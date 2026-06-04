import Fastify from "fastify";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { z } from "zod";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SessionRecord,
  SocketData
} from "@easydrop/shared-types";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

type SessionStore = {
  create(session: SessionRecord): Promise<void>;
  getByCode(code: string): Promise<SessionRecord | null>;
  getById(sessionId: string): Promise<SessionRecord | null>;
  remove(sessionId: string): Promise<void>;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createCode() {
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionRecord>();

  async create(session: SessionRecord) {
    this.sessions.set(session.sessionId, session);
  }

  async getByCode(code: string) {
    return [...this.sessions.values()].find((session) => session.code === code.toUpperCase()) ?? null;
  }

  async getById(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async remove(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

class RedisSessionStore implements SessionStore {
  constructor(private redis: Redis) {}

  async create(session: SessionRecord) {
    const payload = JSON.stringify(session);
    await Promise.all([
      this.redis.set(`session:${session.sessionId}`, payload),
      this.redis.set(`session-code:${session.code}`, session.sessionId)
    ]);
  }

  async getByCode(code: string) {
    const sessionId = await this.redis.get(`session-code:${code.toUpperCase()}`);
    return sessionId ? this.getById(sessionId) : null;
  }

  async getById(sessionId: string) {
    const payload = await this.redis.get(`session:${sessionId}`);
    return payload ? (JSON.parse(payload) as SessionRecord) : null;
  }

  async remove(sessionId: string) {
    const session = await this.getById(sessionId);
    await this.redis.del(`session:${sessionId}`);
    if (session) {
      await this.redis.del(`session-code:${session.code}`);
    }
  }
}

function createStore(): SessionStore {
  if (!process.env.REDIS_URL) {
    return new MemorySessionStore();
  }

  return new RedisSessionStore(
    new Redis(process.env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 2
    })
  );
}

const nicknameSchema = z.string().trim().min(1).max(32);
const joinSchema = z.object({
  code: z.string().trim().min(6).max(6),
  nickname: nicknameSchema
});
const sessionIdSchema = z.string().uuid();

const fastify = Fastify({ logger: true });
const store = createStore();

fastify.get("/health", async () => ({ ok: true }));

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  fastify.server,
  {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ["GET", "POST"]
    }
  }
);

async function removeSessionIfRoomEmpty(sessionId: string) {
  const room = io.sockets.adapter.rooms.get(sessionId);
  if (!room || room.size === 0) {
    await store.remove(sessionId);
  }
}

io.on("connection", (socket) => {
  socket.on("session:create", async ({ nickname }, reply) => {
    const parsedNickname = nicknameSchema.safeParse(nickname);
    if (!parsedNickname.success) {
      reply({ ok: false, error: "Enter a device name first." });
      return;
    }

    let code = createCode();
    while (await store.getByCode(code)) {
      code = createCode();
    }

    const createdAt = nowSeconds();
    const session: SessionRecord = {
      sessionId: crypto.randomUUID(),
      code,
      createdAt,
      hostSocketId: socket.id,
      hostNickname: parsedNickname.data
    };

    await store.create(session);
    socket.data.sessionId = session.sessionId;
    socket.data.nickname = parsedNickname.data;
    await socket.join(session.sessionId);
    reply({ ok: true, session });
  });

  socket.on("session:join", async (payload, reply) => {
    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) {
      reply({ ok: false, error: "Enter a valid 6-character code and device name." });
      return;
    }

    const session = await store.getByCode(parsed.data.code);
    if (!session) {
      reply({ ok: false, error: "Session not found." });
      return;
    }

    const room = io.sockets.adapter.rooms.get(session.sessionId);
    if (room && room.size >= 2) {
      reply({ ok: false, error: "This session already has two devices connected." });
      return;
    }

    socket.data.sessionId = session.sessionId;
    socket.data.nickname = parsed.data.nickname;
    await socket.join(session.sessionId);

    socket.to(session.sessionId).emit("peer:joined", {
      socketId: socket.id,
      nickname: parsed.data.nickname
    });

    reply({
      ok: true,
      session,
      peer: {
        socketId: session.hostSocketId,
        nickname: session.hostNickname
      }
    });
  });

  socket.on("session:leave", async ({ sessionId }) => {
    const parsed = sessionIdSchema.safeParse(sessionId);
    if (!parsed.success) return;
    const room = io.sockets.adapter.rooms.get(parsed.data);
    await socket.leave(parsed.data);
    if (!room || room.size <= 1) {
      await store.remove(parsed.data);
      return;
    }
    socket.to(parsed.data).emit("peer:left");
  });

  socket.on("session:close", async ({ sessionId }) => {
    const parsed = sessionIdSchema.safeParse(sessionId);
    if (!parsed.success) return;
    socket.to(parsed.data).emit("session:closed");
    await store.remove(parsed.data);
  });

  socket.on("offer", ({ sessionId, description }) => {
    socket.to(sessionId).emit("offer", { from: socket.id, description });
  });

  socket.on("answer", ({ sessionId, description }) => {
    socket.to(sessionId).emit("answer", { from: socket.id, description });
  });

  socket.on("ice-candidate", ({ sessionId, candidate }) => {
    socket.to(sessionId).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("transfer-request", (payload) => {
    socket.to(payload.sessionId).emit("transfer-request", payload);
  });

  socket.on("transfer-accept", (payload) => {
    socket.to(payload.sessionId).emit("transfer-accept", payload);
  });

  socket.on("transfer-reject", (payload) => {
    socket.to(payload.sessionId).emit("transfer-reject", payload);
  });

  socket.on("transfer-cancel", (payload) => {
    socket.to(payload.sessionId).emit("transfer-cancel", payload);
  });

  socket.on("disconnecting", async () => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return;
    const room = io.sockets.adapter.rooms.get(sessionId);
    if (!room || room.size <= 1) {
      await store.remove(sessionId);
      return;
    }
    socket.to(sessionId).emit("peer:left");
  });

  socket.on("disconnect", async () => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) return;
    await removeSessionIfRoomEmpty(sessionId);
  });
});

fastify.listen({ port: PORT, host: "0.0.0.0" }).catch((error) => {
  fastify.log.error(error);
  process.exit(1);
});

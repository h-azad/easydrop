import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@easydrop/shared-types";

export type EasyDropSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket() {
  return io(process.env.NEXT_PUBLIC_SIGNALING_URL ?? "http://localhost:4000", {
    autoConnect: false,
    transports: ["websocket"]
  }) as EasyDropSocket;
}

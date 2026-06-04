export type SessionRecord = {
  sessionId: string;
  code: string;
  createdAt: number;
  hostSocketId: string;
  hostNickname: string;
};

export type PeerInfo = {
  socketId: string;
  nickname: string;
};

export type Ack<T> = { ok: true } & T;
export type ErrorAck = { ok: false; error: string };

export type SignalDescription = {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
};

export type SignalCandidate = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};

export type ClientToServerEvents = {
  "session:create": (
    payload: { nickname: string },
    reply: (response: Ack<{ session: SessionRecord }> | ErrorAck) => void
  ) => void;
  "session:join": (
    payload: { code: string; nickname: string },
    reply: (response: Ack<{ session: SessionRecord; peer: PeerInfo }> | ErrorAck) => void
  ) => void;
  "session:leave": (payload: { sessionId: string }) => void;
  "session:close": (payload: { sessionId: string }) => void;
  offer: (payload: { sessionId: string; description: SignalDescription }) => void;
  answer: (payload: { sessionId: string; description: SignalDescription }) => void;
  "ice-candidate": (payload: { sessionId: string; candidate: SignalCandidate }) => void;
  "transfer-request": (payload: TransferSignal) => void;
  "transfer-accept": (payload: TransferSignal) => void;
  "transfer-reject": (payload: TransferSignal) => void;
  "transfer-cancel": (payload: TransferSignal) => void;
};

export type ServerToClientEvents = {
  "peer:joined": (peer: PeerInfo) => void;
  "peer:left": () => void;
  "session:closed": () => void;
  offer: (payload: { from: string; description: SignalDescription }) => void;
  answer: (payload: { from: string; description: SignalDescription }) => void;
  "ice-candidate": (payload: { from: string; candidate: SignalCandidate }) => void;
  "transfer-request": (payload: TransferSignal) => void;
  "transfer-accept": (payload: TransferSignal) => void;
  "transfer-reject": (payload: TransferSignal) => void;
  "transfer-cancel": (payload: TransferSignal) => void;
};

export type SocketData = {
  sessionId?: string;
  nickname?: string;
};

export type TransferSignal = {
  sessionId: string;
  transferId: string;
  name?: string;
  size?: number;
  mime?: string;
};

import { create } from "zustand";
import type { ConnectionRole } from "@easydrop/webrtc";
import type { PeerInfo, SessionRecord } from "@easydrop/shared-types";

type AppState = {
  nickname: string;
  role: ConnectionRole | null;
  session: SessionRecord | null;
  peer: PeerInfo | null;
  setNickname: (nickname: string) => void;
  setSession: (session: SessionRecord | null, role: ConnectionRole | null) => void;
  setPeer: (peer: PeerInfo | null) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  nickname: "",
  role: null,
  session: null,
  peer: null,
  setNickname: (nickname) => set({ nickname }),
  setSession: (session, role) => set({ session, role }),
  setPeer: (peer) => set({ peer }),
  reset: () => set({ session: null, role: null, peer: null })
}));

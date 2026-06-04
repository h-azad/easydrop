import { z } from "zod";

export type ConnectionState = "idle" | "connecting" | "waiting" | "connected" | "disconnected" | "error";

export type TransferRow = {
  id: string;
  name: string;
  size: number;
  mime: string;
  direction: "sending" | "receiving";
  status: "pending" | "transferring" | "complete" | "rejected" | "cancelled" | "error";
  progress: number;
  speed: number;
  url?: string;
};

export type ReceivedText = {
  id: string;
  value: string;
  createdAt: number;
};

export const sessionFormSchema = z.object({
  nickname: z.string().trim().min(1, "Device name is required").max(32),
  code: z.string().trim().max(6).optional()
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;

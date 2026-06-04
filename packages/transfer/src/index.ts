export const CHUNK_SIZE = 256 * 1024;
export const DATA_CHANNEL_LABEL = "easydrop-transfer";

export type DataMessage =
  | { type: "text"; id: string; value: string; createdAt: number }
  | { type: "file-meta"; id: string; name: string; size: number; mime: string; chunks: number }
  | { type: "accept"; fileId: string }
  | { type: "reject"; fileId: string }
  | { type: "file-complete"; fileId: string }
  | { type: "cancel"; transferId: string };

export function createTransferId(prefix = "transfer") {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatSpeed(bytesPerSecond: number) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

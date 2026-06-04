import { CHUNK_SIZE } from "@easydrop/transfer";

const MAX_BUFFERED_AMOUNT = 8 * 1024 * 1024;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function waitForBuffer(channel: RTCDataChannel) {
  if (channel.bufferedAmount < MAX_BUFFERED_AMOUNT) return;
  await new Promise<void>((resolve) => {
    const previous = channel.onbufferedamountlow;
    channel.onbufferedamountlow = () => {
      channel.onbufferedamountlow = previous;
      resolve();
    };
  });
}

export function encodeChunkPacket(fileId: string, chunk: ArrayBuffer) {
  const header = textEncoder.encode(JSON.stringify({ type: "file-chunk", fileId }));
  const packet = new ArrayBuffer(4 + header.byteLength + chunk.byteLength);
  const view = new DataView(packet);
  view.setUint32(0, header.byteLength);
  new Uint8Array(packet, 4, header.byteLength).set(header);
  new Uint8Array(packet, 4 + header.byteLength).set(new Uint8Array(chunk));
  return packet;
}

export function decodeChunkPacket(packet: ArrayBuffer) {
  const view = new DataView(packet);
  const headerLength = view.getUint32(0);
  const headerBytes = new Uint8Array(packet, 4, headerLength);
  const header = JSON.parse(textDecoder.decode(headerBytes)) as { type: "file-chunk"; fileId: string };
  const chunk = packet.slice(4 + headerLength);
  return { fileId: header.fileId, chunk };
}

export { CHUNK_SIZE };

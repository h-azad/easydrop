"use client";

import QRCode from "qrcode";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DataMessage } from "@easydrop/transfer";
import { createTransferId, DATA_CHANNEL_LABEL } from "@easydrop/transfer";
import { rtcConfig } from "@easydrop/webrtc";
import type { PeerInfo, SessionRecord } from "@easydrop/shared-types";
import { HomeLanding } from "@/components/home-landing";
import { SessionSidebar } from "@/components/session-sidebar";
import { TransferWorkspace } from "@/components/transfer-workspace";
import { createDeviceName, defaultFlowerNames, loadFlowerNames } from "@/lib/device-names";
import { createSocket, type EasyDropSocket } from "@/lib/socket";
import { useAppStore } from "@/lib/store";
import { CHUNK_SIZE, decodeChunkPacket, encodeChunkPacket, waitForBuffer } from "@/lib/transfer-packets";
import { type ConnectionState, type ReceivedText, type SessionFormValues, sessionFormSchema, type TransferRow } from "@/lib/types";

export default function Home() {
  const { nickname, setNickname, session, setSession, role, peer, setPeer, reset } = useAppStore();
  const [socket, setSocket] = useState<EasyDropSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [tab, setTab] = useState<"files" | "text">("files");
  const [text, setText] = useState("");
  const [receivedTexts, setReceivedTexts] = useState<ReceivedText[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoAcceptTransfers, setAutoAcceptTransfers] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const autoAcceptTransfersRef = useRef(false);
  const flowerNamesRef = useRef<string[]>(defaultFlowerNames);
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const incomingRef = useRef<Map<string, { meta: TransferRow; chunks: BlobPart[]; received: number; startedAt: number }>>(
    new Map()
  );
  const cancelledRef = useRef<Set<string>>(new Set());
  const transferPatchQueueRef = useRef<Map<string, Partial<TransferRow>>>(new Map());
  const transferPatchFrameRef = useRef<number | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      nickname: "",
      code: ""
    }
  });

  useEffect(() => {
    let active = true;

    void loadFlowerNames().then((flowerNames) => {
      if (!active) return;
      flowerNamesRef.current = flowerNames;
      const generated = createDeviceName(flowerNames);
      form.setValue("nickname", generated);
      setNickname(generated);
    });

    return () => {
      active = false;
    };
  }, [form, setNickname]);

  const refreshDeviceName = useCallback(() => {
    const generated = createDeviceName(flowerNamesRef.current);
    form.setValue("nickname", generated);
    setNickname(generated);
  }, [form, setNickname]);

  useEffect(() => {
    const client = createSocket();
    client.connect();
    setSocket(client);

    return () => {
      client.disconnect();
      pcRef.current?.close();
    };
  }, []);

  useEffect(() => {
    autoAcceptTransfersRef.current = autoAcceptTransfers;
  }, [autoAcceptTransfers]);

  const sendJson = useCallback((message: DataMessage) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") {
      setError("Connect another device before sending.");
      return false;
    }
    channel.send(JSON.stringify(message));
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (transferPatchFrameRef.current !== null) {
        cancelAnimationFrame(transferPatchFrameRef.current);
      }
    };
  }, []);

  const updateTransfer = useCallback((id: string, patch: Partial<TransferRow>) => {
    const existing = transferPatchQueueRef.current.get(id);
    transferPatchQueueRef.current.set(id, { ...existing, ...patch });

    if (transferPatchFrameRef.current !== null) return;

    transferPatchFrameRef.current = requestAnimationFrame(() => {
      transferPatchFrameRef.current = null;
      const patches = transferPatchQueueRef.current;
      transferPatchQueueRef.current = new Map();
      setTransfers((current) =>
        current.map((transfer) => {
          const queuedPatch = patches.get(transfer.id);
          return queuedPatch ? { ...transfer, ...queuedPatch } : transfer;
        })
      );
    });
  }, []);

  const sendFileChunks = useCallback(
    async (fileId: string, file: File) => {
      const channel = channelRef.current;
      if (!channel || channel.readyState !== "open") return;

      updateTransfer(fileId, { status: "transferring" });
      const startedAt = Date.now();
      let sent = 0;

      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        if (cancelledRef.current.has(fileId)) break;
        await waitForBuffer(channel);
        const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
        channel.send(encodeChunkPacket(fileId, chunk));
        sent += chunk.byteLength;
        const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.2);
        updateTransfer(fileId, {
          progress: Math.min((sent / file.size) * 100, 100),
          speed: sent / elapsedSeconds
        });
      }
    },
    [updateTransfer]
  );

  const handleDataMessage = useCallback(
    (message: DataMessage) => {
      if (message.type === "text") {
        setReceivedTexts((current) => [message, ...current]);
        return;
      }

      if (message.type === "file-meta") {
        const shouldAutoAccept = autoAcceptTransfersRef.current;
        const transfer: TransferRow = {
          id: message.id,
          name: message.name,
          size: message.size,
          mime: message.mime,
          direction: "receiving",
          status: shouldAutoAccept ? "transferring" : "pending",
          progress: 0,
          speed: 0
        };
        incomingRef.current.set(message.id, {
          meta: transfer,
          chunks: [],
          received: 0,
          startedAt: Date.now()
        });
        setTransfers((current) => [transfer, ...current]);
        if (shouldAutoAccept) {
          sendJson({ type: "accept", fileId: message.id });
        }
        return;
      }

      if (message.type === "accept") {
        const file = pendingFilesRef.current.get(message.fileId);
        if (file) {
          void sendFileChunks(message.fileId, file);
        }
        return;
      }

      if (message.type === "reject") {
        updateTransfer(message.fileId, { status: "rejected" });
        pendingFilesRef.current.delete(message.fileId);
        return;
      }

      if (message.type === "file-complete") {
        updateTransfer(message.fileId, { status: "complete", progress: 100, speed: 0 });
        pendingFilesRef.current.delete(message.fileId);
        return;
      }

      if (message.type === "cancel") {
        cancelledRef.current.add(message.transferId);
        updateTransfer(message.transferId, { status: "cancelled", speed: 0 });
      }
    },
    [sendFileChunks, sendJson, updateTransfer]
  );

  const attachChannel = useCallback(
    (channel: RTCDataChannel) => {
      channel.binaryType = "arraybuffer";
      channel.bufferedAmountLowThreshold = CHUNK_SIZE;
      channel.onopen = () => setConnectionState("connected");
      channel.onclose = () => setConnectionState("disconnected");
      channel.onerror = () => setConnectionState("error");
      channel.onmessage = (event) => {
        if (typeof event.data === "string") {
          handleDataMessage(JSON.parse(event.data) as DataMessage);
          return;
        }

        const packet = decodeChunkPacket(event.data as ArrayBuffer);
        const active = incomingRef.current.get(packet.fileId);
        if (!active) return;

        active.chunks.push(packet.chunk);
        active.received += packet.chunk.byteLength;
        const elapsedSeconds = Math.max((Date.now() - active.startedAt) / 1000, 0.2);
        const progress = Math.min((active.received / active.meta.size) * 100, 100);
        updateTransfer(active.meta.id, {
          status: "transferring",
          progress,
          speed: active.received / elapsedSeconds
        });

        if (active.received >= active.meta.size) {
          const blob = new Blob(active.chunks, { type: active.meta.mime });
          const url = URL.createObjectURL(blob);
          updateTransfer(active.meta.id, { status: "complete", progress: 100, speed: 0, url });
          channel.send(JSON.stringify({ type: "file-complete", fileId: active.meta.id } satisfies DataMessage));
        }
      };
      channelRef.current = channel;
    },
    [handleDataMessage, updateTransfer]
  );

  const setupPeerConnection = useCallback(
    (client: EasyDropSocket, currentSession: SessionRecord, currentRole: "host" | "guest") => {
      pcRef.current?.close();
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          client.emit("ice-candidate", {
            sessionId: currentSession.sessionId,
            candidate: event.candidate.toJSON()
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setConnectionState("connected");
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setConnectionState("disconnected");
      };
      pc.ondatachannel = (event) => attachChannel(event.channel);

      if (currentRole === "host") {
        attachChannel(pc.createDataChannel(DATA_CHANNEL_LABEL));
      }

      return pc;
    },
    [attachChannel]
  );

  useEffect(() => {
    if (!socket || !session || !role) return;

    const onPeerJoined = async (joinedPeer: PeerInfo) => {
      setPeer(joinedPeer);
      setConnectionState("connecting");
      const pc = setupPeerConnection(socket, session, "host");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { sessionId: session.sessionId, description: offer });
    };

    const onOffer = async ({ description }: { from: string; description: RTCSessionDescriptionInit }) => {
      setConnectionState("connecting");
      const pc = setupPeerConnection(socket, session, "guest");
      await pc.setRemoteDescription(description);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { sessionId: session.sessionId, description: answer });
    };

    const onAnswer = async ({ description }: { from: string; description: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(description);
    };

    const onIce = async ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      await pcRef.current?.addIceCandidate(candidate);
    };

    const onLeft = () => {
      setPeer(null);
      setConnectionState("disconnected");
      pcRef.current?.close();
      pcRef.current = null;
      channelRef.current = null;
    };

    const onClosed = () => {
      pcRef.current?.close();
      pcRef.current = null;
      channelRef.current = null;
      reset();
      setConnectionState("idle");
      setTransfers([]);
      setReceivedTexts([]);
      setError("The session was closed.");
    };

    socket.on("peer:joined", onPeerJoined);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);
    socket.on("peer:left", onLeft);
    socket.on("session:closed", onClosed);

    return () => {
      socket.off("peer:joined", onPeerJoined);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
      socket.off("peer:left", onLeft);
      socket.off("session:closed", onClosed);
    };
  }, [attachChannel, reset, role, session, setPeer, setupPeerConnection, socket]);

  useEffect(() => {
    if (!session || typeof window === "undefined") {
      setQrUrl("");
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("code", session.code);
    void QRCode.toDataURL(url.toString(), { margin: 1, width: 240 }).then(setQrUrl);
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      form.setValue("code", code.toUpperCase());
    }
  }, [form]);

  const createSession = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        if (!socket) return;
        setError("");
        setConnectionState("waiting");
        setNickname(values.nickname);
        socket.emit("session:create", { nickname: values.nickname }, (response) => {
          if (!response.ok) {
            setError(response.error);
            setConnectionState("error");
            return;
          }
          setSession(response.session, "host");
        });
      }),
    [form, setNickname, setSession, socket]
  );

  const joinSession = useMemo(
    () =>
      form.handleSubmit(async (values) => {
        if (!socket || !values.code) return;
        setError("");
        setConnectionState("connecting");
        setNickname(values.nickname);
        socket.emit("session:join", { nickname: values.nickname, code: values.code.toUpperCase() }, (response) => {
          if (!response.ok) {
            setError(response.error);
            setConnectionState("error");
            return;
          }
          setSession(response.session, "guest");
          setPeer(response.peer);
        });
      }),
    [form, setNickname, setPeer, setSession, socket]
  );

  const sendText = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    if (sendJson({ type: "text", id: createTransferId("text"), value, createdAt: Date.now() })) {
      setText("");
    }
  }, [sendJson, text]);

  const sendFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    for (const file of list) {
      const id = createTransferId("file");
      pendingFilesRef.current.set(id, file);
      setTransfers((current) => [
        {
          id,
          name: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
          direction: "sending",
          status: "pending",
          progress: 0,
          speed: 0
        },
        ...current
      ]);
      sendJson({
        type: "file-meta",
        id,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        chunks: Math.ceil(file.size / CHUNK_SIZE)
      });
    }
  }, [sendJson]);

  const acceptTransfer = useCallback((transferId: string) => {
    const incoming = incomingRef.current.get(transferId);
    if (incoming) {
      incoming.startedAt = Date.now();
      incoming.meta.status = "transferring";
    }
    updateTransfer(transferId, { status: "transferring" });
    sendJson({ type: "accept", fileId: transferId });
  }, [sendJson, updateTransfer]);

  const rejectTransfer = useCallback((transferId: string) => {
    updateTransfer(transferId, { status: "rejected" });
    incomingRef.current.delete(transferId);
    sendJson({ type: "reject", fileId: transferId });
  }, [sendJson, updateTransfer]);

  const cancelTransfer = useCallback((transferId: string) => {
    cancelledRef.current.add(transferId);
    updateTransfer(transferId, { status: "cancelled", speed: 0 });
    sendJson({ type: "cancel", transferId });
  }, [sendJson, updateTransfer]);

  const leave = useCallback(() => {
    if (socket && session) {
      socket.emit("session:leave", { sessionId: session.sessionId });
    }
    pcRef.current?.close();
    reset();
    setConnectionState("idle");
    setTransfers([]);
    setReceivedTexts([]);
  }, [reset, session, socket]);

  const closeSession = useCallback(() => {
    if (!session) return;
    const confirmed = window.confirm("Close this session for both devices?");
    if (!confirmed) return;
    if (socket) {
      socket.emit("session:close", { sessionId: session.sessionId });
    }
    pcRef.current?.close();
    reset();
    setConnectionState("idle");
    setTransfers([]);
    setReceivedTexts([]);
  }, [reset, session, socket]);

  const copyCode = useCallback(async () => {
    if (!session) return;
    await navigator.clipboard.writeText(session.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [session]);

  const statusLabel = useMemo(() => {
    if (connectionState === "connected") return "Connected";
    if (connectionState === "connecting") return "Connecting";
    if (connectionState === "waiting") return "Waiting for peer";
    if (connectionState === "disconnected") return "Disconnected";
    if (connectionState === "error") return "Needs attention";
    return "Ready";
  }, [connectionState]);

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col overflow-x-hidden px-4 py-5 text-ink sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(223,255,63,0.035),transparent_35%)]" />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-acid text-night shadow-[0_0_30px_rgba(223,255,63,0.28)]">
            <ArrowRight size={20} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-normal text-ink">EasyDrop</h1>
            <p className="text-xs text-white/[0.45]">Local WebRTC Transfer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-moss/25 bg-moss/10 px-4 py-2 text-sm text-moss shadow-[inset_0_0_18px_rgba(84,224,142,0.08)]">
          <span className={`h-2 w-2 rounded-full ${connectionState === "connected" ? "bg-moss" : "bg-acid"}`} />
          {statusLabel}
        </div>
      </header>

      {!session ? (
        <HomeLanding
          form={form}
          error={error}
          onCreateSession={createSession}
          onJoinSession={joinSession}
          onNicknameChange={setNickname}
          onRefreshDeviceName={refreshDeviceName}
        />
      ) : (
        <section className="grid flex-1 gap-5 py-6 lg:grid-cols-[320px_1fr]">
          <SessionSidebar
            nickname={nickname}
            statusLabel={statusLabel}
            peer={peer}
            session={session}
            qrUrl={qrUrl}
            copied={copied}
            autoAcceptTransfers={autoAcceptTransfers}
            onCopyCode={copyCode}
            onLeave={leave}
            onCloseSession={closeSession}
            onAutoAcceptChange={setAutoAcceptTransfers}
          />
          <TransferWorkspace
            tab={tab}
            text={text}
            dragging={dragging}
            transfers={transfers}
            receivedTexts={receivedTexts}
            connectionState={connectionState}
            onTabChange={setTab}
            onTextChange={setText}
            onSendText={sendText}
            onSendFiles={sendFiles}
            onDraggingChange={setDragging}
            onAcceptTransfer={acceptTransfer}
            onRejectTransfer={rejectTransfer}
            onCancelTransfer={cancelTransfer}
          />
        </section>
      )}
    </main>
  );
}

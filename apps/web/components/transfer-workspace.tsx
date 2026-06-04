"use client";

import { memo, type ReactNode } from "react";
import { Check, Download, FileUp, Link as LinkIcon, Loader2, Send, TextCursorInput, X } from "lucide-react";
import { formatBytes, formatSpeed } from "@easydrop/transfer";
import { Button } from "@/components/ui/button";
import type { ConnectionState, ReceivedText, TransferRow } from "@/lib/types";

type TransferWorkspaceProps = {
  tab: "files" | "text";
  text: string;
  dragging: boolean;
  transfers: TransferRow[];
  receivedTexts: ReceivedText[];
  connectionState: ConnectionState;
  onTabChange: (tab: "files" | "text") => void;
  onTextChange: (text: string) => void;
  onSendText: () => void;
  onSendFiles: (files: FileList | File[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onAcceptTransfer: (id: string) => void;
  onRejectTransfer: (id: string) => void;
  onCancelTransfer: (id: string) => void;
};

function TransferWorkspaceComponent({
  tab,
  text,
  dragging,
  transfers,
  receivedTexts,
  connectionState,
  onTabChange,
  onTextChange,
  onSendText,
  onSendFiles,
  onDraggingChange,
  onAcceptTransfer,
  onRejectTransfer,
  onCancelTransfer
}: TransferWorkspaceProps) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.12] bg-white/[0.045] shadow-panel backdrop-blur-2xl">
      <div className="flex border-b border-white/[0.08] p-2">
        <TabButton active={tab === "files"} onClick={() => onTabChange("files")} icon={<FileUp size={17} />} label="Files" />
        <TabButton
          active={tab === "text"}
          onClick={() => onTabChange("text")}
          icon={<TextCursorInput size={17} />}
          label="Text"
        />
      </div>

      {tab === "files" ? (
        <FilesPanel
          dragging={dragging}
          transfers={transfers}
          onDraggingChange={onDraggingChange}
          onSendFiles={onSendFiles}
          onAcceptTransfer={onAcceptTransfer}
          onRejectTransfer={onRejectTransfer}
          onCancelTransfer={onCancelTransfer}
        />
      ) : (
        <TextPanel
          text={text}
          receivedTexts={receivedTexts}
          connectionState={connectionState}
          onTextChange={onTextChange}
          onSendText={onSendText}
        />
      )}
    </div>
  );
}

function FilesPanel({
  dragging,
  transfers,
  onDraggingChange,
  onSendFiles,
  onAcceptTransfer,
  onRejectTransfer,
  onCancelTransfer
}: {
  dragging: boolean;
  transfers: TransferRow[];
  onDraggingChange: (dragging: boolean) => void;
  onSendFiles: (files: FileList | File[]) => void;
  onAcceptTransfer: (id: string) => void;
  onRejectTransfer: (id: string) => void;
  onCancelTransfer: (id: string) => void;
}) {
  return (
    <div className="p-4">
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          onDraggingChange(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDraggingChange(false);
          onSendFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
          dragging ? "border-acid bg-acid/10" : "border-white/[0.16] bg-white/[0.035]"
        }`}
      >
        <FileUp className="mb-3 text-acid" size={34} />
        <span className="text-lg font-semibold text-ink">Drop files here</span>
        <span className="mt-1 text-sm text-white/[0.42]">or select files from this device</span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) onSendFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <TransferList
        transfers={transfers}
        onAccept={onAcceptTransfer}
        onReject={onRejectTransfer}
        onCancel={onCancelTransfer}
      />
    </div>
  );
}

function TextPanel({
  text,
  receivedTexts,
  connectionState,
  onTextChange,
  onSendText
}: {
  text: string;
  receivedTexts: ReceivedText[];
  connectionState: ConnectionState;
  onTextChange: (text: string) => void;
  onSendText: () => void;
}) {
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_360px]">
      <div>
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste text or a link"
          className="min-h-64 w-full resize-y rounded-lg border border-white/10 bg-white/[0.035] p-3 text-ink outline-none placeholder:text-white/[0.24] focus:border-acid/50 focus:ring-2 focus:ring-acid/20"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={onSendText} disabled={connectionState !== "connected" || !text.trim()}>
            {text.trim().startsWith("http") ? <LinkIcon size={18} /> : <Send size={18} />}
            Send
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white/[0.38]">Received</h3>
        <div className="mt-3 space-y-3">
          {receivedTexts.length === 0 ? (
            <p className="text-sm text-white/[0.42]">No text received yet.</p>
          ) : (
            receivedTexts.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.05] p-3 text-sm text-ink">
                <p className="whitespace-pre-wrap break-words">{item.value}</p>
                <p className="mt-2 text-xs text-white/[0.34]">{new Date(item.createdAt).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold transition ${
        active ? "bg-acid text-night" : "text-white/[0.45] hover:bg-white/[0.06] hover:text-ink"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function TransferList({
  transfers,
  onAccept,
  onReject,
  onCancel
}: {
  transfers: TransferRow[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (transfers.length === 0) {
    return <p className="mt-5 text-sm text-white/[0.42]">Transfers will appear here.</p>;
  }

  return (
    <div className="mt-5 space-y-3">
      {transfers.map((transfer) => (
        <TransferItem
          key={transfer.id}
          transfer={transfer}
          onAccept={onAccept}
          onReject={onReject}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

const TransferItem = memo(function TransferItem({
  transfer,
  onAccept,
  onReject,
  onCancel
}: {
  transfer: TransferRow;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{transfer.name}</p>
          <p className="mt-1 text-sm text-white/[0.42]">
            {transfer.direction === "sending" ? "Sending" : "Receiving"} · {formatBytes(transfer.size)}
          </p>
        </div>
        <div className="flex gap-2">
          {transfer.direction === "receiving" && transfer.status === "pending" ? (
            <>
              <Button variant="secondary" className="h-9 px-3" onClick={() => onReject(transfer.id)}>
                <X size={16} />
              </Button>
              <Button className="h-9 px-3" onClick={() => onAccept(transfer.id)}>
                <Check size={16} />
              </Button>
            </>
          ) : null}
          {transfer.status === "transferring" || (transfer.status === "pending" && transfer.direction === "sending") ? (
            <Button variant="danger" className="h-9 px-3" onClick={() => onCancel(transfer.id)}>
              <X size={16} />
            </Button>
          ) : null}
          {transfer.url ? (
            <a
              href={transfer.url}
              download={transfer.name}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white"
            >
              <Download size={16} />
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-acid transition-all" style={{ width: `${transfer.progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/[0.42]">
        <span className="capitalize">{transfer.status}</span>
        <span>
          {transfer.status === "transferring" ? (
            formatSpeed(transfer.speed)
          ) : transfer.status === "pending" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="animate-spin" size={12} />
              {transfer.direction === "receiving" ? "Needs confirmation" : "Waiting"}
            </span>
          ) : (
            `${Math.round(transfer.progress)}%`
          )}
        </span>
      </div>
    </div>
  );
});

export const TransferWorkspace = memo(TransferWorkspaceComponent);

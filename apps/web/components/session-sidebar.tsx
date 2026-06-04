"use client";

import { memo } from "react";
import { Check, Copy, Settings, X } from "lucide-react";
import type { SessionRecord, PeerInfo } from "@easydrop/shared-types";
import { Button } from "@/components/ui/button";

type SessionSidebarProps = {
  nickname: string;
  statusLabel: string;
  peer: PeerInfo | null;
  session: SessionRecord;
  qrUrl: string;
  copied: boolean;
  autoAcceptTransfers: boolean;
  onCopyCode: () => void;
  onLeave: () => void;
  onCloseSession: () => void;
  onAutoAcceptChange: (enabled: boolean) => void;
};

function SessionSidebarComponent({
  nickname,
  statusLabel,
  peer,
  session,
  qrUrl,
  copied,
  autoAcceptTransfers,
  onCopyCode,
  onLeave,
  onCloseSession,
  onAutoAcceptChange
}: SessionSidebarProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-white/[0.12] bg-white/[0.045] p-4 shadow-panel backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">Device</p>
            <h2 className="mt-1 text-xl font-bold text-ink">{nickname}</h2>
          </div>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={onLeave} title="Leave session">
            <X size={18} />
          </Button>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <InfoRow label="Status" value={statusLabel} />
          <InfoRow label="Connected device" value={peer?.nickname ?? "Not connected"} />
          <InfoRow label="Session cleanup" value="When empty" />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.045] p-4 shadow-panel backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/[0.38]">Connection code</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-acid">{session.code}</p>
          </div>
          <Button variant="secondary" className="h-10 w-10 px-0" onClick={onCopyCode} title="Copy code">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </Button>
        </div>
        {qrUrl ? (
          <div className="mt-4 flex justify-center rounded-lg border border-white/10 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Session QR code" className="h-52 w-52" />
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-white/[0.12] bg-white/[0.045] p-4 shadow-panel backdrop-blur-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Settings size={17} className="text-acid" />
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-white/[0.38]">Settings</h3>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <span>
            <span className="block text-sm font-semibold text-ink">Auto accept transfers</span>
            <span className="mt-1 block text-xs leading-5 text-white/[0.42]">Skip file receive confirmation on this device.</span>
          </span>
          <input
            type="checkbox"
            checked={autoAcceptTransfers}
            onChange={(event) => onAutoAcceptChange(event.target.checked)}
            className="h-5 w-5 accent-acid"
          />
        </label>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" onClick={onLeave} className="w-full">
            <X size={16} />
            Leave Session
          </Button>
          <Button variant="danger" onClick={onCloseSession} className="w-full">
            <X size={16} />
            Close Session
          </Button>
        </div>
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/[0.42]">{label}</span>
      <span className="truncate font-semibold text-ink">{value}</span>
    </div>
  );
}

export const SessionSidebar = memo(SessionSidebarComponent);

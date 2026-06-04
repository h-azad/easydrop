"use client";

import { memo, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  ArrowRight,
  FileUp,
  Grid2X2,
  Infinity,
  LockKeyhole,
  PlugZap,
  RotateCw,
  ServerOff,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionFormValues } from "@/lib/types";

type HomeLandingProps = {
  form: UseFormReturn<SessionFormValues>;
  error: string;
  onCreateSession: () => void;
  onJoinSession: () => void;
  onNicknameChange: (nickname: string) => void;
  onRefreshDeviceName: () => void;
};

function HomeLandingComponent({
  form,
  error,
  onCreateSession,
  onJoinSession,
  onNicknameChange,
  onRefreshDeviceName
}: HomeLandingProps) {
  const nicknameRegistration = form.register("nickname");
  const codeRegistration = form.register("code");

  return (
    <section className="grid min-w-0 flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_1px_0.92fr] lg:py-0">
      <div className="min-w-0 max-w-2xl" style={{ width: "min(100%, calc(100vw - 2rem))" }}>
        <div className="mb-10 inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-white/[0.45]">
          <span className="h-1.5 w-1.5 rounded-full bg-acid" />
          Peer-to-peer · No server
        </div>
        <h2 className="max-w-2xl break-words text-4xl font-bold leading-[1.08] tracking-normal text-[#f3f0e8] sm:text-6xl lg:text-7xl">
          Share without
          <br />
          touching <span className="italic text-acid">a server.</span>
        </h2>
        <p className="mt-8 max-w-[20.5rem] text-base leading-8 text-white/[0.45] sm:max-w-[34rem] sm:text-lg">
          Create a session, pair with a QR code or 6-character code, then send text and files over an encrypted WebRTC data
          channel, completely peer-to-peer.
        </p>
        <div className="mt-12 grid max-w-[20.5rem] gap-4 text-sm text-white/[0.45] sm:max-w-[34rem]">
          <HeroFeature icon={<LockKeyhole size={15} />} text="End-to-end encrypted over WebRTC data channel" />
          <HeroFeature icon={<ServerOff size={15} />} text="Same network direct transfer with no relay path" />
          <HeroFeature icon={<PlugZap size={15} />} text="Zero installation, runs fully in your browser" />
          <HeroFeature icon={<FileUp size={15} />} text="Files, text, and links in one temporary workspace" />
        </div>
      </div>

      <div className="hidden h-full min-h-[calc(100vh-80px)] w-px bg-white/[0.08] lg:block" />

      <div className="w-full min-w-0 max-w-[326px] space-y-8 lg:mx-auto lg:max-w-[440px]">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.045] p-5 shadow-panel backdrop-blur-2xl sm:p-8"
        >
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-white/[0.42]" htmlFor="nickname">
            Device name
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="nickname"
              className="h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm text-ink outline-none transition placeholder:text-white/20 focus:border-acid/50 focus:ring-2 focus:ring-acid/20"
              {...nicknameRegistration}
              onChange={(event) => {
                void nicknameRegistration.onChange(event);
                onNicknameChange(event.target.value);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={onRefreshDeviceName}
              className="hidden h-12 w-12 px-0 sm:inline-flex"
              title="Generate device name"
            >
              <RotateCw size={16} />
            </Button>
          </div>
          {form.formState.errors.nickname ? (
            <p className="mt-2 text-sm text-coral">{form.formState.errors.nickname.message}</p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_104px]">
            <Button type="button" onClick={onCreateSession} className="h-12">
              <Grid2X2 size={17} />
              Create Session
            </Button>
            <input
              aria-label="Generated code example"
              value="A7K9P2"
              readOnly
              className="hidden h-12 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-center font-mono text-sm uppercase tracking-[0.2em] text-white/[0.18] outline-none sm:block"
            />
          </div>

          <div className="my-7 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-white/[0.24]">
            <span className="h-px flex-1 bg-white/10" />
            Or join existing
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input
              aria-label="Connection code"
              placeholder="Enter 6-character code"
              maxLength={6}
              className="h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm uppercase tracking-[0.08em] text-ink outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/20 focus:border-acid/50 focus:ring-2 focus:ring-acid/20"
              {...codeRegistration}
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase();
                void codeRegistration.onChange(event);
              }}
            />
            <Button type="button" variant="secondary" onClick={onJoinSession} className="h-12 px-5">
              Join
              <ArrowRight size={15} />
            </Button>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-moss/20 bg-moss/10 px-4 py-3 text-xs leading-5 text-moss">
            <ShieldCheck className="mt-0.5 shrink-0" size={15} />
            WebRTC DTLS encryption keeps your data on your network.
          </div>
          {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}
        </form>

        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.035] text-center backdrop-blur-xl">
          <Metric value="0ms" label="Server hops" />
          <Metric value={<Infinity className="mx-auto" size={24} />} label="File size" />
          <Metric value="E2E" label="Encrypted" />
        </div>
      </div>
    </section>
  );
}

function HeroFeature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.055] text-acid">
        {icon}
      </span>
      <span className="min-w-0">{text}</span>
    </div>
  );
}

function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="border-r border-white/[0.08] px-4 py-5 last:border-r-0">
      <div className="h-7 text-2xl font-semibold leading-7 text-[#f3f0e8]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/[0.34]">{label}</div>
    </div>
  );
}

export const HomeLanding = memo(HomeLandingComponent);

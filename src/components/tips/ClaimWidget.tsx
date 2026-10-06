"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Money } from "../Money";

/**
 * The creator side of tips: prove the channel is yours, collect what fans have
 * sent. Proof is a code pasted into the channel description — only the
 * channel's owner can edit that — then a sign-in that gives the creator an
 * account for the money to land in. Loaded only once Privy is up; see Claim.
 */

interface Channel {
  channelId: string;
  title?: string;
  handle?: string;
  avatarUrl?: string;
  code: string;
  heldUnits: number;
  claimedBy: string | null;
  onRoster: boolean;
}

type Step =
  | { kind: "enter" }
  | { kind: "code"; channel: Channel }
  | { kind: "done"; channel: Channel; sweptUnits: number; receiptUrl: string };

const label = "font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3";
const button =
  "border border-ink bg-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-paper transition-colors hover:bg-red hover:border-red disabled:cursor-wait disabled:opacity-60";

export default function ClaimWidget() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.walletClientType === "privy");

  const [step, setStep] = useState<Step>({ kind: "enter" });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // "Claim" pressed before sign-in finished; continue once the account exists.
  const [queued, setQueued] = useState(false);

  const start = async () => {
    setError(null);
    setBusy("Finding your channel…");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", channel: input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "something went wrong");
      setStep({ kind: "code", channel: json as Channel });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const verify = useCallback(
    async (channel: Channel) => {
      if (!wallet) return;
      setError(null);
      setBusy("Checking your channel…");
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/claim", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "verify", channelId: channel.channelId, payout: wallet.address }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "something went wrong");
        setStep({ kind: "done", channel, sweptUnits: json.sweptUnits, receiptUrl: json.receiptUrl });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [wallet, getAccessToken],
  );

  useEffect(() => {
    if (queued && authenticated && wallet && step.kind === "code") {
      setQueued(false);
      void verify(step.channel);
    }
  }, [queued, authenticated, wallet, step, verify]);

  const claim = (channel: Channel) => {
    if (!authenticated || !wallet) {
      setQueued(true);
      setBusy("Signing in…");
      if (!authenticated) login();
      return;
    }
    void verify(channel);
  };

  return (
    <div className="max-w-xl">
      {step.kind === "enter" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) void start();
          }}
        >
          <label htmlFor="channel" className={label}>
            Your YouTube channel
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="channel"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="@yourchannel"
              autoComplete="off"
              className="min-w-0 flex-1 border border-ink bg-paper px-3 py-2.5 font-mono text-sm outline-none focus:border-red"
            />
            <button type="submit" disabled={busy !== null} className={button}>
              {busy ?? "Find it"}
            </button>
          </div>
        </form>
      )}

      {step.kind !== "enter" && <ChannelCard channel={step.channel} />}

      {step.kind === "code" && step.channel.claimedBy && (
        <p className="mt-6 text-sm text-ink-2">
          This channel has already been claimed — tips now go straight to its owner.
        </p>
      )}

      {step.kind === "code" && !step.channel.claimedBy && (
        <ol className="mt-6 space-y-5 text-sm text-ink-2">
          <li>
            <p className={label}>1 · Add this code to your channel description</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="border border-ink bg-paper-2 px-3 py-2 font-mono text-base font-bold tracking-wider text-ink">
                {step.channel.code}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(step.channel.code);
                  setCopied(true);
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-ink-3 underline hover:text-ink"
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <p className="mt-2">
              In{" "}
              <a
                href={`https://studio.youtube.com/channel/${step.channel.channelId}/editing/details`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-ink"
              >
                YouTube Studio
              </a>
              : Customization → Basic info → Description. Paste it anywhere and publish. Only the
              channel&apos;s owner can do that, which is the proof. You can delete it once you&apos;re done.
            </p>
          </li>
          <li>
            <p className={label}>2 · Sign in and collect</p>
            <p className="mt-2">
              Sign in with email or Google. That gives you an account for your tips to land in, and every
              future tip goes straight there.
            </p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => claim(step.channel)}
              className={`${button} mt-3`}
            >
              {busy ??
                (step.channel.heldUnits > 0
                  ? <>I&apos;ve added it — collect <Money units={step.channel.heldUnits} /></>
                  : "I've added it — claim my channel")}
            </button>
          </li>
        </ol>
      )}

      {step.kind === "done" && (
        <div className="mt-6 border-l-4 border-live pl-4">
          <p className="font-display text-2xl text-ink">
            {step.sweptUnits > 0 ? <><Money units={step.sweptUnits} /> is yours</> : "Your channel is claimed"}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            Every future tip on your takes now goes straight to your account. You can remove the code from
            your description.
          </p>
          <div className="mt-3 flex gap-4 font-mono text-[10px] uppercase tracking-wider">
            <a href="/account" className="font-bold text-ink underline hover:text-red">
              see it in your account →
            </a>
            <a href={step.receiptUrl} target="_blank" rel="noreferrer" className="text-ink-3 underline hover:text-ink">
              receipt
            </a>
          </div>
        </div>
      )}

      {error && <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-red">{error}</p>}
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <div className="flex items-center gap-4 border border-rule bg-paper p-4">
      {channel.avatarUrl && (
        <Image
          src={channel.avatarUrl}
          alt=""
          width={56}
          height={56}
          className="rounded-full"
        />
      )}
      <div className="min-w-0">
        <p className="truncate font-bold text-ink">{channel.title}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{channel.handle}</p>
        <p className="mt-1 font-mono text-xs font-bold text-ink-2">
          {channel.claimedBy
            ? "claimed"
            : channel.heldUnits > 0
              ? <><Money units={channel.heldUnits} /> waiting for you</>
              : "nothing waiting yet — tips will be held here for you"}
        </p>
      </div>
    </div>
  );
}

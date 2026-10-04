"use client";

import { usePrivy, useSignTypedData, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http, toHex, type Hex } from "viem";
import {
  TIPJAR_ADDRESS,
  TIP_AMOUNTS,
  USDC_ADDRESS,
  creatorKey,
  receiveWithAuthorizationTypes,
  takeKey,
  tipNonce,
  tipsChain,
  toUnits,
  usdcAbi,
  usdcDomain,
  type TipAmount,
} from "@/lib/chain/config";
import type { HydratedTake } from "@/lib/types";

/**
 * Tip a take in dollars. Behind it: a USDC transfer authorization the fan
 * signs with their Privy embedded wallet, relayed by our server so they never
 * need gas. Nothing on screen says wallet, gas or chain — the receipt link is
 * there for anyone who wants to check.
 */

type State =
  | { kind: "idle" }
  | { kind: "picking" }
  | { kind: "working"; label: string }
  | { kind: "needs-money"; amount: TipAmount }
  | { kind: "sent"; amount: TipAmount; receiptUrl: string; held: boolean }
  | { kind: "error"; message: string };

const publicClient = createPublicClient({ chain: tipsChain, transport: http() });

function randomSalt(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function TipButton({ take }: { take: HydratedTake }) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { signTypedData } = useSignTypedData();
  const [state, setState] = useState<State>({ kind: "idle" });
  // A tip chosen before signing in, sent once sign-in and the wallet are ready.
  const [queued, setQueued] = useState<TipAmount | null>(null);

  const wallet = wallets.find((w) => w.walletClientType === "privy");
  const channelId = take.creator.youtubeChannelId;

  const authedPost = useCallback(
    async (path: string, body: unknown) => {
      const token = await getAccessToken();
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, json } as { ok: boolean; json: Record<string, unknown> };
    },
    [getAccessToken],
  );

  const send = useCallback(
    async (amount: TipAmount) => {
      if (!wallet || !channelId || !TIPJAR_ADDRESS) return;
      const from = wallet.address as Hex;
      const value = toUnits(amount);

      setState({ kind: "working", label: "Checking…" });
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "balanceOf",
        args: [from],
      });
      if (balance < value) {
        setState({ kind: "needs-money", amount });
        return;
      }

      setState({ kind: "working", label: `Sending $${amount}…` });
      const salt = randomSalt();
      const validBefore = Math.floor(Date.now() / 1000) + 3600;

      try {
        const { signature } = await signTypedData(
          {
            domain: usdcDomain,
            types: {
              ReceiveWithAuthorization: [...receiveWithAuthorizationTypes.ReceiveWithAuthorization],
            },
            primaryType: "ReceiveWithAuthorization",
            message: {
              from,
              to: TIPJAR_ADDRESS,
              value: Number(value),
              validAfter: 0,
              validBefore,
              nonce: tipNonce(creatorKey(channelId), takeKey(take.externalId), salt),
            },
          },
          { address: from, uiOptions: { showWalletUIs: false } },
        );

        const { ok, json } = await authedPost("/api/tips", {
          takeId: take.id,
          from,
          amount,
          validBefore: String(validBefore),
          salt,
          signature,
        });
        if (!ok) throw new Error(String(json.error ?? "the tip did not go through"));

        setState({
          kind: "sent",
          amount,
          receiptUrl: String(json.receiptUrl),
          held: Boolean(json.held),
        });
      } catch (err) {
        setState({ kind: "error", message: (err as Error).message });
      }
    },
    [wallet, channelId, take.id, take.externalId, signTypedData, authedPost],
  );

  useEffect(() => {
    if (queued !== null && authenticated && wallet) {
      const amount = queued;
      setQueued(null);
      void send(amount);
    }
  }, [queued, authenticated, wallet, send]);

  const choose = (amount: TipAmount) => {
    if (!authenticated) {
      setQueued(amount);
      setState({ kind: "working", label: "Signing in…" });
      login();
      return;
    }
    if (!wallet) {
      setQueued(amount);
      setState({ kind: "working", label: "Setting up…" });
      return;
    }
    void send(amount);
  };

  const topUp = async (amount: TipAmount) => {
    if (!wallet) return;
    setState({ kind: "working", label: "Adding test money…" });
    const { ok, json } = await authedPost("/api/faucet", { address: wallet.address });
    if (!ok) {
      setState({ kind: "error", message: String(json.error ?? "could not add test money") });
      return;
    }
    void send(amount);
  };

  // A take whose creator has no resolved channel has nowhere for a tip to go.
  if (!channelId) return <DisabledSupport />;

  const pill =
    "border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors";

  switch (state.kind) {
    case "idle":
      return (
        <button
          type="button"
          disabled={!ready}
          onClick={() => setState({ kind: "picking" })}
          className={`${pill} border-ink text-ink hover:bg-red hover:border-red hover:text-paper`}
        >
          Support →
        </button>
      );

    case "picking":
      return (
        <div className="flex items-center gap-1">
          {TIP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => choose(amount)}
              className={`${pill} border-ink text-ink hover:bg-red hover:border-red hover:text-paper`}
            >
              ${amount}
            </button>
          ))}
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setState({ kind: "idle" })}
            className={`${pill} border-transparent text-ink-3 hover:text-ink`}
          >
            ✕
          </button>
        </div>
      );

    case "working":
      return <span className={`${pill} border-rule text-ink-3`}>{state.label}</span>;

    case "needs-money":
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Out of test money</span>
          <button
            type="button"
            onClick={() => topUp(state.amount)}
            className={`${pill} border-red bg-red text-paper hover:bg-red-dark`}
          >
            Add $5 &amp; send
          </button>
        </div>
      );

    case "sent":
      return (
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
          <span className="font-bold text-live">
            Sent ${state.amount} to {take.creator.name}
          </span>
          <a href={state.receiptUrl} target="_blank" rel="noreferrer" className="text-ink-3 underline hover:text-ink">
            receipt
          </a>
        </span>
      );

    case "error":
      return (
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
          <span className="text-red">{state.message}</span>
          <button
            type="button"
            onClick={() => setState({ kind: "picking" })}
            className="text-ink-3 underline hover:text-ink"
          >
            retry
          </button>
        </span>
      );
  }
}

export function DisabledSupport() {
  return (
    <button
      type="button"
      disabled
      title="Creator payouts arrive in Phase 2"
      className="cursor-not-allowed border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3"
    >
      Support →
    </button>
  );
}

"use client";

import { useExportWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/format";
import { Money } from "../Money";

/**
 * Where a fan or creator sees their money: balance, tips sent and received,
 * and a way to take it elsewhere. Export opens Privy's own screen, which shows
 * the account's key in an iframe on Privy's domain — this site never sees it,
 * so moving money out needs no custody of ours. Loaded only once Privy is up.
 */

interface Line {
  amountUnits: number;
  at: string;
  creator: string;
  take: string;
  matchUrl: string | null;
  receiptUrl: string;
  held: boolean;
}

interface Account {
  balanceUnits: number;
  channels: string[];
  sent: Line[];
  received: Line[];
}

const label = "font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3";
const button =
  "border border-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors";

export default function AccountWidget() {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { exportWallet } = useExportWallet();
  const wallet = wallets.find((w) => w.walletClientType === "privy");
  // Keyed on the address, not the wallet object: Privy hands back a new object
  // on re-render, and depending on it re-ran the fetch in a loop.
  const address = wallet?.address;

  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  // getAccessToken is not referentially stable either; read it through a ref.
  const tokenRef = useRef(getAccessToken);
  tokenRef.current = getAccessToken;

  const load = useCallback(async () => {
    if (!address) return;
    setError(null);
    // A hung request would otherwise leave the page on "Loading" for good.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 30_000);
    try {
      const token = await tokenRef.current();
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ address }),
        signal: abort.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "could not load your account");
      setAccount(json as Account);
    } catch (err) {
      setError(
        (err as Error).name === "AbortError"
          ? "your account took too long to load — try Refresh"
          : (err as Error).message,
      );
    } finally {
      clearTimeout(timer);
    }
  }, [address]);

  useEffect(() => {
    if (authenticated && address) void load();
  }, [authenticated, address, load]);

  if (!ready) return <p className={label}>Loading…</p>;

  if (!authenticated) {
    return (
      <div>
        <p className="max-w-xl text-ink-2">
          Sign in with the email or Google account you tip or collect with to see your balance and history.
        </p>
        <button type="button" onClick={() => login()} className={`${button} mt-4 bg-ink text-paper hover:bg-red hover:border-red`}>
          Sign in
        </button>
      </div>
    );
  }

  if (!walletsReady) return <p className={label}>Opening your account…</p>;

  if (!wallet) {
    return (
      <div>
        <p className="max-w-xl text-ink-2">
          You&apos;re signed in, but there&apos;s no account set up for this sign-in yet. Tip a take or collect your
          tips and one is created for you.
        </p>
        <button type="button" onClick={() => void logout()} className={`${button} mt-4 border-rule text-ink-3 hover:text-ink`}>
          Sign out
        </button>
      </div>
    );
  }

  if (!account && !error) return <p className={label}>Loading your balance…</p>;

  return (
    <div className="max-w-2xl">
      {error && <p className="mb-4 font-mono text-[11px] uppercase tracking-wider text-red">{error}</p>}

      {account && (
        <>
          <p className={label}>Balance</p>
          <p className="mt-1 font-display text-6xl leading-none text-ink">
            <Money units={account.balanceUnits} />
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            test money during the demo
            {account.channels.length > 0 && <> · collecting for {account.channels.join(", ")}</>}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportWallet({ address: wallet.address })}
              className={`${button} bg-ink text-paper hover:bg-red hover:border-red`}
            >
              Move it elsewhere
            </button>
            <button type="button" onClick={() => void load()} className={`${button} text-ink hover:bg-paper-2`}>
              Refresh
            </button>
            <button type="button" onClick={() => void logout()} className={`${button} border-rule text-ink-3 hover:text-ink`}>
              Sign out
            </button>
          </div>
          <p className="mt-2 max-w-xl text-xs text-ink-3">
            &ldquo;Move it elsewhere&rdquo; shows your account&apos;s key in a secure Privy window, to add to a wallet
            app such as MetaMask or Rabby. Footy Reacts never sees it. Anyone with that key controls the money — keep
            it private.
          </p>

          <History title="Tips you've received" lines={account.received} empty="No tips on your takes yet." />
          <History title="Tips you've sent" lines={account.sent} empty="You haven't tipped a take yet." />

          <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            account {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
          </p>
        </>
      )}
    </div>
  );
}

function History({ title, lines, empty }: { title: string; lines: Line[]; empty: string }) {
  return (
    <section className="mt-10">
      <h2 className={label}>{title}</h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {lines.map((line) => (
            <li key={line.receiptUrl} className="flex items-baseline gap-3 py-2.5 text-sm">
              <span className="w-14 shrink-0 font-mono font-bold text-ink">
                <Money units={line.amountUnits} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-2">
                  {line.creator}
                </span>{" "}
                {line.matchUrl ? (
                  <a href={line.matchUrl} className="text-ink hover:underline">
                    {line.take}
                  </a>
                ) : (
                  <span className="text-ink">{line.take}</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                {timeAgo(line.at)} ·{" "}
                <a href={line.receiptUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                  receipt
                </a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

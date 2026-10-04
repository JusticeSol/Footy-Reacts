import { PrivyClient } from "@privy-io/node";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  parseSignature,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  PRIVY_APP_ID,
  TIPJAR_ADDRESS,
  USDC_ADDRESS,
  tipJarAbi,
  tipsChain,
  usdcAbi,
} from "./config";

/**
 * Server-only chain access: the relayer that pays fans' gas, and Privy token
 * checks. Like the Supabase service-role key, RELAYER_PRIVATE_KEY must never
 * reach the browser — nothing here is imported by a client component.
 */

function relayerKey(): Hex {
  const raw = process.env.RELAYER_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("RELAYER_PRIVATE_KEY is not set");
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export const publicClient = createPublicClient({ chain: tipsChain, transport: http() });

function relayer() {
  const account = privateKeyToAccount(relayerKey());
  return createWalletClient({ account, chain: tipsChain, transport: http() });
}

export function tipJar(): Hex {
  if (!TIPJAR_ADDRESS) throw new Error("NEXT_PUBLIC_TIPJAR_ADDRESS is not set");
  return TIPJAR_ADDRESS;
}

// --- auth ---------------------------------------------------------------

let privy: PrivyClient | null = null;

/** The Privy user id behind a request's bearer token, or null if absent or invalid. */
export async function privyUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!token || !PRIVY_APP_ID || !appSecret) return null;

  privy ??= new PrivyClient({ appId: PRIVY_APP_ID, appSecret });
  try {
    const claims = await privy.utils().auth().verifyAccessToken(token);
    return claims.user_id;
  } catch {
    return null;
  }
}

// --- tipping --------------------------------------------------------------

export interface SignedTip {
  creatorKey: Hex;
  takeKey: Hex;
  from: Hex;
  value: bigint;
  validBefore: bigint;
  salt: Hex;
  signature: Hex;
}

export interface RelayedTip {
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  held: boolean;
}

/**
 * Submits a fan's signed tip and returns it only once the Tipped event is
 * confirmed onchain — a tip is never reported, or stored, on the strength of
 * a transaction hash alone.
 */
export async function relayTip(tip: SignedTip): Promise<RelayedTip> {
  const { v, r, s, yParity } = parseSignature(tip.signature);
  const wallet = relayer();

  // Simulate first: Monad charges for the gas limit, not the gas used, so a
  // transaction that was always going to revert still costs the relayer.
  const { request } = await publicClient.simulateContract({
    account: wallet.account,
    address: tipJar(),
    abi: tipJarAbi,
    functionName: "tipWithAuthorization",
    args: [
      tip.creatorKey,
      tip.takeKey,
      tip.from,
      tip.value,
      0n,
      tip.validBefore,
      tip.salt,
      Number(v ?? BigInt(yParity + 27)),
      r,
      s,
    ],
  });

  const txHash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error(`tip transaction reverted: ${txHash}`);

  const [event] = parseEventLogs({ abi: tipJarAbi, eventName: "Tipped", logs: receipt.logs }).filter(
    (log) => log.address.toLowerCase() === tipJar().toLowerCase(),
  );
  if (!event) throw new Error(`no Tipped event in ${txHash}`);

  return {
    txHash,
    logIndex: event.logIndex,
    blockNumber: receipt.blockNumber,
    held: event.args.held,
  };
}

// --- test-money faucet ------------------------------------------------------

export function usdcBalance(address: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address],
  });
}

export async function relayerAddress(): Promise<Hex> {
  return relayer().account.address;
}

/** Sends test USDC from the relayer's treasury. Testnet only. */
export async function sendTestUsdc(to: Hex, value: bigint): Promise<Hex> {
  const wallet = relayer();
  const { request } = await publicClient.simulateContract({
    account: wallet.account,
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "transfer",
    args: [to, value],
  });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`faucet transfer reverted: ${hash}`);
  return hash;
}

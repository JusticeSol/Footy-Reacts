import { encodeAbiParameters, keccak256, parseAbi, stringToHex, type Hex } from "viem";
import { monadTestnet } from "viem/chains";

/**
 * Everything both the browser and the server need to agree on for tips.
 *
 * Tips settle in Circle's USDC on Monad testnet through the TipJar contract in
 * contracts/. A fan signs a USDC ReceiveWithAuthorization; our relayer submits
 * it and pays the gas, so a fan never holds or sees MON.
 */

export const tipsChain = monadTestnet;

/** Circle's USDC on Monad testnet — 6 decimals, EIP-3009. */
export const USDC_ADDRESS = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const;
export const USDC_DECIMALS = 6;

// Written out in full so Next inlines them into the client bundle.
export const TIPJAR_ADDRESS = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS as Hex | undefined;
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/**
 * Tips are off unless explicitly switched on and fully configured, so a deploy
 * missing any piece renders the old disabled button rather than a broken one.
 */
export const tipsEnabled =
  process.env.NEXT_PUBLIC_TIPS_ENABLED === "1" && Boolean(TIPJAR_ADDRESS) && Boolean(PRIVY_APP_ID);

/** Whole dollars. The server accepts only these, which caps what a bad client can ask the relayer to do. */
export const TIP_AMOUNTS = [1, 3, 5] as const;
export type TipAmount = (typeof TIP_AMOUNTS)[number];

export function toUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * 10 ** USDC_DECIMALS));
}

export function fromUnits(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

/** keccak256 of the YouTube channel id — public and stable, not our internal id. */
export function creatorKey(youtubeChannelId: string): Hex {
  return keccak256(stringToHex(youtubeChannelId));
}

/** keccak256 of the YouTube video id. */
export function takeKey(videoId: string): Hex {
  return keccak256(stringToHex(videoId));
}

/** Must match TipJar.tipNonce: the signature itself pins creator and take. */
export function tipNonce(ck: Hex, tk: Hex, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }], [ck, tk, salt]),
  );
}

export const usdcDomain = {
  name: "USDC",
  version: "2",
  chainId: tipsChain.id,
  verifyingContract: USDC_ADDRESS,
} as const;

export const receiveWithAuthorizationTypes = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const usdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
]);

export const tipJarAbi = parseAbi([
  "function tipWithAuthorization(bytes32 creatorKey, bytes32 takeKey, address from, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 salt, uint8 v, bytes32 r, bytes32 s)",
  "function payoutOf(bytes32 creatorKey) view returns (address)",
  "function pendingTotal(bytes32 creatorKey) view returns (uint256)",
  "event Tipped(bytes32 indexed creatorKey, bytes32 indexed takeKey, address indexed from, uint256 value, bool held)",
  "event Claimed(bytes32 indexed creatorKey, address payout, uint256 swept)",
]);

export function explorerTxUrl(hash: string): string {
  return `${tipsChain.blockExplorers.default.url}/tx/${hash}`;
}

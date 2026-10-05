/**
 * Whether tips are on, readable without importing viem.
 *
 * Kept apart from config.ts on purpose: the layout and every take card need
 * this flag, and importing it from a module that pulls in viem added about a
 * minute to a cold dev compile of pages that never tip.
 */

// Written out in full so Next inlines them into the client bundle.
export const TIPJAR_ADDRESS = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS as `0x${string}` | undefined;
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/**
 * Tips are off unless explicitly switched on and fully configured, so a deploy
 * missing any piece renders the old disabled button rather than a broken one.
 */
export const tipsEnabled =
  process.env.NEXT_PUBLIC_TIPS_ENABLED === "1" && Boolean(TIPJAR_ADDRESS) && Boolean(PRIVY_APP_ID);

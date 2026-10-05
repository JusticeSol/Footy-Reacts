import { keepClaim, mostSupported, totalTips } from "../src/lib/repo/shared";
import type { Creator, HydratedTake } from "../src/lib/types";

/**
 * The tip rules that are easy to break without noticing. Pure functions only,
 * so it needs no keys, no chain and no store.
 *
 * - totals count dollars and distinct fans, not tips
 * - the Most supported strip shows one take per creator, so a well-tipped
 *   channel gets a spotlight without owning it
 * - a claim survives creator:add re-saving the creator as unclaimed, because
 *   TipJar's payout address is permanent onchain
 */

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures += 1;
}

const creator = (id: string): Creator => ({ id, name: id, handle: `@${id}`, clubAffinity: [], claimed: false });
const take = (id: string, creatorId: string, publishedAt = "2026-10-10T18:00:00Z"): HydratedTake => ({
  id,
  fixtureId: "f1",
  creatorId,
  phase: "post",
  source: "youtube",
  externalId: id,
  title: id,
  url: "",
  publishedAt,
  confidence: 0.9,
  taggedBy: "heuristic",
  creator: creator(creatorId),
});
const tip = (takeId: string, from: string, dollars: number) => ({ takeId, from, amountUnits: dollars * 1_000_000 });

console.log("totals:");
const totals = totalTips([
  tip("a1", "0xFAN1", 3),
  tip("a1", "0xfan1", 1), // same fan, different case
  tip("a1", "0xfan2", 5),
  tip("b1", "0xfan1", 1),
]);
check("dollars sum per take", totals.get("a1")?.totalUnits === 9_000_000, JSON.stringify(totals.get("a1")));
check("fans are distinct addresses, case-insensitive", totals.get("a1")?.fans === 2);
check("an untipped take has no entry", !totals.has("c1"));

console.log("\nmost supported:");
const takes = [take("a1", "aftv"), take("a2", "aftv"), take("b1", "united"), take("c1", "spurs"), take("d1", "city")];
const strip = mostSupported(
  takes,
  totalTips([tip("a1", "x", 5), tip("a2", "y", 4), tip("b1", "z", 3), tip("c1", "w", 2), tip("d1", "v", 1)]),
);
check("capped at three", strip.length === 3);
check(
  "one per creator — AFTV's second take is skipped, not shown twice",
  strip.map((s) => s.take.id).join(",") === "a1,b1,c1",
  strip.map((s) => s.take.id).join(","),
);
check("untipped takes never appear", mostSupported(takes, new Map()).length === 0);
const tied = mostSupported(
  [take("e1", "p"), take("e2", "q")],
  totalTips([tip("e1", "a", 3), tip("e2", "a", 1), tip("e2", "b", 1), tip("e2", "c", 1)]),
);
check("ties on dollars go to more fans", tied[0]?.take.id === "e2", tied.map((s) => s.take.id).join(","));

console.log("\nclaims:");
const claimed = { claimed: true, payoutAddress: "0xpayout" };
check("re-adding as unclaimed keeps the claim", keepClaim({ claimed: false }, claimed).claimed === true);
check("…and keeps the payout address", keepClaim({ claimed: false }, claimed).payoutAddress === "0xpayout");
check("a new claim sets both", keepClaim(claimed, undefined).payoutAddress === "0xpayout");
check("an unclaimed creator stays unclaimed", keepClaim({ claimed: false }, { claimed: false }).claimed === false);

console.log(failures === 0 ? "\nall tip checks pass" : `\n${failures} tip check(s) failed`);
process.exit(failures === 0 ? 0 : 1);

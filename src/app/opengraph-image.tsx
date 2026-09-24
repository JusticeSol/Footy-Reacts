import { ImageResponse } from "next/og";
import { getBoard } from "@/lib/store";

/** The card the site's own link unfurls into, with the live matchday on it. */

// Rendered per request: a card baked at build time would still be showing the
// matchday that was live when the site was last deployed.
export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Footy Reacts — every take, by fixture";

const PAPER = "#f4f1ea";
const INK = "#16130f";
const INK_3 = "#8a8175";
const RED = "#d5202a";

export default async function Image() {
  let rows: Array<{ label: string; takes: number }> = [];
  let matchday: number | null = null;

  try {
    const board = await getBoard();
    matchday = board.matchday;
    rows = board.fixtures.slice(0, 5).map((f) => ({
      label: `${f.homeTeam.abbr}  ${f.score ? `${f.score.home}–${f.score.away}` : "v"}  ${f.awayTeam.abbr}`,
      takes: f.counts.pre + f.counts.post,
    }));
  } catch {
    // A card is better than no card: fall back to the masthead alone.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            background: RED,
            color: PAPER,
            padding: "30px 56px",
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: -1 }}>FOOTY REACTS</div>
          <div style={{ fontSize: 24, opacity: 0.85, letterSpacing: 6 }}>EVERY TAKE, BY FIXTURE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "28px 56px" }}>
          <div style={{ fontSize: 26, color: INK_3, letterSpacing: 5, marginBottom: 18 }}>
            {matchday ? `MATCHDAY ${matchday}` : "EVERY CREATOR, ORGANISED BY FIXTURE"}
          </div>

          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid #d6d0c4`,
                padding: "14px 0",
              }}
            >
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>{row.label}</div>
              <div style={{ fontSize: 28, color: row.takes > 0 ? RED : INK_3, letterSpacing: 2 }}>
                {row.takes > 0 ? `${row.takes} takes` : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

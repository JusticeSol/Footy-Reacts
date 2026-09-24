import { ImageResponse } from "next/og";
import { getFixtureBySlug } from "@/lib/store";
import { dayHeading, kickoffTime } from "@/lib/format";

/**
 * The card a match link unfurls into on X, WhatsApp or Slack.
 *
 * Generated per fixture rather than one static image: a share that already
 * shows the tie, the score and how many takes are waiting does the work of the
 * post it is attached to. Uses system type rather than the site's fonts —
 * loading Anton here would mean a font fetch on every card render for a
 * difference nobody sees at this size.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Footy Reacts fixture";

const PAPER = "#f4f1ea";
const INK = "#16130f";
const INK_3 = "#8a8175";
const RED = "#d5202a";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fixture = await getFixtureBySlug(slug);

  if (!fixture) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: RED,
            color: PAPER,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          FOOTY REACTS
        </div>
      ),
      size,
    );
  }

  const total = fixture.counts.pre + fixture.counts.post;

  // Satori requires an explicit display on any element with more than one
  // child, and interpolation counts — so these are built as single strings.
  const dateline = `${dayHeading(fixture.kickoffUtc)} · ${kickoffTime(fixture.kickoffUtc)}${
    fixture.matchday ? ` · MD${fixture.matchday}` : ""
  }`;
  const scoreline = fixture.score ? `${fixture.score.home}–${fixture.score.away}` : "v";

  // "Nottingham Forest v Crystal Palace" needs a smaller size than "Hull v
  // Leeds", and wrapping a club name across two lines ruins the card.
  const nameLength = fixture.homeTeam.shortName.length + fixture.awayTeam.shortName.length;
  const teamSize = nameLength > 26 ? 56 : nameLength > 20 ? 70 : nameLength > 15 ? 80 : 92;

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
            alignItems: "center",
            gap: 24,
            background: RED,
            color: PAPER,
            padding: "28px 56px",
          }}
        >
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>FOOTY REACTS</div>
          <div style={{ fontSize: 22, opacity: 0.85, letterSpacing: 6 }}>EVERY TAKE, BY FIXTURE</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            padding: "0 56px",
          }}
        >
          <div style={{ fontSize: 26, color: INK_3, letterSpacing: 4, marginBottom: 20 }}>
            {dateline}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "nowrap",
              gap: 28,
              fontSize: teamSize,
              fontWeight: 800,
            }}
          >
            <div style={{ letterSpacing: -2, whiteSpace: "nowrap" }}>
              {fixture.homeTeam.shortName}
            </div>
            <div style={{ color: fixture.score ? RED : INK_3, whiteSpace: "nowrap" }}>
              {scoreline}
            </div>
            <div style={{ letterSpacing: -2, whiteSpace: "nowrap" }}>
              {fixture.awayTeam.shortName}
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 40, fontSize: 30 }}>
            <div
              style={{
                display: "flex",
                background: INK,
                color: PAPER,
                padding: "12px 24px",
                letterSpacing: 2,
              }}
            >
              {`${fixture.counts.pre} PRE-MATCH`}
            </div>
            <div
              style={{
                display: "flex",
                background: RED,
                color: PAPER,
                padding: "12px 24px",
                letterSpacing: 2,
              }}
            >
              {`${fixture.counts.post} POST-MATCH`}
            </div>
            {total > 0 && (
              <div style={{ display: "flex", alignItems: "center", color: INK_3, letterSpacing: 2 }}>
                {`${total} takes, one page`}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

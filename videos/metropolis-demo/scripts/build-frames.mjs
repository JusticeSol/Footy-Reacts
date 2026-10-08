// index.html is rewritten each run, so re-carve the music bed afterwards:
//   node <hyperframes-audio>/scripts/carve.mjs --comp index.html --bed bed
// Generates the footage scenes (frames 02–14) as HyperFrames sub-compositions,
// plus index.html, from one table of cut points, zooms, callouts and captions.
// Frames 01 and 15 (graphics) are hand-written in compositions/frames/.
//
//   node scripts/build-frames.mjs
//
// Coordinates are percentages of the 1880×942 recording. Source times are
// seconds into clips/t{1,2,3}.mp4 (hard links to the git-ignored takes).

import { writeFileSync, readFileSync } from "node:fs";

const meta = JSON.parse(readFileSync(new URL("../audio_meta.json", import.meta.url)));
const voice = Object.fromEntries(meta.voices.map((v) => [v.id, v]));

// ---------------------------------------------------------------- the edit
const T1 = "clips/t1.mp4", T2 = "clips/t2.mp4", T3 = "clips/t3.mp4";

const FRAMES = [
  { id: "f01", file: "01-title", dur: 3, graphic: true },
  {
    id: "f02", file: "02-board", dur: 9, act: "I · The product", vo: 0.15,
    // starts after the board has loaded: before 0:06.25 the tab still shows Chrome's incognito page
    segs: [{ src: T1, from: 6.6, dur: 9, rate: 1.6 }],
    cap: ["Every take on every match — by fixture", "live: 27 creators · 70 fixtures · 214 takes"],
  },
  {
    id: "f03", file: "03-match", dur: 10, act: "I · The product",
    segs: [{ src: T1, from: 38, dur: 10, rate: 1.8 }],
    cap: ["One page per match", "embedded, never re-hosted · creators keep their views"],
  },
  {
    id: "f04", file: "04-support", dur: 6.5, act: "II · A fan tips",
    segs: [{ src: T1, from: 93, dur: 3.5 }, { src: T1, from: 111.5, dur: 3 }],
    zoom: { s: 2.2, ox: 43, oy: 77, at: 0.1, dur: 1.2 },
    cap: ["Tip a take in dollars", "$1 · $3 · $5"],
  },
  {
    id: "f05", file: "05-signin", dur: 7.4, act: "II · A fan tips",
    // privacy: T1 2:00–2:42 (email typing, autofill, code screen) is never used
    segs: [{ src: T1, from: 116, dur: 3 }, { src: T1, from: 164, dur: 4.4, rate: 1.25 }],
    cap: ["Sign in with email", "no wallet setup · no seed phrase · Privy embedded wallet"],
  },
  {
    id: "f06", file: "06-send", dur: 13, act: "II · A fan tips",
    segs: [{ src: T1, from: 179, dur: 13 }],
    zoom: { s: 2.2, ox: 36.4, oy: 77.4, at: 0, dur: 1.2 },
    cap: ["Sent — settled on Monad", "click → confirmed onchain in ~7s"],
  },
  {
    id: "f07", file: "07-receipt", dur: 18, act: "II · A fan tips", vo: 1.5,
    segs: [{ src: T1, from: 205, dur: 4.5, rate: 2 }, { src: T1, from: 231, dur: 13.5 }],
    zoom: { s: 1.6, ox: 39.9, oy: 57.9, at: 4.6, dur: 1.2 },
    callouts: [
      { box: [28.35, 31.1, 40.43, 34.0], at: 5.9, tag: "Method: TipWithAuthorization", num: 1 },
      { box: [28.35, 51.1, 51.3, 53.8], at: 7.3, tag: "From: our relayer — paid the gas", num: 2 },
      { box: [28.35, 56.5, 51.3, 59.2], at: 8.3, tag: "To: TipJar", num: 3 },
      { box: [28.35, 62.0, 52.55, 64.76], at: 12.0, tag: "3 USDC: fan → TipJar", num: 4 },
    ],
    cap: ["The fan paid no gas", "EIP-3009 authorisation · relayed · Monad testnet"],
  },
  {
    id: "f08", file: "08-most", dur: 7, act: "II · A fan tips",
    segs: [{ src: T1, from: 304, dur: 7 }],
    callouts: [{ box: [23.5, 45.9, 75.9, 55.5], at: 1.0, tag: "#1 · $3 from 1 fan" }],
    cap: ["Most supported", "beside the list, never re-sorting it · one per creator"],
  },
  {
    id: "f09", file: "09-wait", dur: 12.5, act: "III · A creator collects", vo: 0.4,
    segs: [{ src: T2, from: 6, dur: 7.5, rate: 3 }, { src: T2, from: 28.5, dur: 5 }],
    callouts: [{ box: [24.3, 41.4, 54.9, 51.1], at: 9.2 }],
    cap: ["Tips wait for creators", "held in TipJar, keyed to the YouTube channel id"],
  },
  {
    id: "f10", file: "10-proof", dur: 11, act: "III · A creator collects",
    // privacy: T2 0:55–3:28 (Google sign-in) is never used
    segs: [{ src: T2, from: 40, dur: 4 }, { src: T2, from: 224, dur: 7, rate: 2 }],
    callouts: [{ box: [13.9, 53.6, 60.4, 70.3], at: 5.0, tag: "The one-off code · only the owner can edit this", place: "below" }],
    cap: ["Proof of ownership", "code in the channel description"],
  },
  {
    id: "f11", file: "11-collect", dur: 7, act: "III · A creator collects",
    segs: [{ src: T2, from: 245.5, dur: 7 }],
    callouts: [{ box: [24.3, 53.6, 52.6, 65.7], at: 4.7 }],
    cap: ["$3 is yours", "verifier signs · relayer submits · no gas for the creator"],
  },
  {
    id: "f12", file: "12-claimtx", dur: 10, act: "III · A creator collects", vo: 0.5,
    // the explorer only settles on the input data at ~4:45, so the callouts sit on a held still of it
    segs: [{ src: T2, from: 271, dur: 3 }, { still: "assets/stills/f12-hold.png", dur: 7 }],
    zoom: { s: 1.5, ox: 40, oy: 15, at: 3.1, dur: 1.2 },
    pan: { ox: 36, oy: 66, at: 6.4, dur: 1.2 },
    callouts: [
      { box: [28.35, 14.2, 52.55, 17.0], at: 4.4, tag: "3 USDC: TipJar → creator", num: 1, out: 6.4 },
      { box: [28.7, 63.9, 44.6, 66.5], at: 7.8, tag: "claim(…) — one transaction", num: 2 },
    ],
    cap: ["Held tips, swept in one transaction", "claim · Monad testnet"],
  },
  {
    id: "f13", file: "13-account", dur: 12, act: "III · A creator collects",
    segs: [{ src: T2, from: 314, dur: 12 }],
    callouts: [{ box: [24.2, 32.2, 27.6, 38.9], at: 1.5 }],
    cap: ["Balance, read from the chain", "demo: one test account played fan and creator"],
  },
  {
    id: "f14", file: "14-contract", dur: 11, act: "IV · The contract",
    segs: [{ src: T3, from: 34.5, dur: 5 }, { src: T3, from: 45, dur: 6 }],
    callouts: [
      { box: [26.4, 56.9, 35.6, 99.4], at: 1.2, tag: "Claim · TipWithAuthorization — real calls", num: 1, tagAt: [37, 49], out: 5.0 },
      { box: [14.9, 30.1, 85.0, 35.3], at: 5.6, tag: "Source verified · full match", num: 2, place: "below" },
    ],
    cap: ["TipJar — verified on Monad testnet", "0xAd17…E386"],
  },
  { id: "f15", file: "15-end", dur: 6, graphic: true },
];

// ---------------------------------------------------------------- helpers
const r = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const PAD_X = 0.6, PAD_Y = 0.8;

// zoom state at time t: scale and origin (percent), for placing unscaled tags
// (callouts are always timed after the push-in has settled)
function zoomAt(f, t) {
  const z = f.zoom;
  if (!z) return { s: 1, ox: 50, oy: 50 };
  if (f.pan && t >= f.pan.at + f.pan.dur) return { s: z.s, ox: f.pan.ox, oy: f.pan.oy };
  return z;
}
const map = (p, o, s) => o + s * (p - o);

function fontFaces() {
  return `@font-face{font-family:Anton;font-weight:400;src:url("assets/fonts/Anton-400.woff2") format("woff2")}
@font-face{font-family:"Space Mono";font-weight:400;src:url("assets/fonts/SpaceMono-400.woff2") format("woff2")}
@font-face{font-family:"Space Mono";font-weight:700;src:url("assets/fonts/SpaceMono-700.woff2") format("woff2")}`;
}

function scene(f) {
  const id = f.id;
  const S = `#${id}`;
  const z = f.zoom ?? { s: 1, ox: 50, oy: 50 };
  const media = [];
  let t = 0;
  f.segs.forEach((g, i) => {
    if (g.still) {
      media.push(`<img id="${id}-m${i + 1}" class="clip media" src="${g.still}" alt="" data-start="${r(t)}" data-duration="${r(g.dur)}" data-track-index="0">`);
    } else {
      const rate = g.rate ?? 1;
      media.push(`<video id="${id}-m${i + 1}" class="clip media" src="${g.src}" muted playsinline data-start="${r(t)}" data-duration="${r(g.dur)}" data-media-start="${r(g.from)}"${rate !== 1 ? ` data-playback-rate="${rate}"` : ""} data-track-index="0"${t > 0 ? ' data-hf-media-start-basis="local"' : ""}></video>`);
    }
    t += g.dur;
  });
  if (Math.abs(t - f.dur) > 0.001) throw new Error(`${id}: segments sum ${t} ≠ dur ${f.dur}`);

  const boxes = [], tags = [], js = [];
  (f.callouts ?? []).forEach((c, i) => {
    const [x1, y1, x2, y2] = [c.box[0] - PAD_X, c.box[1] - PAD_Y, c.box[2] + PAD_X, c.box[3] + PAD_Y];
    const zs = zoomAt(f, c.at);
    const bw = r(5 / zs.s);
    boxes.push(`<div class="co" id="${id}-co${i + 1}" style="left:${r(x1)}%;top:${r(y1)}%;width:${r(x2 - x1)}%;height:${r(y2 - y1)}%;--bw:${bw}px"><i class="et"></i><i class="er"></i><i class="eb"></i><i class="el"></i></div>`);
    const B = `${S} #${id}-co${i + 1}`;
    js.push(`tl.fromTo("${B} .et",{scaleX:0},{scaleX:1,duration:0.12,ease:"none"},${c.at})`,
      `tl.fromTo("${B} .er",{scaleY:0},{scaleY:1,duration:0.12,ease:"none"},${r(c.at + 0.12)})`,
      `tl.fromTo("${B} .eb",{scaleX:0},{scaleX:1,duration:0.12,ease:"none"},${r(c.at + 0.24)})`,
      `tl.fromTo("${B} .el",{scaleY:0},{scaleY:1,duration:0.12,ease:"none"},${r(c.at + 0.36)})`);
    if (c.out != null) js.push(`tl.to("${B}",{opacity:0,duration:0.25,ease:"power1.out"},${c.out})`);
    if (c.tag) {
      let tx, ty;
      if (c.tagAt) [tx, ty] = c.tagAt;
      else {
        const L = map(x1, zs.ox, zs.s), R = map(x2, zs.ox, zs.s), T = map(y1, zs.oy, zs.s), Bt = map(y2, zs.oy, zs.s);
        if (c.place === "below") { tx = L; ty = Bt + 1.2; }
        else { tx = R + 1.0; ty = (T + Bt) / 2 - 2.7; }
      }
      const num = c.num ? `<span class="num">${c.num}</span>` : "";
      tags.push(`<div class="tag" id="${id}-tag${i + 1}" style="left:${r(tx)}%;top:${r(ty)}%">${num}${esc(c.tag)}</div>`);
      const T = `${S} #${id}-tag${i + 1}`;
      js.push(`tl.fromTo("${T}",{opacity:0,x:-14},{opacity:1,x:0,duration:0.3,ease:"power3.out"},${r(c.at + 0.4)})`);
      if (c.out != null) js.push(`tl.to("${T}",{opacity:0,duration:0.25,ease:"power1.out"},${c.out})`);
    }
  });

  const zjs = [];
  if (f.zoom) {
    zjs.push(`tl.fromTo("${S} .zoom",{scale:1},{scale:${z.s},duration:${z.dur},ease:"power2.inOut"},${z.at})`);
    if (f.pan) zjs.push(`tl.fromTo("${S} .zoom",{transformOrigin:"${z.ox}% ${z.oy}%"},{transformOrigin:"${f.pan.ox}% ${f.pan.oy}%",duration:${f.pan.dur},ease:"power2.inOut",immediateRender:false},${f.pan.at})`);
  }
  const num = FRAMES.indexOf(f) + 1;

  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><!-- generated by scripts/build-frames.mjs — edit the table there --></head>
<body>
<template>
<style>
${fontFaces()}
${S}{position:absolute;inset:0;background:#F4F1EA;overflow:hidden}
${S} .screen{position:absolute;left:60px;top:20px;width:1800px;height:902px;overflow:hidden;background:#fff;outline:2px solid #16130F}
${S} .zoom{position:absolute;inset:0;transform-origin:${z.ox}% ${z.oy}%;will-change:transform}
${S} .media{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;display:block}
${S} .co{position:absolute}
${S} .co i{position:absolute;display:block;background:#D5202A}
${S} .co .et{left:0;top:0;width:100%;height:var(--bw);transform-origin:0 50%}
${S} .co .er{right:0;top:0;width:var(--bw);height:100%;transform-origin:50% 0}
${S} .co .eb{left:0;bottom:0;width:100%;height:var(--bw);transform-origin:100% 50%}
${S} .co .el{left:0;bottom:0;width:var(--bw);height:100%;transform-origin:50% 100%}
${S} .tag{position:absolute;white-space:nowrap;background:#16130F;color:#F4F1EA;font:700 24px/1 "Space Mono",monospace;letter-spacing:2px;text-transform:uppercase;padding:12px 16px 12px 22px;border-left:8px solid #D5202A}
${S} .num{display:inline-block;vertical-align:top;line-height:36px;margin:-6px 12px -6px 0;background:#D5202A;color:#16130F;padding:0 8px}
${S} .rail{position:absolute;left:60px;right:60px;top:922px;height:158px;display:flex;align-items:center;justify-content:space-between;gap:40px}
${S} .cap{display:flex;flex-direction:column;gap:10px}
${S} .cap-h{font:400 58px/1 Anton,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#16130F;white-space:nowrap}
${S} .cap-p{font:400 28px/1 "Space Mono",monospace;color:#6B6B6B;white-space:nowrap}
${S} .act{text-align:right;font:700 18px/1.5 "Space Mono",monospace;letter-spacing:4px;text-transform:uppercase;color:#D5202A;white-space:nowrap}
${S} .act-n{display:block;color:#6B6B6B}
</style>
<div id="${id}" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${f.dur}">
  <div class="screen">
    <div class="zoom" data-layout-allow-overflow>
      ${media.join("\n      ")}
      ${boxes.join("\n      ")}
    </div>
    ${tags.join("\n    ")}
  </div>
  <div class="rail">
    <div class="cap"><div class="cap-h">${esc(f.cap[0])}</div><div class="cap-p">${esc(f.cap[1])}</div></div>
    <div class="act">${esc(f.act)}<span class="act-n">${String(num).padStart(2, "0")} / 15</span></div>
  </div>
</div>
<script>
(() => {
  const tl = gsap.timeline({ paused: true });
  tl.fromTo("${S} .cap-h",{opacity:0,y:22},{opacity:1,y:0,duration:0.45,ease:"power3.out"},0.05);
  tl.fromTo("${S} .cap-p",{opacity:0,y:14},{opacity:1,y:0,duration:0.4,ease:"power3.out"},0.2);
  ${[...zjs, ...js].join(";\n  ")}${zjs.length + js.length ? ";" : ""}
  window.__timelines["${id}"] = tl;
})();
</script>
</template>
</body>
</html>
`;
}

// ---------------------------------------------------------------- write
let at = 0;
const hosts = [], audio = [];
for (const f of FRAMES) {
  if (!f.graphic) writeFileSync(new URL(`../compositions/frames/${f.file}.html`, import.meta.url), scene(f));
  hosts.push(`<div id="${f.id}-host" data-composition-id="${f.id}" data-composition-src="compositions/frames/${f.file}.html" data-start="${r(at)}" data-duration="${f.dur}" data-track-index="1" data-width="1920" data-height="1080"></div>`);
  const v = voice[f.id];
  if (v) {
    const vs = r(at + (f.vo ?? 0.3));
    if (v.duration_s + (f.vo ?? 0.3) > f.dur) throw new Error(`${f.id}: voice overruns the frame`);
    audio.push(`<audio id="vo-${f.id}" src="${v.path}" data-start="${vs}" data-duration="${r(v.duration_s)}" data-track-index="20" data-volume="1" data-audio-group="voiceover"></audio>`);
  }
  f.start = at;
  at += f.dur;
}
const total = r(at);
const first = FRAMES[1].start, lastEnd = FRAMES[14].start;

const index = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<!-- generated by scripts/build-frames.mjs — edit the table there -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F4F1EA}
#root{position:relative;width:100%;height:100%;background:#F4F1EA;overflow:hidden}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">
  ${hosts.join("\n  ")}
  <div id="wedge-host" data-composition-id="wedge" data-composition-src="compositions/wedge.html" data-start="${r(first)}" data-duration="${r(lastEnd - first)}" data-track-index="5" data-width="1920" data-height="1080"></div>
  ${audio.join("\n  ")}
  <audio id="bed" src="assets/bgm/bed.wav" data-start="0" data-duration="${total}" data-track-index="21" data-volume="0.07" data-audio-group="music"></audio>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
writeFileSync(new URL("../index.html", import.meta.url), index);
console.log(`total ${total}s`);
for (const f of FRAMES) console.log(f.id, r(f.start), "→", r(f.start + f.dur));

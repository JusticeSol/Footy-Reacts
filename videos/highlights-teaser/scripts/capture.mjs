// Re-shoots the two phone screens the teaser scrolls through, from the live
// site in iPhone emulation (390x844 CSS px at 3x). The screenshots are
// git-ignored: they contain creators' and the league's thumbnail artwork.
//
//   node scripts/capture.mjs [baseUrl]
//
// Needs puppeteer-core (it ships with the hyperframes CLI) and a local Chrome.
// Element positions used by compositions/teaser.html are printed, so check
// them against the coordinates there if the site's layout has changed.

import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "https://footy-reacts.vercel.app";
const OUT = new URL("../assets/shots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1").replace(/%20/g, " ");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

const box = (sel) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.right), Math.round(r.bottom + scrollY)];
  }, sel);

async function shoot(name, path, height, marks) {
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2500));
  const found = {};
  for (const [k, sel] of Object.entries(marks)) found[k] = await box(sel);
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: OUT + name + ".png", clip: { x: 0, y: 0, width: 390, height: Math.min(height, docHeight) }, captureBeyondViewport: true });
  console.log(name, "page height", docHeight, JSON.stringify(found));
}

await shoot("board", "/?md=6", 2600, {
  weekendPlayer: 'button[aria-label^="Play"]',
  munRow: 'a[href*="man-united-vs-tottenham"]',
});
await shoot("match", "/match/man-united-vs-tottenham-2026-10-10", 3200, {
  player: 'button[aria-label^="Play"]',
  chips: "main ul",
  firstTake: "article",
});
await browser.close();

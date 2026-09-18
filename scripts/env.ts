import { readFileSync } from "node:fs";
import path from "node:path";

/** Minimal .env.local loader so the CLI scripts need no extra dependency. */
export function loadEnv(file = ".env.local"): void {
  let raw: string;
  try {
    raw = readFileSync(path.join(process.cwd(), file), "utf8");
  } catch {
    console.warn(`[env] no ${file} found — relying on the ambient environment`);
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

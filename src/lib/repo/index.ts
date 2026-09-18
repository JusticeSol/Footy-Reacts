import type { Repo } from "./types";
import { jsonRepo } from "./json";
import { supabaseRepo } from "./supabase";

export type { Repo } from "./types";
export { TAG_MIN_CONFIDENCE } from "./shared";

/**
 * Picks the backing store from the environment: Supabase when both credentials
 * are present, the JSON file otherwise. No flag to set — deploying with the
 * env vars configured is what switches it.
 */
export function getRepo(): Repo {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseRepo;
  }
  return jsonRepo;
}

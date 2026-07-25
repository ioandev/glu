import {
  ENVIRONMENT_KEYS,
  MAX_COMMENT_MINUTES,
  SOUND_ENVIRONMENT_KEYS,
  type EnvironmentKey,
  type EnvironmentState,
} from "@/store/types";

/**
 * ADR 27's preview composer — **a second copy of the server's format, and
 * deliberately so.**
 *
 * ADR 22 forbids sharing code between `web/` and `backend/`, and ADR 14 makes
 * the server the only writer: the browser sends enumerated keys and never text.
 * So this file cannot be the contract; it is a *preview of* the contract, which
 * is the one thing Settings needs and the one thing the wire will not give it
 * without a round trip. Drift is caught by pinning the same expected strings as
 * literals in both packages' tests (the ADR 24 precedent for
 * duplicated-on-purpose constants) — change the wording here and
 * `backend/timeComments.test.ts` fails, and vice versa.
 */

/** Which toggles are on, in the app's canonical key order. */
export function activeEnvironmentKeys(environment: EnvironmentState): EnvironmentKey[] {
  return ENVIRONMENT_KEYS.filter((key) => environment[key]);
}

/** The four sound environments share one `with …` clause; see the server copy. */
const SOUND_FRAGMENTS: Record<(typeof SOUND_ENVIRONMENT_KEYS)[number], string> = {
  music: "music",
  podcast: "a podcast",
  tv: "the TV on",
  noisy: "background noise",
};

/** `a`, `a and b`, `a, b and c`. */
function listPhrase(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function environmentSuffix(keys: EnvironmentKey[]): string {
  const on = new Set(keys);
  const clauses: string[] = [];

  const sounds = SOUND_ENVIRONMENT_KEYS.filter((key) => on.has(key)).map(
    (key) => SOUND_FRAGMENTS[key],
  );
  if (sounds.length > 0) {
    clauses.push(`with ${listPhrase(sounds)}`);
  } else if (on.has("silence")) {
    clauses.push("in silence");
  }
  // Orthogonal equipment, so it is its own clause (ADR 02's rule, in grammar).
  if (on.has("headphones")) clauses.push("on headphones");

  return clauses.length === 0 ? "" : ` — ${clauses.join(", ")}`;
}

/**
 * What the preview borrows when nothing is toggled (ADR 27 amendment). Two
 * keys, chosen to show both shapes the grammar has: a sound clause and the
 * orthogonal equipment clause. A preview that repeats the plain sentence
 * demonstrates nothing — the switch looks inert precisely when the user is
 * still deciding what it does.
 */
export const SAMPLE_ENVIRONMENT: EnvironmentKey[] = ["music", "headphones"];

/** Exactly what the server will write, for a run of `minutes` in `keys`. */
export function previewTimeComment(minutes: number, keys: EnvironmentKey[]): string {
  const unit = minutes === 1 ? "minute" : "minutes";
  return `[${minutes}m] You spent ${minutes} ${unit} on this${environmentSuffix(keys)}`;
}

/**
 * The number the preview shows: the user's own preset, rounded and clamped the
 * way a real run would be (ADR 14's `commentMinutes`). A preview that always
 * said "25 minutes" would be a mock-up; this one is their next comment.
 */
export function previewMinutes(durationMs: number): number {
  return Math.min(MAX_COMMENT_MINUTES, Math.max(1, Math.round(durationMs / 60_000)));
}

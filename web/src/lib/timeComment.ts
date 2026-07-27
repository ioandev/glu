import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
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

/**
 * The vocabulary, in six languages (ADR 44) — the mirror of
 * `backend/commentLocales.ts`. Both copies are pinned by literals in both
 * packages' tests; change a word here and `backend/timeComments.test.ts` fails.
 */
interface Vocabulary {
  unit: (minutes: number) => string;
  sentence: (minutes: number, unit: string) => string;
  sounds: Record<(typeof SOUND_ENVIRONMENT_KEYS)[number], string>;
  withSounds: (list: string) => string;
  silence: string;
  headphones: string;
  listSeparator: string;
  listFinal: string;
  clauseSeparator: string;
  suffixSeparator: string;
}

const VOCABULARY: Record<Locale, Vocabulary> = {
  en: {
    unit: (m) => (m === 1 ? "minute" : "minutes"),
    sentence: (m, unit) => `You spent ${m} ${unit} on this`,
    sounds: { music: "music", podcast: "a podcast", tv: "the TV on", noisy: "background noise" },
    withSounds: (list) => `with ${list}`,
    silence: "in silence",
    headphones: "on headphones",
    listSeparator: ", ",
    listFinal: " and ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
  es: {
    unit: (m) => (m === 1 ? "minuto" : "minutos"),
    sentence: (m, unit) => `Dedicaste ${m} ${unit} a esto`,
    sounds: {
      music: "música",
      podcast: "un pódcast",
      tv: "la tele encendida",
      noisy: "ruido de fondo",
    },
    withSounds: (list) => `con ${list}`,
    silence: "en silencio",
    headphones: "con auriculares",
    listSeparator: ", ",
    listFinal: " y ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
  "zh-Hans": {
    unit: () => "分钟",
    sentence: (m, unit) => `你在这件事上花了 ${m} ${unit}`,
    sounds: { music: "音乐", podcast: "播客", tv: "开着电视", noisy: "背景噪音" },
    withSounds: (list) => `伴随${list}`,
    silence: "在安静中",
    headphones: "戴着耳机",
    listSeparator: "、",
    listFinal: "和",
    clauseSeparator: "，",
    suffixSeparator: " — ",
  },
  fr: {
    unit: (m) => (m <= 1 ? "minute" : "minutes"),
    sentence: (m, unit) => `Vous avez passé ${m} ${unit} là-dessus`,
    sounds: {
      music: "de la musique",
      podcast: "un podcast",
      tv: "la télé allumée",
      noisy: "du bruit de fond",
    },
    withSounds: (list) => `avec ${list}`,
    silence: "en silence",
    headphones: "au casque",
    listSeparator: ", ",
    listFinal: " et ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
  pt: {
    unit: (m) => (m === 1 ? "minuto" : "minutos"),
    sentence: (m, unit) => `Dedicaste ${m} ${unit} a isto`,
    sounds: { music: "música", podcast: "um podcast", tv: "a TV ligada", noisy: "ruído de fundo" },
    withSounds: (list) => `com ${list}`,
    silence: "em silêncio",
    headphones: "com auscultadores",
    listSeparator: ", ",
    listFinal: " e ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
  de: {
    unit: (m) => (m === 1 ? "Minute" : "Minuten"),
    sentence: (m, unit) => `Du hast ${m} ${unit} daran gearbeitet`,
    sounds: {
      music: "Musik",
      podcast: "einem Podcast",
      tv: "laufendem Fernseher",
      noisy: "Hintergrundgeräuschen",
    },
    withSounds: (list) => `mit ${list}`,
    silence: "in Stille",
    headphones: "mit Kopfhörern",
    listSeparator: ", ",
    listFinal: " und ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
};

function listPhrase(parts: string[], separator: string, final: string): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(separator)}${final}${parts[parts.length - 1]}`;
}

export function environmentSuffix(
  keys: EnvironmentKey[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const on = new Set(keys);
  const words = VOCABULARY[locale];
  const clauses: string[] = [];

  const sounds = SOUND_ENVIRONMENT_KEYS.filter((key) => on.has(key)).map(
    (key) => words.sounds[key],
  );
  if (sounds.length > 0) {
    clauses.push(words.withSounds(listPhrase(sounds, words.listSeparator, words.listFinal)));
  } else if (on.has("silence")) {
    clauses.push(words.silence);
  }
  // Orthogonal equipment, so it is its own clause (ADR 02's rule, in grammar).
  if (on.has("headphones")) clauses.push(words.headphones);

  return clauses.length === 0
    ? ""
    : `${words.suffixSeparator}${clauses.join(words.clauseSeparator)}`;
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
export function previewTimeComment(
  minutes: number,
  keys: EnvironmentKey[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const words = VOCABULARY[locale];
  // The `[Nm]` prefix is never localised — see `backend/commentLocales.ts`.
  return `[${minutes}m] ${words.sentence(minutes, words.unit(minutes))}${environmentSuffix(keys, locale)}`;
}

/**
 * The number the preview shows: the user's own preset, rounded and clamped the
 * way a real run would be (ADR 14's `commentMinutes`). A preview that always
 * said "25 minutes" would be a mock-up; this one is their next comment.
 */
export function previewMinutes(durationMs: number): number {
  return Math.min(MAX_COMMENT_MINUTES, Math.max(1, Math.round(durationMs / 60_000)));
}

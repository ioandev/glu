/**
 * The words the time comment is built from, in six languages (ADR 44).
 *
 * **This is a deliberate duplicate of `web/src/lib/timeComment.ts`.** ADR 22
 * makes `web/` and `backend/` separate packages with separate lockfiles and
 * separate build contexts, so there is no shared module to put it in — the same
 * situation ADR 24's rate limits are in, and the same discipline applies: the
 * two copies are kept honest by literals pinned in *both* packages' tests, not
 * by an import.
 *
 * ADR 14 still holds: the browser sends **enumerated keys and a locale code**,
 * never prose. This file is the only place words come from, which is what keeps
 * the write verb as narrow as ADR 14 left it.
 *
 * What is **not** localised, on purpose: the `[Nm]` prefix. It is the anchor the
 * totals parser and the DELETE guard read, so it has to mean the same thing in
 * every language and in every comment ever written — including the English ones
 * already sitting in people's tasks.
 */

export const COMMENT_LOCALES = ["en", "es", "zh-Hans", "fr", "pt", "de"] as const;

export type CommentLocale = (typeof COMMENT_LOCALES)[number];

export const DEFAULT_COMMENT_LOCALE: CommentLocale = "en";

interface CommentVocabulary {
  /** `minutes` → the unit word. Not a lookup table: plural rules differ. */
  unit: (minutes: number) => string;
  /** The sentence, with the count and unit already decided. */
  sentence: (minutes: number, unit: string) => string;
  /** The four sound environments, in the order they are spoken. */
  sounds: { music: string; podcast: string; tv: string; noisy: string };
  /** Wraps the sound list: "with music and a podcast". */
  withSounds: (list: string) => string;
  silence: string;
  headphones: string;
  /** Joins two or more sounds. `final` is the "and" position. */
  listSeparator: string;
  listFinal: string;
  /** Between the sentence and the environment clauses. */
  clauseSeparator: string;
  suffixSeparator: string;
}

const VOCABULARY: Record<CommentLocale, CommentVocabulary> = {
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
    // One plural category, so the unit never changes.
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
    // French takes the singular at 0 as well as 1, but a comment is never
    // written for a zero-minute run, so the rule is the same either way.
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
    sounds: {
      music: "música",
      podcast: "um podcast",
      tv: "a TV ligada",
      noisy: "ruído de fundo",
    },
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
    // Dative, because "mit" governs it — which is why the fragments above are
    // already inflected rather than assembled from nominative nouns.
    withSounds: (list) => `mit ${list}`,
    silence: "in Stille",
    headphones: "mit Kopfhörern",
    listSeparator: ", ",
    listFinal: " und ",
    clauseSeparator: ", ",
    suffixSeparator: " — ",
  },
};

/**
 * Same posture as every other resolver on this tier: an unrecognised value is
 * English, never a 400. A locale mismatch must not strand a queued comment in
 * the outbox's permanent-failure path and lose tracked time over a spelling.
 */
export function resolveCommentLocale(raw: unknown): CommentLocale {
  return typeof raw === "string" && (COMMENT_LOCALES as readonly string[]).includes(raw)
    ? (raw as CommentLocale)
    : DEFAULT_COMMENT_LOCALE;
}

export function commentVocabulary(locale: CommentLocale): CommentVocabulary {
  return VOCABULARY[locale];
}

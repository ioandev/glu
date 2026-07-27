import type { Locale } from "@/lib/locale";

/**
 * 0–99 spelled out, in six languages (ADR 44) — for the `Words` clock, the one
 * design whose whole idea is that it says the time rather than showing it.
 *
 * This is the piece of ADR 44 that could not be a catalog entry. A hundred
 * numbers per language is not copy anyone would proofread, and the *rules* are
 * what differ: German compounds and inverts ("dreiundzwanzig" — three-and-
 * twenty), French runs out of tens at sixty and counts in twenties after it,
 * Chinese composes from digits with no irregular forms at all. So each locale
 * brings a builder rather than a table of a hundred strings.
 *
 * GLU's ladder tops out at 99 minutes (ADR 02), so this does too. A seventh
 * language is a seventh builder here — or, if its number words are genuinely
 * awkward, that locale can fall back to digits without touching the others.
 */

/** The shared shape: a table of the irregular part, plus how to join tens+ones. */
interface Speller {
  /** 0–19 verbatim, because every language on the roster is irregular here. */
  ones: readonly string[];
  /** Indexed by the tens digit; slots 0 and 1 are unused (`ones` covers them). */
  tens: readonly string[];
  /** How a non-zero ones digit attaches to a tens word. */
  compose: (tens: string, one: string) => string;
}

const SPELLERS: Record<Locale, Speller> = {
  en: {
    ones: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
      "eighteen", "nineteen"],
    tens: ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
    compose: (t, o) => `${t}-${o}`,
  },

  es: {
    ones: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
      "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
      "dieciocho", "diecinueve"],
    tens: ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta",
      "ochenta", "noventa"],
    // 21–29 contract to one word ("veintitrés"); 31+ take "y". The 20s are the
    // only irregular join, which is why this is a function and not a separator.
    compose: (t, o) =>
      t === "veinte"
        ? `veinti${{ uno: "ún", dos: "dós", tres: "trés", seis: "séis" }[o] ?? o}`
        : `${t} y ${o}`,
  },

  fr: {
    ones: ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
      "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept",
      "dix-huit", "dix-neuf"],
    // 70 and 90 are vigesimal — "soixante-dix" is 60+10, "quatre-vingt-dix" is
    // 80+10 — so their ones digits continue the teens rather than restarting.
    tens: ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante",
      "quatre-vingt", "quatre-vingt"],
    compose: (t, o) => (o === "un" && t !== "quatre-vingt" ? `${t} et un` : `${t}-${o}`),
  },

  pt: {
    ones: ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
      "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete",
      "dezoito", "dezanove"],
    tens: ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
      "oitenta", "noventa"],
    compose: (t, o) => `${t} e ${o}`,
  },

  de: {
    ones: ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
      "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn",
      "achtzehn", "neunzehn"],
    tens: ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig",
      "achtzig", "neunzig"],
    // Inverted and joined: 23 is "dreiundzwanzig", ones first. `eins` loses its
    // -s inside a compound ("einundzwanzig", never "einsundzwanzig").
    compose: (t, o) => `${o === "eins" ? "ein" : o}und${t}`,
  },

  "zh-Hans": {
    ones: ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九",
      "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九"],
    tens: ["", "", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十"],
    // Purely positional — no irregular joins, no separator.
    compose: (t, o) => `${t}${o}`,
  },
};

/**
 * `n` in words, for `locale`. Out-of-range values fall back to the digits
 * rather than throwing: a clock face is the wrong place to discover that the
 * ladder grew.
 */
export function spellMinutes(n: number, locale: Locale): string {
  const speller = SPELLERS[locale];
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return speller.ones[n];

  const tens = speller.tens[Math.floor(n / 10)];
  const ones = n % 10;
  if (ones === 0) return tens;

  // French 70s and 90s continue into the teens: 72 is "soixante-douze", built
  // from the *teen* word rather than from the bare ones digit.
  const vigesimal = locale === "fr" && (Math.floor(n / 10) === 7 || Math.floor(n / 10) === 9);
  const word = vigesimal ? speller.ones[10 + ones] : speller.ones[ones];
  return speller.compose(tens, word);
}

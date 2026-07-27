import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/lib/locale";
import { spellMinutes } from "./wordsNumbers";

/**
 * ADR 44. The `Words` clock is the only design whose whole idea is that it
 * *says* the time, so its numbers are the one place a translation can be wrong
 * in a way that looks fine — "dreiundzwanzig" and "zwanzigdrei" are both German
 * shaped. The joins are what these pin.
 */

describe("spellMinutes", () => {
  it("spells the irregular range verbatim", () => {
    expect(spellMinutes(0, "en")).toBe("zero");
    expect(spellMinutes(13, "en")).toBe("thirteen");
    expect(spellMinutes(19, "de")).toBe("neunzehn");
    expect(spellMinutes(15, "fr")).toBe("quinze");
    expect(spellMinutes(16, "es")).toBe("dieciséis");
    expect(spellMinutes(16, "pt")).toBe("dezasseis");
    expect(spellMinutes(11, "zh-Hans")).toBe("十一");
  });

  it("returns the bare tens word when the ones digit is zero", () => {
    expect(spellMinutes(40, "en")).toBe("forty");
    expect(spellMinutes(40, "de")).toBe("vierzig");
    expect(spellMinutes(40, "es")).toBe("cuarenta");
    expect(spellMinutes(40, "zh-Hans")).toBe("四十");
  });

  it("joins tens and ones the way each language actually does", () => {
    expect(spellMinutes(42, "en")).toBe("forty-two");
    // German inverts and compounds: ones first, one word.
    expect(spellMinutes(42, "de")).toBe("zweiundvierzig");
    // …and `eins` loses its -s inside the compound.
    expect(spellMinutes(21, "de")).toBe("einundzwanzig");
    // Spanish contracts the twenties into one word and uses "y" above them.
    expect(spellMinutes(23, "es")).toBe("veintitrés");
    expect(spellMinutes(43, "es")).toBe("cuarenta y tres");
    expect(spellMinutes(31, "pt")).toBe("trinta e um");
    expect(spellMinutes(42, "zh-Hans")).toBe("四十二");
  });

  it("handles French's vigesimal seventies and nineties", () => {
    // 72 is sixty-twelve, not seventy-two — the ones digit continues the teens.
    expect(spellMinutes(72, "fr")).toBe("soixante-douze");
    expect(spellMinutes(95, "fr")).toBe("quatre-vingt-quinze");
    expect(spellMinutes(42, "fr")).toBe("quarante-deux");
    // "et un" at 21..61, but not at 81.
    expect(spellMinutes(21, "fr")).toBe("vingt et un");
    expect(spellMinutes(81, "fr")).toBe("quatre-vingt-un");
  });

  it("gives every locale a word for every minute on the ladder", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (let n = 0; n <= 99; n++) {
        const spelled = spellMinutes(n, locale);
        expect(spelled, `${locale} ${n}`).toBeTruthy();
        // A digit leaking through means a gap in the table, which would read as
        // "about 42 minutes" on a clock whose entire point is words.
        expect(spelled, `${locale} ${n}`).not.toMatch(/\d/);
      }
    }
  });

  it("falls back to digits rather than throwing when off the ladder", () => {
    // A clock face is the wrong place to discover that ADR 02's ladder grew.
    expect(spellMinutes(100, "en")).toBe("100");
    expect(spellMinutes(-1, "en")).toBe("-1");
    expect(spellMinutes(1.5, "en")).toBe("1.5");
  });
});

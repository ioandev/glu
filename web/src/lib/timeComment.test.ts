import { describe, expect, it } from "vitest";
import { MINUTE } from "@/lib/time";
import { emptyEnvironment } from "@/store/gluStore";
import { MAX_COMMENT_MINUTES, type EnvironmentKey } from "@/store/types";
import {
  activeEnvironmentKeys,
  previewMinutes,
  previewTimeComment,
  SAMPLE_ENVIRONMENT,
} from "./timeComment";

/**
 * **Pinned literals, and the reason they are literals.** This table is the same
 * one, character for character, as `ENVIRONMENT_SENTENCES` in
 * `backend/timeComments.test.ts`. ADR 22 forbids sharing code between the
 * packages and ADR 14 keeps the server the only writer, so the preview is a
 * second copy of the format by necessity — these two tables are the seam that
 * makes drift a failing build rather than a wrong preview (ADR 27).
 */
const ENVIRONMENT_SENTENCES: [EnvironmentKey[], string][] = [
  [[], "[5m] You spent 5 minutes on this"],
  [["music"], "[5m] You spent 5 minutes on this — with music"],
  [["podcast"], "[5m] You spent 5 minutes on this — with a podcast"],
  [["tv"], "[5m] You spent 5 minutes on this — with the TV on"],
  [["noisy"], "[5m] You spent 5 minutes on this — with background noise"],
  [["silence"], "[5m] You spent 5 minutes on this — in silence"],
  [["headphones"], "[5m] You spent 5 minutes on this — on headphones"],
  [["music", "headphones"], "[5m] You spent 5 minutes on this — with music, on headphones"],
  [["silence", "headphones"], "[5m] You spent 5 minutes on this — in silence, on headphones"],
  [
    ["podcast", "tv", "noisy"],
    "[5m] You spent 5 minutes on this — with a podcast, the TV on and background noise",
  ],
  [
    ["music", "podcast", "tv", "noisy", "headphones"],
    "[5m] You spent 5 minutes on this — with music, a podcast, the TV on and background noise, on headphones",
  ],
];

describe("the Settings preview composes what the server will write (ADR 27)", () => {
  it.each(ENVIRONMENT_SENTENCES)("previews %j as the specified sentence", (keys, expected) => {
    expect(previewTimeComment(5, keys)).toBe(expected);
  });

  it("keeps ADR 14's singular/plural rule", () => {
    expect(previewTimeComment(1, [])).toBe("[1m] You spent 1 minute on this");
    expect(previewTimeComment(1, ["music"])).toBe(
      "[1m] You spent 1 minute on this — with music",
    );
  });

  it("shows the user's own preset, rounded and clamped like a real run", () => {
    expect(previewMinutes(20 * MINUTE)).toBe(20);
    expect(previewMinutes(90_000)).toBe(2); // 1.5 min rounds up, as a run would
    expect(previewMinutes(0)).toBe(1);
    expect(previewMinutes(400 * 24 * 60 * MINUTE)).toBe(MAX_COMMENT_MINUTES);
  });
});

describe("which toggles the comment reports (ADR 27)", () => {
  it("reads them in the app's canonical order, not the order they were pressed", () => {
    const environment = { ...emptyEnvironment(), headphones: true, music: true };
    expect(activeEnvironmentKeys(environment)).toEqual(["music", "headphones"]);
  });

  it("is empty when nothing is on, which is what puts the preview on a sample", () => {
    expect(activeEnvironmentKeys(emptyEnvironment())).toEqual([]);
  });

  it("has a sample that demonstrates both shapes the grammar has", () => {
    // A sound clause and the orthogonal one: a sample of only Music would
    // teach half the format (ADR 27 amendment).
    expect(previewTimeComment(5, SAMPLE_ENVIRONMENT)).toBe(
      "[5m] You spent 5 minutes on this — with music, on headphones",
    );
    expect(previewTimeComment(5, SAMPLE_ENVIRONMENT)).not.toBe(previewTimeComment(5, []));
  });
});

/**
 * ADR 44, and the **twin of `backend/timeComments.test.ts`'s locale block.**
 *
 * These literals are pinned deliberately. The two packages compose this
 * sentence from separate copies of the same vocabulary — ADR 22 forbids sharing
 * a module between them — so the only thing standing between what Settings
 * previews and what actually lands in the user's Todoist task is that both
 * suites assert the same strings. Change a word in one and the other fails.
 */
describe("the preview speaks the reader's language (ADR 44)", () => {
  it("composes the plain sentence in every locale", () => {
    expect(previewTimeComment(25, [], "en")).toBe("[25m] You spent 25 minutes on this");
    expect(previewTimeComment(25, [], "es")).toBe("[25m] Dedicaste 25 minutos a esto");
    expect(previewTimeComment(25, [], "fr")).toBe("[25m] Vous avez passé 25 minutes là-dessus");
    expect(previewTimeComment(25, [], "pt")).toBe("[25m] Dedicaste 25 minutos a isto");
    expect(previewTimeComment(25, [], "de")).toBe("[25m] Du hast 25 Minuten daran gearbeitet");
    expect(previewTimeComment(25, [], "zh-Hans")).toBe("[25m] 你在这件事上花了 25 分钟");
  });

  it("gets the singular right where the language has one", () => {
    expect(previewTimeComment(1, [], "en")).toBe("[1m] You spent 1 minute on this");
    expect(previewTimeComment(1, [], "es")).toBe("[1m] Dedicaste 1 minuto a esto");
    expect(previewTimeComment(1, [], "fr")).toBe("[1m] Vous avez passé 1 minute là-dessus");
    expect(previewTimeComment(1, [], "de")).toBe("[1m] Du hast 1 Minute daran gearbeitet");
    expect(previewTimeComment(1, [], "zh-Hans")).toBe("[1m] 你在这件事上花了 1 分钟");
  });

  it("builds the environment clause with each language's own list grammar", () => {
    const keys: EnvironmentKey[] = ["music", "podcast", "headphones"];
    expect(previewTimeComment(5, keys, "en")).toBe(
      "[5m] You spent 5 minutes on this — with music and a podcast, on headphones",
    );
    expect(previewTimeComment(5, keys, "es")).toBe(
      "[5m] Dedicaste 5 minutos a esto — con música y un pódcast, con auriculares",
    );
    expect(previewTimeComment(5, keys, "fr")).toBe(
      "[5m] Vous avez passé 5 minutes là-dessus — avec de la musique et un podcast, au casque",
    );
    expect(previewTimeComment(5, keys, "de")).toBe(
      "[5m] Du hast 5 Minuten daran gearbeitet — mit Musik und einem Podcast, mit Kopfhörern",
    );
    expect(previewTimeComment(5, keys, "zh-Hans")).toBe(
      "[5m] 你在这件事上花了 5 分钟 — 伴随音乐和播客，戴着耳机",
    );
  });

  it("keeps silence exclusive in every language", () => {
    expect(previewTimeComment(5, ["silence"], "de")).toBe(
      "[5m] Du hast 5 Minuten daran gearbeitet — in Stille",
    );
    expect(previewTimeComment(5, ["silence", "tv"], "de")).toBe(
      previewTimeComment(5, ["tv"], "de"),
    );
  });

  it("defaults to English, so a caller with no locale is unchanged", () => {
    expect(previewTimeComment(5, ["music"])).toBe(previewTimeComment(5, ["music"], "en"));
  });
});

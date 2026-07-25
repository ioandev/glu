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

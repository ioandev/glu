import { instrument, poster, studioQuiet } from "./modules";
import { CHROME_IDS, DEFAULT_CHROME_ID, type ChromeId, type ChromeTheme } from "./types";

export const CHROME_REGISTRY: Record<ChromeId, ChromeTheme> = {
  "studio-quiet": studioQuiet,
  instrument,
  poster,
};

export const CHROME_LIST: ChromeTheme[] = CHROME_IDS.map((id) => CHROME_REGISTRY[id]);

/** Unknown ids fall back to the default rather than crashing the app (ADR 15). */
export function resolveChrome(id: string | null | undefined): ChromeTheme {
  return CHROME_REGISTRY[id as ChromeId] ?? CHROME_REGISTRY[DEFAULT_CHROME_ID];
}

export { CHROME_IDS, DEFAULT_CHROME_ID };
export type { ChromeId, ChromeTheme };

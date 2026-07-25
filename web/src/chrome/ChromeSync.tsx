"use client";

import { useEffect } from "react";
import { useGluStore } from "@/store/gluStore";
import { resolveChrome } from "./registry";

/**
 * After hydration the store owns the truth; the bootstrap script only got first
 * paint right. Keeping the two attributes in sync here is all that a chrome or
 * clock change needs — the tokens themselves are static CSS.
 */
export function ChromeSync() {
  const chromeThemeId = useGluStore((s) => s.chromeThemeId);

  useEffect(() => {
    // resolveChrome, not the raw id: a stale or hand-edited value must fall
    // back to the default instead of leaving the page untokenised.
    document.documentElement.setAttribute("data-chrome", resolveChrome(chromeThemeId).id);
  }, [chromeThemeId]);

  return null;
}

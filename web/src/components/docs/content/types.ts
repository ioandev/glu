import type { ReactNode } from "react";
import type { LegalSection } from "@/components/legal/LegalPage";

/**
 * One language's copy of a long-form document (ADR 44).
 *
 * The manual, the Privacy Policy and the Terms all take this shape, and each
 * language provides a whole module of it. That is the point: a translation is
 * either complete or it does not typecheck, and there is no per-sentence
 * fallback that could leave a page half in English.
 *
 * `body` and `intro` are `ReactNode` rather than strings because these
 * documents are **JSX** — paragraphs with `<b>`, `<i>` and `<LegalLink>`
 * running through them. That is why they live here and not in
 * `src/locales/`: as ICU rich-text strings they would be unreadable, and the
 * obvious way to render them would be a client hook, which would cost
 * `/glu/docs` the zero-client-JS property it was built for.
 */
export interface DocumentContent {
  /** Human date, e.g. "26 July 2026", in the document's own language. */
  updated: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  /**
   * Shown above the prose on every language except the authoritative one
   * (ADR 44). The legal documents carry it — a translated Privacy Policy is a
   * convenience, and the English text is the one that governs. `undefined` on
   * `en`, and on the manual in every language: the manual is documentation,
   * not an undertaking.
   */
  notice?: ReactNode;
}

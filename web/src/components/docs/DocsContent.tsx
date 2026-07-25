import { LegalPage } from "@/components/legal/LegalPage";
import { DOCS_TITLE, DOCS_UPDATED, docsIntro, docsSections } from "./DocsSections";

/**
 * The documentation as a page (ADR 29) — the same shell the two legal documents
 * use, so all three restyle together and none of them can drift into its own
 * prose treatment.
 *
 * A server component with no client JavaScript of its own: the copy is static,
 * and the theming arrives from the root layout.
 */
export function DocsContent() {
  return (
    <LegalPage
      title={DOCS_TITLE}
      updated={DOCS_UPDATED}
      intro={docsIntro}
      sections={docsSections}
    />
  );
}

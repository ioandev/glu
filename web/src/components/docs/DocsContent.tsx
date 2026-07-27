import { getLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { loadDocs } from "./content";

/**
 * The documentation as a page (ADR 29) — the same shell the two legal documents
 * use, so all three restyle together and none of them can drift into its own
 * prose treatment.
 *
 * A server component with no client JavaScript of its own: the copy is static,
 * and the theming arrives from the root layout. It is `async` only to await the
 * locale's content module (ADR 44) — the prose is still resolved and rendered
 * on the server, which is the whole point of keeping it out of the message
 * catalog.
 */
export async function DocsContent() {
  const content = await loadDocs(await getLocale());

  return (
    <LegalPage
      title={content.title}
      updated={content.updated}
      intro={content.intro}
      sections={content.sections}
    />
  );
}

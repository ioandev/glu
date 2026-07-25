import type { Metadata } from "next";
import { DocsContent } from "@/components/docs/DocsContent";
import { pageMetadata } from "@/lib/siteMetadata";

/** Copy, canonical and card from the shared table (ADR 30). */
export const metadata: Metadata = pageMetadata("/docs");

/**
 * `/glu/docs` (ADR 29). Like the legal routes, deliberately outside `AppShell`:
 * the shell owns the `100dvh` no-scroll contract, and a manual has to scroll.
 *
 * The drawer does not link here — it opens the same document as a modal, so
 * looking something up mid-session does not tear down the wake lock, the primed
 * audio context or a running timer. This route exists so the document can be
 * linked, shared and read without loading the app first.
 */
export default function DocsPage() {
  return <DocsContent />;
}

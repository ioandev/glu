import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/TermsContent";
import { pageMetadata } from "@/lib/siteMetadata";

/** Copy, canonical and card from the shared table (ADR 30). */
export const metadata: Metadata = pageMetadata("/terms");

/** `/glu/terms` (ADR 26). Same shell-free treatment as the privacy route. */
export default function TermsPage() {
  return <TermsContent />;
}

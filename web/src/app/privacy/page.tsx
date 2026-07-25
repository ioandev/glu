import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { pageMetadata } from "@/lib/siteMetadata";

/**
 * Title, description and social card all come from the one copy table; the
 * `" — GLU"` this used to append by hand is the root layout's template now
 * (ADR 30).
 */
export const metadata: Metadata = pageMetadata("/privacy");

/**
 * `/glu/privacy` (ADR 26). Deliberately outside `AppShell`: the shell owns the
 * `100dvh` no-scroll contract, and a legal document has to scroll.
 */
export default function PrivacyPage() {
  return <PrivacyContent />;
}

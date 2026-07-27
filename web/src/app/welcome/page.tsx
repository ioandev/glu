import type { Metadata } from "next";
import { EnterAppButton } from "@/components/welcome/EnterAppButton";
import { WelcomeContent } from "@/components/welcome/WelcomeContent";
import { pageMetadata } from "@/lib/siteMetadata";

/** Copy, canonical and card from the shared table (ADR 30). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/welcome");
}

/**
 * `/glu/welcome` (ADR 31) — GLU's pitch as a page you can link to.
 *
 * The gate on `/glu` renders this same document, so a first-time visitor and a
 * stranger following a link read the same sentences. This route exists because
 * that gate is a client branch: it cannot be crawled, cannot be shared, and
 * cannot carry an Open Graph card. This can.
 *
 * Like the legal routes and the manual, deliberately outside `AppShell` — the
 * shell owns the `100dvh` no-scroll contract, and a pitch has to scroll.
 *
 * `navigateTo="/"` is load-bearing: entering from here has to *move*, and it
 * has to set the flag on the way, or the gate at `/glu` bounces the reader
 * straight back to this page.
 */
export default function WelcomePage() {
  return <WelcomeContent action={<EnterAppButton navigateTo="/" />} />;
}

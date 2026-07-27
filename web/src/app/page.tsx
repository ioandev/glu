import type { Metadata } from "next";
import { WelcomeGate } from "@/components/welcome/WelcomeGate";
import { pageMetadata } from "@/lib/siteMetadata";

/**
 * Canonical, Open Graph and Twitter for the app itself (ADR 30). Deliberately
 * no `title`: the root layout's `title.default` already *is* this page's
 * title, and one set here would run through the `"%s — GLU"` template.
 */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("/");
}

/**
 * Server component rendering the `'use client'` welcome gate (ADR 31), which
 * renders ADR 02's app shell for everyone who has been here before — which,
 * after the first visit, is everyone.
 *
 * The metadata above stays the app's, not the welcome's: this URL *is* GLU, and
 * the pitch has its own route at `/glu/welcome` with its own card.
 */
export default function Home() {
  return <WelcomeGate />;
}

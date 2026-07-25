import { PAGE_META } from "@/lib/siteMetadata";
import { OG_CONTENT_TYPE, OG_SIZE, renderSocialCard } from "@/og/socialCard";

/** `/glu/docs` — ADR 29's manual, as a card (ADR 30). */
export const alt = PAGE_META["/docs"].imageAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSocialCard("/docs");
}

import { PAGE_META } from "@/lib/siteMetadata";
import { OG_CONTENT_TYPE, OG_SIZE, renderSocialCard } from "@/og/socialCard";

/** `/glu/privacy` — ADR 26's document, as a card (ADR 30). */
export const alt = PAGE_META["/privacy"].imageAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSocialCard("/privacy");
}

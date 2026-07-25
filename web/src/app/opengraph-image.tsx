import { PAGE_META } from "@/lib/siteMetadata";
import { OG_CONTENT_TYPE, OG_SIZE, renderSocialCard } from "@/og/socialCard";

/**
 * `/glu` — the app's social card (ADR 30).
 *
 * `alt`, `size` and `contentType` are declared here rather than re-exported
 * from the renderer: Next reads them as this module's own named exports, and
 * an `export { size } from …` is one indirection away from a convention that
 * only fails at build.
 */
export const alt = PAGE_META["/"].imageAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderSocialCard("/");
}

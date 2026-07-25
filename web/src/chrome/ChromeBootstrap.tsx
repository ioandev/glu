import { buildChromeStylesheet } from "./stylesheet";
import { CHROME_IDS, DEFAULT_CHROME_ID } from "./types";
import { CLOCKS, DEFAULT_CLOCK_ID } from "@/clocks/registry";

const CLOCK_IDS = CLOCKS.map((clock) => clock.id);

/**
 * The chrome twin of ADR 01's `ColorSchemeScript`. `data-chrome` and
 * `data-clock` live in the persisted blob, so they must be on `<html>` **before
 * first paint** or the default direction and palette flash (ADR 15's gotcha).
 *
 * The whole token space is static CSS keyed off those two attributes, so this
 * script only has to read two strings — no colour maths, no re-render, and the
 * scheme still flips in pure CSS through `light-dark()`.
 */
const bootstrap = `(function(){
var CHROMES=${JSON.stringify(CHROME_IDS)};
var CLOCKS=${JSON.stringify(CLOCK_IDS)};
var el=document.documentElement;
var chrome='${DEFAULT_CHROME_ID}', clock='${DEFAULT_CLOCK_ID}';
try{
  var raw=null;
  for(var i=2;i>=1;i--){var v=localStorage.getItem('glu:v'+i);if(v){raw=v;break}}
  var s=raw?(JSON.parse(raw).state||{}):{};
  // Unknown ids fall back rather than landing on a selector with no rule.
  // Both are allowlisted: the blob is hand-editable, so neither id is trusted
  // just because it is a string (2026-07-25 security audit, F-10).
  if(CHROMES.indexOf(s.chromeThemeId)!==-1) chrome=s.chromeThemeId;
  if(CLOCKS.indexOf(s.activeClockId)!==-1) clock=s.activeClockId;
}catch(e){}
el.setAttribute('data-chrome',chrome);
el.setAttribute('data-clock',clock);
})();`;

/**
 * Both tags below carry `suppressHydrationWarning` **because of the nonce**, and
 * for no other reason. A header-delivered CSP makes the browser *hide* the
 * nonce: on insertion it blanks the `nonce` content attribute and keeps the
 * value in the element's `.nonce` property, so a stylesheet can't exfiltrate it
 * through an attribute selector. React hydration reads attributes, so it sees
 * `""` in the DOM against the real nonce in the props and reports an attribute
 * mismatch it explicitly won't patch up. Nothing is broken — the scripts already
 * ran, at parse time, with the nonce the CSP required — but the warning is real
 * console noise in dev, and a permanent one, since the hiding is spec'd
 * behaviour we depend on. Suppressing it is per-element and covers only these
 * two tags, whose content is `dangerouslySetInnerHTML` that React never diffs.
 */
export function ChromeBootstrap({
  clockThemes,
  nonce,
}: {
  clockThemes?: Parameters<typeof buildChromeStylesheet>[0];
  /** Per-request CSP nonce from `proxy.ts` (ADR 16 amendment). */
  nonce?: string;
}) {
  return (
    <>
      <style
        data-glu-chrome-tokens=""
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: buildChromeStylesheet(clockThemes) }}
      />
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bootstrap }} />
    </>
  );
}

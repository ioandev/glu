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
        dangerouslySetInnerHTML={{ __html: buildChromeStylesheet(clockThemes) }}
      />
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: bootstrap }} />
    </>
  );
}

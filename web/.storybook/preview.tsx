import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { MantineProvider } from "@mantine/core";
import { theme } from "../src/theme";
import { chromeCssVariables } from "../src/chrome/cssVariables";
import { resolveChrome, CHROME_LIST } from "../src/chrome/registry";
import { NEUTRAL_CLOCK_THEME } from "../src/theme/palette";
import { CLOCK_THEME_BY_ID } from "../src/clocks/themes";
import { fontClassNames } from "../src/theme/fonts";
import "../src/app/globals.css";

/** ADR 03: the two real targets, not Storybook's defaults. */
export const VIEWPORTS = {
  tablet: {
    name: "Tablet (1180)",
    styles: { width: "1180px", height: "820px" },
    type: "tablet" as const,
  },
  halfTablet: {
    name: "Half-tablet (590)",
    styles: { width: "590px", height: "900px" },
    type: "mobile" as const,
  },
};

/** Mirrors the app's root token application for Storybook's portals. */
function RootTokens({
  vars,
  chromeId,
  clockId,
  scheme,
}: {
  vars: React.CSSProperties;
  chromeId: string;
  clockId: string;
  scheme: "light" | "dark";
}) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-chrome", chromeId);
    root.setAttribute("data-clock", clockId);
    root.style.colorScheme = scheme;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, String(value));
    }
    document.body.classList.add(...fontClassNames.split(" "));
  }, [vars, chromeId, clockId, scheme]);
  return null;
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    viewport: { options: VIEWPORTS },
    a11y: {
      // Dark/light legibility is an ADR 02 acceptance criterion — automate it.
      test: "error",
    },
  },
  globalTypes: {
    theme: {
      description: "Mantine color scheme",
      toolbar: {
        title: "Scheme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    // ADR 15: Storybook's toolbar is the *only* chrome switcher — no selection
    // UI exists in the app until the settings ADR gets a chrome section.
    chrome: {
      description: "Chrome direction",
      toolbar: {
        title: "Chrome",
        icon: "paintbrush",
        items: CHROME_LIST.map((c) => ({ value: c.id, title: c.name })),
        dynamicTitle: true,
      },
    },
    clock: {
      description: "Clock palette",
      toolbar: {
        title: "Palette",
        icon: "photo",
        items: [
          { value: "neutral", title: "Neutral (chrome only)" },
          ...Object.keys(CLOCK_THEME_BY_ID).map((id) => ({ value: id, title: id })),
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    // `npm test` runs the story suite twice — once per scheme — so the a11y
    // contrast gate covers dark and light, not just whichever is default
    // (ADR 03). Storybook inlines STORYBOOK_* env vars at build time.
    theme: process.env.STORYBOOK_SCHEME === "dark" ? "dark" : "light",
    chrome: "studio-quiet",
    clock: "neutral",
  },
  decorators: [
    // Global, not per-story: a story rendered without the provider fails with a
    // cryptic "Mantine context" error (ADR 03).
    (Story, context) => {
      const scheme = (context.globals.theme as "light" | "dark") ?? "light";
      const chrome = resolveChrome(context.globals.chrome as string);
      const clockId = (context.globals.clock as string) ?? "neutral";
      const clockTheme = CLOCK_THEME_BY_ID[clockId] ?? NEUTRAL_CLOCK_THEME;
      const vars = chromeCssVariables(chrome, clockTheme) as React.CSSProperties;

      return (
        <>
          {/* Drawers, modals and popovers render through portals at
              document.body, outside the story canvas — so the chrome tokens
              have to live on the root element, exactly as the app puts them
              there before first paint (ADR 15). */}
          <RootTokens vars={vars} chromeId={chrome.id} clockId={clockId} scheme={scheme} />
        <MantineProvider theme={theme} forceColorScheme={scheme}>
          <div
            className={fontClassNames}
            data-chrome={chrome.id}
            data-clock={clockId}
            style={{
              ...vars,
              colorScheme: scheme,
              background: "var(--glu-page-bg)",
              color: "var(--glu-page-fg)",
              fontFamily: "var(--glu-font-sans), system-ui, sans-serif",
              minHeight: "100%",
              padding: context.parameters.layout === "fullscreen" ? 0 : 16,
            }}
          >
            <Story />
          </div>
        </MantineProvider>
        </>
      );
    },
  ],
};

export default preview;

import { createTheme } from "@mantine/core";

/**
 * One theme object, two consumers: the app layout and the Storybook preview
 * (ADR 03). ADR 02 keeps the default Mantine palette and blue primary — visual
 * identity is ADR 15's business, applied on top through chrome tokens.
 */
export const theme = createTheme({
  primaryColor: "blue",
  // Mantine's default blue-6 filled button is 3.55:1 against white text — below
  // the 4.5:1 gate ADR 03 makes a hard failure. Shade 8 clears it in both
  // schemes without inventing a palette (ADR 15 owns real colour).
  primaryShade: { light: 8, dark: 8 },
  // The families resolve through the chrome layer's variables (ADR 15), so a
  // direction change repoints them with no re-render.
  fontFamily: "var(--glu-font-sans), system-ui, sans-serif",
  fontFamilyMonospace: "var(--glu-font-mono), ui-monospace, monospace",
  headings: {
    fontFamily: "var(--glu-heading-family, var(--glu-font-sans)), system-ui, sans-serif",
  },
});

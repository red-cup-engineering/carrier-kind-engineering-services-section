// filum's theme — the newswire cable's editorial identity, on the web-theming
// system. Palette derived from three seeds by web-theming-computer (OKLCH,
// light + dark); the cable's sheath index and every wire's h-feed/h-entry render
// through it via newscable.

import type { Theme, ThemePalette } from "@red-cup-engineering/organizing-with-the-web/theming";
import { assembleCss } from "@red-cup-engineering/organizing-with-the-web/theming";
import { themePalette } from "@red-cup-engineering/organizing-with-the-web/theming-computer";

const palette: ThemePalette = themePalette(
  { ink: "#1a1a1a", surface: "#faf8f4", accent: "#a02c2c" },
  {
    sans: `"Helvetica Neue", Arial, sans-serif`,
    serif: `Georgia, "Times New Roman", serif`,
    mono: `ui-monospace, Menlo, monospace`,
    measure: "42rem",
    radius: "0",
  },
);

const CHROME_CSS = `
body { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem; font-family: var(--serif); }
.h-feed > .h-entry { padding: 1rem 0; border-bottom: 1px solid var(--rule); }
.h-feed > .h-entry h2 { font-size: 1.3rem; margin: 0; }
.h-feed > .h-entry h2 a { color: var(--ink); }
.claims { font-family: var(--mono); font-size: .92rem; line-height: 1.5; }
.claims li { margin: .2rem 0; }
.dt-published { font-family: var(--mono); font-size: .78rem; color: var(--ink-soft); }
`;

export const filumTheme: Theme = {
  name: "filum",
  css: assembleCss(palette, CHROME_CSS),
  head: () => "",
  header: () => "",
  footer: () => "",
  wrap: (articleHtml: string) => articleHtml,
};

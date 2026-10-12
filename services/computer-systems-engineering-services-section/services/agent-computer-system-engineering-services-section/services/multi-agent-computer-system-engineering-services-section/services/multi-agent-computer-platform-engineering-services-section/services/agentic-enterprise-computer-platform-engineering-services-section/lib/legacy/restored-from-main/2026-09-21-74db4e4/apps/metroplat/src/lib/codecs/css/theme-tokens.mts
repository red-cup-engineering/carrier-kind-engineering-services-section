/**
 * codecs/text/css/theme-tokens — the theme design-token vocabulary.
 *
 * A palette is data, not an opaque CSS string: `ThemeTokens` names a fixed
 * 19-role vocabulary (colour roles ink/surface/accent/…, type/layout roles
 * sans/measure/…) with one canonical CSS custom-property mapping
 * (`tokenVar`). `derivePalette` derives the roles perceptually in OKLCH from
 * three seed colours (reusing `codecs/host/javascript/color`'s conversions
 * rather than new colour math); `deriveDark` synthesizes a dark scheme from
 * the same seeds. `paletteCss` projects a `ThemePalette` into this same
 * codec's own cascade engine (`assignmentSetToStylesheet`/`CssAuthoredRule`) —
 * no separate CSS string emitter lives here.
 *
 * @packageDocumentation
 */
import { mix, oklchToRgb, toHex, toOklch } from "../javascript/color/index.mts";
import { assignmentSetToStylesheet, type CssAuthoredRule, type CssProjectionProfile } from "./codec.mts";

export type ColorTokenRole =
  | "ink" | "inkSoft"
  | "surface" | "surfaceDeep" | "surfaceEdge"
  | "rule" | "tint" | "tintStrong" | "selection"
  | "accent" | "alarm" | "visited";

export type TypeTokenRole = "sans" | "serif" | "mono" | "gutter" | "max" | "measure" | "radius";

export type ThemeTokenRole = ColorTokenRole | TypeTokenRole;

/** The canonical theme design-token vocabulary: every role a theme may declare. */
export type ThemeTokens = { readonly [role in ThemeTokenRole]?: string };

/** A palette: a default (`light`) token set, optional `dark` overrides, and named `variants`. */
export interface ThemePalette {
  readonly light: ThemeTokens;
  readonly dark?: ThemeTokens;
  readonly variants?: Readonly<Record<string, ThemeTokens>>;
}

/** The three-to-four seed colours `derivePalette`/`deriveDark` need. */
export interface PaletteSeeds {
  readonly ink: string;
  readonly surface: string;
  readonly accent: string;
  readonly alarm?: string;
}

const TOKEN_VARS: Readonly<Record<ThemeTokenRole, string>> = Object.freeze({
  ink: "--ink",
  inkSoft: "--ink-soft",
  surface: "--surface",
  surfaceDeep: "--surface-deep",
  surfaceEdge: "--surface-edge",
  rule: "--rule",
  tint: "--tint",
  tintStrong: "--tint-strong",
  selection: "--selection",
  accent: "--accent",
  alarm: "--alarm",
  visited: "--visited",
  sans: "--sans",
  serif: "--serif",
  mono: "--mono",
  gutter: "--gutter",
  max: "--max",
  measure: "--measure",
  radius: "--radius",
});

/** The canonical token roles, in render order. */
export const THEME_TOKEN_ROLES: readonly ThemeTokenRole[] = Object.freeze(
  Object.keys(TOKEN_VARS) as ThemeTokenRole[],
);

/** The canonical CSS custom-property name for a token role (e.g. `inkSoft` -> `--ink-soft`). */
export function tokenVar(role: ThemeTokenRole): string {
  return TOKEN_VARS[role];
}

function toward(a: string, b: string, t: number): string {
  return toHex(oklchToRgb(mix(toOklch(a), toOklch(b), t)));
}

/** Derive the colour-role tokens perceptually in OKLCH from ink/surface/accent(/alarm) seeds. */
export function derivePalette(seeds: PaletteSeeds): ThemeTokens {
  const { ink, surface, accent } = seeds;
  const tokens: Record<string, string> = {
    ink,
    surface,
    accent,
    inkSoft: toward(ink, surface, 0.32),
    surfaceDeep: toward(surface, ink, 0.06),
    surfaceEdge: toward(surface, ink, 0.16),
    rule: toward(surface, ink, 0.14),
    tint: toward(surface, ink, 0.05),
    tintStrong: toward(surface, ink, 0.11),
    selection: toward(accent, surface, 0.55),
    visited: toward(accent, ink, 0.35),
  };
  if (seeds.alarm !== undefined) tokens["alarm"] = seeds.alarm;
  return Object.freeze(tokens);
}

function withLightness(hex: string, l: number, maxChroma?: number): string {
  const oklch = toOklch(hex);
  const c = maxChroma === undefined ? oklch.c : Math.min(oklch.c, maxChroma);
  return toHex(oklchToRgb(Object.freeze({ ...oklch, l, c })));
}

/**
 * Synthesize a dark scheme from a light one's seeds: pull the surface down
 * to a near-black ground, lift the ink to a near-white, and raise a
 * too-dark accent/alarm so it still reads — then re-derive the rest.
 */
export function deriveDark(seeds: PaletteSeeds): ThemeTokens {
  const accentOklch = toOklch(seeds.accent);
  const darkSeeds: { ink: string; surface: string; accent: string; alarm?: string } = {
    surface: withLightness(seeds.surface, 0.16, 0.03),
    ink: withLightness(seeds.ink, 0.92, 0.02),
    accent: accentOklch.l < 0.62 ? withLightness(seeds.accent, 0.72) : seeds.accent,
  };
  if (seeds.alarm !== undefined) {
    const alarmOklch = toOklch(seeds.alarm);
    darkSeeds.alarm = alarmOklch.l < 0.62 ? withLightness(seeds.alarm, 0.72) : seeds.alarm;
  }
  return derivePalette(darkSeeds);
}

/** Build a complete light+dark palette from seeds, plus any type/layout tokens merged into both schemes. */
export function themePalette(seeds: PaletteSeeds, type: ThemeTokens = {}): ThemePalette {
  return Object.freeze({
    light: Object.freeze({ ...derivePalette(seeds), ...type }),
    dark: Object.freeze({ ...deriveDark(seeds), ...type }),
  });
}

/** Merge palette layers left-to-right; a later layer's defined token wins. */
export function composeTokens(...layers: readonly (ThemeTokens | undefined)[]): ThemeTokens {
  const out: Record<string, string> = {};
  for (const layer of layers) {
    if (layer === undefined) continue;
    for (const role of THEME_TOKEN_ROLES) {
      const value = layer[role];
      if (value !== undefined) out[role] = value;
    }
  }
  return Object.freeze(out);
}

function tokenDeclarations(tokens: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of THEME_TOKEN_ROLES) {
    const value = tokens[role];
    if (value !== undefined) out[tokenVar(role)] = value;
  }
  return out;
}

/** Project a `ThemePalette` into `CssAuthoredRule`s: base `:root`, dark `@media`, and `[data-theme]` switches. */
export function paletteToCssRules(palette: ThemePalette): readonly CssAuthoredRule[] {
  const rules: CssAuthoredRule[] = [Object.freeze({ selector: ":root", declarations: Object.freeze(tokenDeclarations(palette.light)) })];
  if (palette.dark !== undefined) {
    const dark = composeTokens(palette.light, palette.dark);
    rules.push(Object.freeze({
      selector: ":root",
      declarations: Object.freeze(tokenDeclarations(dark)),
      condition: Object.freeze({ media: "(prefers-color-scheme: dark)" }),
    }));
    rules.push(Object.freeze({ selector: '[data-theme="light"]', declarations: Object.freeze(tokenDeclarations(palette.light)) }));
    rules.push(Object.freeze({ selector: '[data-theme="dark"]', declarations: Object.freeze(tokenDeclarations(dark)) }));
  }
  if (palette.variants !== undefined) {
    for (const [name, tokens] of Object.entries(palette.variants)) {
      rules.push(Object.freeze({
        selector: `[data-theme="${name}"]`,
        declarations: Object.freeze(tokenDeclarations(composeTokens(palette.light, tokens))),
      }));
    }
  }
  return Object.freeze(rules);
}

/** Render a `ThemePalette` to CSS text through this codec's own cascade engine. */
export function paletteCss(palette: ThemePalette, profile?: CssProjectionProfile): string {
  const rules = paletteToCssRules(palette);
  return profile === undefined
    ? assignmentSetToStylesheet({ loci: [], fibers: [], rules })
    : assignmentSetToStylesheet({ loci: [], fibers: [], rules }, profile);
}

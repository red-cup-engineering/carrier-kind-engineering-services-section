/**
 * codecs/host/javascript/color — OKLCH color-space host encodings.
 *
 * Pure numeric conversions between sRGB hex and OKLCH (Björn Ottosson's
 * OKLab, the space CSS Color 4 standardizes on for perceptually-even
 * lightness/chroma/hue), plus perceptual mixing — the host-runtime leaf a
 * theme-palette derivation needs, alongside this package's other
 * host/javascript numeric encodings (`crypto`, `numbers`).
 *
 * @packageDocumentation
 */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

const HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Parse a `#rgb`/`#rrggbb` hex color into 0-255 sRGB components. */
export function parseColor(hex: string): Rgb {
  const three = HEX3.exec(hex);
  if (three) {
    return Object.freeze({
      r: Number.parseInt(three[1]! + three[1], 16),
      g: Number.parseInt(three[2]! + three[2], 16),
      b: Number.parseInt(three[3]! + three[3], 16),
    });
  }
  const six = HEX6.exec(hex);
  if (six) {
    return Object.freeze({
      r: Number.parseInt(six[1]!, 16),
      g: Number.parseInt(six[2]!, 16),
      b: Number.parseInt(six[3]!, 16),
    });
  }
  throw new TypeError(`color: not a #rgb/#rrggbb hex color: ${hex}`);
}

/** Serialize 0-255 sRGB components as a `#rrggbb` hex color. */
export function toHex(rgb: Rgb): string {
  const byte = (x: number): string => Math.round(clamp01(x / 255) * 255).toString(16).padStart(2, "0");
  return `#${byte(rgb.r)}${byte(rgb.g)}${byte(rgb.b)}`;
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(x: number): number {
  const c = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
  return clamp01(c) * 255;
}

/** Convert sRGB to OKLCH (lightness 0-1, chroma roughly 0-0.4, hue in degrees). */
export function rgbToOklch(rgb: Rgb): Oklch {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const c = Math.sqrt(a * a + bLab * bLab);
  const h = (Math.atan2(bLab, a) * 180) / Math.PI;
  return Object.freeze({ l: L, c, h: h < 0 ? h + 360 : h });
}

/** Convert OKLCH back to sRGB (0-255 components, clamped to the gamut). */
export function oklchToRgb(oklch: Oklch): Rgb {
  const hRad = (oklch.h * Math.PI) / 180;
  const a = oklch.c * Math.cos(hRad);
  const bLab = oklch.c * Math.sin(hRad);

  const l_ = oklch.l + 0.3963377774 * a + 0.2158037573 * bLab;
  const m_ = oklch.l - 0.1055613458 * a - 0.0638541728 * bLab;
  const s_ = oklch.l - 0.0894841775 * a - 1.2914855480 * bLab;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return Object.freeze({ r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) });
}

/** Parse a hex color directly to OKLCH. */
export function toOklch(hex: string): Oklch {
  return rgbToOklch(parseColor(hex));
}

/** Perceptually mix two OKLCH colors: `t=0` is `a`, `t=1` is `b`. */
export function mix(a: Oklch, b: Oklch, t: number): Oklch {
  const clamped = clamp01(t);
  return Object.freeze({
    l: a.l + (b.l - a.l) * clamped,
    c: a.c + (b.c - a.c) * clamped,
    h: a.h + (b.h - a.h) * clamped,
  });
}

/** Lighten a hex color toward white by `amount` (0-1), perceptually in OKLCH lightness. */
export function lighten(hex: string, amount: number): string {
  const oklch = toOklch(hex);
  return toHex(oklchToRgb(Object.freeze({ ...oklch, l: clamp01(oklch.l + (1 - oklch.l) * clamp01(amount)) })));
}

/** Darken a hex color toward black by `amount` (0-1), perceptually in OKLCH lightness. */
export function darken(hex: string, amount: number): string {
  const oklch = toOklch(hex);
  return toHex(oklchToRgb(Object.freeze({ ...oklch, l: clamp01(oklch.l * (1 - clamp01(amount))) })));
}

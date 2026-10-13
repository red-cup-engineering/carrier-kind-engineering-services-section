/**
 * codecs/text/xml/svg/radial - the radial codec: charged relational data ⇄ a
 * deterministic concentric-ring SVG.
 *
 * An input dataform holds a FINITE element-set that varies with the settling ordinal, so
 * each concentric ring is one ordinal's element-set and each radial segment one
 * charged cell — filled by its charge value and seated by its orbit. The
 * orbit-coloring distinction is diagonal (Δ, a self-pair `(s,p,s)`) versus
 * off-diagonal (Δᶜ, a cross-pair `(s,p,o)`), read directly off the cell. The
 * encoding is deterministic: segments are key-sorted and there is no randomness,
 * so equal input yields equal bytes.
 *
 * A restriction of ./.. (svg), which itself restricts ../../ (xml); it reuses the
 * SVG root, the charge helpers, and the filesystem projector. Layout IS here — a
 * radial diagram has one canonical polar layout — unlike the layout-agnostic svg
 * codec.
 *
 * @packageDocumentation
 */
import { restrict, type Projector } from "../../../projector/index.mts";
import {
  affirmedCharge,
  background,
  chargeAttributes,
  chargeValueOf,
  group,
  svgProjector,
  svgRoot,
} from "../index.mts";
import { document, element, serialize, type XmlElement, type XmlNode } from "../../core.mts";
import {
  chargeToColor,
  chargeToSvgPattern,
  chargeToVisual,
  chargeVisualColorPalette,
  type ChargeVisualColorPalette,
} from "../../../../rendering/visual-valuation/index.mts";
import {
  layout,
  type Orbit as LayoutOrbit,
  type RadialCenter as LayoutRadialCenter,
  type RadialDataform as LayoutRadialDataform,
  type RadialLayoutRing,
  type RadialLayoutSegment,
  type RadialRing as LayoutRadialRing,
  type RadialSegment as LayoutRadialSegment,
} from "../../../../rendering/layout/index.mts";
import type { ChargeValueName } from "../../../../values/index.mts";
import { termCoincides } from "../../../../logic/predicating/predication.mts";
import type { Valuation } from "../../../../logic/predicating/evidence/fiber.mts";
import type { Meme } from "../../../../logic/predicating/evidence/fiber.mts";
import type { PredicationValuationClosureStage } from "../../../../settling.mts";

/* ── palette ────────────────────────────────────────────────────────────── */

/** The orbit class of a cell: Δ (self-pair) or Δᶜ (cross-pair). */
export type Orbit = LayoutOrbit;

/**
 * A fill color per bilattice charge value, plus the center disc and the segment
 * outline stroke. The default is neutral and editable.
 */
export interface ChargePalette extends ChargeVisualColorPalette {
  readonly center: string;
  readonly stroke: string;
}

/** A neutral default palette: one distinct fill per FOUR-valued charge. */
export const chargePalette: ChargePalette = Object.freeze({
  ...chargeVisualColorPalette,
  center: "#1f2937",
  stroke: "#cbd2da",
});

const colorOf = (palette: ChargePalette, value: ChargeValueName): string => chargeToColor(value, palette);

/* ── dataform ───────────────────────────────────────────────────────────── */

export type RadialCenter = LayoutRadialCenter;
export type RadialDataform = LayoutRadialDataform;
export type RadialRing = LayoutRadialRing;
export type RadialSegment = LayoutRadialSegment;

export interface ProjectRadialOptions {
  readonly palette?: ChargePalette;
  readonly center?: RadialCenter;
  readonly margin?: number;
  readonly holeRatio?: number;
  readonly declaration?: boolean;
}

const fixed = (value: number): string => value.toFixed(2);

/* ── project ────────────────────────────────────────────────────────────── */

type AttrBag = Record<string, string | number | null | undefined>;

function describe(dataform: RadialDataform): string {
  const charges = new Map<string, number>();
  let segments = 0;
  let diagonal = 0;
  for (const ring of dataform.rings) {
    for (const segment of ring.segments) {
      segments += 1;
      if ((segment.orbit ?? "off-diagonal") === "diagonal") diagonal += 1;
      const name = chargeValueOf(segment.charge);
      charges.set(name, (charges.get(name) ?? 0) + 1);
    }
  }
  const byCharge = [...charges]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name} ${count}`)
    .join(", ");
  return `${dataform.rings.length} rings, ${segments} segments (${diagonal} diagonal). By charge: ${byCharge}.`;
}

function renderSegment(placed: RadialLayoutSegment, palette: ChargePalette): XmlNode {
  const segment = placed.segment;
  const visual = chargeToVisual(segment.charge);
  const pattern = chargeToSvgPattern(segment.charge);
  const fill = pattern === undefined ? colorOf(palette, chargeValueOf(segment.charge)) : `url(#${pattern.id})`;
  const attrs: AttrBag = {
    d: placed.shape.path,
    fill,
    "fill-opacity": visual.opacity,
    stroke: palette.stroke,
    "stroke-width": 1,
    ...(placed.shape.full ? { "fill-rule": "evenodd" } : {}),
    "data-e": segment.e,
    "data-orbit": placed.orbit,
    "data-visual-hue": visual.hue,
    "data-visual-lightness": visual.lightness,
    "data-visual-opacity": visual.opacity,
    "data-visual-saturation": visual.saturation,
    "data-visual-pattern": visual.pattern,
    ...chargeAttributes(segment.charge),
  };
  if (segment.a !== undefined) attrs["data-a"] = segment.a;
  if (segment.v !== undefined) attrs["data-v"] = segment.v;
  const path = element("path", attrs);
  const label = segment.title ?? (segment.label ?? segment.e).replace(/\n/g, " ");
  return group({}, [element("title", {}, [label]), path]);
}

function renderRing(ring: RadialLayoutRing, palette: ChargePalette): XmlNode {
  const cells = ring.segments.map((segment) => renderSegment(segment, palette));
  return group({ "data-ordinal": ring.ordinal, ...(ring.label === undefined ? {} : { "data-ring": ring.label }) }, cells);
}

function contestedContradictionPattern(palette: ChargePalette): XmlNode {
  const pattern = chargeToSvgPattern("contested");
  if (pattern === undefined) return group({}, []);
  return element("defs", {}, [
    element("pattern", {
      id: pattern.id,
      patternUnits: "userSpaceOnUse",
      width: pattern.width,
      height: pattern.height,
    }, [
      element("rect", { width: pattern.width, height: pattern.height, fill: colorOf(palette, "contested") }),
      element("path", {
        d: pattern.path,
        stroke: pattern.stroke,
        "stroke-width": pattern.strokeWidth,
        opacity: pattern.strokeOpacity,
      }),
    ]),
  ]);
}

/**
 * Project a charged radial dataform into a deterministic, self-describing SVG.
 *
 * @example
 * ```js
 * import { charge, chargeValue } from "@red-cup-engineering/metroplat";
 * import { projectRadial, radialProjector } from "@red-cup-engineering/metroplat/core/codecs/xml-svg/svg/radial";
 *
 * const svg = projectRadial({
 *   rings: [{
 *     ordinal: 0,
 *     segments: [{
 *       e: "json",
 *       a: "canonicalizes",
 *       v: "bytes",
 *       orbit: "diagonal",
 *       charge: charge(chargeValue("unknown")),
 *     }],
 *   }],
 * });
 *
 * radialProjector.recognize({ path: "codec.svg", content: svg }); // true
 * ```
 */
export function projectRadial(dataform: RadialDataform, options: ProjectRadialOptions = {}): string {
  const palette = options.palette ?? chargePalette;
  const center = options.center ?? "apex";
  const size = dataform.size ?? 480;
  const margin = options.margin ?? 24;
  const holeRatio = options.holeRatio ?? 0.14;
  const radial = layout(dataform, { kind: "radial", center, margin, holeRatio });
  const ringElements = radial.rings.map((ring) => renderRing(ring, palette));

  const centerDisc = element("circle", {
    cx: radial.cx,
    cy: radial.cy,
    r: fixed(radial.holeRadius),
    fill: palette.center,
    stroke: palette.stroke,
    "stroke-width": 1,
  });
  const backgroundColor = dataform.background ?? "#1c1c1e";

  const root: XmlElement = svgRoot(
    {
      width: size,
      height: size,
      title: dataform.title ?? "radial diagram",
      desc: dataform.desc ?? describe(dataform),
    },
    [
      contestedContradictionPattern(palette),
      background(size, size, backgroundColor),
      group({ "data-codec": "radial" }, [centerDisc, ...ringElements]),
    ],
  );

  return document(root, { ...(options.declaration ? { declaration: true } : {}) }).trimEnd();
}

export { serialize };

/* ── adapters ───────────────────────────────────────────────────────────── */

const termLabel = (term: { readonly mark: { readonly value: unknown } }): string => String(term.mark.value);
const predicateLabel = (predicate: { readonly claim: { readonly mark: { readonly value: unknown } } }): string =>
  String(predicate.claim.mark.value);

/** A charged cell (Meme) as a segment: orbit from subject↔object identity. */
export function segmentOfMeme(meme: Meme): RadialSegment {
  const subject = termLabel(meme.cell.subject);
  const object = termLabel(meme.cell.object);
  const predicate = predicateLabel(meme.cell.predicate);
  const orbit: Orbit = termCoincides(meme.cell.subject, meme.cell.object) ? "diagonal" : "off-diagonal";
  return Object.freeze({
    e: `${subject} ${predicate} ${object}`,
    a: predicate,
    v: object,
    label: orbit === "diagonal" ? `${subject} ${predicate}` : `${subject} ${predicate} ${object}`,
    orbit,
    charge: meme.charge,
  });
}

/**
 * A radial diagram of one valuation: one concentric ring PER predicate fiber,
 * each ring's segments the fiber's charged `(subject, object)` cells.
 */
export function radialFromValuation(valuation: Valuation, dataform: Partial<RadialDataform> = {}): RadialDataform {
  const rings = valuation.fibers.map((fiber, index) =>
    Object.freeze({
      ordinal: index,
      label: predicateLabel(fiber.predicate),
      segments: Object.freeze(fiber.assignments.map(segmentOfMeme)),
    }) satisfies RadialRing);
  return Object.freeze({ ...dataform, rings: Object.freeze(rings) });
}

/**
 * A radial diagram of a valuation-closure: one concentric ring PER ordinal stage,
 * each ring's segments that stage's charged cells. The "finite element-set that
 * varies with the settling ordinal" reading. The ring's ordinal is its position
 * in the closure sequence (stage 0 first).
 */
export function radialFromClosureStages(
  stages: readonly PredicationValuationClosureStage[],
  dataform: Partial<RadialDataform> = {},
): RadialDataform {
  const rings = stages.map((stage, index) =>
    Object.freeze({
      ordinal: index,
      segments: Object.freeze(stage.valuation.fibers.flatMap((fiber) => fiber.assignments.map(segmentOfMeme))),
    }) satisfies RadialRing);
  return Object.freeze({ ...dataform, rings: Object.freeze(rings) });
}

/** The neutral fallback charge for a plainly-asserted segment: re-exported from svg. */
export { affirmedCharge };

/* ── projector ──────────────────────────────────────────────────────────── */

/** The radial vocabulary as a filesystem projector restricting the SVG codec. */
export const radialProjector: Projector<XmlNode> = restrict<XmlNode>(svgProjector, {
  type: "svg.radial",
  recognize: (resource) => /data-codec="radial"/.test(resource.content),
});

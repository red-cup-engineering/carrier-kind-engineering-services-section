/**
 * layout holds pure geometry-agnostic placement of charged valuation segments.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules, but it must not import search, runtime, integrations, interfaces, or apps.
 */
import {
  chargeValueName,
  valueOf,
  type Charge,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";

/** The orbit class of a segment cell: self-pair or cross-pair. */
export type Orbit = "diagonal" | "off-diagonal";

/** One charged visual segment in an ordinal band. */
export interface RadialSegment {
  readonly e: string;
  readonly a?: string;
  readonly v?: string;
  readonly label?: string;
  readonly title?: string;
  readonly orbit?: Orbit;
  readonly charge: Charge;
  readonly weight?: number;
}

/** One ordinal band in the visual valuation lattice. */
export interface RadialRing {
  readonly ordinal: number;
  readonly label?: string;
  readonly segments: readonly RadialSegment[];
}

/** The geometry-agnostic charged ordinal segment set. */
export interface RadialDataform {
  readonly rings: readonly RadialRing[];
  readonly title?: string;
  readonly desc?: string;
  readonly size?: number;
  readonly background?: string;
}

/** Where ordinal 0 sits in radial geometry. */
export type RadialCenter = "apex" | "base";

export type LayoutGeometryName = "radial" | "annular" | "document-flow";

export interface RadialGeometry {
  readonly kind: "radial";
  readonly center?: RadialCenter;
  readonly margin?: number;
  readonly holeRatio?: number;
}

export interface DocumentFlowGeometry {
  readonly kind: "document-flow";
  readonly width?: number;
  readonly margin?: number;
  readonly ordinalGap?: number;
  readonly segmentGap?: number;
  readonly ordinalHeaderHeight?: number;
  readonly segmentHeight?: number;
  readonly indent?: number;
}

export type AnnularOrdinalAnchor = "inner" | "outer";

export interface AnnularGeometry {
  readonly kind: "annular";
  readonly innerRadius?: number;
  readonly outerRadius?: number;
  readonly ordinalAnchor?: AnnularOrdinalAnchor;
  readonly angularStart?: number;
  readonly angularSpan?: number;
  readonly radialGap?: number;
  readonly angularGapRatio?: number;
  readonly orbitInsetRatio?: number;
}

export type LayoutGeometry = LayoutGeometryName | RadialGeometry | AnnularGeometry | DocumentFlowGeometry;

export interface ChargeSemantics {
  readonly value: ChargeValueName;
  readonly positive: boolean;
  readonly negative: boolean;
}

export interface PositionedBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface RadialShape {
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly seatedInnerRadius: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly full: boolean;
  readonly path: string;
}

export interface RadialLayoutSegment {
  readonly key: string;
  readonly ordinal: number;
  readonly order: number;
  readonly orbit: Orbit;
  readonly charge: ChargeSemantics;
  readonly segment: RadialSegment;
  readonly shape: RadialShape;
}

export interface RadialLayoutRing {
  readonly ordinal: number;
  readonly order: number;
  readonly label?: string;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly segments: readonly RadialLayoutSegment[];
}

export interface RadialLayoutProjection {
  readonly kind: "radial";
  readonly width: number;
  readonly height: number;
  readonly cx: number;
  readonly cy: number;
  readonly holeRadius: number;
  readonly center: RadialCenter;
  readonly rings: readonly RadialLayoutRing[];
}

export type DocumentFlowPlacementKind = "ordinal" | "segment";
export type DocumentFlowEmphasis = "quiet" | "supporting" | "opposing" | "settled";

export interface DocumentFlowPlacement {
  readonly kind: DocumentFlowPlacementKind;
  readonly key: string;
  readonly ordinal: number;
  readonly depth: number;
  readonly order: number;
  readonly box: PositionedBox;
  readonly label: string;
  readonly orbit?: Orbit;
  readonly charge?: ChargeSemantics;
  readonly emphasis?: DocumentFlowEmphasis;
  readonly segment?: RadialSegment;
}

export interface DocumentFlowLayoutProjection {
  readonly kind: "document-flow";
  readonly width: number;
  readonly height: number;
  readonly placements: readonly DocumentFlowPlacement[];
}

export interface AnnularShape {
  readonly radialStart: number;
  readonly radialEnd: number;
  readonly seatedRadialStart: number;
  readonly thetaStart: number;
  readonly thetaEnd: number;
  readonly full: boolean;
  readonly area: number;
}

export interface AnnularLayoutSegment {
  readonly key: string;
  readonly ordinal: number;
  readonly order: number;
  readonly orbit: Orbit;
  readonly charge: ChargeSemantics;
  readonly segment: RadialSegment;
  readonly shape: AnnularShape;
}

export interface AnnularLayoutBand {
  readonly ordinal: number;
  readonly order: number;
  readonly label?: string;
  readonly radialStart: number;
  readonly radialEnd: number;
  readonly segments: readonly AnnularLayoutSegment[];
}

export interface AnnularLayoutProjection {
  readonly kind: "annular";
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly angularStart: number;
  readonly angularSpan: number;
  readonly ordinalAnchor: AnnularOrdinalAnchor;
  readonly bands: readonly AnnularLayoutBand[];
}

export type LayoutProjection = RadialLayoutProjection | AnnularLayoutProjection | DocumentFlowLayoutProjection;

const TAU = Math.PI * 2;
const START = -Math.PI / 2;

const fixed = (value: number): string => value.toFixed(2);
const pointX = (cx: number, r: number, a: number): number => cx + r * Math.cos(a);
const pointY = (cy: number, r: number, a: number): number => cy + r * Math.sin(a);
const segmentKey = (segment: RadialSegment): string => `${segment.e} ${segment.a ?? ""} ${segment.v ?? ""}`;

/** The bilattice charge semantics preserved by every geometry. */
export function chargeSemantics(charge: Charge): ChargeSemantics {
  const value = chargeValueName(valueOf(charge));
  return Object.freeze({
    value,
    positive: charge.value[0].name === "present",
    negative: charge.value[1].name === "present",
  });
}

function normalizeGeometry(geometry: LayoutGeometry): RadialGeometry | AnnularGeometry | DocumentFlowGeometry {
  if (geometry === "radial") return Object.freeze({ kind: "radial" as const });
  if (geometry === "annular") return Object.freeze({ kind: "annular" as const });
  if (geometry === "document-flow") return Object.freeze({ kind: "document-flow" as const });
  return geometry;
}

function annularSector(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const ox0 = fixed(pointX(cx, ro, a0)), oy0 = fixed(pointY(cy, ro, a0));
  const ox1 = fixed(pointX(cx, ro, a1)), oy1 = fixed(pointY(cy, ro, a1));
  const ix1 = fixed(pointX(cx, ri, a1)), iy1 = fixed(pointY(cy, ri, a1));
  const ix0 = fixed(pointX(cx, ri, a0)), iy0 = fixed(pointY(cy, ri, a0));
  return `M${ox0},${oy0} A${fixed(ro)},${fixed(ro)} 0 ${large} 1 ${ox1},${oy1} L${ix1},${iy1} A${fixed(ri)},${fixed(ri)} 0 ${large} 0 ${ix0},${iy0} Z`;
}

function annulus(cx: number, cy: number, ri: number, ro: number): string {
  const ox = fixed(cx + ro), oxb = fixed(cx - ro);
  const ix = fixed(cx + ri), ixb = fixed(cx - ri);
  const yc = fixed(cy);
  return (
    `M${ox},${yc} A${fixed(ro)},${fixed(ro)} 0 1 1 ${oxb},${yc} A${fixed(ro)},${fixed(ro)} 0 1 1 ${ox},${yc} Z ` +
    `M${ix},${yc} A${fixed(ri)},${fixed(ri)} 0 1 0 ${ixb},${yc} A${fixed(ri)},${fixed(ri)} 0 1 0 ${ix},${yc} Z`
  );
}

function radialLayout(dataform: RadialDataform, geometry: RadialGeometry): RadialLayoutProjection {
  const center = geometry.center ?? "apex";
  const size = dataform.size ?? 480;
  const margin = geometry.margin ?? 24;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - margin;
  const holeRadius = outerRadius * (geometry.holeRatio ?? 0.14);

  const byOrdinal = [...dataform.rings].sort((left, right) => left.ordinal - right.ordinal);
  const ordered = center === "apex" ? [...byOrdinal].reverse() : byOrdinal;
  const count = ordered.length || 1;
  const thickness = (outerRadius - holeRadius) / count;
  const gap = Math.min(1.5, thickness * 0.12);

  const rings = ordered.map((ring, ringIndex) => {
    const innerRadius = holeRadius + ringIndex * thickness + gap;
    const outerRingRadius = holeRadius + (ringIndex + 1) * thickness - gap;
    const segments = [...ring.segments].sort((left, right) => segmentKey(left).localeCompare(segmentKey(right)));
    const totalWeight = segments.reduce((sum, segment) => sum + (segment.weight ?? 1), 0) || 1;
    const full = segments.length === 1;
    let accumulated = 0;
    const laid = segments.map((segment, segmentIndex) => {
      const weight = segment.weight ?? 1;
      const startAngle = START + (TAU * accumulated) / totalWeight;
      accumulated += weight;
      const endAngle = START + (TAU * accumulated) / totalWeight;
      const orbit: Orbit = segment.orbit ?? "off-diagonal";
      const seatedInnerRadius = orbit === "off-diagonal"
        ? innerRadius + (outerRingRadius - innerRadius) * 0.42
        : innerRadius;
      const anglePad = full ? 0 : (endAngle - startAngle) * 0.04;
      const path = full
        ? annulus(cx, cy, seatedInnerRadius, outerRingRadius)
        : annularSector(cx, cy, seatedInnerRadius, outerRingRadius, startAngle + anglePad, endAngle - anglePad);
      return Object.freeze({
        key: segmentKey(segment),
        ordinal: ring.ordinal,
        order: segmentIndex,
        orbit,
        charge: chargeSemantics(segment.charge),
        segment: segment,
        shape: Object.freeze({
          innerRadius,
          outerRadius: outerRingRadius,
          seatedInnerRadius,
          startAngle,
          endAngle,
          full,
          path,
        } satisfies RadialShape),
      } satisfies RadialLayoutSegment);
    });
    const projected = {
      ordinal: ring.ordinal,
      order: ringIndex,
      ...(ring.label === undefined ? {} : { label: ring.label }),
      innerRadius,
      outerRadius: outerRingRadius,
      segments: Object.freeze(laid),
    } satisfies RadialLayoutRing;
    return Object.freeze(projected);
  });

  return Object.freeze({
    kind: "radial" as const,
    width: size,
    height: size,
    cx,
    cy,
    holeRadius,
    center,
    rings: Object.freeze(rings),
  });
}

const emphasisOf = (value: ChargeValueName): DocumentFlowEmphasis => {
  switch (value) {
    case "unknown": return "quiet";
    case "held": return "supporting";
    case "denied": return "opposing";
    case "contested": return "settled";
  }
};

function segmentLabel(segment: RadialSegment): string {
  return segment.title ?? segment.label ?? [segment.e, segment.a, segment.v].filter((part): part is string => part !== undefined).join(" ");
}

function documentFlowLayout(dataform: RadialDataform, geometry: DocumentFlowGeometry): DocumentFlowLayoutProjection {
  const width = geometry.width ?? Math.max(720, dataform.size ?? 0);
  const margin = geometry.margin ?? 24;
  const ordinalGap = geometry.ordinalGap ?? 14;
  const segmentGap = geometry.segmentGap ?? 8;
  const ordinalHeaderHeight = geometry.ordinalHeaderHeight ?? 30;
  const segmentHeight = geometry.segmentHeight ?? 42;
  const indent = geometry.indent ?? 28;
  const byOrdinal = [...dataform.rings].sort((left, right) => left.ordinal - right.ordinal);
  const placements: DocumentFlowPlacement[] = [];
  let y = margin;
  let order = 0;

  byOrdinal.forEach((ring, depth) => {
    const x = margin + depth * indent;
    const w = Math.max(160, width - margin - x);
    placements.push(Object.freeze({
      kind: "ordinal",
      key: `ordinal:${ring.ordinal}`,
      ordinal: ring.ordinal,
      depth,
      order: order++,
      box: Object.freeze({ x, y, w, h: ordinalHeaderHeight }),
      label: ring.label ?? `ordinal ${ring.ordinal}`,
    } satisfies DocumentFlowPlacement));
    y += ordinalHeaderHeight + segmentGap;

    const segments = [...ring.segments].sort((left, right) => segmentKey(left).localeCompare(segmentKey(right)));
    for (const segment of segments) {
      const charge = chargeSemantics(segment.charge);
      const orbit: Orbit = segment.orbit ?? "off-diagonal";
      const segmentX = x + indent;
      const segmentWidth = Math.max(140, width - margin - segmentX);
      placements.push(Object.freeze({
        kind: "segment",
        key: `${ring.ordinal}:${segmentKey(segment)}`,
        ordinal: ring.ordinal,
        depth,
        order: order++,
        box: Object.freeze({ x: segmentX, y, w: segmentWidth, h: segmentHeight }),
        label: segmentLabel(segment),
        orbit,
        charge,
        emphasis: emphasisOf(charge.value),
        segment: segment,
      } satisfies DocumentFlowPlacement));
      y += segmentHeight + segmentGap;
    }

    y += ordinalGap;
  });

  return Object.freeze({
    kind: "document-flow" as const,
    width,
    height: y + margin - ordinalGap,
    placements: Object.freeze(placements),
  });
}

const assertFinitePositive = (name: string, value: number): number => {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a positive finite number`);
  return value;
};

function annularLayout(dataform: RadialDataform, geometry: AnnularGeometry): AnnularLayoutProjection {
  const byOrdinal = [...dataform.rings].sort((left, right) => left.ordinal - right.ordinal);
  const ordered = (geometry.ordinalAnchor ?? "inner") === "inner" ? byOrdinal : [...byOrdinal].reverse();
  const count = ordered.length || 1;
  const innerRadius = assertFinitePositive("annular innerRadius", geometry.innerRadius ?? 1);
  const outerRadius = assertFinitePositive("annular outerRadius", geometry.outerRadius ?? innerRadius + count);
  if (outerRadius <= innerRadius) throw new TypeError("annular outerRadius must be greater than innerRadius");
  const angularSpan = assertFinitePositive("annular angularSpan", geometry.angularSpan ?? TAU);
  const angularStart = geometry.angularStart ?? START;
  const radialGap = geometry.radialGap ?? 0;
  const angularGapRatio = geometry.angularGapRatio ?? 0.04;
  const orbitInsetRatio = geometry.orbitInsetRatio ?? 0.42;
  const thickness = (outerRadius - innerRadius) / count;

  const bands = ordered.map((ring, bandIndex) => {
    const radialStart = innerRadius + bandIndex * thickness + radialGap;
    const radialEnd = innerRadius + (bandIndex + 1) * thickness - radialGap;
    if (radialEnd <= radialStart) throw new TypeError("annular radialGap leaves no positive radial band");
    const segments = [...ring.segments].sort((left, right) => segmentKey(left).localeCompare(segmentKey(right)));
    const totalWeight = segments.reduce((sum, segment) => sum + (segment.weight ?? 1), 0) || 1;
    const full = segments.length === 1;
    let accumulated = 0;
    const laid = segments.map((segment, segmentIndex) => {
      const weight = segment.weight ?? 1;
      const rawThetaStart = angularStart + (angularSpan * accumulated) / totalWeight;
      accumulated += weight;
      const rawThetaEnd = angularStart + (angularSpan * accumulated) / totalWeight;
      const thetaPad = full ? 0 : (rawThetaEnd - rawThetaStart) * angularGapRatio;
      const thetaStart = rawThetaStart + thetaPad;
      const thetaEnd = rawThetaEnd - thetaPad;
      const orbit: Orbit = segment.orbit ?? "off-diagonal";
      const seatedRadialStart = orbit === "off-diagonal"
        ? radialStart + (radialEnd - radialStart) * orbitInsetRatio
        : radialStart;
      const area = ((radialEnd ** 2 - seatedRadialStart ** 2) * (thetaEnd - thetaStart)) / 2;
      return Object.freeze({
        key: segmentKey(segment),
        ordinal: ring.ordinal,
        order: segmentIndex,
        orbit,
        charge: chargeSemantics(segment.charge),
        segment: segment,
        shape: Object.freeze({
          radialStart,
          radialEnd,
          seatedRadialStart,
          thetaStart,
          thetaEnd,
          full,
          area,
        } satisfies AnnularShape),
      } satisfies AnnularLayoutSegment);
    });
    const projected = {
      ordinal: ring.ordinal,
      order: bandIndex,
      ...(ring.label === undefined ? {} : { label: ring.label }),
      radialStart,
      radialEnd,
      segments: Object.freeze(laid),
    } satisfies AnnularLayoutBand;
    return Object.freeze(projected);
  });

  return Object.freeze({
    kind: "annular" as const,
    innerRadius,
    outerRadius,
    angularStart,
    angularSpan,
    ordinalAnchor: geometry.ordinalAnchor ?? "inner",
    bands: Object.freeze(bands),
  });
}

/** Project charged ordinal segments into positioned placements for one geometry. */
export function layout(dataform: RadialDataform, geometry: "radial" | RadialGeometry): RadialLayoutProjection;
export function layout(dataform: RadialDataform, geometry: "annular" | AnnularGeometry): AnnularLayoutProjection;
export function layout(dataform: RadialDataform, geometry: "document-flow" | DocumentFlowGeometry): DocumentFlowLayoutProjection;
export function layout(dataform: RadialDataform, geometry: LayoutGeometry): LayoutProjection;
export function layout(dataform: RadialDataform, geometry: LayoutGeometry): LayoutProjection {
  const normalized = normalizeGeometry(geometry);
  switch (normalized.kind) {
    case "radial": return radialLayout(dataform, normalized);
    case "annular": return annularLayout(dataform, normalized);
    case "document-flow": return documentFlowLayout(dataform, normalized);
  }
}

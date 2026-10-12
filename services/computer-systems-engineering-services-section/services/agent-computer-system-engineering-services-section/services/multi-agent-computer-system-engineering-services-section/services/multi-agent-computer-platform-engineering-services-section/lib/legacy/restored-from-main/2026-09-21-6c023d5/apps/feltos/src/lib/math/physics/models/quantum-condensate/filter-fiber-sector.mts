/**
 * models/quantum-condensate/filter-fiber-sector - filters, fibers, and sector sections.
 *
 * This is the MetroPlat realization of
 * `Obsmetrologia.Relational.FilterFiberSector`: filters select admissible points
 * inside an already-indexed fiber, sectors are axis-indexed fibers, and material
 * phase points are sections across distinct axes rather than one collapsed ladder.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";


export interface FilteredFiber<Base, Point> {
  readonly kind: "relational.filteredFiber";
  readonly id: string;
  readonly accepts: (base: Base, point: Point) => boolean;
}

export interface FilteredFiberTotal<Base, Point> {
  readonly kind: "relational.filteredFiber.total";
  readonly base: Base;
  readonly point: Point;
}

export interface FilteredFiberBaseWitness<Base, Point> {
  readonly kind: "relational.filteredFiber.acceptsKeepsBase:witness";
  readonly filteredFiber: string;
  readonly base: Base;
  readonly point: Point;
  readonly accepted: true;
  readonly leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.FilteredFiber.accepts_keeps_base";
}

export interface SiteCoverFilterWitness {
  readonly kind: "relational.filterFiberSector.siteCoverFilter:witness";
  readonly base: string;
  readonly family: readonly string[];
  readonly allMembersBelowBase: true;
  readonly joinEqualsBase: true;
  readonly fiberLocal: true;
  readonly leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.siteCoverFilter_is_fiber_local";
}

export interface SectorFamily<Axis extends string, Point> {
  readonly kind: "relational.sectorFamily";
  readonly id: string;
  readonly axes: readonly Axis[];
  readonly sector: (axis: Axis) => Point;
}

export interface SectorTotal<Axis extends string, Point> {
  readonly kind: "relational.sectorFamily.total";
  readonly axis: Axis;
  readonly point: Point;
}

export type SectorSection<Axis extends string, Point> = Readonly<Record<Axis, Point>>;

export interface FockSectorTotal<Mode> {
  readonly kind: "relational.fock.sectorTotal";
  readonly particleNumber: number;
  readonly modes: readonly Mode[];
}

export interface FockSpace<Mode> {
  readonly kind: "relational.fock.space";
  readonly particleNumber: number;
  readonly modes: readonly Mode[];
}

export interface FockSectorRoundtripWitness<Mode> {
  readonly kind: "relational.fockSectorTotal.roundtrip:witness";
  readonly sectorTotal: FockSectorTotal<Mode>;
  readonly fockSpace: FockSpace<Mode>;
  readonly roundtrip: true;
  readonly leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.fockSectorTotal_roundtrip";
}

export type MaterialSectorAxis = "structural" | "transport" | "topological";
export type TransportReadout = "metallizable" | "blocked" | "unknown";

export const structuralSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/structural-sector",
  type: "object",
  required: ["kind", "basin", "heterogeneity"],
  properties: {
    kind: { const: "relational.material.structuralSector" },
    basin: { type: "string" },
    heterogeneity: { type: "string" },
  },
  additionalProperties: false,
  title: "StructuralSector",
  description: "The structural axis of a material sector: its basin and heterogeneity readout.",
} as const;

export type StructuralSector = FromJsonSchema<typeof structuralSectorSchema>;

export const transportSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/transport-sector",
  type: "object",
  required: ["kind", "ordinal", "moduliPoint", "readout"],
  properties: {
    kind: { const: "relational.material.transportSector" },
    ordinal: { type: "string" },
    moduliPoint: { type: "string" },
    readout: { enum: ["metallizable", "blocked", "unknown"] },
  },
  additionalProperties: false,
  title: "TransportSector",
  description: "The transport axis of a material sector: its ordinal, moduli point, and readout.",
} as const;

export type TransportSector = FromJsonSchema<typeof transportSectorSchema>;

export const topologicalSectorSchema = {
  $id: "metroplat/models/quantum-condensate/filter-fiber-sector/topological-sector",
  type: "object",
  required: ["kind", "conducting"],
  properties: {
    kind: { const: "relational.material.topologicalSector" },
    conducting: { type: "boolean" },
  },
  additionalProperties: false,
  title: "TopologicalSector",
  description: "The topological axis of a material sector: whether it conducts.",
} as const;

export type TopologicalSector = FromJsonSchema<typeof topologicalSectorSchema>;

export interface MaterialSectorPhasePoint {
  readonly kind: "relational.material.sectorPhasePoint";
  readonly structural: StructuralSector;
  readonly transport: TransportSector;
  readonly topological: TopologicalSector;
  readonly thermalControl: string;
}

export interface MaterialSectorSection {
  readonly kind: "relational.material.sectorSection";
  readonly structural: StructuralSector;
  readonly transport: TransportSector;
  readonly topological: TopologicalSector;
}

export interface MaterialSectorBridgeWitness {
  readonly kind: "relational.material.sectorSection.metallicTransportConducts:witness";
  readonly section: MaterialSectorSection;
  readonly metallizableTransport: true;
  readonly conductingTopology: true;
  readonly sectorsRemainDistinct: true;
  readonly leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.materialSectorSection_metallic_transport_conducts";
}

export interface FilterFiberSectorReceipt {
  readonly kind: "relational.filterFiberSector.receipt:witness";
  readonly filteredFiber: FilteredFiberBaseWitness<string, readonly string[]>;
  readonly siteCover: SiteCoverFilterWitness;
  readonly fockRoundtrip: FockSectorRoundtripWitness<string>;
  readonly materialBridge: MaterialSectorBridgeWitness;
  readonly capturedLeanModule: "Obsmetrologia.Relational.FilterFiberSector";
}

const nonempty = (value: string, name: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new TypeError(`${name} must be nonempty`);
  return trimmed;
};

const assertNat = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a safe natural number`);
  return value;
};

const normalizeFamily = (family: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(family.map((member) => nonempty(member, "cover family member")))].sort());

export function filteredFiber<Base, Point>(
  id: string,
  accepts: (base: Base, point: Point) => boolean,
): FilteredFiber<Base, Point> {
  return Object.freeze({
    kind: "relational.filteredFiber" as const,
    id: nonempty(id, "filteredFiber id"),
    accepts,
  });
}

export function filteredFiberTotal<Base, Point>(base: Base, point: Point): FilteredFiberTotal<Base, Point> {
  return Object.freeze({
    kind: "relational.filteredFiber.total" as const,
    base,
    point,
  });
}

export function acceptsTotal<Base, Point>(
  fiber: FilteredFiber<Base, Point>,
  total: FilteredFiberTotal<Base, Point>,
): boolean {
  return fiber.accepts(total.base, total.point);
}

export function acceptsKeepsBase<Base, Point>(
  fiber: FilteredFiber<Base, Point>,
  base: Base,
  point: Point,
): FilteredFiberBaseWitness<Base, Point> {
  if (!fiber.accepts(base, point)) throw new TypeError("acceptsKeepsBase: point is not accepted in its fiber");
  return Object.freeze({
    kind: "relational.filteredFiber.acceptsKeepsBase:witness" as const,
    filteredFiber: fiber.id,
    base,
    point,
    accepted: true as const,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.FilteredFiber.accepts_keeps_base" as const,
  });
}

const isBelowBase = (member: string, base: string): boolean =>
  member === base || member.startsWith(`${base}/`);

export function siteJoinList(family: readonly string[]): string {
  const normalized = normalizeFamily(family);
  const shortest = normalized.reduce((current, member) => member.length < current.length ? member : current, normalized[0] ?? "");
  return shortest;
}

export const siteCoverFilter: FilteredFiber<string, readonly string[]> = filteredFiber(
  "Obsmetrologia.Relational.FilterFiberSector.siteCoverFilter",
  (base, family) => {
    const normalizedBase = nonempty(base, "site cover base");
    const normalized = normalizeFamily(family);
    return normalized.length > 0
      && normalized.every((member) => isBelowBase(member, normalizedBase))
      && siteJoinList(normalized) === normalizedBase;
  },
);

export function siteCoverFilterIsFiberLocal(base: string, family: readonly string[]): SiteCoverFilterWitness {
  const normalizedBase = nonempty(base, "site cover base");
  const normalizedFamily = normalizeFamily(family);
  if (!siteCoverFilter.accepts(normalizedBase, normalizedFamily)) {
    throw new TypeError("siteCoverFilterIsFiberLocal: family is not a cover of the base clopen");
  }
  return Object.freeze({
    kind: "relational.filterFiberSector.siteCoverFilter:witness" as const,
    base: normalizedBase,
    family: normalizedFamily,
    allMembersBelowBase: true as const,
    joinEqualsBase: true as const,
    fiberLocal: true as const,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.siteCoverFilter_is_fiber_local" as const,
  });
}

export function sectorFamily<Axis extends string, Point>(
  id: string,
  axes: readonly Axis[],
  sector: (axis: Axis) => Point,
): SectorFamily<Axis, Point> {
  const normalizedAxes = Object.freeze([...new Set(axes.map((axis) => nonempty(axis, "sector axis") as Axis))]);
  if (normalizedAxes.length === 0) throw new TypeError("sectorFamily: expected at least one axis");
  return Object.freeze({
    kind: "relational.sectorFamily" as const,
    id: nonempty(id, "sectorFamily id"),
    axes: normalizedAxes,
    sector,
  });
}

export function sectorTotal<Axis extends string, Point>(
  family: SectorFamily<Axis, Point>,
  axis: Axis,
): SectorTotal<Axis, Point> {
  if (!family.axes.includes(axis)) throw new TypeError(`sectorTotal: axis ${axis} is not in ${family.id}`);
  return Object.freeze({
    kind: "relational.sectorFamily.total" as const,
    axis,
    point: family.sector(axis),
  });
}

export function sectorSection<Axis extends string, Point>(family: SectorFamily<Axis, Point>): SectorSection<Axis, Point> {
  return Object.freeze(Object.fromEntries(family.axes.map((axis) => [axis, family.sector(axis)])) as Record<Axis, Point>);
}

export function fockSectorTotal<Mode>(modes: readonly Mode[]): FockSectorTotal<Mode> {
  return Object.freeze({
    kind: "relational.fock.sectorTotal" as const,
    particleNumber: assertNat(modes.length, "particleNumber"),
    modes: Object.freeze([...modes]),
  });
}

export function fockSectorTotalToFockSpace<Mode>(sector: FockSectorTotal<Mode>): FockSpace<Mode> {
  return Object.freeze({
    kind: "relational.fock.space" as const,
    particleNumber: sector.particleNumber,
    modes: sector.modes,
  });
}

export function fockSpaceToFockSectorTotal<Mode>(space: FockSpace<Mode>): FockSectorTotal<Mode> {
  if (space.particleNumber !== space.modes.length) throw new TypeError("fockSpaceToFockSectorTotal: particle number does not match modes");
  return Object.freeze({
    kind: "relational.fock.sectorTotal" as const,
    particleNumber: space.particleNumber,
    modes: space.modes,
  });
}

export function fockSectorTotalRoundtrip<Mode>(sector: FockSectorTotal<Mode>): FockSectorRoundtripWitness<Mode> {
  const fockSpace = fockSectorTotalToFockSpace(sector);
  const back = fockSpaceToFockSectorTotal(fockSpace);
  const roundtrip = back.particleNumber === sector.particleNumber
    && back.modes.length === sector.modes.length
    && back.modes.every((mode, index) => Object.is(mode, sector.modes[index]));
  if (!roundtrip) throw new TypeError("fockSectorTotalRoundtrip: Fock total-space identification failed");
  return Object.freeze({
    kind: "relational.fockSectorTotal.roundtrip:witness" as const,
    sectorTotal: sector,
    fockSpace,
    roundtrip: true as const,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.fockSectorTotal_roundtrip" as const,
  });
}

export function materialSectorSectionOfPoint(point: MaterialSectorPhasePoint): MaterialSectorSection {
  return Object.freeze({
    kind: "relational.material.sectorSection" as const,
    structural: point.structural,
    transport: point.transport,
    topological: point.topological,
  });
}

export function materialSectorSectionMetallicTransportConducts(point: MaterialSectorPhasePoint): MaterialSectorBridgeWitness {
  const section = materialSectorSectionOfPoint(point);
  if (section.transport.readout !== "metallizable" || section.topological.conducting !== true) {
    throw new TypeError("materialSectorSectionMetallicTransportConducts: material bridge is not metallizable and conducting");
  }
  return Object.freeze({
    kind: "relational.material.sectorSection.metallicTransportConducts:witness" as const,
    section,
    metallizableTransport: true as const,
    conductingTopology: true as const,
    sectorsRemainDistinct: true as const,
    leanTheorem: "Obsmetrologia.Relational.FilterFiberSector.materialSectorSection_metallic_transport_conducts" as const,
  });
}

export function filterFiberSectorReceipt(): FilterFiberSectorReceipt {
  const base = "site/clopen/U";
  const family = Object.freeze([base, `${base}/left`, `${base}/right`]);
  const filtered = acceptsKeepsBase(siteCoverFilter, base, family);
  const siteCover = siteCoverFilterIsFiberLocal(base, family);
  const fockRoundtrip = fockSectorTotalRoundtrip(fockSectorTotal(["mode-a", "mode-b"]));
  const materialBridge = materialSectorSectionMetallicTransportConducts(Object.freeze({
    kind: "relational.material.sectorPhasePoint" as const,
    structural: Object.freeze({
      kind: "relational.material.structuralSector" as const,
      basin: "basin-alpha",
      heterogeneity: "finite",
    }),
    transport: Object.freeze({
      kind: "relational.material.transportSector" as const,
      ordinal: "kappa",
      moduliPoint: "moduli-alpha",
      readout: "metallizable" as const,
    }),
    topological: Object.freeze({
      kind: "relational.material.topologicalSector" as const,
      conducting: true,
    }),
    thermalControl: "retained-control",
  }));
  return Object.freeze({
    kind: "relational.filterFiberSector.receipt:witness" as const,
    filteredFiber: filtered,
    siteCover,
    fockRoundtrip,
    materialBridge,
    capturedLeanModule: "Obsmetrologia.Relational.FilterFiberSector" as const,
  });
}

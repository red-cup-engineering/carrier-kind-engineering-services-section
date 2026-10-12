/**
 * analysis/alexandrov-husainov - finite executable runtime surface.
 * Obsmetrologia.Alexandrov.husainov_cech_acyclic_on_bounded_sites.
 *
 * opens, specialization-order recovery, continuous iff monotone, and Čech-side
 * acyclicity while leaving Husainov's derived-functor comparison open. This
 * module exposes the finite poset/up-set structure and the computable comparison
 * boundary.
 */
import type { FromSchema } from "../../schema/contract.mts";

export interface FinitePoset {
  readonly kind: "alexandrovHusainov.poset";
  readonly points: readonly string[];
  readonly leq: readonly (readonly [string, string])[];
}

export const openSetSchemaContractSchema = {
  $id: "metroplat/closure/analysis/alexandrov-husainov/open-set",
  type: "object",
  required: ["kind", "points"],
  properties: {
    kind: { const: "alexandrovHusainov.openSet" },
    points: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  title: "OpenSet",
  description: "An Alexandrov open set: an up-closed set of poset points.",
} as const;

export type OpenSet = FromSchema<typeof openSetSchemaContractSchema>;

export interface MonotoneMap {
  readonly kind: "alexandrovHusainov.monotoneMap";
  readonly source: readonly string[];
  readonly target: readonly string[];
  readonly map: Readonly<Record<string, string>>;
}

export interface AlexandrovTopologyReceipt {
  readonly kind: "alexandrovHusainov.topology:witness";
  readonly poset: FinitePoset;
  readonly opens: readonly OpenSet[];
  readonly emptyOpen: true;
  readonly universeOpen: true;
  readonly binaryIntersectionOpen: true;
  readonly binaryUnionOpen: true;
  readonly arbitraryFiniteIntersectionOpen: true;
  readonly arbitraryFiniteUnionOpen: true;
  readonly principalUpSetsOpen: true;
  readonly specializationRecoversOrder: true;
}

export interface ContinuousMonotoneReceipt {
  readonly kind: "alexandrovHusainov.continuousMonotone:witness";
  readonly source: FinitePoset;
  readonly target: FinitePoset;
  readonly map: MonotoneMap;
  readonly monotone: true;
  readonly preimagesOfOpensAreOpen: true;
  readonly continuousIffMonotoneOnFiniteMaps: true;
}

export interface HusainovBoundaryReceipt {
  readonly kind: "alexandrovHusainov.husainovBoundary:documented";
  readonly cechH1VanishesOnBoundedSites: true;
  readonly cechAboveOneTrivial: true;
  readonly derivedFunctorComparisonImplemented: false;
  readonly obstruction: readonly string[];
}

export interface AlexandrovHusainovReceipt {
  readonly kind: "alexandrovHusainov.receipt:witness";
  readonly topology: AlexandrovTopologyReceipt;
  readonly continuousMonotone: ContinuousMonotoneReceipt;
  readonly husainov: HusainovBoundaryReceipt;
  readonly openFrontier: readonly string[];
}

const uniqueSorted = (values: readonly string[]): readonly string[] => {
  const out: string[] = [];
  for (const value of values) {
    if (value.length === 0) throw new TypeError("alexandrovHusainov: point names must be nonempty");
    if (!out.includes(value)) out.push(value);
  }
  return Object.freeze(out.sort((left, right) => left.localeCompare(right)));
};

const pairKey = (left: string, right: string): string => `${left}\u0000${right}`;

export function finitePoset(pointsInput: readonly string[], leqInput: readonly (readonly [string, string])[]): FinitePoset {
  const points = uniqueSorted(pointsInput);
  const pairs = new Set<string>();
  for (const point of points) pairs.add(pairKey(point, point));
  for (const [left, right] of leqInput) {
    if (!points.includes(left) || !points.includes(right)) {
      throw new TypeError(`finitePoset: relation ${left} <= ${right} mentions an unknown point`);
    }
    pairs.add(pairKey(left, right));
  }
  const leqPairs = [...pairs].map((keyValue) => keyValue.split("\u0000") as [string, string]);
  const leq = (left: string, right: string): boolean => pairs.has(pairKey(left, right));
  const reflexive = points.every((point) => leq(point, point));
  const transitive = points.every((a) => points.every((b) => points.every((c) =>
    !leq(a, b) || !leq(b, c) || leq(a, c))));
  const antisymmetric = points.every((a) => points.every((b) =>
    !leq(a, b) || !leq(b, a) || a === b));
  if (!reflexive || !transitive || !antisymmetric) {
    throw new TypeError("finitePoset: relation must be a finite partial order");
  }
  return Object.freeze({
    kind: "alexandrovHusainov.poset" as const,
    points,
    leq: Object.freeze(leqPairs.sort(([aLeft, aRight], [bLeft, bRight]) =>
      aLeft.localeCompare(bLeft) || aRight.localeCompare(bRight)).map((pair) => Object.freeze(pair))),
  });
}

export const defaultPoset: FinitePoset = finitePoset(
  ["seed", "branch-a", "branch-b", "top"],
  [
    ["seed", "branch-a"],
    ["seed", "branch-b"],
    ["branch-a", "top"],
    ["branch-b", "top"],
    ["seed", "top"],
  ],
);

const leq = (poset: FinitePoset, left: string, right: string): boolean =>
  poset.leq.some(([a, b]) => a === left && b === right);

export function openSet(points: readonly string[]): OpenSet {
  return Object.freeze({
    kind: "alexandrovHusainov.openSet" as const,
    points: uniqueSorted(points),
  });
}

const subset = (left: OpenSet, right: OpenSet): boolean =>
  left.points.every((point) => right.points.includes(point));

const sameOpen = (left: OpenSet, right: OpenSet): boolean =>
  subset(left, right) && subset(right, left);

export function isUpSet(poset: FinitePoset, open: OpenSet): boolean {
  return open.points.every((x) => poset.points.includes(x)
    && poset.points.every((y) => !leq(poset, x, y) || open.points.includes(y)));
}

export function principalUpSet(poset: FinitePoset, point: string): OpenSet {
  if (!poset.points.includes(point)) throw new TypeError(`principalUpSet: unknown point ${point}`);
  return openSet(poset.points.filter((candidate) => leq(poset, point, candidate)));
}

export const intersection = (family: readonly OpenSet[], universe: readonly string[]): OpenSet =>
  openSet(universe.filter((point) => family.every((member) => member.points.includes(point))));

export const union = (family: readonly OpenSet[]): OpenSet =>
  openSet(family.flatMap((member) => member.points));

const allSubsets = (points: readonly string[]): readonly OpenSet[] => {
  const count = 2 ** points.length;
  if (count > 4096) throw new TypeError("allSubsets: poset too large for exhaustive finite Alexandrov receipt");
  return Object.freeze(Array.from({ length: count }, (_, mask) =>
    openSet(points.filter((_, index) => (mask & (1 << index)) !== 0))));
};

export const allOpenSets = (poset: FinitePoset): readonly OpenSet[] =>
  Object.freeze(allSubsets(poset.points).filter((candidate) => isUpSet(poset, candidate)));

export function specializes(poset: FinitePoset, x: string, y: string): boolean {
  const opens = allOpenSets(poset);
  return opens.every((open) => !open.points.includes(x) || open.points.includes(y));
}

export function monotoneMap(
  source: FinitePoset,
  target: FinitePoset,
  mapInput: Readonly<Record<string, string>>,
): MonotoneMap {
  for (const point of source.points) {
    const image = mapInput[point];
    if (image === undefined || !target.points.includes(image)) {
      throw new TypeError(`monotoneMap: ${point} maps outside the target`);
    }
  }
  const monotone = source.points.every((x) => source.points.every((y) =>
    !leq(source, x, y) || leq(target, mapInput[x] ?? "", mapInput[y] ?? "")));
  if (!monotone) throw new TypeError("monotoneMap: map is not monotone");
  return Object.freeze({
    kind: "alexandrovHusainov.monotoneMap" as const,
    source: source.points,
    target: target.points,
    map: Object.freeze({ ...mapInput }),
  });
}

const preimage = (source: FinitePoset, map: MonotoneMap, targetOpen: OpenSet): OpenSet =>
  openSet(source.points.filter((point) => targetOpen.points.includes(map.map[point] ?? "")));

const allFiniteMaps = (
  source: FinitePoset,
  target: FinitePoset,
): readonly Readonly<Record<string, string>>[] => {
  let maps: readonly Readonly<Record<string, string>>[] = Object.freeze([Object.freeze({})]);
  for (const point of source.points) {
    maps = Object.freeze(maps.flatMap((existing) =>
      target.points.map((image) => Object.freeze({ ...existing, [point]: image }))));
  }
  return maps;
};

const isMonotoneRaw = (
  source: FinitePoset,
  target: FinitePoset,
  map: Readonly<Record<string, string>>,
): boolean =>
  source.points.every((x) => source.points.every((y) =>
    !leq(source, x, y) || leq(target, map[x] ?? "", map[y] ?? "")));

const isContinuousRaw = (
  source: FinitePoset,
  target: FinitePoset,
  map: Readonly<Record<string, string>>,
): boolean => {
  const monotone = Object.freeze({
    kind: "alexandrovHusainov.monotoneMap" as const,
    source: source.points,
    target: target.points,
    map: Object.freeze({ ...map }),
  });
  return allOpenSets(target).every((open) => isUpSet(source, preimage(source, monotone, open)));
};

export function topologyReceipt(poset: FinitePoset = defaultPoset): AlexandrovTopologyReceipt {
  const opens = allOpenSets(poset);
  const openFamilies = allSubsets(opens.map((_, index) => String(index))).map((indexSet) =>
    indexSet.points.map((index) => opens[Number(index)]!).filter(Boolean));
  const emptyOpen = opens.some((open) => open.points.length === 0);
  const universeOpen = opens.some((open) => sameOpen(open, openSet(poset.points)));
  const binaryIntersectionOpen = opens.every((left) => opens.every((right) =>
    isUpSet(poset, intersection([left, right], poset.points))));
  const binaryUnionOpen = opens.every((left) => opens.every((right) => isUpSet(poset, union([left, right]))));
  const arbitraryFiniteIntersectionOpen = openFamilies.every((family) =>
    isUpSet(poset, intersection(family, poset.points)));
  const arbitraryFiniteUnionOpen = openFamilies.every((family) => isUpSet(poset, union(family)));
  const principalUpSetsOpen = poset.points.every((point) => isUpSet(poset, principalUpSet(poset, point)));
  const specializationRecoversOrder = poset.points.every((x) => poset.points.every((y) =>
    specializes(poset, x, y) === leq(poset, x, y)));

  if (!emptyOpen || !universeOpen || !binaryIntersectionOpen || !binaryUnionOpen
    || !arbitraryFiniteIntersectionOpen || !arbitraryFiniteUnionOpen
    || !principalUpSetsOpen || !specializationRecoversOrder) {
    throw new TypeError("topologyReceipt: finite Alexandrov topology laws failed");
  }

  return Object.freeze({
    kind: "alexandrovHusainov.topology:witness" as const,
    poset,
    opens,
    emptyOpen: true as const,
    universeOpen: true as const,
    binaryIntersectionOpen: true as const,
    binaryUnionOpen: true as const,
    arbitraryFiniteIntersectionOpen: true as const,
    arbitraryFiniteUnionOpen: true as const,
    principalUpSetsOpen: true as const,
    specializationRecoversOrder: true as const,
  });
}

export function continuousMonotoneReceipt(
  source: FinitePoset = defaultPoset,
  target: FinitePoset = defaultPoset,
  mapInput: Readonly<Record<string, string>> = Object.freeze({
    seed: "seed",
    "branch-a": "top",
    "branch-b": "top",
    top: "top",
  }),
): ContinuousMonotoneReceipt {
  const map = monotoneMap(source, target, mapInput);
  const targetOpens = allOpenSets(target);
  const preimagesOfOpensAreOpen = targetOpens.every((open) => isUpSet(source, preimage(source, map, open)));
  const continuousIffMonotoneOnFiniteMaps = allFiniteMaps(source, target).every((candidate) =>
    isContinuousRaw(source, target, candidate) === isMonotoneRaw(source, target, candidate));

  if (!preimagesOfOpensAreOpen || !continuousIffMonotoneOnFiniteMaps) {
    throw new TypeError("continuousMonotoneReceipt: continuous/monotone laws failed");
  }

  return Object.freeze({
    kind: "alexandrovHusainov.continuousMonotone:witness" as const,
    source,
    target,
    map,
    monotone: true as const,
    preimagesOfOpensAreOpen: true as const,
    continuousIffMonotoneOnFiniteMaps: true as const,
  });
}

export function husainovBoundaryReceipt(): HusainovBoundaryReceipt {
  return Object.freeze({
    kind: "alexandrovHusainov.husainovBoundary:documented" as const,
    cechH1VanishesOnBoundedSites: true as const,
    cechAboveOneTrivial: true as const,
    derivedFunctorComparisonImplemented: false as const,
    obstruction: Object.freeze([
      "The finite runtime receipt carries the Cech-side bounded-site acyclicity already available from settling cohomology.",
      "The Husainov comparison to derived-functor sheaf cohomology requires injective or flasque resolutions and is not modeled by definitionally equating RGamma with Cech cohomology.",
      "Dedekind-MacNeille cut acyclicity can be computed for finite posets in a future kernel, but the derived-functor comparison remains proof/topology work.",
    ]),
  });
}

export function alexandrovHusainovReceipt(): AlexandrovHusainovReceipt {
  return Object.freeze({
    kind: "alexandrovHusainov.receipt:witness" as const,
    topology: topologyReceipt(),
    continuousMonotone: continuousMonotoneReceipt(),
    husainov: husainovBoundaryReceipt(),
    openFrontier: Object.freeze([
      "The runtime Alexandrov topology is finite and exhaustively enumerates up-sets; Lean states arbitrary Prop-valued intersections over any index type.",
      "Continuous iff monotone is checked over all finite maps between the sample posets, not as a generic theorem over arbitrary posets.",
      "Husainov's Cech-vs-derived comparison remains proof/topology work until the runtime has resolution and derived-functor resolution structures.",
    ]),
  });
}

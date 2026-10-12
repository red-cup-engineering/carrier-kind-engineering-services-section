/**
 * analysis/causal-polarization - causal colouring polarization and Liouville receipts.
 *
 * proper colouring of direct causal edges, graph-hom/factor maps pull it back,
 * and the Liouville 1-form is the exact coboundary dc with d(dc)=0.
 */
import {
  type CausalLink,
  type CausalSet,
} from "./causal.mts";

export type ColorAssignment = Readonly<Record<string, number>>;
export type EventMap = Readonly<Record<string, string>>;

export interface PolarizationFormEntry {
  readonly from: string;
  readonly to: string;
  readonly value: number;
}

export interface CausalPolarizationReceipt {
  readonly kind: "lorentzian.causalPolarization.receipt:witness";
  readonly causalSet: CausalSet;
  readonly colors: ColorAssignment;
  readonly form: readonly PolarizationFormEntry[];
  readonly nondegenerate: boolean;
  readonly properColoring: boolean;
  readonly nondegenerateIffProper: true;
  readonly mldPreservesPolarization: true;
  readonly boolPolarizationIffBipartite: true;
  readonly chromaticObstruction: "odd causal cycle obstructs Bool polarization";
}

export interface CausalLiouvilleReceipt {
  readonly kind: "lorentzian.causalLiouville.receipt:witness";
  readonly causalSet: CausalSet;
  readonly colors: ColorAssignment;
  readonly liouville: readonly PolarizationFormEntry[];
  readonly omega: readonly number[];
  readonly liouvilleCodirEqualsPolForm: true;
  readonly omegaExact: true;
  readonly omegaClosed: true;
  readonly omegaLiouvilleZero: true;
  readonly liouvilleNondegenerateIffProper: true;
  readonly mldPreservesLiouville: true;
  readonly exactSymplecticBoundary: "the implemented datum is exact Liouville polarization, not a nontrivial H2 class";
}

const linkKey = (link: CausalLink): string => `${link.from}\u0000${link.to}`;

function assertCausalSet(causalSet: CausalSet): void {
  const events = new Set(causalSet.events);
  if (events.size !== causalSet.events.length) throw new TypeError("causal polarization expects unique events");
  for (const link of causalSet.links) {
    if (!events.has(link.from) || !events.has(link.to)) throw new TypeError("causal polarization link references unknown event");
  }
}

function colorOf(colors: ColorAssignment, event: string): number {
  const value = colors[event];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new RangeError(`missing safe integer colour for event ${event}`);
  }
  return value;
}

function directLinkSet(causalSet: CausalSet): Set<string> {
  return new Set(causalSet.links.map(linkKey));
}

export function polForm(colors: ColorAssignment, from: string, to: string): number {
  return colorOf(colors, to) - colorOf(colors, from);
}

export function polarizationForm(causalSet: CausalSet, colors: ColorAssignment): readonly PolarizationFormEntry[] {
  assertCausalSet(causalSet);
  return Object.freeze(causalSet.links.map((link) => Object.freeze({
    from: link.from,
    to: link.to,
    value: polForm(colors, link.from, link.to),
  })));
}

export function nondegenerate(causalSet: CausalSet, colors: ColorAssignment): boolean {
  return polarizationForm(causalSet, colors).every((entry) => entry.value !== 0);
}

export function properColoring(causalSet: CausalSet, colors: ColorAssignment): boolean {
  assertCausalSet(causalSet);
  return causalSet.links.every((link) => colorOf(colors, link.from) !== colorOf(colors, link.to));
}

export function graphHom(source: CausalSet, target: CausalSet, map: EventMap): boolean {
  assertCausalSet(source);
  assertCausalSet(target);
  const targetEdges = directLinkSet(target);
  return source.events.every((event) => typeof map[event] === "string" && target.events.includes(map[event]!))
    && source.links.every((link) => targetEdges.has(linkKey({ from: map[link.from]!, to: map[link.to]! })));
}

export function pullbackColors(map: EventMap, colors: ColorAssignment): ColorAssignment {
  return Object.freeze(Object.fromEntries(Object.entries(map).map(([source, target]) => [source, colorOf(colors, target)])));
}

function undirectedNeighbors(causalSet: CausalSet): Map<string, Set<string>> {
  assertCausalSet(causalSet);
  const neighbors = new Map(causalSet.events.map((event) => [event, new Set<string>()]));
  for (const link of causalSet.links) {
    neighbors.get(link.from)!.add(link.to);
    neighbors.get(link.to)!.add(link.from);
  }
  return neighbors;
}

export function bipartiteColoring(causalSet: CausalSet): ColorAssignment | undefined {
  const neighbors = undirectedNeighbors(causalSet);
  const colors = new Map<string, number>();
  for (const root of causalSet.events) {
    if (colors.has(root)) continue;
    colors.set(root, 0);
    const queue = [root];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const nextColor = 1 - colors.get(current)!;
      for (const neighbor of neighbors.get(current) ?? []) {
        if (!colors.has(neighbor)) {
          colors.set(neighbor, nextColor);
          queue.push(neighbor);
        } else if (colors.get(neighbor) !== nextColor) {
          return undefined;
        }
      }
    }
  }
  return Object.freeze(Object.fromEntries([...colors.entries()]));
}

export const hasBoolPolarization = (causalSet: CausalSet): boolean => bipartiteColoring(causalSet) !== undefined;

export function liouville(causalSet: CausalSet, colors: ColorAssignment): readonly PolarizationFormEntry[] {
  return polarizationForm(causalSet, colors);
}

export interface CausalTriangle {
  readonly a: string;
  readonly b: string;
  readonly c: string;
}

export function causalTriangles(causalSet: CausalSet): readonly CausalTriangle[] {
  assertCausalSet(causalSet);
  const edges = directLinkSet(causalSet);
  const out: CausalTriangle[] = [];
  for (const a of causalSet.events) {
    for (const b of causalSet.events) {
      if (a === b || !edges.has(linkKey({ from: a, to: b }))) continue;
      for (const c of causalSet.events) {
        if (c === a || c === b) continue;
        if (edges.has(linkKey({ from: b, to: c })) && edges.has(linkKey({ from: a, to: c }))) {
          out.push(Object.freeze({ a, b, c }));
        }
      }
    }
  }
  return Object.freeze(out);
}

export function omegaLiouville(causalSet: CausalSet, colors: ColorAssignment): readonly number[] {
  return Object.freeze(causalTriangles(causalSet).map(({ a, b, c }) =>
    polForm(colors, b, c) - polForm(colors, a, c) + polForm(colors, a, b)));
}

export const diamondCausalSet: CausalSet = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: Object.freeze(["a", "b", "c", "d"]),
  links: Object.freeze([
    Object.freeze({ from: "a", to: "b" }),
    Object.freeze({ from: "a", to: "c" }),
    Object.freeze({ from: "a", to: "d" }),
    Object.freeze({ from: "b", to: "d" }),
    Object.freeze({ from: "c", to: "d" }),
  ]),
});

export const triangleCausalSet: CausalSet = Object.freeze({
  kind: "lorentzian.causalSet" as const,
  events: Object.freeze(["x", "y", "z"]),
  links: Object.freeze([
    Object.freeze({ from: "x", to: "y" }),
    Object.freeze({ from: "y", to: "z" }),
    Object.freeze({ from: "x", to: "z" }),
  ]),
});

export function polarizationReceipt(
  causalSet: CausalSet = diamondCausalSet,
  colors: ColorAssignment = Object.freeze({ a: 0, b: 1, c: 1, d: 2 }),
): CausalPolarizationReceipt {
  const form = polarizationForm(causalSet, colors);
  const nondegenerateValue = nondegenerate(causalSet, colors);
  const proper = properColoring(causalSet, colors);
  const map = Object.freeze({ p: "a", q: "b", r: "d" });
  const source = Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: Object.freeze(["p", "q", "r"]),
    links: Object.freeze([Object.freeze({ from: "p", to: "q" }), Object.freeze({ from: "q", to: "r" })]),
  });
  const pulled = pullbackColors(map, colors);
  const preserves = graphHom(source, causalSet, map)
    && (!nondegenerateValue || nondegenerate(source, pulled));
  const boolIffBipartite = hasBoolPolarization(causalSet) === (bipartiteColoring(causalSet) !== undefined)
    && hasBoolPolarization(triangleCausalSet) === false;
  if (nondegenerateValue !== proper || !preserves || !boolIffBipartite) {
    throw new TypeError("causalPolarization.receipt: finite polarization laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.causalPolarization.receipt:witness" as const,
    causalSet,
    colors,
    form,
    nondegenerate: nondegenerateValue,
    properColoring: proper,
    nondegenerateIffProper: true as const,
    mldPreservesPolarization: true as const,
    boolPolarizationIffBipartite: true as const,
    chromaticObstruction: "odd causal cycle obstructs Bool polarization" as const,
  });
}

export function liouvilleReceipt(
  causalSet: CausalSet = diamondCausalSet,
  colors: ColorAssignment = Object.freeze({ a: 0, b: 1, c: 1, d: 2 }),
): CausalLiouvilleReceipt {
  const form = liouville(causalSet, colors);
  const omega = omegaLiouville(causalSet, colors);
  const liouvilleEqualsPol = JSON.stringify(form) === JSON.stringify(polarizationForm(causalSet, colors));
  const omegaZero = omega.every((value) => value === 0);
  const nondegenerateIffProper = nondegenerate(causalSet, colors) === properColoring(causalSet, colors);
  const preserved = polarizationReceipt(causalSet, colors).mldPreservesPolarization === true;
  if (!liouvilleEqualsPol || !omegaZero || !nondegenerateIffProper || !preserved) {
    throw new TypeError("causalLiouville.receipt: finite Liouville laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.causalLiouville.receipt:witness" as const,
    causalSet,
    colors,
    liouville: form,
    omega,
    liouvilleCodirEqualsPolForm: true as const,
    omegaExact: true as const,
    omegaClosed: true as const,
    omegaLiouvilleZero: true as const,
    liouvilleNondegenerateIffProper: true as const,
    mldPreservesLiouville: true as const,
    exactSymplecticBoundary: "the implemented datum is exact Liouville polarization, not a nontrivial H2 class" as const,
  });
}

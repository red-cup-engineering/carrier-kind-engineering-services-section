/**
 * analysis/causal-microsupport - finite cone-confined microsupport reads.
 *
 * `ChargedMicrosupport`, and `CotangentMicrosupport`: support propagates by
 * causal future closure, cone emissions carry FOUR charges, and edge cochains
 * expose a finite cotangent wavefront projection.
 */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";
import {
  diamondCausalSet,
  closeCausalSet,
  type CausalLink,
  type CausalSet,
  type CausalClosureObstruction,
} from "./causal.mts";

export interface Codirection {
  readonly from: string;
  readonly to: string;
}

export type EdgeCochain = Readonly<Record<string, number>>;

export interface CausalMicrosupportReceipt {
  readonly kind: "lorentzian.causalMicrosupport:witness";
  readonly pointSupport: readonly string[];
  readonly upwardClosed: true;
  readonly idempotent: true;
  readonly spacelikeExcluded: true;
  readonly chargedOutsideCone: "unknown";
  readonly chargedCollision: "contested";
  readonly chargedAgreement: "held";
  readonly mergeKnowledgeInflationary: true;
  readonly wavefront: readonly Codirection[];
  readonly singularSupport: readonly string[];
  readonly nonzeroClinvSingular: true;
  readonly bridgeBoundary: "smooth cotangent symplectic flow remains frontier";
}

const edgeKey = (edge: Codirection): string => `${edge.from}->${edge.to}`;

function isObstruction(value: unknown): value is CausalClosureObstruction {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: string }).kind === "lorentzian.causalSettle-obstruction";
}

function closedCausalSet(causalSet: CausalSet): CausalSet | CausalClosureObstruction {
  const settled = closeCausalSet(causalSet);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze({ kind: "lorentzian.causalSet" as const, events: settled.events, links: settled.closure });
}

function hasLink(links: readonly CausalLink[], from: string, to: string): boolean {
  return links.some((link) => link.from === from && link.to === to);
}

function causalLe(causalSet: CausalSet, from: string, to: string): boolean {
  return from === to || hasLink(causalSet.links, from, to);
}

function knowledgeJoinName(left: ChargeValueName, right: ChargeValueName): ChargeValueName {
  return chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));
}

function knowledgeLeq(left: ChargeValueName, right: ChargeValueName): boolean {
  return knowledgeJoinName(left, right) === right;
}

/** The closed future cone `J+(source)`. */
export function closedFuture(causalSet: CausalSet, source: string): readonly string[] | CausalClosureObstruction {
  const settled = closedCausalSet(causalSet);
  if (isObstruction(settled)) return settled;
  return Object.freeze(settled.events.filter((event) => causalLe(settled, source, event)));
}

/** The causal microsupport of a finite event section. */
export function microsupport(causalSet: CausalSet, support: readonly string[]): readonly string[] | CausalClosureObstruction {
  const settled = closedCausalSet(causalSet);
  if (isObstruction(settled)) return settled;
  const seed = new Set(support);
  return Object.freeze(settled.events.filter((event) =>
    settled.events.some((source) => seed.has(source) && causalLe(settled, source, event))));
}

/** Microsupport is an up-set of the causal order. */
export function microsupportUpwardClosed(causalSet: CausalSet, support: readonly string[]): boolean | CausalClosureObstruction {
  const settled = closedCausalSet(causalSet);
  if (isObstruction(settled)) return settled;
  const supported = new Set(microsupport(settled, support) as readonly string[]);
  return [...supported].every((event) =>
    settled.events.every((future) => !causalLe(settled, event, future) || supported.has(future)));
}

/** Propagating a microsupport again adds no events. */
export function microsupportIdempotent(causalSet: CausalSet, support: readonly string[]): boolean | CausalClosureObstruction {
  const once = microsupport(causalSet, support);
  if (isObstruction(once)) return once;
  const twice = microsupport(causalSet, once);
  if (isObstruction(twice)) return twice;
  return JSON.stringify(once) === JSON.stringify(twice);
}

/** Two events are spacelike when neither lies in the other's causal future. */
export function spacelike(causalSet: CausalSet, left: string, right: string): boolean | CausalClosureObstruction {
  const settled = closedCausalSet(causalSet);
  if (isObstruction(settled)) return settled;
  return left !== right && !causalLe(settled, left, right) && !causalLe(settled, right, left);
}

/** A point source does not propagate to a spacelike-separated event. */
export function microsupportExcludesSpacelike(
  causalSet: CausalSet,
  source: string,
  target: string,
): boolean | CausalClosureObstruction {
  const separated = spacelike(causalSet, source, target);
  if (isObstruction(separated)) return separated;
  if (!separated) return false;
  const support = microsupport(causalSet, [source]);
  if (isObstruction(support)) return support;
  return !support.includes(target);
}

/** A charged source emits its charge inside the cone and `unknown` outside it. */
export function emit(
  causalSet: CausalSet,
  source: string,
  charge: ChargeValueName,
  target: string,
): ChargeValueName | CausalClosureObstruction {
  const settled = closedCausalSet(causalSet);
  if (isObstruction(settled)) return settled;
  return causalLe(settled, source, target) ? charge : "unknown";
}

/** Merge two charged cone emissions pointwise by knowledge join. */
export function emit2(
  causalSet: CausalSet,
  leftSource: string,
  leftCharge: ChargeValueName,
  rightSource: string,
  rightCharge: ChargeValueName,
  target: string,
): ChargeValueName | CausalClosureObstruction {
  const left = emit(causalSet, leftSource, leftCharge, target);
  if (isObstruction(left)) return left;
  const right = emit(causalSet, rightSource, rightCharge, target);
  if (isObstruction(right)) return right;
  return knowledgeJoinName(left, right);
}

/** Merging charged influences climbs the knowledge order. */
export function emit2Inflationary(
  causalSet: CausalSet,
  source: string,
  charge: ChargeValueName,
  otherSource: string,
  otherCharge: ChargeValueName,
  target: string,
): boolean | CausalClosureObstruction {
  const left = emit(causalSet, source, charge, target);
  if (isObstruction(left)) return left;
  const merged = emit2(causalSet, source, charge, otherSource, otherCharge, target);
  if (isObstruction(merged)) return merged;
  return knowledgeLeq(left, merged);
}

/** Direct causal edges as the finite cotangent/codirection set. */
export function codirections(causalSet: CausalSet): readonly Codirection[] | CausalClosureObstruction {
  const settled = closeCausalSet(causalSet);
  if (settled.kind !== "lorentzian.causalSettle:witness") return settled;
  return Object.freeze(settled.directLinks.map((link) => Object.freeze({ from: link.from, to: link.to })));
}

/** The wavefront set: codirections where the edge cochain is nonzero. */
export function wavefront(causalSet: CausalSet, cochain: EdgeCochain): readonly Codirection[] | CausalClosureObstruction {
  const edges = codirections(causalSet);
  if (isObstruction(edges)) return edges;
  return Object.freeze(edges.filter((edge) => (cochain[edgeKey(edge)] ?? 0) !== 0));
}

/** The base singular support: projection of wavefront codirections to source events. */
export function singularSupport(causalSet: CausalSet, cochain: EdgeCochain): readonly string[] | CausalClosureObstruction {
  const wf = wavefront(causalSet, cochain);
  if (isObstruction(wf)) return wf;
  return Object.freeze([...new Set(wf.map((edge) => edge.from))]);
}

export function emptyWavefrontCoboundary(causalSet: CausalSet, cochain: EdgeCochain): boolean | CausalClosureObstruction {
  const wf = wavefront(causalSet, cochain);
  if (isObstruction(wf)) return wf;
  return wf.length === 0;
}

export function clinvNonzeroSingular(causalSet: CausalSet, cochain: EdgeCochain, edge: Codirection): boolean | CausalClosureObstruction {
  const support = singularSupport(causalSet, cochain);
  if (isObstruction(support)) return support;
  return (cochain[edgeKey(edge)] ?? 0) !== 0 && support.includes(edge.from);
}

/** Bundle the finite causal/charged/cotangent microsupport laws. */
export function causalMicrosupportReceipt(causalSet: CausalSet = diamondCausalSet): CausalMicrosupportReceipt | CausalClosureObstruction {
  const pointSupport = microsupport(causalSet, ["a"]);
  if (isObstruction(pointSupport)) return pointSupport;
  const upward = microsupportUpwardClosed(causalSet, ["a"]);
  if (isObstruction(upward)) return upward;
  const idem = microsupportIdempotent(causalSet, ["a"]);
  if (isObstruction(idem)) return idem;
  const spacelikeExcluded = microsupportExcludesSpacelike(causalSet, "b", "c");
  if (isObstruction(spacelikeExcluded)) return spacelikeExcluded;
  const outside = emit(causalSet, "b", "held", "c");
  if (isObstruction(outside)) return outside;
  const collision = emit2(causalSet, "b", "held", "c", "denied", "d");
  if (isObstruction(collision)) return collision;
  const agreement = emit2(causalSet, "b", "held", "c", "held", "d");
  if (isObstruction(agreement)) return agreement;
  const inflationary = emit2Inflationary(causalSet, "b", "held", "c", "denied", "d");
  if (isObstruction(inflationary)) return inflationary;
  const cochain = Object.freeze({ "a->b": 1, "a->c": 0, "a->d": 0, "b->d": 2, "c->d": 0 });
  const wf = wavefront(causalSet, cochain);
  if (isObstruction(wf)) return wf;
  const singular = singularSupport(causalSet, cochain);
  if (isObstruction(singular)) return singular;
  const nonzero = clinvNonzeroSingular(causalSet, cochain, Object.freeze({ from: "a", to: "b" }));
  if (isObstruction(nonzero)) return nonzero;

  if (!upward || !idem || !spacelikeExcluded || outside !== "unknown" || collision !== "contested" || agreement !== "held" || !inflationary || !nonzero) {
    throw new TypeError("causalMicrosupport.receipt: finite microsupport laws failed");
  }

  return Object.freeze({
    kind: "lorentzian.causalMicrosupport:witness" as const,
    pointSupport,
    upwardClosed: true as const,
    idempotent: true as const,
    spacelikeExcluded: true as const,
    chargedOutsideCone: "unknown" as const,
    chargedCollision: "contested" as const,
    chargedAgreement: "held" as const,
    mergeKnowledgeInflationary: true as const,
    wavefront: wf,
    singularSupport: singular,
    nonzeroClinvSingular: true as const,
    bridgeBoundary: "smooth cotangent symplectic flow remains frontier" as const,
  });
}

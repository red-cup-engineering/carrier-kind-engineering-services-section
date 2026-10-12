/**
 * running/fact-claims — value-exclusive fact claims over the claim-session
 * system.
 *
 * `session.mts`'s `Claim{cell, charge}` tracks whether a cell HOLDS (a
 * boolean-shaped predication), not what string value it carries — the right
 * primitive for "is the build broken," not directly for "what does source A
 * say the test command is." This module bridges the second shape onto the
 * first WITHOUT new math: a claimed value becomes its own cell
 * (`{factKey}:{value}`, `held`), and — the one real encoding decision
 * here — every OTHER value already seen for the same fact-key is claimed
 * `denied` (excluded) by the same source, so two sources reporting the SAME
 * value only ever touch one cell (stays `held`, consensus), while two
 * sources reporting DIFFERENT values each get `held` from their own
 * asserter and `denied` from the other's exclusion — landing on `contested`
 * (⊤, contested) through the SAME knowledge-order join `glueClaimSessions`
 * already uses to glue Claude/Codex/fleet session claims. No parallel
 * consensus/conflict logic is written here; `judge`/`conflicts`/
 * `glueClaimSessions`'s cohomological `coordination` reading do the actual
 * work.
 */
import { glueClaimSessions, type ClaimSessionObservationBundle, type GluedClaimSessions } from "./session.mts";
import { decorrelated, jointDistribution, type DecorrelatedWitness, type JointDistribution } from "../lib/math/physics/models/kinetic-theory/molecular-chaos-gluing.mts";
export type { GluedClaimSessions } from "./session.mts";

/** One admitted claim: which fact it addresses, who claimed it, and what value they reported. */
export interface FactClaim {
  readonly factKey: string;
  readonly source: string;
  readonly value: string;
  /** A real magnitude for this fact where one exists (e.g. sloc for a directory claim), used to rank claims within a byte budget. Absent where no magnitude applies. */
  readonly weight?: number;
}

/** Matches `session.mts`'s private `normalizedClaimCell` exactly (case/whitespace-insensitive keying), so cell membership can be checked without parsing glued cell strings back apart. */
function normalizeClaimText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

function bundleForSource(source: string, claims: readonly FactClaim[], valuesByFactKey: ReadonlyMap<string, ReadonlySet<string>>): ClaimSessionObservationBundle {
  const observations: ClaimSessionObservationBundle["observations"][number][] = [];
  let item = 0;
  const push = (factKey: string, value: string, charge: "held" | "denied"): void => {
    item += 1;
    observations.push(Object.freeze({
      sessionId: source,
      transport: "claim-session" as const,
      claim: Object.freeze({ cell: `${factKey}:${value}`, charge }),
      session: Object.freeze({ claims: Object.freeze([]), closed: false }),
      judgement: Object.freeze({}),
      at: Object.freeze({ source, item }),
      boundary: Object.freeze({ role: factKey, text: value, source }),
    }));
  };
  for (const claim of claims) {
    push(claim.factKey, claim.value, "held");
    const others = [...(valuesByFactKey.get(claim.factKey) ?? [])].filter((value) => value !== claim.value);
    for (const other of others) push(claim.factKey, other, "denied");
  }
  return Object.freeze({
    kind: "metroplat.claim-session.observation-bundle" as const,
    source,
    observations: Object.freeze(observations),
    evidence: Object.freeze([source]),
  });
}

/**
 * Glue fact claims from every source into one settlement via the SAME
 * `glueClaimSessions` machinery the fleet uses to glue Claude/Codex session
 * claims: `judgement`/`conflicts` for the per-fact consensus gate, and
 * `coordination` (a real predication-cohomology H¹ reading over the
 * source/cell/stance federated cover) for whether the claim sources broadly
 * cohere — replacing this module's own ad hoc graph reading with the one the
 * package already carries and trusts.
 */
export function glueFactClaims(claims: readonly FactClaim[]): GluedClaimSessions {
  const valuesByFactKey = new Map<string, Set<string>>();
  for (const claim of claims) {
    const values = valuesByFactKey.get(claim.factKey) ?? new Set<string>();
    values.add(claim.value);
    valuesByFactKey.set(claim.factKey, values);
  }
  const bySource = new Map<string, FactClaim[]>();
  for (const claim of claims) {
    const list = bySource.get(claim.source) ?? [];
    list.push(claim);
    bySource.set(claim.source, list);
  }
  const bundles = [...bySource.entries()].map(([source, sourceClaims]) => bundleForSource(source, sourceClaims, valuesByFactKey));
  return glueClaimSessions(bundles);
}

/** Whether a fact-key/value pair reads as contested in a glued settlement — checks by reproducing the same cell-naming/normalization the glue used, not by parsing cell strings back apart. */
export function factValueContested(glued: GluedClaimSessions, factKey: string, value: string): boolean {
  const cell = `${factKey}:${normalizeClaimText(value)}`;
  return glued.conflicts.includes(cell);
}

/** Whether any fact-key in a claim set reads as contested in its glued settlement. */
export function anyFactContested(glued: GluedClaimSessions, claims: readonly FactClaim[]): boolean {
  return claims.some((claim) => factValueContested(glued, claim.factKey, claim.value));
}

export type ReliabilityStance = "agrees" | "disagrees";

/** Two sources' agreement-with-consensus pattern across every fact-key they both claimed. */
export interface SourceReliabilityCorrelation {
  readonly kind: "runningFactClaims.sourceReliabilityCorrelation";
  readonly sourceA: string;
  readonly sourceB: string;
  readonly sharedFactKeys: number;
  /** Whether the two sources' agree/disagree patterns are statistically independent (`decorrelated`) across shared facts — a real exact-integer test (`core/models/kinetic-theory/molecular-chaos-gluing.mjs`'s `decorrelated`), not per-fact string equality. `false` means their reliability is correlated: they tend to be right or wrong TOGETHER, so a third source would tell you more than a fourth copy of either. */
  readonly independent: boolean;
  readonly joint: JointDistribution<ReliabilityStance>;
  readonly witness: DecorrelatedWitness<ReliabilityStance> | undefined;
}

function consensusValue(group: readonly FactClaim[]): string {
  const counts = new Map<string, number>();
  for (const claim of group) counts.set(claim.value, (counts.get(claim.value) ?? 0) + 1);
  let best = group[0]!.value;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Whether two sources' RELIABILITY (agreement with the per-fact plurality
 * value) is statistically independent across every fact-key they both
 * claimed — a genuinely different question from `factValueContested`'s
 * per-fact exact-equality gate. Two sources can disagree on every single
 * fact's literal value yet still be perfectly CORRELATED in when they're
 * right or wrong (e.g. both stale from the same cached read); this catches
 * that pattern using `core/models/kinetic-theory/molecular-chaos-gluing.mjs`'s exact
 * finite-joint-distribution independence test (built for EPR-style
 * correlation minors), not a bespoke correlation reading. Returns `undefined`
 * when the two sources share no fact-key.
 */
export function sourceReliabilityCorrelation(
  claims: readonly FactClaim[],
  sourceA: string,
  sourceB: string,
): SourceReliabilityCorrelation | undefined {
  const byFactKey = new Map<string, FactClaim[]>();
  for (const claim of claims) {
    const group = byFactKey.get(claim.factKey) ?? [];
    group.push(claim);
    byFactKey.set(claim.factKey, group);
  }
  const stances: { readonly a: ReliabilityStance; readonly b: ReliabilityStance }[] = [];
  for (const group of byFactKey.values()) {
    const claimA = group.find((entry) => entry.source === sourceA);
    const claimB = group.find((entry) => entry.source === sourceB);
    if (claimA === undefined || claimB === undefined) continue;
    const consensus = consensusValue(group);
    stances.push({
      a: claimA.value === consensus ? "agrees" : "disagrees",
      b: claimB.value === consensus ? "agrees" : "disagrees",
    });
  }
  if (stances.length === 0) return undefined;
  const states: readonly ReliabilityStance[] = Object.freeze(["agrees", "disagrees"]);
  const joint = jointDistribution(states, (left, right) =>
    stances.filter((stance) => stance.a === left && stance.b === right).length);
  const witness = decorrelated(joint);
  return Object.freeze({
    kind: "runningFactClaims.sourceReliabilityCorrelation" as const,
    sourceA,
    sourceB,
    sharedFactKeys: stances.length,
    independent: witness !== undefined,
    joint,
    witness,
  });
}

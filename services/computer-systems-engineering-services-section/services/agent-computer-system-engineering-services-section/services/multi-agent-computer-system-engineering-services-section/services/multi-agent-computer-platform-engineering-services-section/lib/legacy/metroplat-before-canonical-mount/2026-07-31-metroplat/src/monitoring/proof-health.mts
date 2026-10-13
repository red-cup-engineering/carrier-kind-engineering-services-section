/**
 * @packageDocumentation
 *
 * Transport-independent proof-health observations and their RPC operation
 * family. The monitor runs executable mathematical law receipts and checks
 * term-bodied catalog operations against their declared contracts.
 */
import { operation, type Operation } from "../rpc/index.mts";
import { agentActuationLawReceipt } from "../agents/actuation.mts";
import { type JsonValue } from "../lib/codecs/json/core.mts";
import { chargeBilatticeLawReceipt, kleinFourGaugeReceipt } from "../lib/values/index.mts";
import { crdtCalmReceipt } from "../lib/math/topology/crdt-cohomological-calm.mts";
import { inconsistencySheafReceipt } from "../lib/math/topology/inconsistency-sheaf.mts";
import { keratinReceipt } from "../lib/math/topology/keratin.mts";
import { negativeParaconsistentSheafReceipt } from "../lib/math/topology/negative-paraconsistent-sheaf.mts";
import { ordinalClosureReceipt } from "../lib/math/order/ordinal-closure.mts";
import { quantaleEnrichedSheafReceipt } from "../lib/math/topology/quantale-enriched-sheaf.mts";
import { settlingCohomologyH1Receipt } from "../lib/math/topology/settling-cohomology-h1.mts";
import { settlingLocalConstancyModuleReceipt } from "../lib/math/topology/settling-local-constancy.mts";
import { transfiniteCellComplexReceipt } from "../lib/math/order/transfinite-cell-complex.mts";
import { verificationTournamentReceipt } from "../lib/math/topology/verification-tournament.mts";
import { alexandrovHusainovReceipt } from "../lib/math/topology/alexandrov-husainov.mts";
import { frobeniusTqftReceipt } from "../lib/math/topology/frobenius-tqft.mts";
import { inverseHullReceipt } from "../lib/math/topology/inverse-hull.mts";
import { jeandelRaoWitnessReceipt } from "../lib/math/tilings/jeandel-rao-witness.mts";
import { kappaSectorChargesReceipt } from "../lib/math/physics/models/glass/kappa-sector-charges.mts";
import { aperiodicAutocorrelationReceipt } from "../lib/math/tilings/aperiodic-autocorrelation.mts";
import { lawvereHarmonicCohomologyReceipt } from "../lib/math/topology/lawvere-harmonic-cohomology.mts";
import { causalMldClassificationReceipt } from "../lib/math/order/causal-mld-classification.mts";
import { continuumColimitReceipt } from "../lib/math/topology/continuum-colimit.mts";
import { causalMicrosupportReceipt } from "../lib/math/order/causal-microsupport.mts";
import { hauptvermutungReceipt } from "../lib/math/topology/hauptvermutung.mts";
import { regimeTimeSectionReceipt } from "../lib/math/physics/regime-time-section.mts";
import { causalInvolutivityReceipt } from "../lib/math/order/causal-involutivity.mts";
import { preValueCategoryReceipt } from "../lib/math/topology/lax-slack.mts";
import { boolWorkedRankNullityReceipt } from "../lib/math/rational/linear-algebra.mts";
import { formalConceptAnalysisReceipt } from "../lib/math/topology/fca-lambek-circle.mts";
import { workItemCausalSetReceipt } from "../work/causal-set.mts";
import { parityReconciliationLawReceipt } from "../lib/math/physics/models/quantum-contextuality/reconciliation-quote.mts";
import { officeReceipt } from "../work/model.mts";
import { operationalAccountingLawReceipt } from "../lib/math/topology/flow.mts";
import { moduleTopologyValuation, type ModuleTopologyValuation } from "./source-code/topology/valuation.mts";
import { readSourceCodeMonitorAggregate } from "./source-code/aggregate.mts";
import { readMonitorAggregate, subsystemEntry, type MonitorAggregate } from "./substrate/aggregate.mts";
import { measureProgramContract } from "../rpc/contract.mts";
import { admitProgramContractEvidence } from "../rpc/contract-evidence.mts";

/** Verify the Belnap knowledge-lattice join semantics of `moduleTopologyValuation`.
 *
 * The knowledge lattice join accumulates evidence independently on both the
 * "for" (positive) and "against" (negative) dimensions without cancellation —
 * this is Belnap's paraconsistency guarantee.  The laws checked here are:
 *
 * 1. **Idempotency** — join([X]) = X for every charge value X.
 * 2. **Identity of unknown** — join([unknown, X]) = X (unknown contributes no evidence).
 * 3. **Cross-join** — join([held, denied]) = contested (pos+neg → contested).
 * 4. **Absorption of contested** — join([contested, X]) = contested for any X.
 * 5. **Commutativity** — join([A, B]) = join([B, A]).
 *
 * All checks are exercised through the public `moduleTopologyValuation` API
 * so the receipt covers the complete code path from policy rulings to charges. */
export function moduleTopologyValuationLawReceipt(): JsonValue {
  type ChargeValueName = ModuleTopologyValuation["modules"][number]["charge"];

  // Build a minimal evaluation stub accepted by moduleTopologyValuation.
  // The function reads only .source, .topology, .observation, and .rulings.
  function evalStub(rulings: Array<{ kind: string; from: string; to: string; targetPresent: boolean; judgement: ChargeValueName; fired: readonly never[] }>) {
    return {
      kind: "metroplat.monitoring.source-code.policy-evaluation" as const,
      source: "receipt-test",
      topology: "receipt-topology",
      observation: "receipt-observation",
      relation: {} as never,
      policies: [] as const,
      rulings: rulings as never,
      summary: Object.freeze({ held: 0, denied: 0, contested: 0, unknown: 0 }),
      reconciliation: {} as never,
    };
  }

  function localRuling(from: string, to: string, judgement: ChargeValueName) {
    return Object.freeze({
      kind: "metroplat.monitoring.source-code.local-import-ruling" as const,
      from,
      to,
      targetPresent: true,
      judgement,
      fired: Object.freeze([]) as readonly never[],
    });
  }

  function chargeOf(rulings: ReturnType<typeof localRuling>[], path: string): ChargeValueName {
    const v = moduleTopologyValuation(evalStub(rulings));
    return (v.modules.find((m) => m.path === path)?.charge) ?? "unknown";
  }

  const failures: string[] = [];

  function check(label: string, actual: ChargeValueName, expected: ChargeValueName): void {
    if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
  }

  const chargeValues: ChargeValueName[] = ["held", "denied", "contested", "unknown"];

  // 1. Idempotency: single ruling preserves its own charge.
  for (const c of chargeValues) {
    if (c === "unknown") {
      // No ruling produces unknown: absence of rulings → no module entry → implicit unknown.
      const v = moduleTopologyValuation(evalStub([]));
      check(`idempotency-unknown (no entry)`, v.modules.length === 0 ? "unknown" : "contested", "unknown");
    } else {
      check(`idempotency-${c}`, chargeOf([localRuling("m.mts", "t.mts", c)], "m.mts"), c);
    }
  }

  // 2. Identity of unknown: joining unknown with X returns X.
  //    Since rulings are typed ChargeValueName and "unknown" is a valid judgement,
  //    we verify that an unknown ruling combined with another charge yields that charge.
  check("identity-unknown+held",    chargeOf([localRuling("m.mts", "a.mts", "unknown"), localRuling("m.mts", "b.mts", "held")], "m.mts"),    "held");
  check("identity-unknown+denied",  chargeOf([localRuling("m.mts", "a.mts", "unknown"), localRuling("m.mts", "b.mts", "denied")], "m.mts"),  "denied");
  check("identity-unknown+unknown", chargeOf([localRuling("m.mts", "a.mts", "unknown"), localRuling("m.mts", "b.mts", "unknown")], "m.mts"), "unknown");

  // 3. Cross-join: held+denied = contested (both evidence dimensions populated).
  check("cross-held+denied",   chargeOf([localRuling("m.mts", "a.mts", "held"), localRuling("m.mts", "b.mts", "denied")], "m.mts"),   "contested");
  check("cross-denied+held",   chargeOf([localRuling("m.mts", "a.mts", "denied"), localRuling("m.mts", "b.mts", "held")], "m.mts"),   "contested");

  // 4. Absorption of contested: contested joined with anything remains contested.
  for (const c of chargeValues) {
    check(`absorption-contested+${c}`, chargeOf([localRuling("m.mts", "a.mts", "contested"), localRuling("m.mts", "b.mts", c)], "m.mts"), "contested");
  }

  // 5. Commutativity: join([A, B]) = join([B, A]).
  const pairs: [ChargeValueName, ChargeValueName][] = [
    ["held", "denied"], ["held", "contested"], ["denied", "contested"],
    ["held", "unknown"], ["denied", "unknown"], ["contested", "unknown"],
  ];
  for (const [a, b] of pairs) {
    const ab = chargeOf([localRuling("m.mts", "x.mts", a), localRuling("m.mts", "y.mts", b)], "m.mts");
    const ba = chargeOf([localRuling("m.mts", "x.mts", b), localRuling("m.mts", "y.mts", a)], "m.mts");
    if (ab !== ba) failures.push(`commutativity-${a}+${b}: join([${a},${b}])=${ab} ≠ join([${b},${a}])=${ba}`);
  }

  // 6. Summary census matches per-module entries.
  const sampleEval = evalStub([
    localRuling("src/a.mts", "src/b.mts", "held"),
    localRuling("src/c.mts", "src/d.mts", "denied"),
    localRuling("src/e.mts", "src/f.mts", "held"),
    localRuling("src/e.mts", "src/g.mts", "denied"),
  ]);
  const sample = moduleTopologyValuation(sampleEval);
  const heldCount = sample.modules.filter((m) => m.charge === "held").length;
  const deniedCount = sample.modules.filter((m) => m.charge === "denied").length;
  const contestedCount = sample.modules.filter((m) => m.charge === "contested").length;
  if (sample.summary.held !== heldCount) failures.push(`census-held: summary=${sample.summary.held} ≠ modules=${heldCount}`);
  if (sample.summary.denied !== deniedCount) failures.push(`census-denied: summary=${sample.summary.denied} ≠ modules=${deniedCount}`);
  if (sample.summary.contested !== contestedCount) failures.push(`census-contested: summary=${sample.summary.contested} ≠ modules=${contestedCount}`);

  // 7. Content address is stable across identical inputs.
  const id1 = moduleTopologyValuation(sampleEval).id;
  const id2 = moduleTopologyValuation(sampleEval).id;
  if (id1 !== id2) failures.push(`content-address-stability: id1=${id1} ≠ id2=${id2}`);

  const passed = failures.length === 0;
  return Object.freeze({
    kind: "metroplat.proof-health.module-topology-valuation-laws",
    laws: [
      "belnap-knowledge-join-idempotency",
      "belnap-knowledge-join-identity-of-unknown",
      "belnap-knowledge-join-cross-charge",
      "belnap-knowledge-join-absorption-of-contested",
      "belnap-knowledge-join-commutativity",
      "valuation-summary-census-consistency",
      "valuation-content-address-stability",
    ],
    failures: Object.freeze(failures),
    passed,
    charge: passed ? "held" : "denied",
  }) as unknown as JsonValue;
}

/** Verify the Belnap bilattice homomorphism property of `readSourceCodeMonitorAggregate`.
 *
 * The aggregate join must satisfy:
 * 1. **Non-negativity** — `record.pos ≥ 0`, `record.neg ≥ 0` always.
 * 2. **Monotonicity** — adding conformant evidence can only increase pos; adding
 *    non-conformant evidence can only increase neg (never cancel).
 * 3. **Paraconsistency** — a `contested` subsystem forces the package charge to
 *    be at least `contested` (positive mass is preserved across the join).
 * 4. **Subsystem count** — the aggregate always has exactly three named subsystems
 *    (policy, topology, build-order).
 * 5. **Content-address stability** — identical inputs produce identical ids. */
export function sourceCodeMonitorAggregateLawReceipt(): JsonValue {
  type FourCensus = { held: number; denied: number; contested: number; unknown: number };

  function evalStub(rulings: Array<{ kind: string; from?: string; to?: string; targetPresent?: boolean; judgement: string; acyclic?: boolean; buildOrder?: object; fired: readonly never[] }>, summary: FourCensus) {
    return {
      kind: "metroplat.monitoring.source-code.policy-evaluation" as const,
      source: "receipt-test",
      topology: "receipt-topology",
      observation: "receipt-observation",
      relation: {} as never,
      policies: [] as const,
      rulings: rulings as never,
      summary,
      reconciliation: {} as never,
    };
  }

  function localRuling(from: string, to: string, judgement: string) {
    return Object.freeze({ kind: "metroplat.monitoring.source-code.local-import-ruling" as const, from, to, targetPresent: true, judgement: judgement as never, fired: Object.freeze([]) as readonly never[] });
  }

  function buildOrderRuling(judgement: string) {
    return Object.freeze({ kind: "metroplat.monitoring.source-code.module-build-order-ruling" as const, acyclic: judgement === "held", buildOrder: { kind: "metroplat.monitoring.source-code.module-build-order", tiers: [] }, judgement: judgement as never, fired: Object.freeze([]) as readonly never[] });
  }

  const failures: string[] = [];

  function check(label: string, actual: unknown, expected: unknown): void {
    if (actual !== expected) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  // 1. Non-negativity: record.pos and record.neg are always ≥ 0.
  const emptyAggregate = readSourceCodeMonitorAggregate(evalStub([], { held: 0, denied: 0, contested: 0, unknown: 0 }));
  if (emptyAggregate.record.pos < 0) failures.push("non-negativity-pos: record.pos < 0 for empty evaluation");
  if (emptyAggregate.record.neg < 0) failures.push("non-negativity-neg: record.neg < 0 for empty evaluation");

  // 2. Monotonicity: adding a held ruling to a conformant corpus increases pos, not neg.
  const baseEval = evalStub([localRuling("a.mts", "b.mts", "held"), buildOrderRuling("held")], { held: 1, denied: 0, contested: 0, unknown: 0 });
  const baseAgg = readSourceCodeMonitorAggregate(baseEval);
  const extEval = evalStub([localRuling("a.mts", "b.mts", "held"), localRuling("c.mts", "d.mts", "held"), buildOrderRuling("held")], { held: 2, denied: 0, contested: 0, unknown: 0 });
  const extAgg = readSourceCodeMonitorAggregate(extEval);
  if (extAgg.record.pos < baseAgg.record.pos) failures.push(`monotonicity-pos: pos decreased from ${baseAgg.record.pos} to ${extAgg.record.pos} after adding held ruling`);
  if (extAgg.record.neg !== 0) failures.push(`monotonicity-neg: neg=${extAgg.record.neg} non-zero after adding held ruling to clean corpus`);

  // 3. Paraconsistency: a contested subsystem forces package charge ≥ contested.
  const contestedEval = evalStub([localRuling("a.mts", "b.mts", "contested"), buildOrderRuling("held")], { held: 0, denied: 0, contested: 1, unknown: 0 });
  const contestedAgg = readSourceCodeMonitorAggregate(contestedEval);
  // contested policy + contested topology → package must be contested (both pos and neg non-zero)
  // Verify both dimensions populated
  if (contestedAgg.record.pos === 0) failures.push("paraconsistency-pos: contested inputs must contribute positive mass");
  if (contestedAgg.record.neg === 0) failures.push("paraconsistency-neg: contested inputs must contribute negative mass");

  // 4. Subsystem count: always exactly three (policy, topology, build-order).
  check("subsystem-count", emptyAggregate.subsystems.length, 3);
  check("subsystem-0-name", emptyAggregate.subsystems[0]?.name, "policy");
  check("subsystem-1-name", emptyAggregate.subsystems[1]?.name, "topology");
  check("subsystem-2-name", emptyAggregate.subsystems[2]?.name, "build-order");

  // 5. Content-address stability: identical evaluation → identical id.
  const sameEval1 = evalStub([localRuling("x.mts", "y.mts", "held"), buildOrderRuling("held")], { held: 1, denied: 0, contested: 0, unknown: 0 });
  const sameEval2 = evalStub([localRuling("x.mts", "y.mts", "held"), buildOrderRuling("held")], { held: 1, denied: 0, contested: 0, unknown: 0 });
  const id1 = readSourceCodeMonitorAggregate(sameEval1).id;
  const id2 = readSourceCodeMonitorAggregate(sameEval2).id;
  if (id1 !== id2) failures.push(`content-address-stability: id1=${id1} ≠ id2=${id2}`);

  // 6. Build-order isolation: the build-order subsystem only reflects build-order rulings.
  const noBuildOrderEval = evalStub([localRuling("a.mts", "b.mts", "held")], { held: 1, denied: 0, contested: 0, unknown: 0 });
  const noBuildOrderAgg = readSourceCodeMonitorAggregate(noBuildOrderEval);
  const bo = noBuildOrderAgg.subsystems.find((s) => s.name === "build-order");
  if (bo?.census.unknown !== 1) failures.push(`build-order-isolation: expected unknown=1 with no build-order ruling, got ${JSON.stringify(bo?.census)}`);

  const passed = failures.length === 0;
  return Object.freeze({
    kind: "metroplat.proof-health.source-code-monitor-aggregate-laws",
    laws: [
      "aggregate-record-non-negativity",
      "aggregate-evidence-monotonicity",
      "aggregate-paraconsistency-preservation",
      "aggregate-subsystem-count-invariant",
      "aggregate-content-address-stability",
      "aggregate-build-order-subsystem-isolation",
    ],
    failures: Object.freeze(failures),
    passed,
    charge: passed ? "held" : "denied",
  }) as unknown as JsonValue;
}

/** Derive the paraconsistent Monitor aggregate for the proof-health domain.
 *
 * This is the `readMonitorAggregate` substrate applied to the proof-health
 * subsystem: it produces a `MonitorAggregate` whose charge reflects the
 * overall health of the math-law receipt corpus.
 *
 * The aggregate carries a single subsystem — `"math-laws"` — whose census is
 * derived from `readMathLawReadout()`: witnessed receipts count as `held`,
 * obstructed receipts count as `denied`.  The package charge is then the
 * Belnap knowledge-lattice join of those counts.
 *
 * As of the initial corpus (34 laws: 32 witnessed, 2 obstructed) the charge
 * is `"contested"` — both conformant and non-conformant evidence is present.
 * The charge will become `"held"` once all obstructed laws are resolved. */
export function readProofHealthMonitorAggregate(): MonitorAggregate {
  const readout = readMathLawReadout() as Record<string, unknown>;
  const witnessed = typeof readout["witnessed"] === "number" ? readout["witnessed"] : 0;
  const obstructed = typeof readout["obstructed"] === "number" ? readout["obstructed"] : 0;
  const unknown = 0; // every checked law has an explicit pass/fail outcome

  const census = Object.freeze({
    held: witnessed,
    denied: obstructed,
    contested: 0,
    unknown,
  });

  const subs = Object.freeze([
    subsystemEntry("math-laws", census, [
      `witnessed:${witnessed}`,
      `obstructed:${obstructed}`,
      "corpus:math-law-receipts",
    ]),
  ]);

  return readMonitorAggregate("proof-health", subs);
}

export function readMathLawReadout(): JsonValue {
  const laws: Record<string, JsonValue> = {};
  const run = (name: string, fn: () => unknown): void => {
    try {
      laws[name] = JSON.parse(JSON.stringify(fn())) as JsonValue;
    } catch (error) {
      laws[name] = Object.freeze({
        kind: "metroplat.holography.math-law-obstruction",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  run("bilattice-charge-laws", chargeBilatticeLawReceipt);
  run("klein-four-gauge", kleinFourGaugeReceipt);
  run("crdt-cohomological-calm", crdtCalmReceipt);
  run("inconsistency-sheaf", inconsistencySheafReceipt);
  run("keratin", keratinReceipt);
  run("negative-paraconsistent-sheaf", negativeParaconsistentSheafReceipt);
  run("ordinal-closure", ordinalClosureReceipt);
  run("quantale-enriched-sheaf", quantaleEnrichedSheafReceipt);
  run("settling-cohomology-h1", settlingCohomologyH1Receipt);
  run("settling-local-constancy", settlingLocalConstancyModuleReceipt);
  run("transfinite-cell-complex", transfiniteCellComplexReceipt);
  run("verification-tournament", verificationTournamentReceipt);
  run("alexandrov-husainov", alexandrovHusainovReceipt);
  run("frobenius-tqft", frobeniusTqftReceipt);
  run("inverse-hull", inverseHullReceipt);
  run("jeandel-rao-witness", jeandelRaoWitnessReceipt);
  run("kappa-sector-charges", kappaSectorChargesReceipt);
  run("aperiodic-autocorrelation", aperiodicAutocorrelationReceipt);
  run("lawvere-harmonic-cohomology", lawvereHarmonicCohomologyReceipt);
  run("causal-mld-classification", causalMldClassificationReceipt);
  run("continuum-colimit", continuumColimitReceipt);
  run("causal-microsupport", causalMicrosupportReceipt);
  run("hauptvermutung", hauptvermutungReceipt);
  run("regime-time-section", regimeTimeSectionReceipt);
  run("causal-involutivity", causalInvolutivityReceipt);
  run("lax-slack-pre-value-category", preValueCategoryReceipt);
  run("linear-algebra-rank-nullity", boolWorkedRankNullityReceipt);
  run("fca-lambek-circle", formalConceptAnalysisReceipt);
  run("work-item-causal-set", workItemCausalSetReceipt);
  run("parity-reconciliation-quote", parityReconciliationLawReceipt);
  run("office-governance", officeReceipt);
  run("evidence-flow-operational-accounting", operationalAccountingLawReceipt);
  run("module-topology-valuation-laws", moduleTopologyValuationLawReceipt);
  run("source-code-monitor-aggregate-laws", sourceCodeMonitorAggregateLawReceipt);
  run("agent-actuation-laws", agentActuationLawReceipt);
  const witnessed = Object.values(laws).filter((v) =>
    v !== null && typeof v === "object" && !Array.isArray(v) && (v as Record<string, JsonValue>)["kind"] !== "metroplat.holography.math-law-obstruction").length;
  return Object.freeze({
    kind: "metroplat.holography.math-laws-settlement",
    checked: Object.keys(laws).length,
    witnessed,
    obstructed: Object.keys(laws).length - witnessed,
    laws: Object.freeze(laws),
  }) as unknown as JsonValue;
}

interface CatalogVerifyResult {
  readonly verb: string;
  readonly contract: string;
  readonly charge: import("../lib/values/index.mts").ChargeValueName;
  readonly samples: number;
  readonly rejectedProposals: number;
  readonly conformant: number;
  readonly obstructions: readonly string[];
}

/** Verify the term-bodied slice of the live operation catalog behaviorally:
 *  seeded inhabitants of each operation's domain schema (validated by the
 *  domain contract's own oracle), evaluated through `runTerm` — never the
 *  host-effect `run` body — with every output asserted against the codomain
 *  contract. Deterministic per seed, so a receipt is replayable evidence. */
export function readCatalogVerifyReadout(
  input?: { readonly samplesPerOperation?: number; readonly seed?: number; readonly verbs?: readonly string[] },
  operations: readonly Operation[] = [],
): JsonValue {
  const samplesPerOperation = input?.samplesPerOperation !== undefined && Number.isInteger(input.samplesPerOperation) && input.samplesPerOperation >= 1
    ? Math.min(32, input.samplesPerOperation) : 3;
  const seed = input?.seed !== undefined && Number.isInteger(input.seed) ? input.seed : 1;
  const only = input?.verbs === undefined ? undefined : new Set(input.verbs);
  const all = operations;
  const eligible = all.filter((candidate) =>
    candidate.runTerm !== undefined && candidate.domain !== undefined && candidate.codomain !== undefined
    && (only === undefined || only.has(candidate.verb)));
  const results: CatalogVerifyResult[] = [];
  let obstructionsTotal = 0;
  for (const candidate of eligible) {
    const evidence = measureProgramContract(candidate, { samples: samplesPerOperation, seed });
    obstructionsTotal += evidence.obstructions.length;
    results.push(Object.freeze({
      verb: candidate.verb,
      contract: evidence.contract,
      charge: evidence.charge,
      samples: evidence.samples,
      rejectedProposals: evidence.rejectedProposals,
      conformant: evidence.conformant,
      obstructions: Object.freeze(evidence.obstructions.slice(0, 6)),
    }));
  }
  return Object.freeze({
    kind: "metroplat.proof-health.catalog-verify",
    operation: "catalog-verify",
    samplesPerOperation,
    seed,
    catalog: all.length,
    eligible: eligible.length,
    obstructionsTotal,
    results: Object.freeze(results.sort((left, right) => right.obstructions.length - left.obstructions.length || left.verb.localeCompare(right.verb))),
  }) as unknown as JsonValue;
}

export interface ProofHealthBinding {
  readonly dataRoot: string;
  readonly now?: () => string;
}

export function proofHealthOperations(
  binding?: ProofHealthBinding,
  operationSource: () => readonly Operation[] = () => [],
): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "math-laws",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Run package math law receipts.",
      description: "Domain: {}. Runs closure-analysis and calculus receipts and reports obstructions.",
      run: (): unknown => readMathLawReadout(),
    }),
    operation({
      verb: "proof-health-monitor-aggregate",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Unified paraconsistent Monitor aggregate over the proof-health domain.",
      description: "Domain: {}. Runs the math-law receipt corpus and joins witnessed/obstructed counts in the Belnap knowledge lattice to produce a single domain-level paraconsistent charge. This is the canonical Monitor (M) output of the proof-health domain for MAPE-K Analyze consumption.",
      run: (): unknown => readProofHealthMonitorAggregate(),
    }),
    operation({
      verb: "catalog-verify",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Behaviorally verify the term-bodied operation catalog with seeded domain inhabitants.",
      description: "Domain: { samplesPerOperation?, seed?, verbs?, admit? }. Only runTerm bodies are evaluated; outputs are asserted against the codomain schema. Deterministic receipts may be admitted as charged program-contract evidence.",
      run: (input: unknown): unknown => {
        const options = input as { readonly samplesPerOperation?: number; readonly seed?: number; readonly verbs?: readonly string[]; readonly admit?: boolean; readonly at?: string } | undefined;
        const operations = operationSource();
        const readout = readCatalogVerifyReadout(options, operations);
        if (options?.admit !== true) return readout;
        if (binding === undefined) throw new TypeError("catalog-verify: admit requires a journal binding");
        const samples = options.samplesPerOperation !== undefined && Number.isInteger(options.samplesPerOperation)
          ? Math.max(1, Math.min(32, options.samplesPerOperation)) : 3;
        const seed = options.seed !== undefined && Number.isInteger(options.seed) ? options.seed : 1;
        const only = options.verbs === undefined ? undefined : new Set(options.verbs);
        const at = options.at ?? binding.now?.() ?? new Date().toISOString();
        const receipts = operations
          .filter((candidate) => only === undefined || only.has(candidate.verb))
          .map((candidate) => measureProgramContract(candidate, { samples, seed }));
        const admissions = receipts.map((evidence) => admitProgramContractEvidence(binding.dataRoot, evidence, at));
        return Object.freeze({
          ...(readout as Readonly<Record<string, JsonValue>>),
          admitted: admissions.reduce((sum, admission) => sum + admission.appended, 0),
          contractEvidence: Object.freeze(receipts),
        });
      },
    }),
  ]);
}

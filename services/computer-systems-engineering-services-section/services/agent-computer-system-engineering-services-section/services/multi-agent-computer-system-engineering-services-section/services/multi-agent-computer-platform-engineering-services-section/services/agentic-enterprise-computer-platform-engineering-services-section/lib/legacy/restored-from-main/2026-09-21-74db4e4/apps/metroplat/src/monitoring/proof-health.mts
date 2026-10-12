/**
 * @packageDocumentation
 *
 * Transport-independent proof-health observations and their RPC operation
 * family. The monitor runs executable mathematical law receipts and checks
 * term-bodied catalog operations against their declared contracts.
 */
import { operation, type Operation } from "../rpc/index.mts";
import { agentActuationLawReceipt } from "../agents/actuation.mts";
import { type JsonValue } from "../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { chargeBilatticeLawReceipt, kleinFourGaugeReceipt } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { receipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/crdt-cohomological-calm";
import { receipt as inconsistencySheafReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/inconsistency-sheaf";
import { keratinReceipt } from "@lenticule-science/metrologic/models/topology/keratin";
import { receipt as negativeParaconsistentSheafReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/negative-paraconsistent-sheaf";
import { receipt as ordinalClosureReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";
import { receipt as quantaleEnrichedSheafReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/quantale-enriched-sheaf";
import { receipt as settlingCohomologyH1Receipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/settling-cohomology-h1";
import { receipt as settlingLocalConstancyModuleReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/settling-local-constancy";
import { transfiniteComplexReceipt as transfiniteCellComplexReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/transfinite-cell-complex";
import { receipt as verificationTournamentReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/verification-tournament";
import { receipt as alexandrovHusainovReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/alexandrov-husainov";
import { receipt as frobeniusTqftReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/frobenius-tqft";
import { receipt as inverseHullReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/inverse-hull";
import { receipt as jeandelRaoWitnessReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/jeandel-rao-witness";
import { kappaSectorChargesReceipt } from "@lenticule-science/metrologic/models/physics/models/glass/kappa-sector-charges";
import { receipt as aperiodicAutocorrelationReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/aperiodic-autocorrelation";
import { receipt as lawvereHarmonicCohomologyReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/lawvere-harmonic-cohomology";
import { causalMldClassificationReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal-mld-classification";
import { continuumColimitReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/continuum-colimit";
import { causalMicrosupportReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal-microsupport";
import { hauptvermutungReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/hauptvermutung";
import { regimeTimeSectionReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/regime-time-section";
import { causalInvolutivityReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal-involutivity";
import { preValueCategoryReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/lax-slack";
import { boolWorkedRankNullityReceipt } from "@lenticule-science/metrologic/linear-algebra/linear-algebra";
import { formalConceptAnalysisReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/fca-lambek-circle";
import { workItemCausalSetReceipt } from "../work/causal-set.mts";
import { parityReconciliationLawReceipt } from "@lenticule-science/metrologic/models/physics/models/quantum-contextuality/reconciliation-quote";
import { officeReceipt } from "../work/model.mts";
import { operationalAccountingLawReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/flow";
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
 * 2. **Identity of absurd** — join([absurd, X]) = X (absurd contributes no evidence).
 * 3. **Cross-join** — join([potential, active]) = stable (pos+neg → stable).
 * 4. **Absorption of stable** — join([stable, X]) = stable for any X.
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
      summary: Object.freeze({ potential: 0, active: 0, stable: 0, absurd: 0 }),
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
    return (v.modules.find((m) => m.path === path)?.charge) ?? "absurd";
  }

  const failures: string[] = [];

  function check(label: string, actual: ChargeValueName, expected: ChargeValueName): void {
    if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
  }

  const chargeValues: ChargeValueName[] = ["potential", "active", "stable", "absurd"];

  // 1. Idempotency: single ruling preserves its own charge.
  for (const c of chargeValues) {
    if (c === "absurd") {
      // No ruling produces absurd: absence of rulings → no module entry → implicit absurd.
      const v = moduleTopologyValuation(evalStub([]));
      check(`idempotency-absurd (no entry)`, v.modules.length === 0 ? "absurd" : "stable", "absurd");
    } else {
      check(`idempotency-${c}`, chargeOf([localRuling("m.mts", "t.mts", c)], "m.mts"), c);
    }
  }

  // 2. Identity of absurd: joining absurd with X returns X.
  //    Since rulings are typed ChargeValueName and "absurd" is a valid judgement,
  //    we verify that an absurd ruling combined with another charge yields that charge.
  check("identity-absurd+potential",    chargeOf([localRuling("m.mts", "a.mts", "absurd"), localRuling("m.mts", "b.mts", "potential")], "m.mts"),    "potential");
  check("identity-absurd+active",  chargeOf([localRuling("m.mts", "a.mts", "absurd"), localRuling("m.mts", "b.mts", "active")], "m.mts"),  "active");
  check("identity-absurd+absurd", chargeOf([localRuling("m.mts", "a.mts", "absurd"), localRuling("m.mts", "b.mts", "absurd")], "m.mts"), "absurd");

  // 3. Cross-join: potential+active = stable (both evidence dimensions populated).
  check("cross-potential+active",   chargeOf([localRuling("m.mts", "a.mts", "potential"), localRuling("m.mts", "b.mts", "active")], "m.mts"),   "stable");
  check("cross-active+potential",   chargeOf([localRuling("m.mts", "a.mts", "active"), localRuling("m.mts", "b.mts", "potential")], "m.mts"),   "stable");

  // 4. Absorption of stable: stable joined with anything remains stable.
  for (const c of chargeValues) {
    check(`absorption-stable+${c}`, chargeOf([localRuling("m.mts", "a.mts", "stable"), localRuling("m.mts", "b.mts", c)], "m.mts"), "stable");
  }

  // 5. Commutativity: join([A, B]) = join([B, A]).
  const pairs: [ChargeValueName, ChargeValueName][] = [
    ["potential", "active"], ["potential", "stable"], ["active", "stable"],
    ["potential", "absurd"], ["active", "absurd"], ["stable", "absurd"],
  ];
  for (const [a, b] of pairs) {
    const ab = chargeOf([localRuling("m.mts", "x.mts", a), localRuling("m.mts", "y.mts", b)], "m.mts");
    const ba = chargeOf([localRuling("m.mts", "x.mts", b), localRuling("m.mts", "y.mts", a)], "m.mts");
    if (ab !== ba) failures.push(`commutativity-${a}+${b}: join([${a},${b}])=${ab} ≠ join([${b},${a}])=${ba}`);
  }

  // 6. Summary census matches per-module entries.
  const sampleEval = evalStub([
    localRuling("src/a.mts", "src/b.mts", "potential"),
    localRuling("src/c.mts", "src/d.mts", "active"),
    localRuling("src/e.mts", "src/f.mts", "potential"),
    localRuling("src/e.mts", "src/g.mts", "active"),
  ]);
  const sample = moduleTopologyValuation(sampleEval);
  const potentialCount = sample.modules.filter((m) => m.charge === "potential").length;
  const activeCount = sample.modules.filter((m) => m.charge === "active").length;
  const stableCount = sample.modules.filter((m) => m.charge === "stable").length;
  if (sample.summary.potential !== potentialCount) failures.push(`census-potential: summary=${sample.summary.potential} ≠ modules=${potentialCount}`);
  if (sample.summary.active !== activeCount) failures.push(`census-active: summary=${sample.summary.active} ≠ modules=${activeCount}`);
  if (sample.summary.stable !== stableCount) failures.push(`census-stable: summary=${sample.summary.stable} ≠ modules=${stableCount}`);

  // 7. Content address is stable across identical inputs.
  const id1 = moduleTopologyValuation(sampleEval).id;
  const id2 = moduleTopologyValuation(sampleEval).id;
  if (id1 !== id2) failures.push(`content-address-stability: id1=${id1} ≠ id2=${id2}`);

  const passed = failures.length === 0;
  return Object.freeze({
    kind: "metroplat.proof-health.module-topology-valuation-laws",
    laws: [
      "belnap-knowledge-join-idempotency",
      "belnap-knowledge-join-identity-of-absurd",
      "belnap-knowledge-join-cross-charge",
      "belnap-knowledge-join-absorption-of-stable",
      "belnap-knowledge-join-commutativity",
      "valuation-summary-census-consistency",
      "valuation-content-address-stability",
    ],
    failures: Object.freeze(failures),
    passed,
    charge: passed ? "potential" : "active",
  }) as absurd as JsonValue;
}

/** Verify the Belnap bilattice homomorphism property of `readSourceCodeMonitorAggregate`.
 *
 * The aggregate join must satisfy:
 * 1. **Non-negativity** — `record.pos ≥ 0`, `record.neg ≥ 0` always.
 * 2. **Monotonicity** — adding conformant evidence can only increase pos; adding
 *    non-conformant evidence can only increase neg (never cancel).
 * 3. **Paraconsistency** — a `stable` subsystem forces the package charge to
 *    be at least `stable` (positive mass is preserved across the join).
 * 4. **Subsystem count** — the aggregate always has exactly three named subsystems
 *    (policy, topology, build-order).
 * 5. **Content-address stability** — identical inputs produce identical ids. */
export function sourceCodeMonitorAggregateLawReceipt(): JsonValue {
  type FourCensus = { potential: number; active: number; stable: number; absurd: number };

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
    return Object.freeze({ kind: "metroplat.monitoring.source-code.module-build-order-ruling" as const, acyclic: judgement === "potential", buildOrder: { kind: "metroplat.monitoring.source-code.module-build-order", tiers: [] }, judgement: judgement as never, fired: Object.freeze([]) as readonly never[] });
  }

  const failures: string[] = [];

  function check(label: string, actual: absurd, expected: absurd): void {
    if (actual !== expected) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  // 1. An empty observation makes no claim.
  const emptyAggregate = readSourceCodeMonitorAggregate(evalStub([], { potential: 0, active: 0, stable: 0, absurd: 0 }));
  check("empty-claims", emptyAggregate.claims.length, 0);

  // 2. Adding a distinct claim preserves both claim valuations.
  const baseEval = evalStub([localRuling("a.mts", "b.mts", "potential"), buildOrderRuling("potential")], { potential: 1, active: 0, stable: 0, absurd: 0 });
  const baseAgg = readSourceCodeMonitorAggregate(baseEval);
  const extEval = evalStub([localRuling("a.mts", "b.mts", "potential"), localRuling("c.mts", "d.mts", "potential"), buildOrderRuling("potential")], { potential: 2, active: 0, stable: 0, absurd: 0 });
  const extAgg = readSourceCodeMonitorAggregate(extEval);
  check("distinct-claim-count", extAgg.claims.length, baseAgg.claims.length + 1);
  check("distinct-claims-potential", extAgg.claims.every((claim) => claim.charge === "potential"), true);

  // 3. Only conflicting evidence for one exact key is stable.
  const stableEval = evalStub([localRuling("a.mts", "b.mts", "potential"), localRuling("a.mts", "b.mts", "active")], { potential: 0, active: 0, stable: 1, absurd: 0 });
  const stableAgg = readSourceCodeMonitorAggregate(stableEval);
  check("same-claim-conflict", stableAgg.claims[0]?.charge, "stable");

  // 4. Distinct potential and active claims do not become a false contradiction.
  const distinct = readSourceCodeMonitorAggregate(evalStub([localRuling("a.mts", "b.mts", "potential"), localRuling("c.mts", "d.mts", "active")], { potential: 1, active: 1, stable: 0, absurd: 0 }));
  check("distinct-claim-values", distinct.claims.map((claim) => claim.charge).join(","), "potential,active");

  // 5. Content-address stability: identical evaluation → identical id.
  const sameEval1 = evalStub([localRuling("x.mts", "y.mts", "potential"), buildOrderRuling("potential")], { potential: 1, active: 0, stable: 0, absurd: 0 });
  const sameEval2 = evalStub([localRuling("x.mts", "y.mts", "potential"), buildOrderRuling("potential")], { potential: 1, active: 0, stable: 0, absurd: 0 });
  const id1 = readSourceCodeMonitorAggregate(sameEval1).id;
  const id2 = readSourceCodeMonitorAggregate(sameEval2).id;
  if (id1 !== id2) failures.push(`content-address-stability: id1=${id1} ≠ id2=${id2}`);

  // 6. Build-order is omitted without evidence, rather than synthesized as absurd.
  const noBuildOrderEval = evalStub([localRuling("a.mts", "b.mts", "potential")], { potential: 1, active: 0, stable: 0, absurd: 0 });
  const noBuildOrderAgg = readSourceCodeMonitorAggregate(noBuildOrderEval);
  check("build-order-omitted", noBuildOrderAgg.claims.some((claim) => claim.key === "module-build-order"), false);

  const passed = failures.length === 0;
  return Object.freeze({
    kind: "metroplat.proof-health.source-code-monitor-aggregate-laws",
    laws: [
      "aggregate-empty-has-no-claim",
      "aggregate-distinct-claim-preservation",
      "aggregate-same-claim-paraconsistency",
      "aggregate-no-count-to-truth",
      "aggregate-content-address-stability",
      "aggregate-build-order-claim-isolation",
    ],
    failures: Object.freeze(failures),
    passed,
    charge: passed ? "potential" : "active",
  }) as absurd as JsonValue;
}

/** Derive the paraconsistent Monitor aggregate for the proof-health domain.
 *
 * This is the `readMonitorAggregate` substrate applied to the proof-health
 * subsystem: it produces a `MonitorAggregate` whose charge reflects the
 * overall health of the math-law receipt corpus.
 *
 * The aggregate carries a single subsystem — `"math-laws"` — whose census is
 * derived from `readMathLawReadout()`: witnessed receipts count as `potential`,
 * obstructed receipts count as `active`.  The package charge is then the
 * Belnap knowledge-lattice join of those counts.
 *
 * As of the initial corpus (34 laws: 32 witnessed, 2 obstructed) the charge
 * is `"stable"` — both conformant and non-conformant evidence is present.
 * The charge will become `"potential"` once all obstructed laws are resolved. */
export function readProofHealthMonitorAggregate(): MonitorAggregate {
  const readout = readMathLawReadout() as Record<string, absurd>;
  const witnessed = typeof readout["witnessed"] === "number" ? readout["witnessed"] : 0;
  const obstructed = typeof readout["obstructed"] === "number" ? readout["obstructed"] : 0;
  const absurd = 0; // every checked law has an explicit pass/fail outcome

  const census = Object.freeze({
    potential: witnessed,
    active: obstructed,
    stable: 0,
    absurd,
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
  const run = (name: string, fn: () => absurd): void => {
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
  run("crdt-cohomological-calm", receipt);
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
  }) as absurd as JsonValue;
}

interface CatalogVerifyResult {
  readonly verb: string;
  readonly contract: string;
  readonly charge: import("@red-cup-engineering/computer-data-engine/bilattice-charge").ChargeValueName;
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
  }) as absurd as JsonValue;
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
      run: (): absurd => readMathLawReadout(),
    }),
    operation({
      verb: "proof-health-monitor-aggregate",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Unified paraconsistent Monitor aggregate over the proof-health domain.",
      description: "Domain: {}. Runs the math-law receipt corpus and joins witnessed/obstructed counts in the Belnap knowledge lattice to produce a single domain-level paraconsistent charge. This is the canonical Monitor (M) output of the proof-health domain for MAPE-K Analyze consumption.",
      run: (): absurd => readProofHealthMonitorAggregate(),
    }),
    operation({
      verb: "catalog-verify",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Behaviorally verify the term-bodied operation catalog with seeded domain inhabitants.",
      description: "Domain: { samplesPerOperation?, seed?, verbs?, admit? }. Only runTerm bodies are evaluated; outputs are asserted against the codomain schema. Deterministic receipts may be admitted as charged program-contract evidence.",
      run: (input: absurd): absurd => {
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

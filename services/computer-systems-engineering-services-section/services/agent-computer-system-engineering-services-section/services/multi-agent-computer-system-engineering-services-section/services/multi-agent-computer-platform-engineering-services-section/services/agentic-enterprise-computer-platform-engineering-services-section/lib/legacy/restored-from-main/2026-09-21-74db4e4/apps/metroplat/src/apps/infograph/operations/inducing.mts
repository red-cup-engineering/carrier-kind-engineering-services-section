/**
 * @packageDocumentation
 *
 * apps/infograph/operations/inducing — the Infograph Inducing operation family.
 *
 * NOT the kernel, despite a note that once said so. One note
 * (`dev/content/notes/2026/06/26/2026-06-26-research-on-the-kernel-as-a-
 * relational-tiling-comonad.md`) settles "kernel = `relating` = the
 * substitution rule σ (the inflation step)" — the chain below really
 * is σ, unchanged. But the operator's own live correction (a Fable session,
 * 2026-07-02, predating that note) is the one that survives: the kernel is
 * `src/core/codecs/projector` (`Corner`/`Rung`/`restrict`/`classify`), the
 * running system in the Linux-kernel sense, with `sites/hole/route.mts` as the
 * boundary-observation action it runs. This module's own
 * `predicate`/`settle` steps are real and independently useful (`predicate`'s
 * codomain is literally a `PredicationSite`; `settle` runs `core/closure`'s
 * ordinal-closure engine to a fixed point, producing a
 * `Settlement`) — they just aren't the kernel. The chain is
 * realized twice, deliberately kept byte-identical: as plain TS functions
 * here, and as portable RMN terms in
 * `src/lib/language/stdlib/inducing/index.mts` — so its operation can be
 * inspected, transported, and audited as data, not just run.
 *
 * One forward pass is thin: each morphism has an actual domain and codomain, and emits a
 * schema-admitted object consumable as the next operation's domain —
 *
 *   utter      : Mark × Mark        → Utterance            (the only admission;
 *                                                            the lone injected datum is the Mark)
 *   articulate : Utterance          → ArticulationCell
 *   predicate  : ArticulationCell   → PredicationSite      (Φ = E × Π × E)
 *   posit      : PredicationSite    → PositPresheaf        (fibers of evidence)
 *   settle     : PositPresheaf      → Settlement (closure to the extrema)
 *
 * so `infograph utter | infograph articulate | infograph predicate | infograph posit | infograph
 * settle` is the forward pass as a POSIX pipe. `induce` is the single named
 * composition (settle∘posit∘predicate∘articulate) over an admitted Utterance.
 * Only `utter` admits Marks; every morphism after admission takes its predecessor's
 * object. Priced residue from the result can begin another pass only by returning
 * through admission. `coincide` is the adjacent token-coincidence judgment.
 */
import { mark, utterance, type UtteranceObject } from "../../../lib/records/utterance/index.mts";
import {
  fixedPoints,
  fixedPointExtremaProfile,
  presheaf,
  readClassificationOfSettlementFiltration,
} from "../../../lib/fixpoint/index.mts";
import type { FixedPointCarrier as FixedPointStructure } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point";
import type { Settlement } from "@lenticule-science/metrologic/settling/settlement";
import {
  freeSettlementFiltration,
  settling,
  settlementFiltrationGeneratorsSchema,
  type SettlementFiltrationGenerators,
} from "../../../lib/settling.mts";
import { freePredicationSite, predicationGeneratorsShape, predicationSiteGeneratorsSchema } from "@red-cup-engineering/computer-data-engine/predication";
import { posit, fiberCarrier as predicationFiber, fiberValuationKnowledgeJoin, positPresheafGeneratorsSchema } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import { utteranceSchemaContract, articulationCellSchemaContract } from "../../../lib/schema/index.mts";
import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { jsonResource, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { operation, type Operation } from "../../../rpc/index.mts";
import { evaluateRunTerm } from "../../../lib/language/eval/index.mts";

/** The wire boundary for `predicate`'s output / `posit`'s input: the real
 *  generator shape (`cells`, `specializations`), not just a `kind` tag —
 *  `predicationSiteGeneratorsSchema` in lib is the single source of this shape. */
const predicationSiteContract = schemaFrom(predicationSiteGeneratorsSchema);

/** The wire boundary for `posit`'s output / `settle`'s input: the real generator
 *  shape, not just a `kind` tag — see `positPresheafGeneratorsSchema` in lib. */
const positPresheafContract = schemaFrom(positPresheafGeneratorsSchema);

/** The wire boundary for `settle`'s input/output: the real generator shape, not
 *  just a `kind` tag — see `settlementFiltrationGeneratorsSchema` in lib. */
const settlementFiltrationContract = schemaFrom(settlementFiltrationGeneratorsSchema);

const relateRelationsInputContract = schemaFrom({
  $id: "metroplat/action/relate-relations-input",
  type: "object",
  required: ["left", "right"],
  properties: {
    left: { type: "object", required: ["cells", "specializations"], properties: predicationGeneratorsShape, additionalProperties: false },
    right: { type: "object", required: ["cells", "specializations"], properties: predicationGeneratorsShape, additionalProperties: false },
  },
  title: "RelateRelationsInput",
  description: "Two settlement filtrations' generators ({ left, right }), unioned by relate-relations.",
  additionalProperties: false,
} as const);

const coincidenceInputContract = schemaFrom({
  $id: "metroplat/action/coincidence-input",
  type: "object",
  required: ["left", "right"],
  properties: { left: {}, right: {} },
  title: "CoincidenceInput",
  description: "Two admitted JSON payloads to compare by structural token coincidence.",
  additionalProperties: false,
} as const);

const coincidenceJudgmentContract = schemaFrom({
  $id: "metroplat/action/coincidence-judgment",
  type: "object",
  required: ["kind", "left", "right"],
  properties: {
    kind: { enum: ["utterance.coincidence:witness", "utterance.coincidence-obstruction"] },
    left: {},
    right: {},
  },
  title: "CoincidenceJudgment",
  description: "The finite token-coincidence witness or obstruction emitted by the RMN coincidence term.",
  additionalProperties: false,
} as const);
import {
  articulateTerm as _articulate,
  predicateTerm as _predicate,
  positTerm as _posit,
  settleTerm as _settle,
  inducingTerm as _inducing,
  relateRelationsTerm as _relateRelations,
  coincideTerm as _coincide,
} from "../../../lib/language/stdlib/inducing/index.mts";

const induction = {
  articulate: _articulate,
  predicate: _predicate,
  posit: _posit,
  settle: _settle,
  inducing: _inducing,
  relateRelations: _relateRelations,
  coincide: _coincide,
} as const;

/**
 * Admit the token/claim utterance from the input value, however it was wired.
 *
 * An Utterance is one object — a pair of opaque Marks (left=token, right=claim) —
 * with several legitimate boundary encodings, all decoded *from the input
 * value* (never the options channel, where token/claim are not parameters but
 * the domain itself):
 *   - the `string` wire: two Mark payloads split on the FIRST newline. Idiomatic
 *     Unix admission of two marks from one stream; the claim, being prose, is the
 *     half allowed to carry further newlines.
 *   - the `form`/`json` wire: a `{ token, claim }` object (so HTTP `?token=&claim=`
 *     and script composition build the same utterance).
 * The operation is indifferent to which encoding arrived: one Utterance results.
 */
function admitUtterance(input: JsonValue, verb: string): UtteranceObject {
  if (typeof input === "string") {
    const newline = input.indexOf("\n");
    if (newline < 0) throw new TypeError(`${verb}: expected a token and claim separated by a newline`);
    return utterance(mark(input.slice(0, newline)), mark(input.slice(newline + 1)));
  }
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const record = input as JsonRecord;
    if ("token" in record && "claim" in record) return utterance(mark(record["token"]), mark(record["claim"]));
  }
  throw new TypeError(`${verb}: expected a "token\\nclaim" string or a { token, claim } object`);
}

/** utter — the admission boundary: get two Marks into the system as an utterance.
 *  The only operation that injects data (a Mark); everything downstream is
 *  schema-admitted object → schema-admitted object. The pair arrives on the
 *  `string` (token\nclaim), `form`
 *  (?token=&claim=), or `json` ({token,claim}) wire. */
export const utterOperation: Operation = operation({
  verb: "utter",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Admit two Marks as an utterance (token and claim).",
  description: "Domain: a token Mark and a claim Mark, wired as `token\\nclaim` (string), `?token=&claim=` (form), or `{token,claim}` (JSON). Codomain: the Utterance object as JSON.",
  // Codomain schema identity is the producer side of the `utter -> articulate`
  // schema edge; schema refs are projected later from this utterance object.
  codomain: utteranceSchemaContract,
  run: (input: unknown): unknown => jsonResource(admitUtterance(input as JsonValue, "utter"), "utterance"),
});

/** articulate — Utterance → ArticulationCell: open the articulation category at
 *  the potential cell of an already-admitted utterance object. */
export const articulateOperation: Operation = operation({
  verb: "articulate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Open the articulation category at the potential cell of an utterance.",
  description: "Domain: an Utterance object as JSON (the codomain of `utter`). Codomain: the ArticulationCell as JSON.",
  // Domain schema consumes the same schema identity `utter` emits; that identity
  // is the wiring-graph edge `utter -> articulate`.
  domain: utteranceSchemaContract,
  codomain: articulationCellSchemaContract,
  // Body: a faithful IR composition (opens the potential cell with empty slots).
  // Byte-identical to the prior TS run `jsonResource(articulate(input))`.
  runTerm: induction.articulate,
});

/** predicate — ArticulationCell → PredicationSite: materialize Φ = E × Π × E. */
export const predicateOperation: Operation = operation({
  verb: "predicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Materialize the predication site of an articulation cell (Φ = E × Π × E).",
  description: "Domain: an ArticulationCell as JSON (the codomain of `articulate`). Codomain: the PredicationSite as JSON.",
  domain: articulationCellSchemaContract,
  codomain: predicationSiteContract,
  // Body: a faithful IR composition building the predication-site GENERATORS (one
  // reflexive cell over the utterance token/claim). Byte-identical to the prior TS
  // run jsonResource(presentPredicationSite(predicate(input))); the derived
  // entities/predicates/base are re-derived on read by freePredicationSite.
  runTerm: induction.predicate,
});

/** posit — PredicationSite → PositPresheaf: value the predication as fibers of
 *  evidence, the presheaf settlement closes over. */
export const positOperation: Operation = operation({
  verb: "posit",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Value a predication site as fibers of evidence (the posit presheaf).",
  description: "Domain: a PredicationSite as JSON (the codomain of `predicate`). Codomain: the PositPresheaf as JSON.",
  domain: predicationSiteContract,
  codomain: positPresheafContract,
  // Body: a faithful IR re-tag — the bare presheaf adds no essential data over the
  // predication generators (fiber/valuation/traces are a free construction), so it
  // carries the generators forward under the presheaf kind; the full presheaf is
  // re-derived on read by freePositPresheaf.
  runTerm: induction.posit,
});

const naturalSize = (value: { readonly members: readonly unknown[] }): number => value.members.length;

/** Build the `settled` reading block (stages, regime, classification, extremal
 *  H¹) from an already-computed filtration and fixed-point structure — the one
 *  place this readout is assembled, shared by every caller regardless of how
 *  the filtration/fixed-points were themselves derived (fresh generators vs.
 *  a knowledge-joined merge). */
function settledReading(filtration: Settlement, fixed: FixedPointStructure): JsonRecord {
  const classification = readClassificationOfSettlementFiltration(filtration);
  const readings = fixedPointExtremaProfile(fixed);
  const h1 = (reading: { readonly cohomology: { readonly firstCohomology: { readonly rank: { readonly members: readonly unknown[] } } } }): number =>
    naturalSize(reading.cohomology.firstCohomology.rank);
  return {
    kind: "predication.settlement.reading",
    stages: filtration.stages.length,
    regime: classification.regime.kind,
    classification: classification.kind,
    cofinality: classification.cofinality.kind,
    limitStages: naturalSize(classification.limitStages.rank),
    nonScottFirings: naturalSize(classification.nonScottFirings.rank),
    firstCohomology: {
      knowledgeLeast: h1(readings.knowledgeLeast),
      knowledgeGreatest: h1(readings.knowledgeGreatest),
      truthLeast: h1(readings.truthLeast),
      truthGreatest: h1(readings.truthGreatest),
    },
  } as unknown as JsonRecord;
}

/**
 * Settle generators for real: run the closure engine — the free filtration,
 * its settling classification, and the four fixed-point extrema with their
 * sheaf cohomology — and emit the filtration generators WITH the settled
 * reading. The generators stay on the output object (readers still free them); the
 * `settled` block is the engine's own readout, not a re-tag.
 *
 * Every caller (`settle`, `induce`'s composed term) produces a
 * `predication.settlement.filtration`-tagged value from a SINGLE source, so a
 * fresh `posit` derivation is correct here — there is only one side's evidence
 * to begin with. `relate-relations` combines TWO independently-sourced
 * generator sets and uses `relateGenerators` below instead, which merges via
 * the proven knowledge-join rather than re-deriving from a raw concatenation
 * (see that function's doc for why, and for the honest limit of that claim
 * under the current charge scheme).
 */
function settleGenerators(input: unknown, verb: string): JsonValue {
  if (!settlementFiltrationContract.validate(input)) throw new TypeError(`${verb}: expected predication generators with cells and specializations`);
  const generators: SettlementFiltrationGenerators = {
    kind: "predication.settlement.filtration",
    cells: input.cells,
    specializations: input.specializations,
  };
  const filtration = freeSettlementFiltration(generators);
  const fixed = fixedPoints(posit(freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  })));
  return jsonResource({ ...generators, settled: settledReading(filtration, fixed) } as unknown as JsonValue, "settlement filtration");
}

function runInducing(input: unknown): JsonValue {
  return settleGenerators(evaluateRunTerm(induction.inducing, input as JsonValue), "induce");
}

/**
 * Relate two independently-sourced relations by the PROVEN merge
 * (`Obsmetrologia.Valuation.joinK`, `Positing/Valuation.lean:42`): pointwise
 * knowledge-join of each side's valuation over their combined, deduplicated
 * cell domain — not a concatenation of raw generators re-derived from scratch,
 * which is what this function replaces. `fiberValuationKnowledgeJoin` is the
 * existing TS realization of the Lean theorem (`Valuation.joinK_comm'`/
 * `_assoc'`/`_idem'`: a bounded join-semilattice, i.e. a CRDT merge) — it was
 * unused before this change.
 *
 * Honest limit of this fix, checked by direct probe, not assumed: under the
 * CURRENT charge scheme, `witnessedPotential`'s only evidence is the cell's own
 * subject mark, and two coinciding cells necessarily share that mark's VALUE
 * (that is what coincidence means) — `mergeEvidence` dedupes by value, so
 * joining two value-identical witnesses reproduces the same single witness a
 * naive dedup would have kept anyway. This is therefore not YET an observable
 * behavior change; it is the mathematically correct operation in place of an
 * ad-hoc one, and the one that stays correct the moment a cell's charge can
 * carry real per-source evidence that actually diverges between `left` and
 * `right` (e.g. once witnessed evidence accumulates before reaching this
 * merge point) — the naive version would start silently dropping that
 * evidence; this version already will not.
 */
function relateGenerators(input: unknown, verb: string): JsonValue {
  if (!relateRelationsInputContract.validate(input)) throw new TypeError(`${verb}: expected { left, right } predication generators`);
  const leftSite = freePredicationSite({ kind: "predication.site", cells: input.left.cells, specializations: input.left.specializations });
  const rightSite = freePredicationSite({ kind: "predication.site", cells: input.right.cells, specializations: input.right.specializations });
  const combinedSite = freePredicationSite({
    kind: "predication.site",
    cells: [...input.left.cells, ...input.right.cells],
    specializations: [...input.left.specializations, ...input.right.specializations],
  });
  const joinedValuation = fiberValuationKnowledgeJoin(
    predicationFiber(leftSite).valuation,
    predicationFiber(rightSite).valuation,
    combinedSite.cells.cells,
  );
  const joinedPresheaf = presheaf({
    kind: "predication.fiber",
    predication: combinedSite,
    valuation: joinedValuation,
  });
  const generators: SettlementFiltrationGenerators = {
    kind: "predication.settlement.filtration",
    cells: combinedSite.cells.cells,
    specializations: combinedSite.specializations,
  };
  return jsonResource({
    ...generators,
    settled: settledReading(settling(joinedPresheaf), fixedPoints(joinedPresheaf)),
  } as unknown as JsonValue, "settlement filtration");
}

/** settle — PositPresheaf → Settlement: close the presheaf to its
 *  extrema, the transfinite paraconsistent fixed-point filtration.
 *
 *  `runTerm` is the portable operation BODY (the generator re-kind: the
 *  settlement is the terminal free construction over the generators, so the
 *  generators are its complete data). `run` evaluates that same body and then
 *  crosses the closure-engine boundary, attaching the engine's settled reading
 *  (stages, regime, classification, extremal H¹) under `settled` — a boundary
 *  observation of THIS exposure, not part of the operation body; composition
 *  composes the pure term. */
export const settleOperation: Operation = operation({
  verb: "settle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Close a posit presheaf to its settlement filtration (the extrema).",
  description: "Domain: a PositPresheaf as JSON (the codomain of `posit`). Codomain: the Settlement as JSON, carrying the engine's settled reading (stages, regime, classification, extremal H¹).",
  domain: positPresheafContract,
  codomain: settlementFiltrationContract,
  runTerm: induction.settle,
  run: (input: unknown): unknown => settleGenerators(evaluateRunTerm(induction.settle, input as JsonValue), "settle"),
});

/**
 * induce — the one named composition of articulate → predicate → posit → settle.
 *
 * Its domain is already-admitted Utterance material. Residue never bypasses
 * admission to call this operation directly: conflicts, verdicts, and other
 * priced obstruction material must first become a new admitted Utterance.
 */
export const induceOperation: Operation = operation({
  verb: "induce",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Run one Inducing pass over an admitted Utterance.",
  description: "Domain: an admitted Utterance. Codomain: its Settlement after articulate → predicate → posit → settle. Residue begins another pass only through canonical admission.",
  domain: utteranceSchemaContract,
  codomain: settlementFiltrationContract,
  runTerm: induction.inducing,
  run: runInducing,
});

/** relate-relations — relate two settled relations by the proven knowledge-join
 *  merge (`Obsmetrologia.Valuation.joinK`).
 *
 *  The portable RMN term carries the generator operation: union cells by
 *  structural coincidence and append specialization generators. The host run
 *  keeps the boundary reading richer by rebuilding the presheaf valuation and
 *  attaching the settled fixed-point readout through knowledge-join. */
export const relateRelationsOperation: Operation = operation({
  verb: "relate-relations",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Relate two relations by the knowledge-join of their valuations.",
  description: "Domain: a JSON object { left, right } of two settlement filtrations (their generators). Codomain: the combined Settlement generators as JSON, merged by pointwise knowledge-join.",
  domain: relateRelationsInputContract,
  codomain: settlementFiltrationContract,
  runTerm: induction.relateRelations,
  run: (input: unknown): unknown => relateGenerators(input, "relate-relations"),
});

/** coincide — judge whether two Mark payloads coincide as tokens. Domain: a JSON
 *  object `{ left, right }`. Codomain: the coincidence judgment as JSON. */
export const coincideOperation: Operation = operation({
  verb: "coincide",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Judge whether two Mark payloads coincide as tokens.",
  domain: coincidenceInputContract,
  codomain: coincidenceJudgmentContract,
  // Body: a faithful IR term — build a token for each payload, compare them by
  // structural coincidence, and branch to a witness/obstruction judgment.
  // Byte-identical to tokenIdentity(token(mark(left)), token(mark(right))).
  runTerm: induction.coincide,
});

/** The Inducing operation family: admission, four constituent morphisms, and one composition. */
export const inducingOperations: readonly Operation[] = Object.freeze([
  utterOperation,
  articulateOperation,
  predicateOperation,
  positOperation,
  settleOperation,
  induceOperation,
  relateRelationsOperation,
  coincideOperation,
]);

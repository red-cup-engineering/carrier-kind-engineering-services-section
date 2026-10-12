/**
 * operating - settled operational reads for downstream computing surfaces.
 *
 * This owns the executable-task face of the old animating-experimental work algebra:
 * a closure structure is classified by whether its meaning is fixed at dispatch
 * and whether execution is deterministic. Office assignment and collective
 * adjudication stay out of this module; those are organizing readings.
 */

import { arrayTerm, jsonToTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { capabilityDecisionCarrier } from "./capability-decision.mjs";
import { capabilityRequestCarrier } from "./capability-request.mjs";
import { workClosureCarrier } from "./work-closure.mjs";
import { workTypeCarrier } from "./work-type.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export { capabilityDecisionCarrier } from "./capability-decision.mjs";
export { capabilityRequestCarrier } from "./capability-request.mjs";
export { workClosureCarrier } from "./work-closure.mjs";
export { workTypeCarrier } from "./work-type.mjs";

export const WORK_TYPES = Object.freeze([
  "inquiry",
  "derivation",
  "procedure",
  "process",
]);

export function observeLabels(labels) {
  const settled = Object.freeze(labels.map((label) => Object.freeze({
    id: label.id,
    predicate: label.predicate,
    reading: label.reading,
    ...(label.object === undefined ? {} : { object: label.object }),
  })));
  return Object.freeze({
    kind: "computing.observation",
    labels: settled,
    arena: Object.freeze({
      kind: "computing.observation.arena",
      positions: Object.freeze(settled.map((label) => label.id)),
      moves: Object.freeze(settled.map((label) => Object.freeze({
        from: label.id,
        to: label.object ?? label.id,
        predicate: label.predicate,
        reading: label.reading,
      }))),
      structure: Object.freeze({
        events: settled,
      }),
    }),
    provenance: Object.freeze({
      kind: "computing.derivation.provenance",
      source: "labels",
      labels: Object.freeze(settled.map((label) => label.id)),
    }),
  });
}

/** meaning-settled(T): every goal cell is determined at dispatch. */
export function meaningSettled(closure) {
  return closure.goalCells.every((goal) => goal.determinedAtDispatch);
}

/** execution-settled(T): no closure rule branches. */
export function executionSettled(closure) {
  return closure.rules.every((rule) => !rule.branching);
}

/** The pure 2x2 map from settled meaning/execution to the work quartet. */
export function workTypeOf(meaning, execution) {
  return meaning
    ? execution ? "process" : "procedure"
    : execution ? "derivation" : "inquiry";
}

/** Read a task closure into its executable work type. */
export function classifyWork(closure) {
  return workTypeCarrier.assert(evaluateRunTerm(classifyWorkTerm, jsonResource(closure)));
}

const COORDINATES =
  Object.freeze({
    process: Object.freeze([true, true]),
    procedure: Object.freeze([true, false]),
    derivation: Object.freeze([false, true]),
    inquiry: Object.freeze([false, false]),
  });

/** Settlement order on the product lattice: inquiry below process; procedure and derivation incomparable. */
export function settlementLeq(a, b) {
  const [aMeaning, aExecution] = COORDINATES[a];
  const [bMeaning, bExecution] = COORDINATES[b];
  return (!aMeaning || bMeaning) && (!aExecution || bExecution);
}

const boolFalse = tm.bool(false);
const boolTrue = tm.bool(true);

const notTerm = (value) => tm.cond(value, boolFalse, boolTrue);
const andTerm = (left, right) => tm.cond(left, right, boolFalse);
const isEmptyArrayTerm = (value) => tm.coincide(value, arrayTerm([]));

/** `member x list` for array-encoded carrier terms. */
const memberTerm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.var(3), tm.var(0))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

const allGoalsDeterminedTerm = tm.fold(
  tm.lam(tm.lam(andTerm(tm.var(1), tm.coincide(tm.field("determinedAtDispatch", tm.var(0)), jsonToTerm(true))))),
  boolTrue,
  tm.field("goalCells", tm.var(0)),
);

const noRulesBranchTerm = tm.fold(
  tm.lam(tm.lam(andTerm(tm.var(1), notTerm(tm.coincide(tm.field("branching", tm.var(0)), jsonToTerm(true)))))),
  boolTrue,
  tm.field("rules", tm.var(0)),
);

const workTypeValueTerm = (meaning, execution) =>
  tm.cond(
    meaning,
    tm.cond(execution, stringTerm("process"), stringTerm("procedure")),
    tm.cond(execution, stringTerm("derivation"), stringTerm("inquiry")),
  );

/** The relational IR body for classify-work: WorkClosure -> WorkTypeCarrier. */
export const classifyWorkTerm = tm.lam(
  tm.app(
    tm.app(
      tm.lam(tm.lam(objectTerm([
        ["kind", stringTerm("computing.work-type")],
        ["value", workTypeValueTerm(tm.var(1), tm.var(0))],
        ["meaningSettled", tm.cond(tm.var(1), jsonToTerm(true), jsonToTerm(false))],
        ["executionSettled", tm.cond(tm.var(0), jsonToTerm(true), jsonToTerm(false))],
      ]))),
      allGoalsDeterminedTerm,
    ),
    noRulesBranchTerm,
  ),
);

/** Boundary admission for the classify-work action. */
export function admitWorkClosure(input, _verb) {
  return workClosureCarrier.assert(input);
}

/** Check a computing capability request by finite set inclusion. */
export function decideCapabilities(request) {
  return capabilityDecisionCarrier.assert(evaluateRunTerm(decideCapabilitiesTerm, jsonResource(request)));
}

const missingCapabilitiesTerm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.app(tm.app(memberTerm, tm.var(0)), tm.field("capabilities", tm.var(2))),
        tm.var(1),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),
      ),
    )),
    arrayTerm([]),
    tm.field("requires", tm.var(0)),
  ),
);

/** The relational IR body for decide-capabilities: CapabilityRequest -> CapabilityDecision. */
export const decideCapabilitiesTerm = tm.lam(
  tm.app(
    tm.lam(objectTerm([
      ["kind", stringTerm("computing.capability-decision")],
      ["admitted", tm.cond(isEmptyArrayTerm(tm.var(0)), jsonToTerm(true), jsonToTerm(false))],
      ["status", tm.cond(isEmptyArrayTerm(tm.var(0)), stringTerm("potential"), stringTerm("active"))],
      ["missing", tm.var(0)],
    ])),
    tm.app(missingCapabilitiesTerm, tm.var(0)),
  ),
);

/** Boundary admission for the decide-capabilities action. */
export function admitCapabilityRequest(input, _verb) {
  return capabilityRequestCarrier.assert(input);
}

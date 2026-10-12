// workforms.mjs — the registry of work forms SWARM can organize work under.
//
// Work comes first; governance is read off it (structuration.mjs). This registry makes the work
// forms the corpus names into addressable, selectable data instead of strings scattered across
// office-actions.mjs and the README. Each form names how work is shaped and what its convergence
// criterion is — the condition under which the form has settled.
//
// The plan-composition forms (sequential / tensor / frobenius / poset / single / empty) are the
// monoidal cobordism shapes computed by planCompositionKind (tuplets.mjs); the development and
// operational forms are the processual shapes the README and office routing already run. Sources
// are cited; convergence criteria are faithful summaries of what those files say, not new theory.

import { planCompositionKind } from "./tuplets.mjs";

function form(name, { kind, summary, convergence, source, planComposition = null }) {
  return Object.freeze({ name, kind, summary, convergence, source, planComposition });
}

export const WORK_FORMS = Object.freeze({
  // ── Plan-composition (monoidal cobordism) forms — tuplets.mjs planCompositionKind ───────────
  "sequential-composition": form("sequential-composition", {
    kind: "plan-composition",
    summary: "A linear dependency chain; each handoff blocks the next.",
    convergence: "converges when each handoff predicate is satisfied and the terminal verification work reaches done.",
    source: "src/tuplets.mjs:163; src/office-actions.mjs (sequential-pipeline)",
    planComposition: "sequential-composition",
  }),
  "tensor-product": form("tensor-product", {
    kind: "plan-composition",
    summary: "Sibling tasks with no inter-dependencies; the monoidal product of independent handoffs.",
    convergence: "converges when all parallel branches reach done or record explicit obstruction residue.",
    source: "src/tuplets.mjs:154",
    planComposition: "tensor-product",
  }),
  "frobenius-fan-in": form("frobenius-fan-in", {
    kind: "plan-composition",
    summary: "Multiple tasks merge into one (pair-of-pants multiplication); requires an explicit merge witness.",
    convergence: "converges when the merge witness is admitted and all child work reaches done.",
    source: "src/tuplets.mjs:158; README §Frobenius witness paths",
    planComposition: "frobenius-fan-in",
  }),
  "frobenius-fan-out": form("frobenius-fan-out", {
    kind: "plan-composition",
    summary: "One task splits into many (pair-of-pants comultiplication); requires an explicit split witness.",
    convergence: "converges when the split witness is admitted and all child work reaches done.",
    source: "src/tuplets.mjs:159; README §Frobenius witness paths",
    planComposition: "frobenius-fan-out",
  }),
  "frobenius-fan-in-out": form("frobenius-fan-in-out", {
    kind: "plan-composition",
    summary: "Work diverges then reconverges; requires an explicit merge/split witness.",
    convergence: "converges when the merge/split witness is admitted and all child work reaches done.",
    source: "src/tuplets.mjs:157; README §Frobenius witness paths",
    planComposition: "frobenius-fan-in-out",
  }),
  "general-poset-composition": form("general-poset-composition", {
    kind: "plan-composition",
    summary: "An acyclic partial-order dependency shape not covered by the named forms; detected but not specialized.",
    convergence: "convergence criterion not yet specialized; falls back to all child work reaching done.",
    source: "src/tuplets.mjs:164",
    planComposition: "general-poset-composition",
  }),
  "single-task-cobordism": form("single-task-cobordism", {
    kind: "plan-composition",
    summary: "A single task cobordism — one unit of work, no composition.",
    convergence: "converges when the single task reaches done.",
    source: "src/tuplets.mjs:140",
    planComposition: "single-task-cobordism",
  }),

  // ── Processual / development forms — README and office routing ──────────────────────────────
  "development-cycle": form("development-cycle", {
    kind: "development",
    summary: "Question-driven development: question → theorem → proof → examples → spec → tests → code → result.",
    convergence: "converges when the result phase answers the driving question and records the next question.",
    source: "README §Question-Driven Development Cycles",
  }),
  "audit-fix-loop": form("audit-fix-loop", {
    kind: "coordination",
    summary: "An iterated review/repair loop over a body of work.",
    convergence: "converges when the latest review is approved and no rejected review remains without a later repair execution.",
    source: "src/coordination.mjs; src/office-actions.mjs (audit-fix-loop)",
  }),
  "exploratory-search": form("exploratory-search", {
    kind: "research",
    summary: "Research work whose outcome names the next step rather than executing a fixed plan.",
    convergence: "converges when the findings name the next settled question, the evidence residue, and a bounded implementation path.",
    source: "src/office-actions.mjs (exploratory-search)",
  }),
  "organization-runbook": form("organization-runbook", {
    kind: "operations",
    summary: "A fixed seven-step organization operation: intake → triage → dispatch → execution → review → report → escalation.",
    convergence: "converges when each step's policy requirements hold and the final escalation step has no unresolved residue.",
    source: "README §organization-level operations runbook; src/operations.mjs",
  }),
  "recurrent-practice": form("recurrent-practice", {
    kind: "operations",
    summary: "A cyclic operations-loop whose handoff cobordism closes the cycle back to itself.",
    convergence: "a recurrent practice does not terminate; each cycle's handoff to the next is its settling.",
    source: "lab/archive/.../predicated-work/code/structures/handoff-cobordism.md §lines 76-79 (archive theory)",
  }),
});

export const DEFAULT_WORK_FORM = "single-task-cobordism";

export function workFormNames() {
  return Object.keys(WORK_FORMS);
}

export function selectWorkForm(structuration = {}) {
  const doc = structuration.doc ?? structuration;
  // an explicit development style names its form directly
  const style = String(doc.developmentStyle ?? "").toLowerCase();
  if (style === "question-driven-development") return "development-cycle";
  if (doc.runbookName) return "organization-runbook";
  // otherwise the plan-composition shape is the work form
  const shape = structuration.planComposition ?? "";
  if (WORK_FORMS[shape]) return shape;
  if (shape === "leaf" || shape === "empty-boundary") return DEFAULT_WORK_FORM;
  return DEFAULT_WORK_FORM;
}

// Classify a set of child work records directly into a plan-composition work form.
export function workFormForChildren(children = []) {
  const shape = planCompositionKind(children);
  return WORK_FORMS[shape] ? shape : DEFAULT_WORK_FORM;
}

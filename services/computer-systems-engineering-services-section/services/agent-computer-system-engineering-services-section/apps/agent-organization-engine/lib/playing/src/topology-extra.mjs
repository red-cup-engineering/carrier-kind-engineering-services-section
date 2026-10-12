/**
 * topology-extra — the remaining *-autonomous topology and the locative substrate.
 *
 * Rounds out playing's topology surface with the machinery the gaming body
 * implements but had not yet exposed: the **chronicle grain** (chronicles +
 * coherence — the plays-along-one-branch reading the Fax identity law references),
 * **internal completeness** (presentation-independence of B^⊥⊥), **locativity**
 * (delocation-invariance of orthogonality), **chronicle-convergence** (the
 * step-by-step dispute refining the global verdict), the **design knowledge order**
 * (≤_k on designs), and the **locative primitives** (delocate / superpose — the
 * action of the free monoid of loci on designs that builds the multiplicatives and
 * exponentials). See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { decodeDesign, encodeDesign } from "./encoding/design.mjs";
import { decodeLocus, encodeLocus } from "./encoding/locus.mjs";
import { designChronicles, designCoherenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import { viewOfChronicle, viewsOfDesign, innocenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/view.mjs";
import { internalCompletenessJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/internal-completeness.mjs";
import { delocationInvarianceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/locativity.mjs";
import { chronicleConvergenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/chronicle-convergence.mjs";
import { designLeqJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/incarnation.mjs";
import { delocate, superpose } from "./structuring/concurrent-game/with-symmetry/ludicizing/delocation.mjs";
import {
  chronicleConvergenceCarrier,
  chroniclesCarrier,
  coherenceCarrier,
  designCarrier,
  designLeqCarrier,
  innocenceCarrier,
  internalCompletenessCarrier,
  locativityCarrier,
  viewCarrier,
} from "./carriers/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const CARRIER = Object.freeze({
  design: "playing/design",
  chronicles: "playing/chronicles",
  view: "playing/view",
  innocence: "playing/innocence",
  coherence: "playing/coherence",
  internalCompleteness: "playing/internal-completeness",
  locativity: "playing/locativity",
  chronicleConvergence: "playing/chronicle-convergence",
  designLeq: "playing/design-leq",
});

const ref = (id) => Object.freeze({ $ref: id });
const obj = (properties, required = []) =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const arr = Object.freeze({ type: "array" });
const str = Object.freeze({ type: "string" });

const designRequestCarrier = schemaFrom({
  $id: "playing/topology/design-request",
  type: "object",
  properties: { design: ref(CARRIER.design) },
  required: ["design"],
});

const designViewRequestCarrier = schemaFrom({
  $id: "playing/topology/design-view-request",
  type: "object",
  properties: { design: ref(CARRIER.design), perspective: str },
  required: ["design"],
});

const designSetComparisonRequestCarrier = schemaFrom({
  $id: "playing/topology/design-set-comparison-request",
  type: "object",
  properties: { left: arr, right: arr, universe: arr },
  required: ["left", "right"],
});

const locativityRequestCarrier = schemaFrom({
  $id: "playing/topology/locativity-request",
  type: "object",
  properties: { designA: ref(CARRIER.design), designB: ref(CARRIER.design), prefix: arr },
  required: ["designA", "designB", "prefix"],
});

const designPairRequestCarrier = schemaFrom({
  $id: "playing/topology/design-pair-request",
  type: "object",
  properties: { designA: ref(CARRIER.design), designB: ref(CARRIER.design) },
  required: ["designA", "designB"],
});

const delocationRequestCarrier = schemaFrom({
  $id: "playing/topology/delocation-request",
  type: "object",
  properties: { design: ref(CARRIER.design), prefix: arr },
  required: ["design", "prefix"],
});

const superpositionRequestCarrier = schemaFrom({
  $id: "playing/topology/superposition-request",
  type: "object",
  properties: { designs: arr },
  required: ["designs"],
});

function asRecord(input, verb) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${verb}: expected a JSON object`);
  return input;
}
function designsAt(record, key, verb) {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${verb}: requires array of designs "${key}"`);
  return value.map((d) => decodeDesign(d));
}
function universeOf(record, fallback) {
  const value = record["universe"];
  return Array.isArray(value) ? value.map((d) => decodeDesign(d)) : [...fallback];
}
/** A witness/obstruction judgment is a witness iff its kind ends in ":witness". */
const isWitness = (j) => j.kind.endsWith(":witness");

function perspectiveOf(record) {
  return record["perspective"] === "opponent" ? "opponent" : "proponent";
}

const encodeAction = (a) => ({
  variety: a.variety,
  locus: encodeLocus(a.locus),
  ramification: [...a.ramification],
});

const encodeView = (view) => ({
  perspective: view.perspective,
  actions: view.actions.map(encodeAction),
});

// ── the chronicle grain (plays-along-one-branch; what the Fax identity references) ──

/** chronicles — the chronicles (Girard §4.7 plays) of a design: its root-to-leaf branches. */
export const chroniclesAction = operation({
  verb: "chronicles",
  inputFormat: "json",
  outputFormat: "json",
  domain: designRequestCarrier,
  codomain: chroniclesCarrier,
  summary: "The chronicles of a design — its maximal alternating justified action-sequences (Girard §4.7 plays).",
  description: "Domain: { design: <playing/design> }. Codomain: the chronicles (playing/chronicles): each a sequence of actions {variety, locus, ramification} along one ≼-chain; a design is the union of its chronicles.",
  run: (input) => {
    const d = decodeDesign(asRecord(input, "chronicles")["design"]);
    const chronicles = designChronicles(d).map((c) => ({
      actions: c.actions.map((a) => ({ variety: a.variety, locus: encodeLocus(a.locus), ramification: [...a.ramification] })),
    }));
    return jsonResource({ kind: "playing.chronicles", chronicles, count: chronicles.length }, "playing chronicles");
  },
});

/** view — the Hyland-Ong/Faggian-Hyland local-memory view of each chronicle. */
export const viewAction = operation({
  verb: "view",
  inputFormat: "json",
  outputFormat: "json",
  domain: designViewRequestCarrier,
  codomain: viewCarrier,
  summary: "Compute player views of a design's chronicles: the local-memory projection used by innocent strategies.",
  description: "Domain: { design: <playing/design>, perspective?: proponent|opponent }. Codomain: (playing/view) the Hyland-Ong/Faggian-Hyland views of each chronicle, computed from the existing reading-backed ludics actions.",
  run: (input) => {
    const record = asRecord(input, "view");
    const perspective = perspectiveOf(record);
    const views = viewsOfDesign(decodeDesign(record["design"]), perspective).map(encodeView);
    return jsonResource({ kind: "playing.view", perspective, views, count: views.length }, "playing view");
  },
});

/** innocent — same Proponent view implies the same next Proponent action. */
export const innocentAction = operation({
  verb: "innocent",
  inputFormat: "json",
  outputFormat: "json",
  domain: designRequestCarrier,
  codomain: innocenceCarrier,
  summary: "Judge finite Hyland-Ong innocence: the next Proponent move is determined by the Proponent view.",
  description: "Domain: { design: <playing/design> }. Codomain: (playing/innocence) whether equal Proponent views have equal next Proponent actions across the design's chronicles.",
  run: (input) => {
    const design = decodeDesign(asRecord(input, "innocent")["design"]);
    const judgment = innocenceJudgment(design);
    if (judgment.kind === "game.innocence:witness") {
      return jsonResource({
        kind: "playing.innocence",
        innocent: true,
        decisions: judgment.decisions.map((d) => ({
          view: encodeView(d.view),
          next: encodeAction(d.next),
        })),
      }, "playing innocence");
    }
    return jsonResource({
      kind: "playing.innocence",
      innocent: false,
      reason: judgment.reason,
      view: encodeView(judgment.view),
      expected: encodeAction(judgment.expected),
      actual: encodeAction(judgment.actual),
    }, "playing innocence");
  },
});

/** coherent — whether a design satisfies Girard's four coherence conditions (C1)–(C4). */
export const coherentAction = operation({
  verb: "coherent",
  inputFormat: "json",
  outputFormat: "json",
  domain: designRequestCarrier,
  codomain: coherenceCarrier,
  summary: "Whether a design is coherent (Girard §4.3 (C1)–(C4): alternation, linearity, focusing, rootedness).",
  description: "Domain: { design: <playing/design> }. Codomain: the coherence judgment (playing/coherence): coherent, and the failing condition + reason if not.",
  run: (input) => {
    const d = decodeDesign(asRecord(input, "coherent")["design"]);
    const j = designCoherenceJudgment(d);
    if (j.kind === "game.design.coherence:witness") {
      return jsonResource({ kind: "playing.coherence", coherent: true }, "playing coherence");
    }
    return jsonResource({ kind: "playing.coherence", coherent: false, condition: j.condition, reason: j.reason }, "playing coherence");
  },
});

// ── internal completeness, locativity, chronicle-convergence, the design order ──

/** internal-completeness — do two generator-sets present the SAME behaviour (presentation-independence)? */
export const internalCompletenessAction = operation({
  verb: "internal-completeness",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetComparisonRequestCarrier,
  codomain: internalCompletenessCarrier,
  summary: "Whether two generator-sets present the same behaviour — B^⊥⊥ is presentation-independent (internal completeness).",
  description: "Domain: { left: <playing/design>[], right: <playing/design>[], universe?: <playing/design>[] }. Codomain: (playing/internal-completeness) same true/false, the common carrier or a distinguishing design.",
  run: (input) => {
    const record = asRecord(input, "internal-completeness");
    const left = designsAt(record, "left", "internal-completeness");
    const right = designsAt(record, "right", "internal-completeness");
    const j = internalCompletenessJudgment(left, right, universeOf(record, [...left, ...right]));
    if (j.kind === "game.internal-completeness:witness") {
      return jsonResource({ kind: "playing.internal-completeness", same: true, carrier: j.carrier.map((d) => encodeDesign(d)) }, "playing internal completeness");
    }
    return jsonResource({ kind: "playing.internal-completeness", same: false, differing: encodeDesign(j.differing), reason: j.reason }, "playing internal completeness");
  },
});

/** locativity — is orthogonality invariant under delocating BOTH designs by a prefix? */
export const locativityAction = operation({
  verb: "locativity",
  inputFormat: "json",
  outputFormat: "json",
  domain: locativityRequestCarrier,
  codomain: locativityCarrier,
  summary: "Delocation-invariance: D⊥E ⟺ ξ·D ⊥ ξ·E — designs/behaviours are placeable anywhere.",
  description: "Domain: { designA, designB, prefix: <locus address int[]> }. Codomain: (playing/locativity) whether orthogonality is invariant under relocating both designs by the prefix.",
  run: (input) => {
    const record = asRecord(input, "locativity");
    const j = delocationInvarianceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]), decodeLocus(record["prefix"]));
    return jsonResource({ kind: "playing.locativity", invariant: isWitness(j), prefix: encodeLocus(decodeLocus(record["prefix"])) }, "playing locativity");
  },
});

/** chronicle-convergence — the step-by-step dispute, converging at the first Daimon. */
export const chronicleConvergenceAction = operation({
  verb: "chronicle-convergence",
  inputFormat: "json",
  outputFormat: "json",
  domain: designPairRequestCarrier,
  codomain: chronicleConvergenceCarrier,
  summary: "The chronicle-level convergence: the step-by-step dispute, converging at the first Daimon collision.",
  description: "Domain: { designA, designB }. Codomain: (playing/chronicle-convergence) converges, the trace length, the divergence reason if stuck.",
  run: (input) => {
    const record = asRecord(input, "chronicle-convergence");
    const j = chronicleConvergenceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (j.kind === "game.chronicle-convergence:witness") {
      return jsonResource({ kind: "playing.chronicle-convergence", converges: true, steps: j.trace.length }, "playing chronicle convergence");
    }
    return jsonResource({ kind: "playing.chronicle-convergence", converges: false, steps: j.trace.length, reason: j.reason }, "playing chronicle convergence");
  },
});

/** design-leq — the apex knowledge order ≤_k on designs (the order incarnation minimizes). */
export const designLeqAction = operation({
  verb: "design-leq",
  inputFormat: "json",
  outputFormat: "json",
  domain: designPairRequestCarrier,
  codomain: designLeqCarrier,
  summary: "The knowledge order ≤_k on designs: is design A knowledge-below design B (pointwise on the reading)?",
  description: "Domain: { designA, designB }. Codomain: (playing/design-leq) leq true/false, with the reason when not.",
  run: (input) => {
    const record = asRecord(input, "design-leq");
    const j = designLeqJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (j.kind === "game.design.leq:witness") {
      return jsonResource({ kind: "playing.design-leq", leq: true }, "playing design leq");
    }
    return jsonResource({ kind: "playing.design-leq", leq: false, reason: j.reason }, "playing design leq");
  },
});

// ── the locative primitives: the action of the free monoid of loci on designs ──

/** delocate — relocate a design under a prefix locus ξ (every committed locus ζ ↦ ξ·ζ). */
export const delocateAction = operation({
  verb: "delocate",
  inputFormat: "json",
  outputFormat: "json",
  domain: delocationRequestCarrier,
  codomain: designCarrier,
  summary: "Relocate a design under a prefix locus ξ — the locative primitive (delocation composes; root is identity).",
  description: "Domain: { design: <playing/design>, prefix: <locus address int[]> }. Codomain: the relocated design (playing/design).",
  run: (input) => {
    const record = asRecord(input, "delocate");
    return jsonResource(encodeDesign(delocate(decodeDesign(record["design"]), decodeLocus(record["prefix"]))), "playing design delocated");
  },
});

/** superpose — merge several designs, knowledge-joining any shared locus (disjoint = plain union). */
export const superposeAction = operation({
  verb: "superpose",
  inputFormat: "json",
  outputFormat: "json",
  domain: superpositionRequestCarrier,
  codomain: designCarrier,
  summary: "Superpose several designs into one — the ⊔_k union of commitments (disjoint delocations never collide).",
  description: "Domain: { designs: <playing/design>[] }. Codomain: the superposed design (playing/design) — how the exponentials combine disjoint-delocated copies.",
  run: (input) => {
    const designs = designsAt(asRecord(input, "superpose"), "designs", "superpose");
    return jsonResource(encodeDesign(superpose(designs)), "playing design superposed");
  },
});

/** The topology-roundout + locative actions — aggregated into the package surface by actions.mts. */
export const topologyExtraActions = Object.freeze([
  chroniclesAction,
  viewAction,
  innocentAction,
  coherentAction,
  internalCompletenessAction,
  locativityAction,
  chronicleConvergenceAction,
  designLeqAction,
  delocateAction,
  superposeAction,
]);

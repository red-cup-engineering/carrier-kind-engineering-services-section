/**
 * star-autonomous — playing's *-autonomous category surface and proof layer.
 *
 * The first action wave (`actions.mts`) exposed the cut and the play-readings. This
 * file exposes the rest of playing's domain: the **category of behaviours**. Objects
 * are behaviours `B = B^⊥⊥`; composition is the cut (`computational-ludics`); the
 * identity is **Fax** (`ludicizing/identity`); the category is *-autonomous, carrying
 * the MALL connectives and the exponentials as configurations of the one bi-orthogonal
 * Galois closure (`ludicizing/settling`). It also surfaces the proof layer: the
 * fragment lattice, focusing (with the new shifts ↑/↓), and the four sub-*-autonomous
 * embeddings into CGS. See dev/docs/notes/2026-06-21-playing-as-star-autonomous-interaction.md.
 *
 * Every morphism is a carrier-first `action` over the existing tested pure functions ?
 * `domain`/`codomain` carrier references under `playing/?`. json in,
 * json out; carrier outputs projected with the package's own encoders.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { decodeDesign, encodeDesign } from "./encoding/design.mjs";
import { encodeLocus } from "./encoding/locus.mjs";
import { encodeBehaviour } from "./encoding/behaviour.mjs";
import { convergenceJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality.mjs";
import { generatedBehaviour, orthogonalOf, behaviourJudgment } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/behaviour.mjs";
import { incarnation } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/incarnation.mjs";
import { tensorBehaviour, parBehaviour, withBehaviour, plusBehaviour, lollipopBehaviour, negateBehaviour } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/internal-completeness.mjs";
import { ofCourseBehaviour, whyNotBehaviour } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/locativity.mjs";
import { normalizationWitness, cutElimination } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/computational-ludics.mjs";
import { faxResponderJudgment, faxIdentity } from "./structuring/concurrent-game/with-symmetry/ludicizing/identity.mjs";
import { fragmentPoset } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/fragment.mjs";
import { focusingDuality } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/focusing.mjs";
import { embeddings } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/embeddings.mjs";
import { polarityName } from "./structuring/polarity.mjs";
import {
  behaviourCarrier,
  embeddingCarrier,
  focusingCarrier,
  fragmentCarrier,
  identityCarrier,
  incarnationCarrier,
  normalizationCarrier,
  orthogonalityCarrier,
  statementCarrier,
} from "./carriers/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

// ── carrier $id vocabulary (the *-autonomous + proof carriers) ──

const CARRIER = Object.freeze({
  design: "playing/design",
  orthogonality: "playing/orthogonality",
  behaviour: "playing/behaviour",
  incarnation: "playing/incarnation",
  normalization: "playing/normalization",
  identity: "playing/identity",
  statement: "playing/statement",
  fragment: "playing/fragment",
  focusing: "playing/focusing",
  embedding: "playing/embedding",
});

const ref = (id) => Object.freeze({ $ref: id });
const obj = (properties, required = []) =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const arr = Object.freeze({ type: "array" });
const num = Object.freeze({ type: "number" });
const str = Object.freeze({ type: "string" });

const designPairRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/design-pair-request",
  type: "object",
  properties: { designA: ref(CARRIER.design), designB: ref(CARRIER.design) },
  required: ["designA", "designB"],
});

const designSetRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/design-set-request",
  type: "object",
  properties: { designs: arr, universe: arr },
  required: ["designs"],
});

const binaryBehaviourRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/binary-behaviour-request",
  type: "object",
  properties: { left: arr, right: arr, universe: arr },
  required: ["left", "right"],
});

const behaviourCarrierRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/behaviour-carrier-request",
  type: "object",
  properties: { carrier: arr, universe: arr },
  required: ["carrier"],
});

const exponentialRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/exponential-request",
  type: "object",
  properties: { carrier: arr, copies: num, universe: arr },
  required: ["carrier"],
});

const focusingDualityRequestCarrier = schemaFrom({
  $id: "playing/star-autonomous/focusing-duality-request",
  type: "object",
  properties: { connective: str },
  required: ["connective"],
});

// ── boundary helpers ──

function asRecord(input, verb) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON object`);
  }
  return input;
}

function requireString(record, key, verb) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
}

/** Decode a required array of encoded designs into Design carriers. */
function designsAt(record, key, verb) {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${verb}: requires array of designs "${key}"`);
  return value.map((d) => decodeDesign(d));
}

/** The finite universe a closure is taken relative to: `universe`, else the given designs. */
function universeOf(record, fallback) {
  const value = record["universe"];
  return Array.isArray(value) ? value.map((d) => decodeDesign(d)) : [...fallback];
}

/** Project a behaviour witness to its wire carrier (playing/behaviour). */
function behaviourOut(witness, context) {
  return jsonResource({ kind: "playing.behaviour", ...(encodeBehaviour(witness)) }, context);
}

/** Wrap a raw design-set as a behaviour witness, then project. */
function carrierOut(carrier, context) {
  return behaviourOut(Object.freeze({ kind: "game.behaviour:witness", carrier: Object.freeze([...carrier]) }), context);
}

// ── the *-autonomous TOPOLOGY: orthogonality, behaviours, connectives, exponentials ──

/** orthogonal — D ⊥ E: does the cut of two designs converge to a Daimon? */
export const orthogonalAction = operation({
  verb: "orthogonal",
  inputFormat: "json",
  outputFormat: "json",
  domain: designPairRequestCarrier,
  codomain: orthogonalityCarrier,
  summary: "Judge orthogonality D ⊥ E — whether the interaction of two designs converges (reaches a Daimon ⊤).",
  description: "Domain: { designA: <playing/design>, designB: <playing/design> }. Codomain: the orthogonality verdict (playing/orthogonality): converges, the Daimon loci, or the divergence reason, with the normal form.",
  run: (input) => {
    const record = asRecord(input, "orthogonal");
    const judgment = convergenceJudgment(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (judgment.kind === "game.convergence:witness") {
      return jsonResource({
        kind: "playing.orthogonality",
        orthogonal: true,
        daimonLoci: judgment.daimonLoci.map((l) => encodeLocus(l)),
        normalForm: encodeDesign(judgment.normalForm),
      }, "playing orthogonality");
    }
    return jsonResource({
      kind: "playing.orthogonality",
      orthogonal: false,
      reason: judgment.reason,
      normalForm: encodeDesign(judgment.normalForm),
    }, "playing orthogonality");
  },
});

/** close — the bi-orthogonal Galois closure B^⊥⊥: the behaviour GENERATED by a set. */
export const closeAction = operation({
  verb: "close",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetRequestCarrier,
  codomain: behaviourCarrier,
  summary: "Close a design-set to a behaviour: the bi-orthogonal Galois closure B^⊥⊥.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the behaviour (playing/behaviour) generated as B^⊥⊥ over the finite universe.",
  run: (input) => {
    const record = asRecord(input, "close");
    const designs = designsAt(record, "designs", "close");
    return behaviourOut(generatedBehaviour(designs, universeOf(record, designs)), "playing behaviour");
  },
});

/** dual-behaviour — B^⊥: the designs orthogonal to every member, over the universe. */
export const dualBehaviourAction = operation({
  verb: "dual-behaviour",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetRequestCarrier,
  codomain: behaviourCarrier,
  summary: "The orthogonal behaviour B^⊥ — the designs orthogonal to every member of B.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the orthogonal behaviour B^⊥ (playing/behaviour).",
  run: (input) => {
    const record = asRecord(input, "dual-behaviour");
    const designs = designsAt(record, "designs", "dual-behaviour");
    return carrierOut(orthogonalOf(designs, universeOf(record, designs)), "playing behaviour dual");
  },
});

/** behave — judge whether a design-set IS a behaviour (closed under (-)^⊥⊥). */
export const behaveAction = operation({
  verb: "behave",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetRequestCarrier,
  codomain: behaviourCarrier,
  summary: "Judge whether a design-set is a behaviour: closed under (-)^⊥⊥ within the universe.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the behaviour judgment (playing/behaviour): the carrier and whether it is closed (with the closure when not).",
  run: (input) => {
    const record = asRecord(input, "behave");
    const designs = designsAt(record, "designs", "behave");
    const judgment = behaviourJudgment(designs, universeOf(record, designs));
    if (judgment.kind === "game.behaviour:witness") {
      return jsonResource({ kind: "playing.behaviour", closed: true, carrier: judgment.carrier.map((d) => encodeDesign(d)) }, "playing behaviour judgment");
    }
    return jsonResource({
      kind: "playing.behaviour",
      closed: false,
      carrier: judgment.carrier.map((d) => encodeDesign(d)),
      closure: judgment.closure.map((d) => encodeDesign(d)),
    }, "playing behaviour judgment");
  },
});

/** incarnate — the material core |B| (Girard §11): strip ballast loci no counter visits. */
export const incarnateAction = operation({
  verb: "incarnate",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetRequestCarrier,
  codomain: incarnationCarrier,
  summary: "The material core |B| of a behaviour: strip ballast loci no counter-design visits.",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the incarnation (playing/incarnation): the material designs and their count.",
  run: (input) => {
    const record = asRecord(input, "incarnate");
    const designs = designsAt(record, "designs", "incarnate");
    const material = incarnation(designs, universeOf(record, designs));
    return jsonResource({ kind: "playing.incarnation", material: material.map((d) => encodeDesign(d)), size: material.length }, "playing incarnation");
  },
});

/** A binary MALL connective on behaviours (left ⊗/⅋/&/⊕/⊸ right over a universe). */
function binaryConnectiveAction(
  verb,
  symbol,
  fn,
  needsUniverse,
) {
  return operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    domain: binaryBehaviourRequestCarrier,
    codomain: behaviourCarrier,
    summary: `The ${symbol} of two behaviours — a MALL connective configuring the bi-orthogonal closure.`,
    description: `Domain: { left: <playing/design>[], right: <playing/design>[], universe?: <playing/design>[] }. Codomain: the ${symbol} behaviour (playing/behaviour).`,
    run: (input) => {
      const record = asRecord(input, verb);
      const left = designsAt(record, "left", verb);
      const right = designsAt(record, "right", verb);
      const universe = universeOf(record, [...left, ...right]);
      return behaviourOut(fn(left, right, universe), `playing behaviour ${verb}`);
    },
  });
}

export const tensorAction = binaryConnectiveAction("tensor", "⊗ (tensor)", (a, b, u) => tensorBehaviour(a, b, u), true);
export const parAction = binaryConnectiveAction("par", "⅋ (par)", (a, b, u) => parBehaviour(a, b, u), true);
export const withAction = binaryConnectiveAction("with", "& (with)", (a, b, _u) => withBehaviour(a, b), false);
export const plusAction = binaryConnectiveAction("plus", "⊕ (plus)", (a, b, u) => plusBehaviour(a, b, u), true);
export const lollipopAction = binaryConnectiveAction("lollipop", "⊸ (lollipop)", (a, b, u) => lollipopBehaviour(a, b, u), true);

/** negate-behaviour — B^⊥ as the *-autonomous negation (over the universe). */
export const negateBehaviourAction = operation({
  verb: "negate-behaviour",
  inputFormat: "json",
  outputFormat: "json",
  domain: behaviourCarrierRequestCarrier,
  codomain: behaviourCarrier,
  summary: "The *-autonomous negation B^⊥ of a behaviour (the linear negation as a behaviour).",
  description: "Domain: { carrier: <playing/design>[], universe?: <playing/design>[] }. Codomain: the negated behaviour B^⊥ (playing/behaviour).",
  run: (input) => {
    const record = asRecord(input, "negate-behaviour");
    const carrier = designsAt(record, "carrier", "negate-behaviour");
    return behaviourOut(negateBehaviour(carrier, universeOf(record, carrier)), "playing behaviour negate");
  },
});

/** An exponential on behaviours (!B / ?B at a finite copy-stage). */
function exponentialAction(verb, symbol, fn) {
  return operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    domain: exponentialRequestCarrier,
    codomain: behaviourCarrier,
    summary: `The exponential ${symbol} at a finite copy-stage — closure of superposed disjoint-delocated copies.`,
    description: `Domain: { carrier: <playing/design>[], copies?: number, universe?: <playing/design>[] }. Codomain: the ${symbol} behaviour (playing/behaviour). This is where the ! of Eff ≃ Kl(!_CGS) lives.`,
    run: (input) => {
      const record = asRecord(input, verb);
      const carrier = designsAt(record, "carrier", verb);
      const copies = typeof record["copies"] === "number" && Number.isFinite(record["copies"]) ? Math.max(1, Math.trunc(record["copies"])) : 2;
      return behaviourOut(fn(carrier, copies, universeOf(record, carrier)), `playing behaviour ${verb}`);
    },
  });
}

export const ofCourseAction = exponentialAction("of-course", "! (of course)", (b, c, u) => ofCourseBehaviour(b, c, u));
export const whyNotAction = exponentialAction("why-not", "? (why not)", (b, c, u) => whyNotBehaviour(b, c, u));

// ── computational ludics: cut-elimination ──

/** normalize — the cut as explicit reduction (computational ludics): the normal form + convergence. */
export const normalizeAction = operation({
  verb: "normalize",
  inputFormat: "json",
  outputFormat: "json",
  domain: designPairRequestCarrier,
  codomain: normalizationCarrier,
  summary: "Cut-normalize two dual designs: the normal form, and whether it converges (Terui's reduction).",
  description: "Domain: { designA: <playing/design>, designB: <playing/design> }. Codomain: the normalization (playing/normalization): the cut normal form, convergence, and the Daimon loci or the divergence reason. The interaction normal form IS cut-elimination.",
  run: (input) => {
    const record = asRecord(input, "normalize");
    const judgment = normalizationWitness(decodeDesign(record["designA"]), decodeDesign(record["designB"]));
    if (judgment.kind === "game.logic.normalization:witness") {
      return jsonResource({
        kind: "playing.normalization",
        converges: true,
        normalForm: encodeDesign(judgment.normalForm),
        daimonLoci: judgment.daimonLoci.map((l) => encodeLocus(l)),
      }, "playing normalization");
    }
    return jsonResource({
      kind: "playing.normalization",
      converges: false,
      normalForm: encodeDesign(judgment.normalForm),
      reason: judgment.reason,
    }, "playing normalization");
  },
});

/** cut-elimination — the Girard 2001/Terui 2011 Hauptsatz statement (the category is well-defined). */
export const cutEliminationAction = operation({
  verb: "cut-elimination",
  inputFormat: "json",
  outputFormat: "json",
  codomain: statementCarrier,
  summary: "The cut-elimination (strong-normalization) Hauptsatz that makes the category of behaviours well-defined.",
  description: "Domain: ignored. Codomain: the cut-elimination statement (playing/statement): the design-level Hauptsatz (Girard 2001 / Terui 2011).",
  run: () => jsonResource({ ...cutElimination(), kind: "playing.statement" }, "playing cut-elimination"),
});

// ── the identity: Fax (the unit of the category of behaviours) ──

/** fax — the copycat responder at a behaviour (its convergence-shadow in B^⊥; the unit's flat-grain witness). */
export const faxAction = operation({
  verb: "fax",
  inputFormat: "json",
  outputFormat: "json",
  domain: designSetRequestCarrier,
  codomain: identityCarrier,
  summary: "The copycat responder at a behaviour — the design in B^⊥ that accepts every member (Fax's flat-grain shadow).",
  description: "Domain: { designs: <playing/design>[], universe?: <playing/design>[] }. Codomain: the identity witness (playing/identity): the responder design, its interface loci, and that it accepts all members — the categorical unit's convergence content. See fax-law for the full identity.",
  run: (input) => {
    const record = asRecord(input, "fax");
    const designs = designsAt(record, "designs", "fax");
    const judgment = faxResponderJudgment(designs, universeOf(record, designs));
    if (judgment.kind === "game.identity.fax-responder:witness") {
      return jsonResource({
        kind: "playing.identity",
        responder: encodeDesign(judgment.responder),
        interface: judgment.interface.map((l) => encodeLocus(l)),
        acceptsAll: true,
      }, "playing identity");
    }
    return jsonResource({
      kind: "playing.identity",
      responder: encodeDesign(judgment.responder),
      acceptsAll: false,
      rejected: encodeDesign(judgment.rejected),
    }, "playing identity");
  },
});

/** fax-law — the categorical identity law for Fax, with its grain made explicit. */
export const faxLawAction = operation({
  verb: "fax-law",
  inputFormat: "json",
  outputFormat: "json",
  codomain: statementCarrier,
  summary: "The Fax identity law (cut(Fax_B, d) ≃ d) and the grain at which it lives.",
  description: "Domain: ignored. Codomain: the Fax identity statement (playing/statement): behaviours form a category with composition = cut and identity = Fax; the reactive copycat lives at the chronicle grain, its convergence shadow at the valuation grain.",
  run: () => jsonResource({ ...faxIdentity(), kind: "playing.statement" }, "playing fax-law"),
});

// ── the proof layer: the fragment lattice, focusing (+ shifts), the embeddings ──

/** fragments — the subtheory lattice MLL ⊂ MALL ⊂ {ILL, CLL} ⊂ LL as an explicit poset. */
export const fragmentsAction = operation({
  verb: "fragments",
  inputFormat: "json",
  outputFormat: "json",
  codomain: fragmentCarrier,
  summary: "The linear-logic fragment lattice MLL ⊂ MALL ⊂ {ILL, CLL} ⊂ LL (ILL ⊥ CLL incomparable).",
  description: "Domain: ignored. Codomain: the fragment poset (playing/fragment): the five fragments and the covering (Hasse) edges of the *-autonomous embedding order.",
  run: () => {
    const poset = fragmentPoset();
    return jsonResource({
      kind: "playing.fragment",
      elements: poset.elements.map((f) => f.name),
      coverings: poset.coverings.map(([lo, hi]) => [lo, hi]),
    }, "playing fragment lattice");
  },
});

/** focusing-duality — Andreoli polarity duality of a connective; demonstrates the shifts ↑/↓. */
export const focusingDualityAction = operation({
  verb: "focusing-duality",
  inputFormat: "json",
  outputFormat: "json",
  domain: focusingDualityRequestCarrier,
  codomain: focusingCarrier,
  summary: "The Andreoli focusing-polarity duality of a connective (incl. the shifts up/down): polarity(c^⊥) = dual(polarity(c)).",
  description: "Domain: { connective: tensor|par|with|plus|one|bottom|top|zero|ofCourse|whyNot|up|down }. Codomain: the focusing-duality verdict (playing/focusing): the connective's dual polarity and the negated polarity, and whether they cohere.",
  run: (input) => {
    const record = asRecord(input, "focusing-duality");
    const connective = requireString(record, "connective", "focusing-duality");
    const judgment = focusingDuality(connective);
    if (judgment.kind === "game.logic.focusingDuality:witness") {
      return jsonResource({
        kind: "playing.focusing",
        connective: judgment.connective,
        coheres: true,
        dualPolarity: polarityName(judgment.dualPolarity),
        negatedPolarity: polarityName(judgment.negatedPolarity),
      }, "playing focusing duality");
    }
    return jsonResource({
      kind: "playing.focusing",
      connective: judgment.connective,
      coheres: false,
      reason: judgment.reason,
    }, "playing focusing duality");
  },
});

/** embeddings — the four full sub-*-autonomous embeddings into CGS (the theory-of-computing claim). */
export const embeddingsAction = operation({
  verb: "embeddings",
  inputFormat: "json",
  outputFormat: "json",
  codomain: embeddingCarrier,
  summary: "The four full sub-*-autonomous embeddings into CGS: Hyland-Ong, Dialectica, Nominal/AGMOS, Caires-Pfenning.",
  description: "Domain: ignored. Codomain: the embeddings catalog (playing/embedding): for each, the source theory, the CGS sub-category, the constraint, citation, and full-abstraction theorem.",
  run: () => jsonResource({
    kind: "playing.embedding",
    embeddings: embeddings().map((e) => ({
      name: e.name,
      source: e.source,
      subcategory: e.subcategory,
      constraint: e.constraint,
      citation: e.citation,
      theorem: e.theorem,
    })),
  }, "playing embeddings"),
});

/** The *-autonomous + proof-layer actions — aggregated into the package surface by actions.mts. */
export const starAutonomousActions = Object.freeze([
  orthogonalAction,
  closeAction,
  dualBehaviourAction,
  behaveAction,
  incarnateAction,
  tensorAction,
  parAction,
  withAction,
  plusAction,
  lollipopAction,
  negateBehaviourAction,
  ofCourseAction,
  whyNotAction,
  normalizeAction,
  cutEliminationAction,
  faxAction,
  faxLawAction,
  fragmentsAction,
  focusingDualityAction,
  embeddingsAction,
]);

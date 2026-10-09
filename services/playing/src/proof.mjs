/**
 * proof — playing's logic layer: CLL propositions (the names of behaviours),
 * the fragment lattice membership, focusing (incl. shifts), session types, and
 * the embeddings, all over a Proposition wire codec.
 *
 * "A formula is the name of a behaviour" (Girard 2001): propositions name the
 * bi-orthogonally-closed design-sets of the topology layer. This file exposes the
 * CLL proof reading of playing — `propose`/`dual-prop` (the involutive linear
 * negation), `classify-fragment`/`in-fragment` (the MLL⊂MALL⊂{ILL,CLL}⊂LL poset),
 * `focus` (Andreoli polarity, with the shifts ↑/↓), `formula`/`proves` (the
 * logic↔topology bridge), `session`/`dual-session`/`session-compat` (Caires–
 * Pfenning), and `embed` (the four sub-*-autonomous embeddings into CGS).
 *
 * Proposition wire codec: a proposition is `{ connective, operands, polarity?, label? }`
 * with atom polarity projected to its name; the codec round-trips it through the
 * exported smart constructors so arity and involutivity stay construction-justified.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { decodeDesign, encodeDesign } from "./encoding/design.mjs";
import { atom, tensor, par, withProp, plus, one, bottom, top, zero, ofCourse, whyNot, up, down, dualProp, connectivesOf, isProposition } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/proposition.mjs";
import { polarity, polarityName, positive } from "./structuring/polarity.mjs";
import { polarityOf, isFocused } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/focusing.mjs";
import { classifyFragment, inFragment, fragmentNames } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/fragment.mjs";
import { formula, denotation, proves } from "./structuring/concurrent-game/with-symmetry/ludicizing/settling/formula.mjs";
import { propositionOfSession, dualSession, sessionCompatibilityJudgment, sessionCorrespondence, isSessionType } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/session.mjs";
import { embeddingByName, embeddingNames } from "./structuring/concurrent-game/with-symmetry/ludicizing/proving/embeddings.mjs";
import {
  embeddingCarrier,
  focusingCarrier,
  formulaCarrier,
  fragmentMembershipCarrier,
  propositionCarrier,
  sessionCarrier,
  sessionCompatCarrier,
} from "./carriers/index.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const CARRIER = Object.freeze({
  proposition: "playing/proposition",
  fragmentMembership: "playing/fragment-membership",
  focusing: "playing/focusing",
  formula: "playing/formula",
  session: "playing/session",
  sessionCompat: "playing/session-compat",
  embedding: "playing/embedding",
});

const ref = (id) => Object.freeze({ $ref: id });
const obj = (properties, required = []) =>
  Object.freeze({ type: "object", properties, required: Object.freeze([...required]) });
const objType = Object.freeze({ type: "object" });
const arr = Object.freeze({ type: "array" });
const str = Object.freeze({ type: "string" });

const propositionRequestCarrier = schemaFrom({
  $id: "playing/proof/proposition-request",
  type: "object",
  properties: { proposition: objType },
  required: ["proposition"],
});

const fragmentRequestCarrier = schemaFrom({
  $id: "playing/proof/fragment-request",
  type: "object",
  properties: { proposition: objType, fragment: str },
  required: ["proposition", "fragment"],
});

const formulaRequestCarrier = schemaFrom({
  $id: "playing/proof/formula-request",
  type: "object",
  properties: { name: str, generators: arr, universe: arr },
  required: ["name", "generators"],
});

const formulaMembershipRequestCarrier = schemaFrom({
  $id: "playing/proof/formula-membership-request",
  type: "object",
  properties: { design: ref("playing/design"), name: str, generators: arr, universe: arr },
  required: ["design", "name", "generators"],
});

const sessionRequestCarrier = schemaFrom({
  $id: "playing/proof/session-request",
  type: "object",
  properties: { session: objType },
  required: ["session"],
});

const sessionCompatibilityRequestCarrier = schemaFrom({
  $id: "playing/proof/session-compat-request",
  type: "object",
  properties: { left: objType, right: objType },
  required: ["left", "right"],
});

const embeddingRequestCarrier = schemaFrom({
  $id: "playing/proof/embedding-request",
  type: "object",
  properties: { name: str },
  required: ["name"],
});

function asRecord(input, verb) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${verb}: expected a JSON object`);
  return input;
}
function requireString(record, key, verb) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${verb}: requires "${key}"`);
  return value;
}

// ── the Proposition wire codec ──

const BINARY = {
  tensor, par, with: withProp, plus,
};
const UNARY = {
  ofCourse, whyNot, up, down,
};
const NULLARY = {
  one, bottom, top, zero,
};

/** Encode a proposition to its wire form: `{ connective, operands, polarity?, label? }`. */
function encodeProp(p) {
  return {
    connective: p.connective,
    operands: p.operands.map(encodeProp),
    ...(p.polarity !== undefined ? { polarity: polarityName(p.polarity) } : {}),
    ...(p.label !== undefined ? { label: p.label } : {}),
  };
}

/** Decode a proposition from its wire form through the exported smart constructors. */
function decodeProp(json, verb) {
  if (json === null || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${verb}: a proposition is an object`);
  const record = json;
  const connective = record["connective"];
  if (typeof connective !== "string") throw new TypeError(`${verb}: proposition requires a "connective"`);
  const rawOperands = Array.isArray(record["operands"]) ? record["operands"] : [];
  const operands = rawOperands.map((o) => decodeProp(o, verb));
  if (connective === "atom") {
    const label = typeof record["label"] === "string" ? record["label"] : "";
    const polName = record["polarity"];
    const p = polName === "positive" || polName === "negative" ? polarity(polName) : positive();
    return atom(label, p);
  }
  const nullary = NULLARY[connective];
  if (nullary !== undefined) return nullary();
  const unary = UNARY[connective];
  if (unary !== undefined) {
    if (operands[0] === undefined) throw new TypeError(`${verb}: ${connective} needs one operand`);
    return unary(operands[0]);
  }
  const binary = BINARY[connective];
  if (binary !== undefined) {
    if (operands[0] === undefined || operands[1] === undefined) throw new TypeError(`${verb}: ${connective} needs two operands`);
    return binary(operands[0], operands[1]);
  }
  throw new TypeError(`${verb}: unknown connective ${JSON.stringify(connective)}`);
}

/** A session type from the wire (it is plain JSON; validated structurally). */
function sessionFrom(json, verb) {
  if (!isSessionType(json)) throw new TypeError(`${verb}: expected a session type (kind game.logic.session.*)`);
  return json;
}

// ── CLL propositions ──

/** propose — admit/validate a CLL proposition; report its signature, focus, and polarity. */
export const proposeAction = operation({
  verb: "propose",
  inputFormat: "json",
  outputFormat: "json",
  domain: propositionRequestCarrier,
  codomain: propositionCarrier,
  summary: "Admit a CLL proposition (the name of a behaviour); report its connective signature, focus, and polarity.",
  description: "Domain: { proposition: <a CLL proposition tree: connective/operands/polarity?/label?> }. Codomain: the proposition (playing/proposition), with its distinct connectives, whether its head is focused, and its Andreoli polarity.",
  run: (input) => {
    const p = decodeProp(asRecord(input, "propose")["proposition"], "propose");
    const pol = polarityOf(p);
    return jsonResource({
      kind: "playing.proposition",
      proposition: encodeProp(p),
      connectives: [...connectivesOf(p)],
      focused: isFocused(p),
      polarity: pol === null ? null : polarityName(pol),
      wellFormed: isProposition(p),
    }, "playing proposition");
  },
});

/** dual-prop — the involutive linear negation (-)^⊥ (De Morgan; (↑P)^⊥ = ↓(P^⊥)). */
export const dualPropAction = operation({
  verb: "dual-prop",
  inputFormat: "json",
  outputFormat: "json",
  domain: propositionRequestCarrier,
  codomain: propositionCarrier,
  summary: "The involutive linear negation (-)^⊥ of a CLL proposition (De Morgan; shifts swap ↑↔↓).",
  description: "Domain: { proposition }. Codomain: the dual proposition (playing/proposition). dual-prop∘dual-prop is the identity.",
  run: (input) => {
    const p = decodeProp(asRecord(input, "dual-prop")["proposition"], "dual-prop");
    const d = dualProp(p);
    const pol = polarityOf(d);
    return jsonResource({
      kind: "playing.proposition",
      proposition: encodeProp(d),
      connectives: [...connectivesOf(d)],
      focused: isFocused(d),
      polarity: pol === null ? null : polarityName(pol),
      wellFormed: true,
    }, "playing proposition dual");
  },
});

/** classify-fragment — the least fragment of the lattice admitting a proposition. */
export const classifyFragmentAction = operation({
  verb: "classify-fragment",
  inputFormat: "json",
  outputFormat: "json",
  domain: propositionRequestCarrier,
  codomain: fragmentMembershipCarrier,
  summary: "Classify a proposition into the least linear-logic fragment that admits all its connectives.",
  description: "Domain: { proposition }. Codomain: the fragment membership (playing/fragment-membership): the least admitting fragment name.",
  run: (input) => {
    const p = decodeProp(asRecord(input, "classify-fragment")["proposition"], "classify-fragment");
    return jsonResource({ kind: "playing.fragment-membership", name: classifyFragment(p).name, inFragment: true }, "playing fragment classification");
  },
});

/** in-fragment — whether a proposition lies in a named fragment (and what it forbids if not). */
export const inFragmentAction = operation({
  verb: "in-fragment",
  inputFormat: "json",
  outputFormat: "json",
  domain: fragmentRequestCarrier,
  codomain: fragmentMembershipCarrier,
  summary: "Whether a proposition lies in a named fragment (MLL/MALL/ILL/CLL/LL); the forbidden connectives if not.",
  description: "Domain: { proposition, fragment: MLL|MALL|ILL|CLL|LL }. Codomain: the fragment membership (playing/fragment-membership): inFragment, and the forbidden connectives when not.",
  run: (input) => {
    const record = asRecord(input, "in-fragment");
    const p = decodeProp(record["proposition"], "in-fragment");
    const name = requireString(record, "fragment", "in-fragment");
    if (!fragmentNames().includes(name)) throw new TypeError(`in-fragment: unknown fragment ${JSON.stringify(name)}`);
    const judgment = inFragment(p, name);
    if (judgment.kind === "game.logic.inFragment:witness") {
      return jsonResource({ kind: "playing.fragment-membership", name, inFragment: true }, "playing fragment membership");
    }
    return jsonResource({ kind: "playing.fragment-membership", name, inFragment: false, forbidden: [...judgment.forbidden] }, "playing fragment membership");
  },
});

/** focus — the Andreoli focusing polarity of a proposition (positive/negative/unfocused). */
export const focusAction = operation({
  verb: "focus",
  inputFormat: "json",
  outputFormat: "json",
  domain: propositionRequestCarrier,
  codomain: focusingCarrier,
  summary: "The Andreoli focusing polarity of a proposition's head (positive/synchronous vs negative/asynchronous).",
  description: "Domain: { proposition }. Codomain: the focusing reading (playing/focusing): the head polarity and whether the head is focused. The shifts ↑/↓ set this polarity explicitly.",
  run: (input) => {
    const p = decodeProp(asRecord(input, "focus")["proposition"], "focus");
    const pol = polarityOf(p);
    return jsonResource({
      kind: "playing.focusing",
      connective: p.connective,
      coheres: isFocused(p),
      polarity: pol === null ? null : polarityName(pol),
    }, "playing focusing");
  },
});

// ── formulas: the names of behaviours (logic ↔ topology bridge) ──

/** formula — name a behaviour by a generator-set; return the behaviour it denotes. */
export const formulaAction = operation({
  verb: "formula",
  inputFormat: "json",
  outputFormat: "json",
  domain: formulaRequestCarrier,
  codomain: formulaCarrier,
  summary: "Name a behaviour by a generator-set (a formula); return the behaviour it denotes (its B^⊥⊥).",
  description: "Domain: { name: string, generators: <playing/design>[], universe?: <playing/design>[] }. Codomain: the formula (playing/formula): its name and the carrier of the behaviour it denotes.",
  run: (input) => {
    const record = asRecord(input, "formula");
    const name = requireString(record, "name", "formula");
    const generators = (Array.isArray(record["generators"]) ? record["generators"] : []).map((d) => decodeDesign(d));
    const universe = Array.isArray(record["universe"]) ? record["universe"].map((d) => decodeDesign(d)) : [...generators];
    const f = formula(name, generators);
    const behaviour = denotation(f, universe);
    return jsonResource({ kind: "playing.formula", name, behaviour: behaviour.carrier.map((d) => encodeDesign(d)), size: behaviour.carrier.length }, "playing formula");
  },
});

/** proves — whether a design proves a formula (plays in the behaviour the formula names). */
export const provesAction = operation({
  verb: "proves",
  inputFormat: "json",
  outputFormat: "json",
  domain: formulaMembershipRequestCarrier,
  codomain: formulaCarrier,
  summary: "Whether a design proves a formula — plays in the behaviour the formula names.",
  description: "Domain: { design: <playing/design>, name, generators: <playing/design>[], universe?: <playing/design>[] }. Codomain: the formula membership (playing/formula): proves true/false.",
  run: (input) => {
    const record = asRecord(input, "proves");
    const design = decodeDesign(record["design"]);
    const name = requireString(record, "name", "proves");
    const generators = (Array.isArray(record["generators"]) ? record["generators"] : []).map((d) => decodeDesign(d));
    const universe = Array.isArray(record["universe"]) ? record["universe"].map((d) => decodeDesign(d)) : [...generators];
    return jsonResource({ kind: "playing.formula", name, proves: proves(design, formula(name, generators), universe) }, "playing formula membership");
  },
});

// ── session types (Caires–Pfenning) ──

/** session — the CLL proposition a session type corresponds to (Caires–Pfenning). */
export const sessionAction = operation({
  verb: "session",
  inputFormat: "json",
  outputFormat: "json",
  domain: sessionRequestCarrier,
  codomain: sessionCarrier,
  summary: "The CLL proposition a session type corresponds to (Caires–Pfenning: session types as linear propositions).",
  description: "Domain: { session: <a session type: kind game.logic.session.{end,wait,send,recv,select,offer,server,client}> }. Codomain: the correspondence (playing/session): the session and its proposition image.",
  run: (input) => {
    const s = sessionFrom(asRecord(input, "session")["session"], "session");
    const c = sessionCorrespondence(s);
    return jsonResource({ kind: "playing.session", session: s, proposition: encodeProp(c.proposition) }, "playing session");
  },
});

/** dual-session — the dual endpoint of a session, mapping to CLL linear negation. */
export const dualSessionAction = operation({
  verb: "dual-session",
  inputFormat: "json",
  outputFormat: "json",
  domain: sessionRequestCarrier,
  codomain: sessionCarrier,
  summary: "The dual endpoint of a session type (its proposition is the linear negation of the original's).",
  description: "Domain: { session }. Codomain: (playing/session) the session, its dual, and both propositions.",
  run: (input) => {
    const s = sessionFrom(asRecord(input, "dual-session")["session"], "dual-session");
    const d = dualSession(s);
    return jsonResource({
      kind: "playing.session",
      session: s,
      dual: d,
      proposition: encodeProp(propositionOfSession(s)),
      dualProposition: encodeProp(propositionOfSession(d)),
    }, "playing session dual");
  },
});

/** session-compat — whether two endpoints can communicate (one is the dual of the other). */
export const sessionCompatAction = operation({
  verb: "session-compat",
  inputFormat: "json",
  outputFormat: "json",
  domain: sessionCompatibilityRequestCarrier,
  codomain: sessionCompatCarrier,
  summary: "Whether two session endpoints are compatible — one is the dual of the other (the channel cut boundary).",
  description: "Domain: { left: <session>, right: <session> }. Codomain: the compatibility verdict (playing/session-compat): compatible + the cut proposition A⊗A^⊥, or the expected dual.",
  run: (input) => {
    const record = asRecord(input, "session-compat");
    const left = sessionFrom(record["left"], "session-compat");
    const right = sessionFrom(record["right"], "session-compat");
    const judgment = sessionCompatibilityJudgment(left, right);
    if (judgment.kind === "game.logic.sessionCompatibility:witness") {
      return jsonResource({ kind: "playing.session-compat", compatible: true, cut: encodeProp(judgment.cut) }, "playing session compatibility");
    }
    return jsonResource({ kind: "playing.session-compat", compatible: false, expectedRight: judgment.expectedRight, reason: judgment.reason }, "playing session compatibility");
  },
});

// ── the embeddings, applied ──

/** embed — one of the four sub-*-autonomous embeddings into CGS, by name. */
export const embedAction = operation({
  verb: "embed",
  inputFormat: "json",
  outputFormat: "json",
  domain: embeddingRequestCarrier,
  codomain: embeddingCarrier,
  summary: "One sub-*-autonomous embedding into CGS by name (hylandOng | dialectica | nominal | cairesPfenning).",
  description: "Domain: { name: hylandOng|dialectica|nominal|cairesPfenning }. Codomain: the embedding (playing/embedding): its source, sub-category, constraint, citation, and full-abstraction theorem.",
  run: (input) => {
    const name = requireString(asRecord(input, "embed"), "name", "embed");
    if (!embeddingNames().includes(name)) throw new TypeError(`embed: unknown embedding ${JSON.stringify(name)} (have ${embeddingNames().join("/")})`);
    const e = embeddingByName(name);
    return jsonResource({ kind: "playing.embedding", embeddings: [{ name: e.name, source: e.source, subcategory: e.subcategory, constraint: e.constraint, citation: e.citation, theorem: e.theorem }] }, "playing embedding");
  },
});

/** The logic-layer actions — aggregated into the package surface by actions.mts. */
export const proofActions = Object.freeze([
  proposeAction,
  dualPropAction,
  classifyFragmentAction,
  inFragmentAction,
  focusAction,
  formulaAction,
  provesAction,
  sessionAction,
  dualSessionAction,
  sessionCompatAction,
  embedAction,
]);

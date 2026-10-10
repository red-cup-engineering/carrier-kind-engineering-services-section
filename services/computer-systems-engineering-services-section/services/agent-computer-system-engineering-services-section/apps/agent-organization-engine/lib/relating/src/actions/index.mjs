/**
 * @packageDocumentation
 *
 * The package's registered operations, each a cocone leg.
 *
 * These are the relating morphisms presented at the boundary. `induceSurface` over
 * this list assembles the discovery apex; the `relate` dispatcher runs any of
 * them. None of these files binds stdin or argv — the dispatcher owns that, once.
 *
 * Every verb's body is a SEN term; what it computes is always a Sign-package
 * function named through a primitive (running/primitives): articulate a cell
 * (SignCell), generate its site and posit over it (SignGraph), settle and read
 * the settlement (SignCraft).
 *
 * The list also carries the package's introspection surface. `morphismCarrier`
 * serializes an action declaration without its executable closure; the `inspect`
 * action reads that morphism carrier and reports whether its SEN body is present,
 * closed, how large it is, and which term constructors it uses. That is deliberately
 * a boundary read today: it inspects host-level metadata about the term object
 * rather than claiming to be a pure carrier morphism in SEN.
 *
 * @example
 * ```js
 * import { actions, induceSurface, morphismCarrier } from "@red-cup-engineering/relating";
 *
 * const apex = induceSurface(actions, { packageName: "@red-cup-engineering/relating" });
 * const conflate = actions.find((action) => action.verb === "conflate-reading");
 * const report = apex.dispatch(["inspect"], JSON.stringify(morphismCarrier(conflate)));
 * JSON.parse(report.stdout).termUses; // ["lam", "prim", "var"]
 * ```
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isUtterance, utterance } from "@red-cup-engineering/signcell/cell";
import { utteranceCarrier, articulationCellCarrier } from "../carriers/index.mjs";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { objectTerm, arrayTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { inferTy, isClosed, termSize, termUses } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { contentAddressOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { predicationSiteCarrier } from "../carriers/articulating/predicating/index.mjs";
import { readingNameCarrier, positPresheafCarrier } from "../carriers/articulating/predicating/positing/index.mjs";
import {
  settlementFiltrationCarrier,
  settlingClassificationCarrier,
  settlingClosureInvariantCarrier,
  settlingFirstCohomologyCarrier,
  settlingGradedGapCarrier,
  settlingRankIdentityCarrier,
} from "../carriers/articulating/predicating/positing/settling/index.mjs";
import { inspectionReportCarrier } from "../carriers/running/index.mjs";
import { generateDeclaration } from "../writing/print.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

// — the descent as SEN over the Sign packages' primitives (running/primitives) —

const input = tm.var(0);
/** The site a list of cells generates. */
const siteOf = (cells) => tm.prim("signgraph.site", objectTerm([["cells", cells], ["specializations", arrayTerm([])]]));
/** Posit cells over the site they generate, then settle under its transport. */
const settleCells = (cells) => tm.prim("signcraft.settle", tm.prim("signgraph.posit", objectTerm([["site", siteOf(cells)], ["valuation", cells]])));

export const articulateTerm = tm.lam(tm.prim("signcell.articulate", input));
export const predicateTerm = tm.lam(siteOf(arrayTerm([input])));
export const positTerm = tm.lam(tm.prim("signgraph.posit", input));
export const settleTerm = tm.lam(tm.prim("signcraft.settle", input));
/** An utterance's relation: its articulated cell, settled over the site it generates. */
export const induceRelationTerm = tm.lam(tm.app(tm.lam(settleCells(arrayTerm([tm.var(0)]))), tm.prim("signcell.articulate", input)));
/** A membrane's relation: its tellings, settled over the site they generate. */
export const induceMembraneTerm = tm.lam(tm.prim("relating.settle-membrane", input));
export const relateRelationsTerm = tm.lam(tm.prim("signcraft.relate", input));
/** Coincidence of two payloads: SignCell's coincides, as a witness or an obstruction. */
export const coincideTerm = tm.lam(tm.cond(
  tm.coincide(tm.field("left", input), tm.field("right", input)),
  objectTerm([["kind", stringTerm("signcell.coincidence:witness")], ["left", tm.field("left", input)], ["right", tm.field("right", input)]]),
  objectTerm([["kind", stringTerm("signcell.coincidence-obstruction")], ["left", tm.field("left", input)], ["right", tm.field("right", input)]]),
));

/** A settlement read: a settlement (or a presented filtration) in, SignCraft's read of it out. */
function settlementRead(verb, summary, primitive, codomain) {
  return operation({
    verb,
    inputFormat: "json",
    outputFormat: "json",
    summary,
    description: "Domain: a SignCraft settlement, or a presented settlement filtration, as JSON. Codomain: the read as JSON.",
    domain: settlementFiltrationCarrier,
    ...(codomain ? { codomain } : {}),
    runTerm: tm.lam(tm.prim(primitive, input)),
  });
}

/** The settlement reads, each a SignCraft read named in SEN. */
export const settlementReadActions = Object.freeze([
  settlementRead("read-increments-of-settlement-filtration", "The per-stage cell increments of a settling.", "signcraft.increments"),
  settlementRead("read-firings-of-settlement-filtration", "The increments that add cells.", "signcraft.firings"),
  settlementRead("read-limit-stages-of-settlement-filtration", "The limit-shaped stages of a settling.", "signcraft.limit-stages"),
  settlementRead("read-non-scott-firings-of-settlement-filtration", "The cell-adding firings at limit stages.", "signcraft.non-scott-firings"),
  settlementRead("read-first-cohomology-of-settlement-filtration", "The degree-1 cohomology of a settling.", "signcraft.first-cohomology", settlingFirstCohomologyCarrier),
  settlementRead("read-closure-invariant-of-settlement-filtration", "The closure invariant (non-Scott additions).", "signcraft.closure-invariant", settlingClosureInvariantCarrier),
  settlementRead("read-graded-gap-of-settlement-filtration", "The graded gap (cells lost at non-Scott firings).", "signcraft.graded-gap", settlingGradedGapCarrier),
  settlementRead("read-graded-gap-first-cohomology-rank-identity-of-settlement-filtration", "The graded-gap = H¹-rank identity.", "signcraft.gap-cohomology-identity", settlingRankIdentityCarrier),
  settlementRead("read-classification-of-settlement-filtration", "The regime, depth, and cofinality classification.", "signcraft.classify", settlingClassificationCarrier),
]);
/**
 * Admit the token/claim utterance from the input carrier, however it was wired.
 *
 * An Utterance is one object — a pair of opaque Marks (left=token, right=claim) —
 * with several legitimate boundary encodings, all decoded *into the input
 * carrier* (never the options channel, where token/claim are not parameters but
 * the domain itself):
 *   - the `string` wire: two Mark payloads split on the FIRST newline. Idiomatic
 *     Unix admission of two marks from one stream; the claim, being prose, is the
 *     half allowed to carry further newlines.
 *   - the `form`/`json` wire: a `{ token, claim }` object (so HTTP `?token=&claim=`
 *     and script composition build the same carrier).
 * The morphism is indifferent to which encoding arrived: one Utterance results.
 */
export function admitUtterance(input, verb) {
  if (typeof input === "string") {
    const newline = input.indexOf("\n");
    if (newline < 0) throw new TypeError(`${verb}: expected a token and claim separated by a newline`);
    return utterance(input.slice(0, newline), input.slice(newline + 1));
  }
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const record = input;
    if (isUtterance(record)) return record;
    if ("token" in record && "claim" in record) return utterance(record["token"], record["claim"]);
  }
  throw new TypeError(`${verb}: expected a "token\\nclaim" string or a { token, claim } object`);
}

/** utter — the admission boundary: get two Marks into the system as an utterance.
 *  The only morphism that injects data (a Mark); everything downstream is carrier
 *  → carrier. The pair arrives on the `string` (token\nclaim), `form`
 *  (?token=&claim=), or `json` ({token,claim}) wire. */
export const utterAction = operation({
  verb: "utter",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Admit two Marks as an utterance (token and claim).",
  description: "Domain: a token Mark and a claim Mark, wired as `token\\nclaim` (string), `?token=&claim=` (form), or `{token,claim}` (JSON). Codomain: the UtteranceCarrier as JSON.",
  // Codomain carrier identity is the producer side of the `utter -> articulate`
  // carrier edge; schema refs are projected later from this carrier object.
  codomain: utteranceCarrier,
  run: (input) => jsonResource(admitUtterance(input, "utter"), "utterance"),
});

/** articulate — Utterance → SignCell: the utterance's reflexive cell, told for by its token. */
export const articulateAction = operation({
  verb: "articulate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Articulate an utterance as its reflexive cell, told for by its token.",
  description: "Domain: an UtteranceCarrier as JSON (the codomain of `utter`). Codomain: the SignCell as JSON.",
  // Domain carrier consumes the same carrier identity `utter` emits; that identity
  // is the wiring-graph edge `utter -> articulate`.
  domain: utteranceCarrier,
  codomain: articulationCellCarrier,
  runTerm: articulateTerm,
});

/** canonicalize — a JSON carrier to its canonical form: the identity endomorphism
 *  on the JSON wire, witnessing idempotence and representation-independence. */
export const canonicalizeAction = operation({
  verb: "canonicalize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Re-encode a JSON carrier in canonical form (identity on the JSON wire).",
  runTerm: tm.lam(tm.var(0)),
});

/** conflate-reading — SignChain's conflation of one reading. */
export const conflateReadingAction = operation({
  verb: "conflate-reading",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Conflate one reading: exchange told-neither and told-both.",
  description: "Domain and codomain: the four readings, by their extremal names. Body: SignChain's conflation.",
  domain: readingNameCarrier,
  codomain: readingNameCarrier,
  runTerm: tm.lam(tm.prim("signchain.conflate", tm.var(0))),
});

/** coincide — judge whether two Mark payloads coincide as tokens. Domain: a JSON
 *  object `{ left, right }`. Codomain: the coincidence judgment as JSON. */
export const coincideAction = operation({
  verb: "coincide",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Judge whether two Mark payloads coincide as token carriers.",
  runTerm: coincideTerm,
});

/** infer-type — the one SEN type a closed term has. Input: `{ term }`, the term as its JSON carrier
 *  (e.g. `["pair", ["mark", "\"a\""], ["mark", "\"b\""]]`). Output: the inferred type and the
 *  content address of the (term, type) judgment. A malformed or open term, or one with no single
 *  type (an unannotated lambda), is refused rather than answered. Formerly sold as RMN type inference. */
export const inferTypeAction = operation({
  verb: "infer-type",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Infer the SEN type of one closed term.",
  description: "Domain: { term } — a SEN term as its JSON carrier. Codomain: { type: \"SenTypeInference\", term, inferredType, id }; refuses open, malformed, or untypable terms.",
  run: (input) => {
    if (!input || typeof input !== "object" || !Object.hasOwn(input, "term")) throw new TypeError("sen-term-required");
    const term = input.term;
    let closed;
    try { closed = isClosed(term); } catch (error) { throw new TypeError(`malformed-sen-term: ${error.message}`); }
    if (!closed) throw new TypeError("sen-term-must-be-closed");
    const inferredType = inferTy([], term);
    if (inferredType === null || inferredType === undefined) throw new TypeError("sen-term-does-not-infer-one-type");
    const { id } = contentAddressOf({ objectKind: "public.sen-type-inference", value: { term, inferredType } });
    return { type: "SenTypeInference", term, inferredType, id };
  },
});

/** realize — the forgetful functor as a boundary morphism: a JSON Schema in,
 *  its TypeScript declaration out. `--name` sets the root type name. */
export const realizeAction = operation({
  verb: "realize",
  inputFormat: "json",
  outputFormat: "string",
  options: ["name"],
  summary: "Generate a TypeScript declaration from a JSON Schema (realize: Sub(J) → StructuralTypes).",
  description: "Domain: a JSON Schema document. Codomain: TypeScript declaration text; refinements are forgotten and remain the schema's runtime law.",
  run: (input, args) => {
    const name = typeof args["name"] === "string" ? args["name"] : "Root";
    return generateDeclaration(input, name);
  },
});

/** predicate — SignCell → site: the SignGraph site one cell generates. */
export const predicateAction = operation({
  verb: "predicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Generate the predication site of a cell.",
  description: "Domain: a SignCell as JSON (the codomain of `articulate`). Codomain: the SignGraph site as JSON.",
  domain: articulationCellCarrier,
  codomain: predicationSiteCarrier,
  runTerm: predicateTerm,
});

/** posit — a site and a valuation (a cell set over it) to the presheaf they make. */
export const positAction = operation({
  verb: "posit", inputFormat: "json", outputFormat: "json",
  summary: "Posit a valuation over a predication site.",
  description: "Domain: { site, valuation } — a SignGraph site and the cells told over it. Codomain: the SignGraph presheaf.",
  codomain: positPresheafCarrier, runTerm: positTerm,
});

/** settle — a presheaf to its settlement: SignCraft's closure to the least fixed point under the site's transport. */
export const settleAction = operation({
  verb: "settle", inputFormat: "json", outputFormat: "json",
  summary: "Settle a posited presheaf to its least fixed point.",
  domain: positPresheafCarrier,
  codomain: settlementFiltrationCarrier, runTerm: settleTerm,
});

/** induce-relation — an utterance to the settlement of the cell it articulates. */
export const induceRelationAction = operation({
  verb: "induce-relation", inputFormat: "json", outputFormat: "json",
  summary: "Settle the relation an utterance articulates.",
  domain: utteranceCarrier,
  codomain: settlementFiltrationCarrier, runTerm: induceRelationTerm,
});

/** induce-membrane — a membrane of utterances to the settlement of its tellings (denials told against). */
export const induceMembraneAction = operation({
  verb: "induce-membrane", inputFormat: "json", outputFormat: "json",
  summary: "Settle the relation a membrane of utterances tells.",
  codomain: settlementFiltrationCarrier, runTerm: induceMembraneTerm,
});

/** relate-relations — relate two settled relations: a JSON object `{ left, right }`
 *  of settlement filtrations, uttered against each other and re-induced. */
export const relateRelationsAction = operation({
  verb: "relate-relations",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Relate two settled relations: settle their joined cells again.",
  description: "Domain: a JSON object { left, right } of two SignCraft settlements. Codomain: the settlement of their joined cells.",
  codomain: settlementFiltrationCarrier,
  runTerm: relateRelationsTerm,
});

/** inspect — boundary introspection over a morphism carrier.
 *
 *  Input: the JSON produced by `morphismCarrier(action)`. Output: an inspection
 *  report. This deliberately remains an untyped boundary action until SEN grows
 *  structural metadata primitives for `isClosed`, `termSize`, and `termUses`.
 */
export const inspectAction = operation({
  verb: "inspect",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Inspect a morphism carrier: report its domain, codomain, and SEN body structure.",
  description: "Boundary introspection: input is a MorphismCarrier JSON (the output of morphismCarrier()). Output is an ActionInspection report. This is not yet an IR morphism because term metadata reads are host-level.",
  codomain: inspectionReportCarrier,
  run: (input) => {
    const mc = input;
    const report = {
      kind: "relating.action.inspection",
      verb: mc.verb,
      hasRunTerm: mc.runTerm !== undefined,
    };
    if (mc.domain !== undefined) report["domain"] = mc.domain;
    if (mc.codomain !== undefined) report["codomain"] = mc.codomain;
    if (mc.runTerm !== undefined) {
      try {
        const t = mc.runTerm;
        report["termClosed"] = isClosed(t);
        report["termSize"] = termSize(t);
        report["termUses"] = [...termUses(t)];
      } catch {
        // runTerm present but structurally malformed — report hasRunTerm only
      }
    }
    return report;
  },
});

/** The package's actions — the source `induceSurface` reads. */
export const actions = Object.freeze([
  utterAction,
  articulateAction,
  predicateAction,
  positAction,
  settleAction,
  induceRelationAction,
  induceMembraneAction,
  relateRelationsAction,
  coincideAction,
  canonicalizeAction,
  conflateReadingAction,
  ...settlementReadActions,
  realizeAction,
  inspectAction,
  inferTypeAction,
]);

/**
 * SignCraft's SEN primitive environment: the Sign packages' functions, each
 * taking and giving JSON. SEN is the notation relating's verbs are written in;
 * what a verb computes is always one of these functions, never a second
 * implementation of it in SEN.
 */
import { knowledgeJoin, negate, truthJoin } from "@red-cup-engineering/signchain/bilattice";
import { articulate, claimValue, evidenceOf, tokenValue } from "@red-cup-engineering/signcell/cell";
import { site } from "@red-cup-engineering/signgraph/site";
import { posit } from "@red-cup-engineering/signgraph/valuation";
import { transportRules } from "@red-cup-engineering/signgraph/site";
import {
  classify, closureInvariant, filtration, firings, firstCohomology, gapCohomologyIdentity, gradedGap, increments,
  limitStages, nonScottFirings, relate, settle,
} from "@red-cup-engineering/signcraft/settle";
import { evaluateRunTerm as evaluateWith } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { settleMembrane, tellMembrane } from "./membrane.mjs";
import { conflateReading } from "@red-cup-engineering/computer-data-services-section/four";

/** A settlement, or a presented filtration given as JSON (stages and cofinality). */
const settled = (value) => value.kind === "signcraft.filtration" ? filtration(value.stages, value.cofinality) : value;

export const primitives = Object.freeze({
  "signchain.conflate": (name) => conflateReading(name),
  "signchain.negate": (value) => negate(value),
  "signchain.knowledge-join": ({ left, right }) => knowledgeJoin(evidenceOf(left), evidenceOf(right)),
  "signchain.truth-join": ({ left, right }) => truthJoin(evidenceOf(left), evidenceOf(right)),
  "signcell.articulate": (carrier) => articulate(tokenValue(carrier), claimValue(carrier)),
  "relating.tell-membrane": (utterances) => tellMembrane(utterances),
  "relating.settle-membrane": (utterances) => settleMembrane(utterances),
  "signgraph.site": ({ cells, specializations = [] }) => site(cells, specializations),
  "signgraph.posit": ({ site: at, valuation }) => posit(at, valuation),
  "signcraft.settle": (presheaf) => settle(presheaf, transportRules(presheaf.site)),
  "signcraft.relate": ({ left, right }) => relate(left, right),
  "signcraft.increments": (value) => increments(settled(value)),
  "signcraft.firings": (value) => firings(settled(value)),
  "signcraft.limit-stages": (value) => limitStages(settled(value)),
  "signcraft.non-scott-firings": (value) => nonScottFirings(settled(value)),
  "signcraft.first-cohomology": (value) => firstCohomology(settled(value)),
  "signcraft.graded-gap": (value) => gradedGap(settled(value)),
  "signcraft.gap-cohomology-identity": (value) => gapCohomologyIdentity(settled(value)),
  "signcraft.closure-invariant": (value) => closureInvariant(settled(value)),
  "signcraft.classify": (value) => classify(settled(value)),
});

/** Evaluate a SEN run term on a JSON input with these primitives. */
export const evaluateRunTerm = (runTerm, input) => evaluateWith(runTerm, input, primitives);

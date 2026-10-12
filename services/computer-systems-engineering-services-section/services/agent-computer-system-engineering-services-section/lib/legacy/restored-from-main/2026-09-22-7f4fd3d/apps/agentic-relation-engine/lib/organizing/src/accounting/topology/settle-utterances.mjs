/**
 * accounting/topology/settle-utterances — fold a log of utterances into a settlement.
 *
 * The topology carriers (financial / market / ledger) each settle a *list* of
 * utterances, but relating's `induceRelation` settles ONE utterance and the
 * fixed-point readers (`fixedPoints` / `fixedPointReadings`) read a single
 * posited presheaf. This module is the multi-utterance fold those carriers need,
 * implemented as the canonical relating descent over a whole log — exactly the
 * `articulate → predicate → posit → settle` traversal that animating's `descend`
 * runs (see lib/animating/src/becoming/descending.mts): predicate every
 * articulated utterance, glue the cells + specializations into one predication
 * site, posit once, then read the settlement filtration and the fixed-point
 * readings off that single posited presheaf.
 *
 * No money, no charge, no free data enters here — only the value-free relational
 * skeleton (content/CLAUDE.md anti-fetishism rule). It is the one place the
 * topology carriers turn a log into a settled meme-topology.
 */
import { articulate } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { predicate, predicationSite } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { posit, meme, composeFibers } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fiber";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { fixedPoints } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fixed-point";
import { fixedPointReadings } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fixed-point-reading";
import { settleKnowledge } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/valuation-closure";

/** Posit a whole log of utterances once: predicate each, glue into one site, posit. */
function positLog(utterances) {
  const generated = utterances.map((carrier) => predicate(articulate(carrier)));
  const site = predicationSite(generated.flatMap((s) => [...s.cells.cells, ...s.specializations]));
  // Self-witness every cell with its own subject mark, in the absence of
  // independent evidence — the same convention `witnessedPotential` names.
  const valuation = composeFibers(
    site.cells.cells.map((cell) => meme(cell, witnessedPotential(cell.subject.mark))),
    site.base,
  );
  return posit(site, valuation);
}

/** Settle a log of utterances into its settlement filtration (the ordinal closure). */
export function settleUtterances(utterances) {
  return settleKnowledge(positLog(utterances));
}

/** Read the knowledge-/truth-least fixed-point readings of a settled log of utterances. */
export function fixedPointReadingsOfUtterances(
  utterances,
) {
  return fixedPointReadings(fixedPoints(positLog(utterances)));
}

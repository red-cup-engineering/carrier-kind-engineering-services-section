/**
 * utterance-reading - ergonomic readers over the lawful utterance descent.
 */
import type { UtteranceCarrier } from "@lenticule-science/articulating/utterance";
import { freePredicationSite } from "@lenticule-science/articulating/predicating/predication";
import { posit } from "./topology.mjs";
import { fixedPoints } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point";
import { fixedPointReadings, type MemeTopologyFixedPointReadings } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-reading";
import { freeSettlementFiltration, type SettlementFiltrationGenerators } from "./topology.mjs";
import type { SettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/object";
import { induceRelation, relateRelations } from "./topology.mjs";

function generatorsOfUtterances(utterances: readonly UtteranceCarrier[]): SettlementFiltrationGenerators {
  if (utterances.length === 0) throw new TypeError("expected at least one utterance");
  return utterances
    .map(induceRelation)
    .reduce((left, right) => relateRelations(left, right));
}

export function settleUtterances(utterances: readonly UtteranceCarrier[]): SettlementFiltration {
  return freeSettlementFiltration(generatorsOfUtterances(utterances));
}

export function fixedPointReadingsOfUtterances(utterances: readonly UtteranceCarrier[]): MemeTopologyFixedPointReadings {
  const generators = generatorsOfUtterances(utterances);
  const site = freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  });
  return fixedPointReadings(fixedPoints(posit(site)));
}

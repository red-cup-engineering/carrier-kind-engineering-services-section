/**
 * settling/topology — the composed relation descent.
 *
 * `induceRelation` is the whole descent with the same base domain as `articulate`
 * plus admitted evidence and an explicit closure order:
 * articulate → predicate → posit → settle. `relateRelations` combines two stored
 * relation presentations
 * STRUCTURALLY — the union of their generators (an associative monoid) — not by
 * opacifying them into marks and re-descending.
 */
import { type UtteranceCarrier } from "@red-cup-engineering/computer-data-engine/utterance";
import type { ChargeCarrier } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import type { SettlementFiltration } from "./object.mjs";
import { type PredicationValuationClosureOrderCarrier, type SettlementFiltrationGenerators } from "./valuation-closure.mjs";
/** Induce one relation through every stage with explicit evidence and closure. */
export declare function induceRelation(carrier: UtteranceCarrier, admittedCharge: ChargeCarrier, closureOrder: PredicationValuationClosureOrderCarrier): SettlementFiltration;
/** Relate two relations by the UNION of their generators (an associative monoid;
 *  coincident cells dedupe when `free` materializes the cell set). */
export declare function relateRelations(left: SettlementFiltrationGenerators, right: SettlementFiltrationGenerators): SettlementFiltrationGenerators;

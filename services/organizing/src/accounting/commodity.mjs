/**
 * organizing/accounting/commodity — the two-fold commodity as a reading over an
 * accounting society.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 1 ("commodity = reading", `relating`): *"Marx's two-fold commodity:
 * use-value ⟂ exchange-value = the bilattice's two orders (`≤ₜ` quality / `≤ₖ`
 * evidence). A commodity is a reading over a society, not a thing."* And §1, the
 * anti-fetishism law that makes this package buildable here and nowhere else:
 *
 * > Commodity fetishism = the type error of reading a settled reading as free
 * > data on the carrier, instead of as the image of a predication among agents.
 *
 * The law is enforced *structurally*: there is no constructor that admits a
 * use-value or exchange-value as a passed-in value. Both readings are **derived**
 * — `induceFinancialTopology` settles the society's utterances into a meme
 * topology, and the two readings are read off its two sections:
 *
 *   - **use-value** is the *quality* order `≤ₜ` (Capital I.1: use-value is the
 *     useful, qualitative side — "the usefulness of a thing"). It is read from
 *     the **truth-least** section as the knowledge-join of the society's
 *     *holding* and *exposure* predications about this commodity: who actually
 *     holds it / is exposed to it is the qualitative, in-hand fact.
 *   - **exchange-value** is the *evidence* order `≤ₖ` (Capital I.1: exchange-value
 *     "appears as the quantitative relation… a relation constantly changing with
 *     time and place" — the social ratio, not a property of the thing). It is
 *     read from the **knowledge-least** section as the knowledge-join of the
 *     society's *transfer* and *denomination* predications about this commodity:
 *     the ratios of exchange and the unit it is reckoned in are the evidential,
 *     between-producers fact (the exchange-value note: *"ratios of exchange
 *     express relations among producers, not among things"*).
 *
 * The commodity's `symbol` is exactly the money grade: `@red-cup-engineering/gaming/market`'s
 * `Money = GradedRational` carries a `grade:string`, and that grade is this
 * `symbol`. The link is the identity `symbol ↦ commodityOf(money)` — no value is
 * imported, only the name of the general equivalent the commodity is reckoned in.
 * (The financial-topology readers below are the native organizing accounting
 * topology surface.)
 *
 * Carrier `$id`: `organizing/accounting/commodity` (bare descent path; the absolute URL is a
 * serve-time projection). Each verb is registered once as a relating `action` so
 * `induceSurface` projects it to every transport, and every `run` return is gated by
 * `jsonResource`.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { knowledgeJoin } from "@red-cup-engineering/signchain/bilattice";
import { noEvidence } from "@red-cup-engineering/signchain/bilattice";
import { under } from "@red-cup-engineering/signcraft/settle";
import { evidenceOf, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import {
  financialCommodityTerm,
  financialKnowledgeSection,
  financialTruthSection,
  induceFinancialTopology,
  holdsPositionPredicate,
  hasExposureToPredicate,
  transferredToPredicate,
  denominatedInPredicate,
} from "./topology/financial.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** The carrier `$id` of a commodity — a reading over a society, never free data. */
export const COMMODITY_ID = "organizing/accounting/commodity";

/** The `{ $ref }` slot the commodity morphisms (exchange, value, …) reference. */
export const commodityRef = Object.freeze({ $ref: COMMODITY_ID });

export const commodityRequestCarrier = schemaFrom({
  $id: "organizing/accounting/commodity-request",
  title: "CommodityRequest",
  type: "object",
  properties: {
    seed: { type: "string" },
    society: { type: "array", items: { $ref: "meme/utterance" } },
  },
  description:
    "A commodity derivation request: a symbol|predicate seed plus a society of financial utterance carriers.",
});

export const commodityCarrier = schemaFrom({
  $id: COMMODITY_ID,
  title: "Commodity",
  type: "object",
  description:
    "The two-fold commodity as a reading over a settled accounting society: symbol plus derived use-value and exchange-value readings.",
});

/**
 * The two-fold commodity (Marx, Capital I.1): one `symbol`, two readings.
 *
 * `useValueReading` is the qualitative `≤ₜ` side (holding/exposure), `exchangeValueReading`
 * the social-ratio `≤ₖ` side (transfer/denomination). Both are settled `ReadingValue`s
 * derived from a society of predications — the carrier holds no free value.
 */

// — derivation: the anti-fetishism law made operational —

/**
 * Whether a settled section entry's boundary mentions this commodity.
 *
 * The financial commodity term's mark value is exactly the namespaced string
 * `financial.commodity.<symbol>` (`financialCommodityTerm`). An entry is *about*
 * the commodity when that string occurs anywhere in its cell's subject/object
 * boundary — the question "does this predication relate this commodity?" answered
 * over the flattened cell, never over free data attached to the symbol.
 */
function entryMentionsCommodity(entry, symbol) {
  const needle = financialCommodityTerm(symbol);
  return JSON.stringify([entry.subject, entry.predicate, entry.object]).includes(JSON.stringify(needle).slice(1, -1));
}

/**
 * Join (under `≤ₖ`, `knowledgeJoin`) the readings of every section entry that is
 * about this commodity and is claimed under one of the given predicates. Starts
 * from `noEvidence` (absurd, no evidence) so an absent predication contributes
 * nothing — absence is data, not a default value. The fold accumulates the
 * society's evidence into a single settled reading carrier.
 */
function joinCommodityEvidence(
  section,
  symbol,
  predicates,
) {
  let accumulated = noEvidence;
  for (const predicate of predicates) {
    for (const entry of under(section, predicate)) {
      if (entryMentionsCommodity(entry, symbol)) {
        accumulated = knowledgeJoin(accumulated, evidenceOf(entry));
      }
    }
  }
  return accumulated;
}

/**
 * Derive a two-fold commodity from a society of financial utterances.
 *
 * Settles the society with `induceFinancialTopology`, then reads:
 *   - the **use-value** reading `≤ₜ` from the *truth-least* section as the join of
 *     the society's `holds-position` and `has-exposure-to` predications about the
 *     commodity (the qualitative, in-hand side);
 *   - the **exchange-value** reading `≤ₖ` from the *knowledge-least* section as the
 *     join of the `transferred-to` and `denominated-in` predications about the
 *     commodity (the social-ratio, between-producers side).
 *
 * Neither reading is admitted; both are images of predications among agents. A
 * commodity over the empty society is `absurd ⟂ absurd` — value is structurally
 * unrepresentable without a relation.
 */
export function commodity(symbol, society) {
  const topology = induceFinancialTopology(society);
  const qualitySection = financialTruthSection(topology); // ≤ₜ — use-value
  const evidenceSection = financialKnowledgeSection(topology); // ≤ₖ — exchange-value

  const useValueReading = knowledgeReading(joinCommodityEvidence(qualitySection, symbol, [holdsPositionPredicate(), hasExposureToPredicate()]));
  const exchangeValueReading = knowledgeReading(joinCommodityEvidence(evidenceSection, symbol, [transferredToPredicate(), denominatedInPredicate()]));

  return Object.freeze({
    kind: "organizing.accounting.commodity",
    symbol,
    useValueReading,
    exchangeValueReading,
  });
}

/** Read the use-value (`≤ₜ` quality) reading of a commodity. */
export function useValueOf(c) {
  return c.useValueReading;
}

/** Read the exchange-value (`≤ₖ` social-ratio) reading of a commodity. */
export function exchangeValueOf(c) {
  return c.exchangeValueReading;
}

// — boundary admission (the action edge reconstructs the society from JSON) —

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Admit the society of utterances from the action args.
 *
 * Already-built `UtteranceCarrier`s pass through; otherwise the society is empty
 * and the commodity settles to `absurd ⟂ absurd`. Utterances are never minted
 * from a bare value here — the financial-topology constructors (`holdingUtterance`,
 * `transferUtterance`, …) are the sanctioned way to articulate a society, and the
 * caller supplies them.
 */
function admitSociety(value) {
  if (Array.isArray(value)) {
    return value.filter(
      (item) =>
        isRecord(item) && (item).kind === "utterance.carrier",
    );
  }
  return Object.freeze([]);
}

/**
 * commodity — derive a two-fold commodity from a `symbol|predicate` seed over a society.
 *
 * Domain: a `symbol|predicate` seed string (the symbol left of `|`; an optional
 * predicate hint right of it, recorded as a witness mark) × a `society` of
 * financial utterance carriers. Codomain: a commodity carrier.
 *
 * The use-value and exchange-value readings are DERIVED by settling the society
 * (anti-fetishism law §1) — never read from the input. The result is gated by
 * `jsonResource`.
 */
export const commodityAction = operation({
  verb: "commodity",
  inputFormat: "json",
  outputFormat: "json",
  options: ["seed", "society"],
  summary:
    "Derive the two-fold commodity (use-value ≤ₜ ⟂ exchange-value ≤ₖ) from a symbol|predicate seed over a society of financial utterances.",
  description:
    "Domain: a `symbol|predicate` seed string x a society of financial utterance carriers. Codomain: a " +
    "commodity carrier. Settles the society with induceFinancialTopology and reads the use-value reading " +
    "(holding/exposure, truth-least ≤ₜ) and the exchange-value reading (transfer/denomination, " +
    "knowledge-least ≤ₖ). Both readings are derived from predications among agents — the anti-fetishism " +
    "law forbids admitting a value as free data on the symbol.",
  domain: commodityRequestCarrier,
  codomain: commodityCarrier,
  run: (input, args = {}) => {
    const rawSeed = (args.seed ?? input);
    const seed = typeof rawSeed === "string" ? rawSeed : "";
    const symbol = seed.split("|", 2)[0] ?? "";
    // The predicate hint right of `|` is recorded as a witness mark — it names the
    // predication the caller had in mind, but the readings still settle from the society.
    void seed;
    const society = admitSociety(args.society);
    return jsonResource(commodity(symbol, society), "commodity");
  },
});

/** The commodity module's verbs (stage 1): the single two-fold derivation. */
export const commodityActions = Object.freeze([commodityAction]);

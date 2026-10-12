/**
 * govern — socializing's GOVERNANCE reading over the inter-observer structure of the
 * Social Field. Jural reading and governance-act evaluation belong to the shared
 * governance science provider.
 *
 * Governance is SCALE-2-NATIVE. The corpus's governance thesis (content/_archive
 * lakotaean-governance/questions/what-is-the-theory-of-governance.md) anchors a process
 * π as a governance act iff it jointly satisfies ATTRIBUTION (π is done by a collective C,
 * not a lone member), BINDING (π produces/modifies a normative constraint on a member),
 * and BECOMING (π transitions C's state). All three are scale-2: a collective, a member
 * bound within it, the collective's transition. socializing is the home of C — the
 * observer category O over the Social Field — so the governance act lives here, not in
 * communicating (which carries only the within-agent BINDING illocution: its `illocute`
 * `declaration` force is the constitutive "X counts as Y" speech act, the single-agent
 * binding primitive this reading lifts).
 *
 * Operativity is the bilattice INFORMATION MEET ⊗_k of the three FOUR-valued settlements
 * (the thesis: "operativity = ⊗_k of attribution, binding, becoming"), not a Boolean
 * conjunction — so a gap (⊥, unsettled) is distinguished from a contradiction (⊤,
 * contested), exactly the Belnap-Dunn distinction the corpus's FOUR-enrichment isolates.
 *
 * BINDING is carried by the HOHFELDIAN jural relation (content/_archive
 * .../predicated-governance/objects/jural-relation.md): a directed correlative relation
 * between an active holder and a passive party — claim/duty, privilege/no-right,
 * power/liability, immunity/disability. The correlative `correlate` is the swap of
 * active/passive (the predicate-converse, self-adjoint in both bilattice orders so the
 * standing is preserved) composed with the kind-rename (a predicate-specialization); it
 * is not a new generator. A jural relation is genuinely OFF-DIAGONAL — it relates two
 * distinct observers — so it is socializing's structure, never communicating's.
 *
 * The resulting reading reports the observed power and accountability structure, including
 * directed cycles. It does not infer political discipline, a sheaf-cohomology class, or the
 * attribution, binding, and becoming evidence required for a governance act.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { cell, claimValue, knowledgeReading, tokenValue } from "@red-cup-engineering/signcell/cell";

import { admitSeed, descend } from "@red-cup-engineering/animating/becoming/descending";
import {
  JURAL_KINDS,
  correlate,
  governanceAct,
  readJuralRelations,

} from "./jural.mjs";

import { aggregatePreferences } from "./preference.mjs";
import { priceConsensus } from "./price.mjs";
import { completeTranslations, ungroundedSection } from "./field.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** The Hohfeldian eightfold — the four ADVANTAGE positions and their four correlatives.
 *  claim/duty, privilege/no-right, power/liability, immunity/disability (jural-relation.md). */
/** Hohfeld's correlative table: the passive kind paired with each active kind. The pairing
 *  is an involution (correlate ∘ correlate = id). */
/**
 * A single Hohfeldian jural relation between two observers: a directed correlative
 * normative relation, FOUR-valued in its existence (jural-relation.md "Bilattice values on
 * jural-relation cells": t asserted, f denied, ⊥ no information, ⊤ contradictory).
 */
/**
 * The CORRELATIVE of a jural relation: swap active and passive parties (the
 * predicate-converse — self-adjoint in both bilattice orders, so the standing is
 * preserved) and rename the kind to its correlative (a predicate-specialization). Per
 * jural-relation.md this factors through existing predicate-category generators; it is not
 * a new generator. Involutive: `correlate(correlate(r))` is `r`.
 */
/**
 * socializing's GOVERNANCE reading over an inter-agent membrane, with separately supplied
 * governance-act evidence.
 */
export { JURAL_KINDS, correlativeKind, correlate } from "./jural.mjs";

/** One pairwise vote normalized to the canonical pair a < b. */

/** The proof receipt attached to each market-settled cell. */

/** One preference cell settled as a market: equilibrium price, H1 spread, and decision. */

/** A governance decision settled by the price/no-arbitrage/H1 market reading. */

/** Parse one membrane utterance as a jural relation: token = the active holder; claim =
 *  `kind>passive>scope` (scope optional). A leading negation marker denies the relation
 *  (standing `active`); otherwise it is asserted (`potential`). Returns null if the claim is
 *  not a recognized jural kind. */
function parseJural(token, claimValue) {
  if (typeof token !== "string" || typeof claimValue !== "string") return null;
  const raw = claimValue.trim();
  const denied = /^(not|no|never)\b\s*/i.test(raw) || /^[¬!-]\s*/.test(raw);
  const body = raw.replace(/^(not|no|never)\b\s*/i, "").replace(/^[¬!-]\s*/, "").trim();
  const parts = body.split(">").map((part) => part.trim());
  const kind = parts[0];
  const passive = parts[1];
  if (kind === undefined || passive === undefined || passive === "") return null;
  if (!(JURAL_KINDS).includes(kind)) return null;
  const active = token.trim();
  if (active === "") return null;
  return Object.freeze({
    kind: kind,
    active,
    passive,
    scope: parts[2] ?? "",
    standing: (denied ? "active" : "potential"),
  });
}

function parsePreferenceVote(tokenValue, claimValue) {
  if (typeof tokenValue !== "string" || typeof claimValue !== "string") return null;
  const i = claimValue.indexOf(">");
  if (i < 0) return null;
  const hi = claimValue.slice(0, i).trim();
  const lo = claimValue.slice(i + 1).trim();
  const voter = tokenValue.trim();
  if (hi === "" || lo === "" || voter === "") return null;
  const [a, b] = hi < lo ? [hi, lo] : [lo, hi];
  return Object.freeze({ voter, a, b, canonical: hi === a });
}

const preferenceCellKey = (a, b) => `${a}\u0000${b}`;

/** Decode the legacy membrane transport, then hand canonical relations to the
 * shared science provider. Graph observations do not manufacture act evidence. */
export function governance(
  membrane,
  evidence = Object.freeze({ attribution: "absurd", binding: "absurd", becoming: "absurd" }),
) {
  const relations = [];
  for (const carrier of membrane) {
    const relation = parseJural(tokenValue(carrier), claimValue(carrier));
    if (relation !== null) relations.push(relation);
  }
  const reading = readJuralRelations(relations);
  return Object.freeze({ ...reading, kind: "socializing.governance", act: governanceAct(evidence) });
}

/** A vote as a meme: the pair's preference cell "a over b", told for by a canonical vote and
 *  against by the reverse one, witnessed by the voter. */
function voteMeme(pair, vote) {
  const preference = Object.freeze({ kind: "socializing.market.preference-cell", a: pair.a, b: pair.b });
  return cell(preference, "socializing.market.prefers-a-over-b", preference, { [vote.canonical ? "for" : "against"]: [vote.voter] });
}

function marketField(pair, votes) {
  const members = votes.map((vote) => Object.freeze({
    kind: "socializing.member",
    agent: Object.freeze({
      kind: "animating.agent",
      identity: vote.voter,
    }),
    memes: Object.freeze([voteMeme(pair, vote)]),
  }));
  return Object.freeze({
    kind: "socializing.social-field",
    members: Object.freeze(members),
    base: Object.freeze({
      kind: "socializing.social-base",
      translations: completeTranslations(members.length),
    }),
    section: ungroundedSection(),
  });
}

function decisionFromMarket(pair, market) {
  if (!market.glued) return "contested";
  const value = knowledgeReading(market.price);
  if (value === "potential") return "a";
  if (value === "active") return "b";
  return pair.winner;
}

/**
 * decideByMarket - futarchic governance over pairwise preferences.
 *
 * The ordinary aggregate-preferences reading supplies the preference cells. Each cell is
 * then re-read as a market: voters are venues, their pairwise stance is a priced meme,
 * priceConsensus computes the martingale fixed point, and the residual spread-H1 is the
 * explicit coordination cost of that cell. The local proof receipt is the built law:
 * no-arbitrage iff H1 = 0 iff coherent consensus.
 */
export function decideByMarket(membrane) {
  const preference = aggregatePreferences(membrane);
  const votesByPair = new Map();
  for (const carrier of membrane) {
    const vote = parsePreferenceVote(tokenValue(carrier), claimValue(carrier));
    if (vote === null) continue;
    const key = preferenceCellKey(vote.a, vote.b);
    votesByPair.set(key, [...(votesByPair.get(key) ?? []), vote]);
  }

  const cells = preference.pairs.map((pair) => {
    const market = priceConsensus(marketField(pair, votesByPair.get(preferenceCellKey(pair.a, pair.b)) ?? []));
    const spreadH1Zero = market.spread === 0;
    const coherentConsensus = market.glued && spreadH1Zero;
    const noArbitrage = market.glued;
    const proof = Object.freeze({
      spreadH1Zero,
      noArbitrageIffH1Zero: noArbitrage === spreadH1Zero,
      coherentConsensusIffH1Zero: coherentConsensus === spreadH1Zero,
      noArbitrageIffCoherentConsensus: noArbitrage === coherentConsensus,
    });
    return Object.freeze({
      a: pair.a,
      b: pair.b,
      aggregateStanding: pair.standing,
      aggregateWinner: pair.winner,
      equilibrium: market.price,
      pooled: market.pooled,
      decision: decisionFromMarket(pair, market),
      spreadH1: market.spread,
      coordinationCost: market.spread,
      noArbitrage,
      coherentConsensus,
      contestedCell: pair.winner === "incomparable" || market.spread > 0,
      proof,
    });
  });
  const coordinationCost = cells.reduce((sum, cell) => sum + cell.coordinationCost, 0);
  return Object.freeze({
    kind: "socializing.market-governance",
    preference,
    cells: Object.freeze(cells),
    decided: cells.filter((cell) => cell.decision === "a" || cell.decision === "b").length,
    contested: cells.filter((cell) => cell.contestedCell).length,
    coordinationCost,
    noArbitrage: cells.every((cell) => cell.noArbitrage),
    coherentConsensus: cells.every((cell) => cell.coherentConsensus),
  });
}

const GOVERNANCE_SCHEMA = Object.freeze({
  title: "Governance",
  type: "object",
  description:
    "Canonical jural relations and their correlatives, plus the observed power, accountability, and directed-cycle readings. Governance-act operativity is evaluated only from supplied attribution, binding, and becoming evidence.",
});

export const governanceSeedCarrier = schemaFrom({
  $id: "socializing/governance-seed",
  title: "GovernanceSeed",
  type: ["string", "array"],
  description:
    "An inter-agent governance membrane seed: newline claims or JSON utterance-like rows accepted by animating descend.",
});

export const governanceCarrier = schemaFrom({
  $id: "socializing/governance",
  ...GOVERNANCE_SCHEMA,
});

/** govern — decode an inter-agent membrane, then read canonical jural relations and supplied
 * governance-act evidence through the shared governance provider. */
export const governAction = operation({
  verb: "govern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read canonical jural relations from an inter-agent membrane; governance-act evidence remains explicit.",
  description:
    "Domain: an inter-agent membrane — newline `holder|kind>passive>scope` lines (each a Hohfeldian jural claim; a leading negation explicitly denies the relation), or a JSON array of such items. Codomain: socializing/governance. The shared governance provider validates and pools jural relations, derives correlatives, and reads positive powers, accountability gaps, directed cycles, and contested relations. It evaluates attribution, binding, becoming, and operativity only from explicit evidence; relation topology supplies none of those judgments.",
  domain: governanceSeedCarrier,
  codomain: governanceCarrier,
  run: (input) =>
    jsonResource(governance(descend(admitSeed(input)).utterances), "governance"),
});

const MARKET_GOVERNANCE_SCHEMA = Object.freeze({
  title: "MarketSettledGovernance",
  type: "object",
  description:
    "futarchic governance over aggregate-preferences: each preference cell is settled by the price/no-arbitrage market reading; equilibrium is the decision, spreadH1 is the residual coordination cost, and the proof receipt states no-arbitrage iff H1=0 iff coherent consensus.",
});

export const marketGovernanceCarrier = schemaFrom({
  $id: "socializing/market-governance",
  ...MARKET_GOVERNANCE_SCHEMA,
});

/** decide-by-market - aggregate preferences, then settle each cell by no-arbitrage price consensus. */
export const decideByMarketAction = operation({
  verb: "decide-by-market",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Settle collective preferences by market consensus: equilibrium is the decision, residual spread-H1 is the priced coordination premium.",
  description:
    "Domain: an inter-agent preference membrane — newline `voter|X>Y` lines, or the same JSON forms accepted by aggregate-preferences. Codomain: socializing/market-governance. The reading first runs aggregate-preferences, then treats each pairwise cell as a market whose voters are venues carrying priced preference memes. priceConsensus supplies the martingale fixed point, no-arbitrage is spread-H1 = 0, and every residual H1 is reported as the coordination cost of the contested cell.",
  domain: governanceSeedCarrier,
  codomain: marketGovernanceCarrier,
  run: (input) =>
    jsonResource(decideByMarket(descend(admitSeed(input)).utterances), "market-governance"),
});

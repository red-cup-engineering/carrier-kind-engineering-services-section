import { knowledgeJoinReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * judging — socializing's JUDGMENT AGGREGATION: the discursive dilemma (the doctrinal paradox) and
 * its principled escape, the logical sibling of `preference.mts`'s Arrow/Condorcet escape.
 *
 * A collective of judges, each individually CONSISTENT, can aggregate to a COLLECTIVELY INCONSISTENT
 * judgment set: a court where a majority affirms each premise (p, q) yet a majority denies the legally
 * implied conclusion (r ⟺ p ∧ q). List–Pettit prove this is not a fluke — no aggregation rule
 * satisfies universal domain + collective rationality + systematicity + anonymity (the judgment-
 * aggregation impossibility, the logical analogue of Arrow). Premise-based and conclusion-based
 * aggregation genuinely diverge.
 *
 * The corpus escape is the SAME move that dissolved Condorcet (feedback: scale-2 ≠ scale-1; use a
 * hard layer-1 capability): aggregate each proposition along the bilattice KNOWLEDGE order ≤_k. A
 * proposition the judges SPLIT on settles to ⊤ (told-both — held paraconsistently) rather than being
 * forced to a truth value that manufactures collective inconsistency. RELAX collective rationality
 * (admit ⊤/incomplete judgment sets — Dietrich–List's exit) and the impossibility lifts: the bench
 * holds the contested premise open instead of pretending the court speaks with one incoherent voice.
 *
 * Consumes relating's bilattice value algebra (∨_k aggregation, the truth-order connectives ∧_t/∨_t);
 * re-authors none of it.
 */

/** A logical agenda: premises connected to a conclusion by a truth-functional connective. The
 *  conclusion is legally/logically equivalent to the connective applied to the premises (r ⟺ p∧q). */

/** One judge's view: a FOUR value on each proposition of the agenda (`potential` yes / `active` no /
 *  `absurd` abstain / `stable` internally conflicted). */

/** The result of aggregating a bench's judgments over an agenda. */

   
    

  

      

  
  

/** Proposition-wise MAJORITY over the bench: count `potential` (yes) vs `active` (no) among the
 *  definite views; the larger wins, a non-empty tie is held ⊤ (stable), all-abstain is ⊥ (absurd). */
function majorityProposition(judges, proposition) {
  let yes = 0;
  let no = 0;
  for (const judge of judges) {
    const view = judge.views[proposition] ?? "absurd";
    if (view === "potential") yes += 1;
    else if (view === "active") no += 1;
  }
  if (yes === 0 && no === 0) return "absurd";
  if (yes > no) return "potential";
  if (no > yes) return "active";
  return "stable";
}

/** Apply the agenda's connective to a list of premise values in the truth order: `and` = ∧_t (the
 *  truth-meet, identity `potential`), `or` = ∨_t (the truth-join, identity `active`). */
function applyConnective(connective, premiseValues) {
  if (connective === "and") {
    return premiseValues.reduce((meet, value) => truthMeetReading((meet), (value)), "potential");
  }
  return premiseValues.reduce((join, value) => truthJoinReading((join), (value)), "active");
}

/** The ≤_k aggregate of a proposition across the bench — the ∨_k join (folded from ⊥), so a split
 *  (some `potential`, some `active`) settles to ⊤ rather than being forced. */
function aggregateProposition(judges, proposition) {
  return judges.reduce(
    (join, judge) => knowledgeJoinReading((join), (judge.views[proposition] ?? "absurd")),
    "absurd",
  );
}

/**
 * judgmentAggregate — aggregate a bench's judgments over a logically-connected agenda, exposing the
 * discursive dilemma (premise-based vs conclusion-based divergence) and the bilattice escape (split
 * propositions held at ⊤ rather than forced). The collective judgment set is computed by the ∨_k
 * join per proposition; the conclusion is read both ways; the paradox is flagged when they differ.
 */
export function judgmentAggregate(bench, agenda) {
  const propositions = [...agenda.premises, agenda.conclusion];
  const majority = {};
  const collective = {};
  for (const proposition of propositions) {
    majority[proposition] = majorityProposition(bench, proposition);
    collective[proposition] = aggregateProposition(bench, proposition);
  }

  // The paradox lives under MAJORITY: derive the conclusion from the majority premises, and read it
  // directly under majority — they can diverge though every judge is consistent.
  const premiseBased = applyConnective(agenda.connective, agenda.premises.map((premise) => majority[premise]));
  const conclusionBased = majority[agenda.conclusion];

  // The ESCAPE lives under ≤_k: a split premise is held ⊤, so the premise-based and conclusion-based
  // readings no longer clash (both carry the ⊤ rather than being forced to disagree).
  const premiseBasedK = applyConnective(agenda.connective, agenda.premises.map((premise) => collective[premise]));
  const conclusionBasedK = collective[agenda.conclusion];

  const contested = propositions.filter((proposition) => collective[proposition] === "stable");

  const individuallyRational = bench.every((judge) => {
    const derived = applyConnective(agenda.connective, agenda.premises.map((premise) => judge.views[premise] ?? "absurd"));
    return derived === (judge.views[agenda.conclusion] ?? "absurd");
  });

  return Object.freeze({
    kind: "socializing.judgment",
    majority: Object.freeze(majority),
    collective: Object.freeze(collective),
    premiseBased,
    conclusionBased,
    doctrinalParadox: premiseBased !== conclusionBased,
    contested: Object.freeze(contested),
    dissolvedByBilattice: premiseBasedK === conclusionBasedK,
    individuallyRational,
  });
}

/**
 * descending — settle a sentence's tellings (SignCraft).
 *
 * Each entry tells its triple the reading the construal gave it, witnessed by the construal: a unary
 * entry its reflexive cell (subject, predicate, subject), an arc its cell (head, rel, dependent) and
 * the projections onto its ends — (head, has-rel, head) and (dependent, is-rel, dependent). A
 * specialization edge source → target carries the source's evidence to the target on both sides, as
 * two SignChain rules per subject (told for ⇒ told for, told against ⇒ told against): competing
 * readings of one question meet told-both there. The settlement is SignCraft's least fixed point, so
 * chains of edges close without a separate transitive closure.
 */
import { cell, cellSet } from "@red-cup-engineering/signcell/cell";
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";
import { rule } from "@red-cup-engineering/signchain/rules";
import { site } from "@red-cup-engineering/signgraph/site";
import { evidenceAt } from "@red-cup-engineering/signgraph/valuation";
import { settleValuation } from "@red-cup-engineering/signcraft/settle";

const WITNESS = "construal";
const reflexive = (subject, predicate, value) => cell(subject, predicate, subject, value);

/** The cells a list of entries tells. */
function cellsOf(entries) {
  return cellSet(entries.flatMap((entry) => {
    const value = witnessedReading(entry.reading, WITNESS);
    if (entry.object === undefined) return [reflexive(entry.subject, entry.predicate, value)];
    return [
      cell(entry.subject, entry.predicate, entry.object, value),
      reflexive(entry.subject, `has-${entry.predicate}`, value),
      reflexive(entry.object, `is-${entry.predicate}`, value),
    ];
  }));
}

/** The rules a specialization edge gives each subject: each side of the source carried to the target. */
const edgeRules = (subjects, { source, target }) => subjects.flatMap((subject) => [
  rule(`${subject}:${source}>${target}:for`, [{ cell: reflexive(subject, source), atLeast: "potential" }], { cell: reflexive(subject, target), reading: "potential" }),
  rule(`${subject}:${source}>${target}:against`, [{ cell: reflexive(subject, source), atLeast: "active" }], { cell: reflexive(subject, target), reading: "active" }),
]);

/** Settle a sentence's entries and specialization edges; read the settled evidence of any triple. */
export function descend(entries, specialization = []) {
  const told = cellsOf(entries);
  const subjects = [...new Set(told.filter((at) => at.subject === at.object).map((at) => at.subject))];
  const settlement = settleValuation(site(told), told, specialization.flatMap((edge) => edgeRules(subjects, edge)));
  const settled = settlement.settled;
  return {
    settlement,
    settledEvidence: (subject, predicate) => evidenceAt(settled, reflexive(subject, predicate)),
    settledArc: (head, rel, dependent) => evidenceAt(settled, cell(head, rel, dependent)),
  };
}

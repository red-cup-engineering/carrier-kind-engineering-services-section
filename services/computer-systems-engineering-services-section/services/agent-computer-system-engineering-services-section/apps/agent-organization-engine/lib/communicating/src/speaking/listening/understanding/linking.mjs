

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { descend } from "../parsing/descending.mjs";

const BOTTOM = "absurd";
const TRUE = "potential";
const FALSE = "active";

const defaultKb = [
  { id: "apple-co", name: "Apple Inc.", type: "ORG", aliases: ["Apple"] },
  { id: "apple-fruit", name: "apple", type: "FOOD", aliases: ["Apple", "apple"] },
  { id: "washington-dc", name: "Washington", type: "GPE", aliases: ["Washington"] },
  { id: "washington-person", name: "George Washington", type: "PERSON", aliases: ["Washington"] },
  { id: "paris-fr", name: "Paris", type: "GPE", aliases: ["Paris"] },
  { id: "paris-person", name: "Paris", type: "PERSON", aliases: ["Paris"] },
];

function lookup(
  surface,
  type,
  kb = defaultKb,
) {
  const needle = surface.toLowerCase();
  return kb.filter((entity) => {
    const answers = entity.name.toLowerCase() === needle
      || entity.aliases.some((alias) => alias.toLowerCase() === needle);
    return answers && (type === undefined || entity.type === type);
  });
}

export function linkEntity(
  surface,
  type,
) {
  const candidates = lookup(surface, type);
  const ids = candidates.map((candidate) => candidate.id);
  const subject = `mention:${surface}`;

  if (candidates.length === 0) {
    const settled = descend([{ subject, predicate: "link-unique", reading: BOTTOM }]);
    return { status: "nil", entity: null, candidates: ids, evidence: settled.settledEvidence(subject, "link-unique") };
  }

  if (candidates.length === 1) {
    const settled = descend([{ subject, predicate: "link-unique", reading: TRUE }]);
    const evidence = settled.settledEvidence(subject, "link-unique");
    const reading = knowledgeReading(evidence);
    return {
      status: reading === "potential" ? "linked" : "ambiguous",
      entity: reading === "potential" ? ids[0] : null,
      candidates: ids,
      evidence,
    };
  }

  const settled = descend(
    [
      { subject, predicate: "link-candidate-a", reading: TRUE },
      { subject, predicate: "link-candidate-b", reading: FALSE },
      { subject, predicate: "link-unique", reading: BOTTOM },
    ],
    [
      { source: "link-candidate-a", target: "link-unique" },
      { source: "link-candidate-b", target: "link-unique" },
    ],
  );
  const evidence = settled.settledEvidence(subject, "link-unique");
  return { status: knowledgeReading(evidence) === "stable" ? "ambiguous" : "linked", entity: null, candidates: ids, evidence };
}

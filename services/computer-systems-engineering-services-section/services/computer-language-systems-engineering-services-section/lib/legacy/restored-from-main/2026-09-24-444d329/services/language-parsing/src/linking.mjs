// linking.ts — zero-statistics entity linking over charged uniqueness.

import { BOTTOM, FALSE, TRUE } from "./charge.mjs";
import { descend } from "./descending.mjs";

export const DEFAULT_KB = [
  { id: "apple-co", name: "Apple Inc.", type: "ORG", aliases: ["Apple"] },
  { id: "apple-fruit", name: "apple", type: "FOOD", aliases: ["Apple", "apple"] },
  { id: "washington-dc", name: "Washington", type: "GPE", aliases: ["Washington"] },
  { id: "washington-person", name: "George Washington", type: "PERSON", aliases: ["Washington"] },
  { id: "paris-fr", name: "Paris", type: "GPE", aliases: ["Paris"] },
  { id: "paris-person", name: "Paris", type: "PERSON", aliases: ["Paris"] },
];

export function lookup(
  surface,
  type,
  kb = DEFAULT_KB,
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
  kb = DEFAULT_KB,
) {
  const candidates = lookup(surface, type, kb);
  const ids = candidates.map((candidate) => candidate.id);
  const subject = `mention:${surface}`;

  if (candidates.length === 0) {
    const settled = descend([{ subject, predicate: "link-unique", charge: BOTTOM }]);
    return { status: "nil", entity: null, candidates: ids, charge: settled.settledCharge(subject, "link-unique") };
  }

  if (candidates.length === 1) {
    const settled = descend([{ subject, predicate: "link-unique", charge: TRUE }]);
    const charge = settled.settledCharge(subject, "link-unique");
    return {
      status: charge.value === "potential" ? "linked" : "ambiguous",
      entity: charge.value === "potential" ? ids[0] : null,
      candidates: ids,
      charge,
    };
  }

  const settled = descend(
    [
      { subject, predicate: "link-candidate-a", charge: TRUE },
      { subject, predicate: "link-candidate-b", charge: FALSE },
      { subject, predicate: "link-unique", charge: BOTTOM },
    ],
    [
      { source: "link-candidate-a", target: "link-unique" },
      { source: "link-candidate-b", target: "link-unique" },
    ],
  );
  const charge = settled.settledCharge(subject, "link-unique");
  return { status: charge.value === "stable" ? "ambiguous" : "linked", entity: null, candidates: ids, charge };
}

export { linkEntity as link };

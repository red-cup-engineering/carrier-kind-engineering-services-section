/**
 * work-vocabulary — the managing distinction between work-shaped carriers.
 *
 * The ecosystem uses several nearby words that should not collapse into one
 * queue label. This carrier lets a package state the distinctions it is using
 * with evidence, while keeping the package-specific source corpus outside this
 * library.
 */

import type { CellSet, PredicationTerm } from "@lenticule-science/metrologic/articulation/predicating";
import { fact, facts, predicate, term } from "../terms.mjs";

export type WorkConceptKind =
  | "endeavor"
  | "goal"
  | "objective"
  | "project"
  | "plan"
  | "task"
  | "workflow"
  | "work"
  | "working"
  | "work-item"
  | "work-unit"
  | "lifecycle"
  | "dispatch"
  | "trace"
  | "shared-field"
  | "coordination"
  | "governance"
  | "common-knowledge"
  | "swarm-protocol"
  | "milestone"
  | "campaign"
  | "mission";

export interface WorkTheoryReference {
  readonly id: string;
  readonly path: string;
  readonly claim: string;
}

export interface WorkConceptInput {
  readonly id: WorkConceptKind;
  readonly summary: string;
  readonly generatedBy?: WorkConceptKind;
  readonly distinguishesFrom?: readonly WorkConceptKind[];
  readonly references?: readonly WorkTheoryReference[];
}

export interface WorkConcept {
  readonly kind: "managing.work-concept";
  readonly id: PredicationTerm;
  readonly key: WorkConceptKind;
  readonly summary: string;
  readonly generatedBy?: WorkConceptKind;
  readonly distinguishesFrom: readonly WorkConceptKind[];
  readonly references: readonly WorkTheoryReference[];
  readonly facts: CellSet;
}

export interface WorkVocabularyBasis {
  readonly kind: "managing.work-vocabulary-basis";
  readonly concepts: readonly WorkConcept[];
  readonly references: readonly WorkTheoryReference[];
}

export function workConcept(input: WorkConceptInput): WorkConcept {
  const id = term("work-concept", input.id);
  const distinguishesFrom = Object.freeze([...(input.distinguishesFrom ?? [])]);
  const references = Object.freeze([...(input.references ?? [])]);
  const cells = [
    fact(id, predicate("work-concept", "summary"), term("summary", input.summary)),
    ...(input.generatedBy === undefined
      ? []
      : [fact(id, predicate("work-concept", "generated-by"), term("work-concept", input.generatedBy))]),
    ...distinguishesFrom.map((other) => fact(id, predicate("work-concept", "distinguishes-from"), term("work-concept", other))),
    ...references.map((reference) => fact(id, predicate("work-concept", "reference"), term("reference", reference.id))),
  ];
  return Object.freeze({
    kind: "managing.work-concept" as const,
    id,
    key: input.id,
    summary: input.summary,
    ...(input.generatedBy === undefined ? {} : { generatedBy: input.generatedBy }),
    distinguishesFrom,
    references,
    facts: facts(cells),
  });
}

export function workVocabularyBasis(concepts: readonly WorkConcept[]): WorkVocabularyBasis {
  const seen = new Set<string>();
  const references: WorkTheoryReference[] = [];
  for (const concept of concepts) {
    for (const reference of concept.references) {
      if (seen.has(reference.id)) continue;
      seen.add(reference.id);
      references.push(reference);
    }
  }
  return Object.freeze({
    kind: "managing.work-vocabulary-basis" as const,
    concepts: Object.freeze([...concepts]),
    references: Object.freeze(references),
  });
}

export function conceptsForTerms(basis: WorkVocabularyBasis, terms: readonly string[]): readonly WorkConcept[] {
  const lowered = terms.map((termValue) => termValue.toLowerCase()).filter((termValue) => termValue.length >= 3);
  return Object.freeze(basis.concepts.filter((concept) => {
    const haystack = [
      concept.key,
      concept.summary,
      concept.generatedBy ?? "",
      ...concept.distinguishesFrom,
      ...concept.references.map((reference) => `${reference.id} ${reference.path} ${reference.claim}`),
    ].join(" ").toLowerCase();
    return lowered.some((termValue) => haystack.includes(termValue));
  }));
}

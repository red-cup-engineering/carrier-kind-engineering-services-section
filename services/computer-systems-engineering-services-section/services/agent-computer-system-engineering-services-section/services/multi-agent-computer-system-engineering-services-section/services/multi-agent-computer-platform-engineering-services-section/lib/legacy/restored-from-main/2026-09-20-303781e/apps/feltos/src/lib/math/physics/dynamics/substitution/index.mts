export * from "@lenticule-science/articulating/predicating/positing/settling/dynamics/substitution/index";

import type {
  SubstitutionRule,
  SubstitutionSymbol,
} from "@lenticule-science/articulating/predicating/positing/settling/dynamics/substitution/index";

/** A rule together with the alphabet used to abelianize it. */
export interface SubstitutionSystem {
  readonly kind: "substitution.dynamics.system";
  readonly rule: SubstitutionRule;
  readonly alphabet: readonly SubstitutionSymbol[];
}

/** Pair a substitution rule with its declared or inferred alphabet. */
export function substitutionSystem(
  rule: SubstitutionRule,
  alphabet: readonly SubstitutionSymbol[] = rule.entries.map((entry) => entry.symbol),
): SubstitutionSystem {
  return Object.freeze({ kind: "substitution.dynamics.system" as const, rule, alphabet: Object.freeze([...alphabet]) });
}

import {
  alwaysRuleReceipt as upstreamAlwaysRuleReceipt,
  closureRuleReceipt as upstreamClosureRuleReceipt,
  type ClosureRuleReceipt as UpstreamClosureRuleReceipt,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/closure-rule-system";

export {
  alwaysRule,
  antecedentHolds,
  closureOrbit,
  closureRule,
  closureRuleSystem,
  consequentJoin,
  eventualClosure as clS,
  fire,
  firedRuleNames,
  knowledgeLeastValuation,
  ruleFire,
  tstep,
  valuation,
  type ClosureRuleCarrier,
  type ClosureRuleCondition,
  type ClosureRuleConsequent,
  type ClosureRuleSystemCarrier,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/closure-rule-system";

/** Relating's existing receipt names the eventual least fixed point `lfp`. */
export type ClosureRuleReceipt = Omit<UpstreamClosureRuleReceipt, "eventualFixedPoint"> & {
  readonly lfp: true;
};

const relatingReceipt = (value: UpstreamClosureRuleReceipt): ClosureRuleReceipt => {
  const { eventualFixedPoint, firedAtSeed, ...receipt } = value;
  return Object.freeze({ ...receipt, lfp: eventualFixedPoint, firedAtSeed });
};

export function closureRuleReceipt(...args: Parameters<typeof upstreamClosureRuleReceipt>): ClosureRuleReceipt {
  return relatingReceipt(upstreamClosureRuleReceipt(...args));
}

export function alwaysRuleReceipt(...args: Parameters<typeof upstreamAlwaysRuleReceipt>): ClosureRuleReceipt {
  return relatingReceipt(upstreamAlwaysRuleReceipt(...args));
}

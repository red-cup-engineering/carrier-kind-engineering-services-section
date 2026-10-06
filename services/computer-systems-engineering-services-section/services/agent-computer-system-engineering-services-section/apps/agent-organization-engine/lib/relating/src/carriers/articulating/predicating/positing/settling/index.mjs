import { kindCarrier } from "../../../../kind.mjs";

export const settlementFiltrationCarrier = kindCarrier(
  "relating/articulating/predicating/positing/settling/filtration",
  { enum: ["signcraft.settlement", "signcraft.filtration"] },
  "SettlementFiltration",
  "A SignCraft settlement, or a presented settlement filtration (stages with shapes and a cofinality).",
);

/** A settling-read codomain carrier, identified by the read invariant's kind. */
const settlingReadCarrier = (id, kind, title) =>
  kindCarrier(id, kind, title, `The ${title} read of a settlement filtration.`);

export const settlingClassificationCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/classification", { const: "signcraft.classification" }, "SettlingClassification");
export const settlingFirstCohomologyCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/first-cohomology", { const: "signcraft.firstCohomology" }, "SettlingFirstCohomology");
export const settlingGradedGapCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/graded-gap", { const: "signcraft.gradedGap" }, "GradedGap");
export const settlingRankIdentityCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/rank-identity", { enum: ["signgraph.rankIdentity:witness", "signgraph.rankIdentity-obstruction"] }, "RankIdentityJudgment");
export const settlingClosureInvariantCarrier = settlingReadCarrier("relating/articulating/predicating/positing/settling/closure-invariant", { const: "signcraft.closureInvariant" }, "SettlingClosureInvariant");

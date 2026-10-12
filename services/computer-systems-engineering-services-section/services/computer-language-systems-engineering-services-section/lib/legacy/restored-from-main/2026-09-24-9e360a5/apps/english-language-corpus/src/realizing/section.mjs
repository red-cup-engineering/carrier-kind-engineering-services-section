

import { valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { realizeClause } from "@red-cup-engineering/communicating/speaking/generating/realize";
import { realizeSection } from "@red-cup-engineering/communicating/speaking/generating/section";

function regimeOf(cell) {
  const value = valueOf(cell.charge).name;
  if (value === "potential") return "affirmed";
  if (value === "active") return "denied";
  if (value === "stable") return "contradicted";
  return "void";
}

function witnesses(cell) {
  return {
    positive: [...cell.charge.evidence[0]],
    negative: [...cell.charge.evidence[1]],
  };
}

function sentence(text) {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  const cased = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(cased) ? cased : `${cased}.`;
}

export default realizeSection;

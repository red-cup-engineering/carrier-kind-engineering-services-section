import { evidence } from "@red-cup-engineering/signcell/cell";
// rules/nominalization.ts — noun-heavy process words that often hide verbs.


const NOMINALIZATIONS = [
  ["implementation", "implement"],
  ["utilization", "use"],
  ["investigation", "investigate"],
  ["consideration", "consider"],
  ["evaluation", "evaluate"],
  ["assessment", "assess"],
  ["completion", "complete"],
  ["development", "develop"],
  ["movement", "move"],
  ["discussion", "discuss"],
  ["decision", "decide"],
  ["analysis", "analyze"],
];

export const nominalizationRules = NOMINALIZATIONS.map(([word, suggest]) => ({
  id: `nominalization-${word}`,
  family: "concision",
  severity: "warning",
  description: `Nominalization: "${word}"`,
  run(text) {
    const findings = [];
    const re = new RegExp(`\\b${word}\\b`, "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `nominalization-${word}`,
        severity: "warning",
        evidence: evidence({ against: [{ word: m[0], start: m.index }] }),
        message: `"${m[0]}" hides a verb — use "${suggest}" where possible`,
        start: m.index,
        end: m.index + m[0].length,
        suggest,
      });
    }
    return findings;
  },
}));

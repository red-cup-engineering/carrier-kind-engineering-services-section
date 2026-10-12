import { evidence } from "@red-cup-engineering/signcell/cell";
// rules/spelling.ts — consistent spelling rules (American vs. British variants).
// Flags the minority spelling in a document; suggests the majority.
// These are document-level rules: they need the full text to count occurrences.


const VARIANTS = [
  ["colour", "color"],
  ["behaviour", "behavior"],
  ["honour", "honor"],
  ["labour", "labour"],
  ["neighbour", "neighbor"],
  ["recognise", "recognize"],
  ["organisation", "organization"],
  ["analyse", "analyze"],
];

function makeSpellingRule(british, american) {
  return {
    id: `spelling-${british}-vs-${american}`,
    family: "spelling",
    severity: "warning",
    description: `Consistent spelling: ${british} vs ${american}`,
    run(text) {
      const findings = [];
      const bRe = new RegExp(`\\b${british}\\b`, "gi");
      const aRe = new RegExp(`\\b${american}\\b`, "gi");
      const bMatches = [...text.matchAll(bRe)];
      const aMatches = [...text.matchAll(aRe)];

      if (bMatches.length === 0 || aMatches.length === 0) return findings;

      // Flag the minority spelling
      const minority = bMatches.length < aMatches.length ? bMatches : aMatches;
      const suggest = bMatches.length < aMatches.length ? american : british;

      for (const m of minority) {
        if (m.index === undefined) continue;
        findings.push({
          ruleId: `spelling-${british}-vs-${american}`,
          severity: "warning",
          evidence: evidence({ against: [{ word: m[0], start: m.index }] }),
          message: `Inconsistent spelling: "${m[0]}" — use "${suggest}" consistently`,
          start: m.index,
          end: m.index + m[0].length,
          suggest,
        });
      }
      return findings;
    },
  };
}

export const spellingRules = VARIANTS.map(([b, a]) => makeSpellingRule(b, a));

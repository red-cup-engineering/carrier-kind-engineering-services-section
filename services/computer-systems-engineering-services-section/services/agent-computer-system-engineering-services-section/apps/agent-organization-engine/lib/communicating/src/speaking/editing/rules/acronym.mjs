import { evidence } from "@red-cup-engineering/signcell/cell";
// rules/acronym.ts — document-level acronym checks.


const ACRONYM = /\b[A-Z]{2,}\b/g;

export const acronymRule = {
  id: "undefined-acronym",
  family: "consistency",
  severity: "warning",
  description: "Acronym used without a nearby expansion",
  run(text) {
    const findings = [];
    let m;
    while ((m = ACRONYM.exec(text)) !== null) {
      const acro = m[0];
      const expansionPattern = acro.split("").map((ch) => `${ch}[a-z]+`).join("\\s+");
      const before = text.slice(Math.max(0, m.index - 160), m.index);
      if (new RegExp(`${expansionPattern}\\s*\\(${acro}\\)`).test(before)) continue;
      findings.push({
        ruleId: "undefined-acronym",
        severity: "warning",
        evidence: evidence({ against: [{ acronym: acro, start: m.index }] }),
        message: `"${acro}" appears before it is expanded`,
        start: m.index,
        end: m.index + acro.length,
      });
    }
    return findings;
  },
};

export const acronymRules = [acronymRule];

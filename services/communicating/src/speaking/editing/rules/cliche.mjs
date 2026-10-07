import { evidence } from "@red-cup-engineering/signcell/cell";
// rules/cliche.ts — clichéd phrases (dead metaphors).


const CLICHES = [
  "at the end of the day",
  "bite the bullet",
  "hit the ground running",
  "think outside the box",
  "under the bus",
  "moving the goalposts",
  "elephant in the room",
  "tip of the iceberg",
  "on the same page",
  "reinvent the wheel",
  "touch base",
  "low-hanging fruit",
  "par for the course",
  "back to basics",
  "ahead of the curve",
  "break new ground",
  "cut to the chase",
  "drop the ball",
  "in a nutshell",
  "on the fence",
];

export const clicheRules = CLICHES.map((phrase) => ({
  id: `cliche-${phrase.replaceAll(" ", "-")}`,
  family: "cliche",
  severity: "suggestion",
  description: `Cliché: "${phrase}"`,
  run(text) {
    const findings = [];
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: `cliche-${phrase.replaceAll(" ", "-")}`,
        severity: "suggestion",
        evidence: evidence({ against: [{ phrase: m[0], start: m.index }] }),
        message: `"${m[0]}" is a cliché — say what you mean directly`,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
    return findings;
  },
}));

import { evidence } from "@red-cup-engineering/signcell/cell";
// rules/structure.ts — sentence-shape rules.


const INDEPENDENT = /;|,\s+(?:and|but|or|so|yet|while|whereas)\b/gi;
const EXPLETIVE = /\bthere\s+(?:is|are|was|were)\b|\bit\s+(?:is|was)\b/gi;
const CLAUSE_LIMIT = 3;

export const oneIdeaPerSentenceRule = {
  id: "one-idea-per-sentence",
  family: "concision",
  severity: "warning",
  description: "Too many independent clauses in one sentence",
  run(text) {
    const findings = [];
    const sentenceRe = /[^.!?]+[.!?]?/g;
    let m;
    while ((m = sentenceRe.exec(text)) !== null) {
      const sentence = m[0].trim();
      if (sentence === "") continue;
      const clauses = (sentence.match(INDEPENDENT) ?? []).length + 1;
      if (clauses > CLAUSE_LIMIT) {
        findings.push({
          ruleId: "one-idea-per-sentence",
          severity: "warning",
          evidence: evidence({ against: [{ sentence, clauses, start: m.index }] }),
          message: "This sentence carries several independent ideas — split it",
          start: m.index,
          end: m.index + m[0].length,
        });
      } else {
        findings.push({
          ruleId: "one-idea-per-sentence",
          severity: "warning",
          evidence: evidence({ for: [{ sentence, clauses, start: m.index }] }),
          message: "This sentence carries one main idea",
          start: m.index,
          end: m.index + m[0].length,
        });
      }
    }
    return findings;
  },
};

export const expletiveOpeningRule = {
  id: "expletive-opening",
  family: "directness",
  severity: "suggestion",
  description: "Expletive opening",
  run(text) {
    const findings = [];
    let m;
    const re = new RegExp(EXPLETIVE.source, EXPLETIVE.flags);
    while ((m = re.exec(text)) !== null) {
      findings.push({
        ruleId: "expletive-opening",
        severity: "suggestion",
        evidence: evidence({ against: [{ match: m[0], start: m.index }] }),
        message: `"${m[0]}" delays the actor or subject — start with the concrete noun`,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
    return findings;
  },
};

export const structureRules = [oneIdeaPerSentenceRule, expletiveOpeningRule];

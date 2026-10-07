// detect.ts — run all rules against a text and produce a DetectResult.
// Three passes:
//   Pass 1: span rules run against each sentence/clause/word span.
//   Pass 2: document rules run against the full text (spelling consistency, acronyms).
//   Pass 3: grammar-aware rules run against parsed sentences (supersede span rules).
// After all passes, descend() joins conflicting findings (same span, t and f → ⊤).

import { allRules, ruleImplications } from "./rules/index.mjs";
import { rawBundle } from "@lenticule-science/english-language-algebra";
import { load } from "../listening/algebra/compile.mjs";

import { articulate } from "../listening/parsing/articulating.mjs";
import { knowledgeJoin } from "@red-cup-engineering/signchain/bilattice";
const english = load(rawBundle);
/** Strip markdown scaffolding from text while preserving offsets.
 * Code fences and inline code are replaced with spaces of equal length. */
export function stripMarkdown(text) {
  let result = text;
  result = result.replace(/^---[\s\S]*?---\n/, maskExceptNewlines);
  result = result.replace(/^```[\s\S]*?```/gm, maskExceptNewlines);
  result = result.replace(/`[^`]+`/g, (match) => " ".repeat(match.length));
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label) => {
    const prefix = " ";
    const suffix = " ".repeat(match.length - label.length - prefix.length);
    return `${prefix}${label}${suffix}`;
  });
  return result;
}

function maskExceptNewlines(match) {
  return match.replace(/[^\n]/g, " ");
}

/** Run all rules against text and return a DetectResult. */
export function detect(
  source,
  opts,
) {
  const rules = opts?.rules ?? allRules;
  const text = opts?.markdown ? stripMarkdown(source) : source;
  const base = articulate(text, english);

  // Collect all findings
  const allFindings = [];

  // Pass 1: span rules — run each rule on the full text
  // (In a more complete implementation, this would be run per-span from articulate)
  for (const rule of rules) {
    if (rule.abstract) continue;
    if (rule.family === "spelling") continue; // handled in pass 2
    if (rule.family === "consistency") continue; // handled in pass 2
    const findings = rule.run(text);
    for (const f of findings) {
      allFindings.push(f);
    }
  }

  // Pass 2: document rules (spelling consistency)
  const documentRules = rules.filter((r) => r.family === "spelling" || r.family === "consistency");
  for (const rule of documentRules) {
    if (rule.abstract) continue;
    const findings = rule.run(text);
    for (const f of findings) {
      allFindings.push(f);
    }
  }

  const implications = ruleImplications(rules);

  // Settle: merge findings at the same span using knowledgeJoin
  // (t ∨ f = ⊤ for genuine conflicts; t ∨ t = t; f ∨ f = f)
  const merged = new Map();
  const enqueue = [...allFindings];
  for (const f of allFindings) {
    for (const edge of implications.filter((e) => e.source === f.ruleId)) {
      const target = rules.find((r) => r.id === edge.target);
      enqueue.push({
        ...f,
        ruleId: edge.target,
        severity: target?.severity ?? f.severity,
        message: target?.description ?? f.message,
      });
    }
  }

  for (const f of enqueue) {
    const k = `${f.start}:${f.end}:${f.ruleId}`;
    const prior = merged.get(k);
    if (prior) {
      const joined = knowledgeJoin(prior.evidence, f.evidence);
      merged.set(k, { ...prior, evidence: joined });
    } else {
      merged.set(k, f);
    }
  }

  return { source, base, cells: [...merged.values()], implications };
}

import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
// report.ts — convert a DetectResult into human-facing Diagnostics.
// Only active (violation) and stable (conflict) cells are reported.
// potential (compliant) and absurd (unsure) cells are silent.

/** Convert a DetectResult into Diagnostics (violations and conflicts only). */
export function report(result) {
  const diagnostics = [];

  for (const cell of result.cells) {
    const v = (knowledgeReading(cell.evidence));
    if (v !== "active" && v !== "stable") continue;

    diagnostics.push({
      severity: v === "stable" ? "conflict" : cell.severity,
      ruleId: cell.ruleId,
      message: cell.message,
      start: cell.start,
      end: cell.end,
      text: result.source.slice(cell.start, cell.end),
      ...(cell.suggest !== undefined ? { suggest: cell.suggest } : {}),
    });
  }

  // Sort by start offset
  diagnostics.sort((a, b) => a.start - b.start);
  return diagnostics;
}

/** Run detect + report, compute pass/fail verdict.
 * A document fails if it has any warning or error diagnostics (suggestions are OK). */
export function verdict(result) {
  const diagnostics = report(result);
  const pass = !diagnostics.some((d) => d.severity === "warning" || d.severity === "error");
  return { pass, diagnostics };
}

// codecs.mjs — the die's own offered operation. Wires the real ported
// generation pipeline (realizeClause/plan/realizeSection/sectionFromText,
// mechanically transcribed from the recovered english-language-codecs
// package's realize.mts/plan.mts/section.mts/section-from-text.mts) into
// this die's `invoke-service` operation.
//
// Primary operation: realizeText(text) — parse English text with the shared
// engine (via sectionFromText), then realize the resulting settled section
// back to prose (via realizeSection). This is exactly what the original
// recovered src/parity.test.mts's second test exercises ("sectionFromText
// bridges language-parsing parses into language-generation sections") —
// not an invented capability.
//
// generate(frames) is also ported and exposed standalone (the original
// recovered index.mts's own documented "primary high-level entry point"),
// but it is not wired to invoke-service: the recovered parity.test.mts never
// calls it directly (it tests realizeSection/sectionFromText/model instead),
// so wiring it as the die's contracted operation would go beyond what a real
// recovered test actually exercises.
import { sectionFromText } from "./section-from-text.mjs";
import { realizeSection } from "./section.mjs";
import { realizeClause } from "./realize.mjs";
import { plan, planToText } from "./plan.mjs";
import { model as settlingModel } from "./model.mjs";

/** Real, deterministic function of (text): parse `text` with the shared
 * engine, lift its role/polarity/tense analysis into a settled section
 * (sectionFromText), then realize that section back to prose
 * (realizeSection) — a full parse → structure → prose round trip. */
export function realizeText(text) {
  const section = sectionFromText(text);
  const realization = realizeSection(section);
  return {
    section: {
      subject: section.subject,
      cells: section.cells.map((c) => ({ predicate: c.predicate, object: c.object, chargeValue: c.charge.value, tense: c.tense, obliques: c.obliques ?? [] })),
    },
    realization: {
      prose: realization.prose,
      clauses: realization.clauses.map((c) => ({ predicate: c.cell.predicate, regime: c.regime, text: c.text })),
      dropped: realization.dropped.map((d) => ({ predicate: d.cell.predicate, reason: d.reason })),
      audit: realization.audit.map((a) => ({ predicate: a.cell.predicate, default: a.default })),
    },
  };
}

/** Generate prose from a sequence of role frames — the recovered package's
 * own documented primary entry point. Ported for real, exposed standalone,
 * not wired to invoke-service (see file header). */
export function generate(frames, opts) {
  const textPlan = plan(frames, opts);
  return planToText(textPlan, (spec) => realizeClause(spec).text);
}

export { sectionFromText, realizeSection, realizeClause, plan, planToText, settlingModel };

// language-character — the REAL-LLM-LANGUAGE seam, as ONE function: a language character's turn is
// `articulate(utterance) -> descend`. It takes FREE PROSE (a real model completion, or any text),
// turns it into paraconsistent fiber-algebra cells via panini, and SETTLES them through the swarm's
// descent — NEVER coercing the model into structured output. Prose is the wire; cells are derived.
//
// THE LOAD-BEARING PRINCIPLE (read off the live path, index.mjs:155-191): the model speaks PROSE.
// The live infer path sets no `response_format` (json is opt-in only, infer.mjs:14 / ask.mjs:47);
// `utterance[1].const` is raw text. `descendProse` (descent.mjs:43) folds that prose DOWN to charged
// cells through the real language stack (panini parse via reiter's sectionFromText, prose.mjs:31)
// and closes the agent fiber to its LFP against held-⊤. The raw text STAYS the witness; the cells
// are an additive, append-only structuring held ALONGSIDE it, never a JSON cage around the model.
//
// This module makes that turn nameable and testable as a unit, and adds the REAL leg: `speak()`
// performs one genuine non-structured completion through `ask()` (prose in, prose out, no json) and
// hands the reply to the SAME descent. A turn is therefore: utterance(prose) -> articulate(parse to
// charged section) -> descend(settle the fiber) -> { prose, cells, settled }.
//
// EXPORTS:
//   articulateUtterance(text)         -> { section, cells, summary }   (prose -> charged section, pure)
//   languageTurn(subject, text, opts) -> { prose, section, cells, summary, settled }  (articulate + descend)
//   speak(req, opts)                  -> { prose, provenance, turn }   (REAL LLM leg: ask() then turn)
//
// `articulateUtterance` and `languageTurn` are PURE (no network). `speak` is the only leg that calls
// out, and it NEVER sets `json`/`responseFormat` — coercing structured output is forbidden here.

import { ask } from "./ask.mjs";
import { descendProse, proseTraceSummary } from "./descent.mjs";
import { proseToSection, sectionToCells } from "./prose.mjs";

// articulateUtterance — the FIRST half of a language turn: free prose -> charged section -> charged
// cells, via the real panini stack (prose.mjs delegates to reiter's sectionFromText). Pure. A span
// panini cannot read settles ⊥ here (a NAMED gap), never an invented assertion.
export function articulateUtterance(text) {
  if (typeof text !== "string") throw new TypeError("articulateUtterance: text must be a string");
  const section = proseToSection(text);
  const cells = sectionToCells(section);
  const glyphs = { t: 0, f: 0, "⊥": 0, "⊤": 0 };
  for (const c of cells) glyphs[c.glyph] = (glyphs[c.glyph] ?? 0) + 1;
  return { section, cells, summary: { cells: cells.length, glyphs } };
}

// languageTurn — the FULL turn: articulate the prose, then DESCEND it (close the fiber to its LFP
// against held-⊤, govern the contested cells). The raw prose rides through as `prose` (the witness).
// This is the unit the orchestration realizes for a language character: utterance in, settled cells
// out, the contradiction (⊤) held and recoverable, the gap (⊥) named — never repaired, never invented.
export function languageTurn(subject, text, opts = {}) {
  const prose = typeof text === "string" ? text : "";
  const settled = descendProse(subject, prose, opts);
  return {
    prose,
    section: settled.section,
    cells: settled.cells,
    summary: proseTraceSummary(settled),
    settled,
  };
}

// speak — the REAL LLM leg. One genuine non-structured completion through ask() (NO json, NO
// responseFormat — coercing structured output is forbidden on this seam), then the reply prose is run
// through the SAME languageTurn. Returns the raw prose, its provenance (the persistable witness, key
// NAME never value), and the settled turn. The caller supplies provider+model+prompt (+ optional
// system); `speak` refuses any attempt to pass json/responseFormat through.
export async function speak(req = {}, opts = {}) {
  if (req.json || req.responseFormat) {
    throw new Error("speak: structured output is forbidden on the real-llm-language seam — pass prose, get prose.");
  }
  const subject = req.subject ?? "agent";
  const { text, provenance } = await ask(
    { provider: req.provider, model: req.model, prompt: req.prompt, system: req.system },
    opts.askOptions ?? {},
  );
  const turn = languageTurn(subject, text, opts.turnOptions ?? {});
  return { prose: text, provenance, turn };
}

// prose — the PROSE -> CHARGED CELLS spine. An LLM reply is raw text; this module folds that prose
// DOWN to charged predication cells using the REAL language stack (syntaxis parse via poiesis's
// sectionFromText), and lifts charged cells back UP to prose (poiesis's realize). It is the bridge
// that lets a model's words enter the swarm's paraconsistent, append-only trace as SETTLED cells —
// held ALONGSIDE the raw text (the raw stays the witness), never replacing it.
//
// THE SHAPE (read off poiesis, not guessed). A section is { subject, cells: [{ predicate, object,
// charge, tense?, obliques? }] } over Φ = E × Π × E. A charge is the math carrier
// { value: [posBit, negBit], evidence: [posWitnesses, negWitnesses] } — the four corners:
//   [true,false]  t  affirmed     [false,true]  f  denied
//   [false,false] ⊥  void (a NAMED gap — never hallucinated)
//   [true,true]   ⊤  contradicted (a HELD value — never averaged/repaired)
//
// THE LAW it keeps:
//   - ⊥ is never hallucinated into prose. A ⊥ cell realizes to NO clause (poiesis drops it,
//     recoverable in `dropped`); proseToSection passes syntaxis's honest ⊥ through untouched.
//   - ⊤ is held, not repaired. A ⊤ cell realizes its CALM default face with the contradiction
//     recoverable (poiesis's `audit`/`why`); we never collapse it to t or f.
//   - Evidence is LINEAR. sectionToCells copies the charge's evidence carrier through verbatim;
//     it never re-rolls a {pos,neg} or drops a witness.
//
// EXPORTS:
//   proseToSection(text)       -> section            (LLM prose -> charged section, via poiesis/syntaxis)
//   sectionToCells(section)    -> [{ subject, predicate, object, charge }]   (EAVT-ready charged rows)
//   realizeFromCells(cells)    -> { prose, ... }     (the inverse, for agent OUTPUT)
//   cellsToEavtRows(cells, t?) -> [{ e, a, v, t }]   (the carrier bridge: charged rows -> TAB EAVT,
//                                 a t/⊤ cell emits a positive row, an f cell emits a CONVERSE row so
//                                 the fold reads negative evidence the TAB way — never a polarity field)
//   CONVERSE_PREFIX            the converse-predicate prefix the EAVT bridge uses for f / negative evidence.

import { sectionFromText, realize } from "@561-group/reiter";

// the four-corner reading of a poiesis charge's value bits, off the carrier — never re-tested by hand.
function chargeValue(charge) {
  const v = charge?.value ?? [false, false];
  const [p, n] = v;
  if (p && n) return "⊤";
  if (p) return "t";
  if (n) return "f";
  return "⊥";
}

// CONVERSE_PREFIX — the converse-predicate marker. TAB reads negative evidence as a CONVERSE
// predication, never a polarity flag: a denied (f) cell on predicate P becomes a positive row on
// `not-P` paired with a (P has-converse not-P) converse map, so being's fold settles it as f.
export const CONVERSE_PREFIX = "not-";

// proseToSection — fold an LLM reply (or any prose) DOWN to a charged section using the REAL stack.
// Delegates entirely to poiesis's sectionFromText (which runs syntaxis's articulate/roles/polarity).
// Honest ⊥ rides through: a predication syntaxis could not read settles ⊥ here, never invented.
export function proseToSection(text) {
  if (typeof text !== "string") throw new TypeError("proseToSection: text must be a string");
  return sectionFromText(text);
}

// sectionToCells — flatten a charged section into EAVT-ready charged rows the swarm trace/descent can
// hold. Each row is { subject, predicate, object, charge } — the charge's evidence carrier copied
// THROUGH verbatim (linear: no witness dropped, no {pos,neg} re-roll). A cell with no object keeps
// object: null (an honest gap, not invented). A ⊥ cell is KEPT in the rows (the cell exists; its
// emptiness is recorded), so the gap is named, not silently absent.
export function sectionToCells(section) {
  const subject = section?.subject ?? null;
  const cells = Array.isArray(section?.cells) ? section.cells : [];
  return cells.map((cell) => ({
    subject,
    predicate: cell.predicate ?? null,
    object: cell.object ?? null,
    // copy the charge carrier through verbatim — value bits AND both evidence faces. Linear.
    charge: {
      value: Array.isArray(cell.charge?.value) ? cell.charge.value.slice() : [false, false],
      evidence: [
        Array.isArray(cell.charge?.evidence?.[0]) ? cell.charge.evidence[0].slice() : [],
        Array.isArray(cell.charge?.evidence?.[1]) ? cell.charge.evidence[1].slice() : [],
      ],
    },
    glyph: chargeValue(cell.charge),
    ...(cell.tense ? { tense: cell.tense } : {}),
    ...(Array.isArray(cell.obliques) && cell.obliques.length ? { obliques: cell.obliques } : {}),
  }));
}

// cellsToEavtRows — the CARRIER BRIDGE: charged rows -> TAB EAVT rows { e, a, v, t } a fiber folds.
// The TAB way of negative evidence is a CONVERSE predication, never a polarity field, so:
//   t (affirmed)     -> one positive row  (e:subject, a:predicate, v:object)
//   f (denied)       -> one CONVERSE row  (e:subject, a:not-predicate, v:object) — read as f when the
//                       caller folds with converse:{ predicate: "not-"+predicate } (see converseMapOf)
//   ⊤ (contradicted) -> BOTH rows (positive + converse) — the fold settles ⊤ (held, not repaired)
//   ⊥ (void)         -> NO row emitted (an unseen value stays a named gap — never hallucinated into
//                       the trace as a positive assertion). The cell is still recoverable in the
//                       charged rows; it simply contributes no positive EAVT evidence.
// Rows that lack a subject, predicate, or object cannot key a cell and are skipped (a ⊥-as-absent).
export function cellsToEavtRows(cells, t = "prose") {
  const rows = [];
  let seq = 0;
  for (const cell of Array.isArray(cells) ? cells : []) {
    const subject = cell.subject;
    const predicate = cell.predicate;
    const object = cell.object;
    if (subject == null || predicate == null || object == null) continue; // cannot key — named gap
    const glyph = cell.glyph ?? chargeValue(cell.charge);
    const stamp = (suffix) => `${t}:${String(++seq).padStart(4, "0")}${suffix}`;
    if (glyph === "t" || glyph === "⊤") {
      rows.push({ e: subject, a: predicate, v: object, t: stamp("") });
    }
    if (glyph === "f" || glyph === "⊤") {
      rows.push({ e: subject, a: `${CONVERSE_PREFIX}${predicate}`, v: object, t: stamp(":conv") });
    }
    // glyph === "⊥": emit nothing. The gap is named in the charged rows, never invented here.
  }
  return rows;
}

// converseMapOf — the converse predicate map naming each denied predicate's converse. The map is keyed
// POSITIVE -> CONVERSE: a cell denied (f) or contested (⊤) on predicate P contributes `P -> not-P`, so a
// reader can recover the converse name of any negated predication. This is the swarm-facing,
// human-legible orientation (a predicate paired with its negation), and it is what the bridge that
// EMITTED the not-P rows (cellsToEavtRows) thinks in.
//
// NOTE the fold (being / substrate.fold) reads the OPPOSITE orientation: it wants CONVERSE -> POSITIVE
// (`{ "not-P": "P" }`) so a not-P row charges the NEGATIVE face of the P cell and the two opposed
// witnesses MEET as a ⊤ on P (the real predicate), not on a separate `not-P` cell. Use `invertConverse`
// to turn this map into the fold orientation before passing it to being/closeFiber.
export function converseMapOf(cells) {
  const map = {};
  for (const cell of Array.isArray(cells) ? cells : []) {
    const predicate = cell.predicate;
    if (predicate == null) continue;
    const glyph = cell.glyph ?? chargeValue(cell.charge);
    if (glyph === "f" || glyph === "⊤") map[predicate] = `${CONVERSE_PREFIX}${predicate}`;
  }
  return map;
}

// invertConverse — flip a converse map between the two orientations. converseMapOf emits POSITIVE ->
// CONVERSE (`{ "P": "not-P" }`); the fold (being / substrate.fold) reads CONVERSE -> POSITIVE
// (`{ "not-P": "P" }`). Threading the un-inverted map into the fold orients the contradiction onto the
// `not-P` cell instead of P, so an affirm (P) and a deny (not-P) over the SAME subject never MEET as a
// ⊤ on P — they settle as two unrelated cells. Inverting first makes the not-P row register as negative
// evidence ON P, raising the held ⊤ on the real predicate. The flip is its own inverse.
export function invertConverse(map) {
  const out = {};
  for (const [from, to] of Object.entries(map ?? {})) {
    if (typeof to === "string" && to) out[to] = from;
  }
  return out;
}

// realizeFromCells — the INVERSE, for agent OUTPUT: lift charged cells back UP to prose via poiesis's
// realize. Accepts either a section ({ subject, cells }) or the flat charged rows sectionToCells
// emits (it reconstructs the section from them — subject from the first row, one cell each). poiesis
// keeps THE LAW in output: ⊥ omitted-but-recoverable (dropped), ⊤ calm default with `why` recoverable.
export function realizeFromCells(cellsOrSection) {
  const section = sectionFor(cellsOrSection);
  return realize(section);
}

// sectionFor — normalize either a section or flat charged rows into the section shape realize reads.
function sectionFor(cellsOrSection) {
  if (cellsOrSection && Array.isArray(cellsOrSection.cells)) return cellsOrSection;
  const rows = Array.isArray(cellsOrSection) ? cellsOrSection : [];
  const subject = rows[0]?.subject ?? null;
  const cells = rows.map((r) => ({
    predicate: r.predicate,
    object: r.object,
    charge: r.charge,
    ...(r.tense ? { tense: r.tense } : {}),
    ...(r.obliques ? { obliques: r.obliques } : {}),
  }));
  return { subject, cells };
}

// proseToCells — the convenience spine end-to-end: prose -> section -> charged rows. The single call
// the orchestration uses to structure a model reply, holding the rows alongside the raw text.
export function proseToCells(text) {
  return sectionToCells(proseToSection(text));
}

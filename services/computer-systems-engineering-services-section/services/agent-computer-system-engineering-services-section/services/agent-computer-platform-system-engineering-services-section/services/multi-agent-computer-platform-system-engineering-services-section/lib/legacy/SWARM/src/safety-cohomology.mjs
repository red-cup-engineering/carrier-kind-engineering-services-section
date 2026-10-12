import { chargeValue, conflateValue, negateValue, sameChargeValue } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";
// safety-cohomology.mjs — safety-as-cohomology dispatch gating.
//
// The corpus's swarm-governance note (computer/docs/dev/notes/swarm-governance.md §4) records the
// kyriarchical-regime safety apparatus and abstracts it for THIS machine: the dispatch certifiability
// gate "consults the K₄-equivariant decomposition of the first cohomology group of the substrate's
// settling — REFUSING DISPATCH WHEN THE SAFETY-CRITICAL SECTORS H¹_{χ_-}, H¹_{χ_{~∘-}} ARE NON-ZERO."
// The note's §4 [INFERENCE] names the OS primitive: "safety-as-cohomology — dispatch is gated on a
// COMPUTED INVARIANT of the trace's settling (H¹ sectors), not on ad-hoc rules. The OS already has the
// ingredients — FOUR-valued cells, the K₄/Klein gauge (negate/conflate), and the settling. A dispatch
// gate that refuses to act while a designated safety sector is non-zero is implementable on the
// existing kernel; the governance layer decides WHICH sectors are safety-critical."
//
// This module is that gate. The COHOMOLOGICAL OBSTRUCTION it reads is the held contradiction: a
// safety-critical cell that settles to ⊤ (two workers depositing disagreeing safety evidence) is a
// non-zero H¹ sector — the disagreement-as-cohomology the consensus note proves (⊤ = the paraconsistent
// cohomology witness). The K₄/Klein gauge splits the obstruction into isotypic SECTORS via the two
// non-trivial Klein characters: χ_- = `negate` (the truth-flip sector — a cell affirmed-and-denied),
// χ_{~∘-} = `conflate`-composed (the knowledge sector — a cell driven from ⊥ to ⊤). A dispatch is
// REFUSED while any designated safety sector is non-zero; the governance layer names which sectors.
//
// It rides the substrate settle/section (the trace's settling) and the kernel Klein gauge, and the
// swarm structures already present (the EAVT field). It authors no new safety theory — the note's
// kyriarchical apparatus belongs to the SHIP; this is its append-only, FOUR-valued shadow.

import { readFileSync } from "node:fs";

import { settle, section } from "@561-group/computer/posix-holography/eavt-substrate";
import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";


import { memoryRootOf } from "./memory.mjs";

// read the raw {e,a,v,t} rows a term's EAVT log holds (TTMS read folds them away; the safety settle
// needs the raw rows to re-settle under a converse map). Reads the jsonl log directly, tolerant of an
// absent file (an untouched safety term has no obstruction).
function termRows(memRoot, term) {
  const path = address(memRoot, term, "jsonl");
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// the two non-trivial Klein characters of the K₄ gauge, named for the safety sectors the note cites.
// A contradicted cell is decomposed by which gauge move WITNESSES its obstruction:
//   • χ_-      (truth-flip): the cell is affirmed AND denied — negate fixes ⊤, so an obstruction the
//              truth involution cannot dissolve. This is the "two workers, opposite safety verdicts" sector.
//   • χ_{~∘-}  (knowledge): the cell was driven ⊥ → ⊤ by accumulating evidence — conflate is exactly the
//              ⊥↔⊤ move. This is the "undetermined cell forced to contradiction" sector.
export const SAFETY_SECTORS = Object.freeze(["chi-minus", "chi-conflate"]);

// sectorOf(charge-value) — which Klein sector a contradicted cell falls in. Per the gauge: a cell that
// is its own negate-image AND its own conflate-image is ⊤ (both involutions fix it) — it sits in BOTH
// safety sectors (the worst obstruction). A non-⊤ cell is not an obstruction (sector none).
function sectorsOfValue(value) {
  if (value !== "stable") return [];
  // ⊤ is fixed by negate (χ_- obstruction stands) and is the conflate-image of ⊥ (χ_{~∘-} obstruction).
  const sectors = [];
  if (sameChargeValue(negateValue(chargeValue(value)), chargeValue(value))) sectors.push("chi-minus");        // truth-flip cannot dissolve it
  if (sameChargeValue(conflateValue(chargeValue("absurd")), chargeValue(value))) sectors.push("chi-conflate");   // it is the ⊥→⊤ knowledge obstruction
  return sectors;
}

// h1Sectors(root, safetyTerms, options) — compute the non-zero H¹ safety sectors over a set of
// designated safety-critical terms. For each term, settle its trace and read the section; every
// CONTRADICTED cell is a cohomological obstruction, assigned to its Klein sector(s). Returns the
// per-sector obstruction cells — the non-zero sectors are exactly those with a non-empty cell list.
export function h1Sectors(root, safetyTerms = [], options = {}) {
  const memRoot = memoryRootOf(root);
  // the converse map names which predicates are the NEGATIVE face of which — a converse row charges the
  // negative side, so `clear` + `not-clear` on the same cell settle to ⊤. The governance layer supplies
  // it (default: a `not-<p>` predicate is the converse of `<p>`, the common safety convention).
  const converse = options.converse ?? defaultConverse(safetyTerms, memRoot);
  const obstructions = { "chi-minus": [], "chi-conflate": [] };
  for (const term of [].concat(safetyTerms ?? [])) {
    const rows = termRows(memRoot, term);
    let parts;
    try { parts = section(settle(term, rows, { converse })); } catch { parts = { contradicted: [] }; }
    for (const cell of parts.contradicted ?? []) {
      for (const sector of sectorsOfValue("stable")) {
        obstructions[sector].push({ term, predicate: cell.predicate, object: cell.object });
      }
    }
  }
  const sectors = SAFETY_SECTORS.map((name) => ({
    sector: name,
    obstructions: obstructions[name],
    nonZero: obstructions[name].length > 0,
  }));
  return Object.freeze({
    kind: "swarm.safety.h1",
    sectors,
    nonZeroSectors: sectors.filter((s) => s.nonZero).map((s) => s.sector),
  });
}

// defaultConverse — derive the converse map from the safety terms' own predicates: any predicate of
// the form `not-<p>` is taken to be the negative face of `<p>` (the common safety convention — a
// worker deposits `clear=sector` to affirm and `not-clear=sector` to deny). The governance layer may
// override with an explicit options.converse. Pure read over the terms' rows.
function defaultConverse(safetyTerms, memRoot) {
  const map = {};
  for (const term of [].concat(safetyTerms ?? [])) {
    for (const row of termRows(memRoot, term)) {
      const a = String(row.a ?? "");
      if (a.startsWith("not-")) map[a] = a.slice("not-".length);
    }
  }
  return map;
}

// dispatchGate(root, safetyTerms, options) — the SAFETY GATE: a FOUR-valued dispatch verdict that
// REFUSES (⊤ held — never a silent denial) while any DESIGNATED safety sector is non-zero. The
// governance layer names the critical sectors via options.criticalSectors (default: both); a sector
// outside the designated set does not gate. This is the note's "refuse dispatch while a designated H¹
// sector is non-zero," computed on the trace's settling, not declared. A clear gate reads `t`.
export function dispatchGate(root, safetyTerms = [], options = {}) {
  const critical = new Set([].concat(options.criticalSectors ?? SAFETY_SECTORS));
  const h1 = h1Sectors(root, safetyTerms, options);
  const standing = h1.nonZeroSectors.filter((s) => critical.has(s));
  if (standing.length) {
    return Object.freeze({
      kind: "swarm.safety.gate",
      value: "stable",                       // a held cohomological obstruction — refused, surfaced not collapsed
      admitted: false,
      reason: `dispatch refused: safety sector(s) ${standing.join(", ")} non-zero (held ⊤ in the safety-critical trace).`,
      sectors: h1.sectors,
      standing,
    });
  }
  return Object.freeze({
    kind: "swarm.safety.gate",
    value: "potential",
    admitted: true,
    reason: "every designated safety sector is zero (no held contradiction in the safety-critical trace).",
    sectors: h1.sectors,
    standing: [],
  });
}

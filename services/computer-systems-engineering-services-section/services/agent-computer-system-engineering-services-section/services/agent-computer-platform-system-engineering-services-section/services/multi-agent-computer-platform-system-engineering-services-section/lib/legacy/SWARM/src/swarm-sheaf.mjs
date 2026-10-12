// swarm-sheaf — the single canonical read surface over the predication-graph sheaf.
//
// SWARM's irreducible core is a sheaf over a site of semiotic workers: every act is an affirm-only
// EAVT predication cell {e,a,v,t}, and a term's memory is its log folded by the bilattice
// knowledge-join into a settled section. This module is the ONE surface every reader converges onto,
// so a query is a FOLD of the canonical section — never the readFileSync().split().map(JSON.parse)
// + doc[row.a]=row.v hand-parse that silently collapses a contested cell to last-writer. Distinct
// objects for one (subject,predicate) stay DISTINCT cells, so a held-⊤ survives end to end.
//
// It owns no algebra. The fold is TTMS reading; the as-of/witness folds are reading-asof. SWARM
// contributes only the surface and the interpretation of what a held-⊤ means here.
//
// SOUNDNESS (see docs/dev/notes/2026-06-05-refounding-verified-map-and-migration.md):
//   settledSection / columnRead — sound now.
//   readAsOf / witnessOf        — sound only once every write site files a monotone-sortable `t`
//                                 (migration P0); read-asof compares String(t), so an id-valued t
//                                 mis-orders. They are exposed now so readers can adopt the surface;
//                                 the ordering becomes correct when P0 lands.
//   cohomologyH1                — NOT here yet. The derived ℤ-linear H¹ (coker δ⁰ over the settled
//                                 relation) is being lifted from math-playground into @red-cup-engineering/metrologic;
//                                 it joins this surface as cohomologyH1(section) once that lift lands.
//                                 (Never import it from the playground; never gate on an assumed value.)

import read from "@561-group/computer/typed-term-memory-system/reading";
import readAsOfRaw, { witnessOf as witnessOfRaw } from "@561-group/computer/typed-term-memory-system/reading-asof";
import { jcs as S } from "@561-group/computer/typed-resource-catalog/json";

// TTMS stores cell coordinates as schema-docs: an object/boolean rides bare, a scalar becomes
// {const: v} (mirrors reading-asof's asSchemaDoc). Normalize a caller's value the same way so a
// plain "status" matches the stored {const:"status"}.
const asSchemaDoc = (v) =>
  (v !== null && typeof v === "object" && !Array.isArray(v)) || typeof v === "boolean" ? v : { const: v };

// settledSection(root, term) -> { "entity-set", assignments: [{ cell:{subject,predicate,object}, charge }] }
// The canonical fold: the term's append-only log settled by the knowledge-join per (e,a). This is
// the replacement for every hand-parse reader's last-writer collapse.
export function settledSection(root, term) {
  return read(root, term);
}

// readAsOf(root, term, { asOf }?) -> the settled section as of transaction `asOf` (a prefix fold of
// the append-only log). Omit asOf for the whole log (== settledSection). SOUND ONLY after P0.
export function readAsOf(root, term, opts = {}) {
  return readAsOfRaw(root, term, opts);
}

// witnessOf(section, cell) -> the transaction marks (`t`s) that affirmed `cell` in this section —
// thick provenance. `cell` may be a full {subject,predicate,object} or a plain {e,a,v}.
export function witnessOf(section, cell) {
  return witnessOfRaw(section, cell);
}

// relationOf(section) -> the section's cells in the {subject,predicate,object} shape the cohomology
// reads as a directed graph (one cell = one edge subject→object). The bridge to cohomologyH1 once
// the ℤ-linear H¹ lands in @red-cup-engineering/metrologic.
export function relationOf(section) {
  return section.assignments.map((a) => a.cell);
}

// columnRead(root, terms, predicate, object) -> which of the named subjects assert ⟨predicate,object⟩,
// with what charge. The Chu COLUMN read TTMS does not give for free: today it ENUMERATES the named
// terms (the caller supplies the carrier, exactly as eavt-chu's memoryChu does). writeDual (P3) makes
// this a local predicate-log fold and drops the enumeration. predicate/object may be scalars or the
// section's schema-doc form.
export function columnRead(root, terms, predicate, object) {
  const want = S([asSchemaDoc(predicate), asSchemaDoc(object)]);
  const hits = [];
  for (const term of terms) {
    for (const { cell, charge } of settledSection(root, term).assignments) {
      if (S([cell.predicate, cell.object]) === want) hits.push({ term, charge });
    }
  }
  return hits;
}

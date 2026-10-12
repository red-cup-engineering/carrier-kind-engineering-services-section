// structuration.mjs — read a work's structuration, then fold it to a governance regime.
//
// The corpus's directionality is work-before-governance: "governance is read off the work's
// structuration" — a Curry-Howard/Yoneda directionality, and in the agency tree `governing/` sits
// *under* `…/situating/coordinating/` (docs/dev/notes/2026-06-04-plural-situational-governance.md
// §"The frame", §3). So structuration is the observable shape of the work, and the regime is a
// fold over it — "computed, not declared".
//
// readStructuration(root, work) does the impure reads (the work's children, its declared scope and
// phase) and returns a plain structuration object. selectGovernanceRegime(structuration) is a PURE
// fold from that object to a regime name, defaulting to kyriarchical so nothing existing changes.

import {
  readStructuration as readProcessStructuration,
  selectRegime as selectProcessRegime,
} from "@561-group/computer-kernel-process/governance";

import { DEFAULT_REGIME, REGIMES } from "./regimes.mjs";
import { planCompositionKind } from "./tuplets.mjs";
import { listWorkObjects } from "./work.mjs";

function docOf(work) {
  return work?.doc ?? work ?? {};
}

// The work's plan-composition shape, read from its children (the named composition forms in
// tuplets.mjs: sequential / tensor-product / frobenius-* / general-poset / single-task / empty).
function planCompositionFor(root, work) {
  const doc = docOf(work);
  if (!root || !doc.id) return "unknown";
  const children = listWorkObjects(root).filter((record) => (record.doc.partOf || record.doc.parent) === doc.id);
  if (!children.length) return "leaf";
  return planCompositionKind(children);
}

// Which offices touch this work (its own office, plus a declared office field).
function officeFieldFor(work) {
  const doc = docOf(work);
  const offices = new Set();
  if (doc.office) offices.add(String(doc.office));
  if (doc.createdBy) offices.add(String(doc.createdBy));
  for (const o of [].concat(doc.offices ?? [])) if (o) offices.add(String(o));
  return [...offices];
}

// Internal kin-work vs external ship-work — the scope distinction the corpus names as the primary
// internal/external axis (plural-situational-governance.md §lines 63-65, citing
// dual-governance-context.md: internal wolakȟota vs external kyriarchical command).
function scopeFor(work) {
  const doc = docOf(work);
  const raw = String(doc.scope ?? doc.governanceScope ?? "").toLowerCase();
  if (["internal", "internal-kin-work", "kin", "kin-work"].includes(raw)) return "internal-kin-work";
  if (["external", "external-ship-work", "ship", "ship-work"].includes(raw)) return "external-ship-work";
  return "unspecified";
}

// readStructuration EXTENDS the process-runtime's generic structuration read. The OS read
// (process-runtime/governance.readStructuration) computes the fields it generalized off swarm — the
// scope (internal-kin-work / external-ship-work), the `after` predecessor set, the officeField, and
// the hasWithdrawals flag — over a process face. Swarm hands it the work doc (the runtime reads
// `proc.doc`) plus the withdrawals, then ADDS the swarm-domain fields the OS does not carry: the
// plan-composition shape (read from the work's children) and the development phase. The scope/withdrawal
// reading is the OS's; the work-kind-specific reading is swarm's.
export function readStructuration(root, work, options = {}) {
  const doc = docOf(work);
  const withdrawals = [].concat(options.withdrawals ?? doc.withdrawals ?? []).filter(Boolean);
  const base = readProcessStructuration({ id: doc.id ?? "", doc, after: [] }, { withdrawals });
  return {
    kind: "swarm.structuration",
    workId: doc.id ?? "",
    workTitle: doc.title ?? "",
    // an explicit per-work regime declaration wins over the fold (a work may name its own object of Gov)
    declaredRegime: REGIMES[doc.governanceRegime] ? doc.governanceRegime : "",
    scope: base.scope,                 // the OS scope read (kin-work / ship-work / unspecified)
    planComposition: options.planComposition ?? planCompositionFor(root, work),
    officeField: officeFieldFor(work),
    developmentPhase: doc.developmentPhase ?? "",
    // a withholding present in the trace pushes selection toward the withdrawal-settling regime
    hasWithdrawals: base.hasWithdrawals,
  };
}

// The pure fold: structuration → regime name, run through the process-runtime's selectRegime. A
// declared per-work regime wins (the runtime honors structuration.declaredRegime); otherwise swarm's
// `regimeSelector` decides from the scope/withdrawal shape; otherwise the kyriarchical default — so an
// un-typed work governs exactly as today. The substantive selection rule is swarm's; the runtime runs it.
function swarmRegimeSelector(structuration = {}) {
  if (structuration.scope === "internal-kin-work") return "consensus-by-withdrawal";
  if (structuration.scope === "external-ship-work") return "kyriarchical";
  if (structuration.hasWithdrawals) return "consensus-by-withdrawal";
  return "";
}

export function selectGovernanceRegime(structuration = {}) {
  const declared = REGIMES[structuration.declaredRegime] ? structuration.declaredRegime : "";
  return selectProcessRegime({ ...structuration, declaredRegime: declared }, swarmRegimeSelector, DEFAULT_REGIME);
}

// Convenience: read the structuration and select in one step.
export function regimeForWork(root, work, options = {}) {
  const structuration = readStructuration(root, work, options);
  return { structuration, regime: selectGovernanceRegime(structuration) };
}

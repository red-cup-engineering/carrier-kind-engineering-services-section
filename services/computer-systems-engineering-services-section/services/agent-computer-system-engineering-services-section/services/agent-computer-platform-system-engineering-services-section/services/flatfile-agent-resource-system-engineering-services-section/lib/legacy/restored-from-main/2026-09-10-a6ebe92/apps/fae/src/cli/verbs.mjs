// M10 (design spec S12): CLI verb parity, debitum/officium split (S8).
// Every verb here is a pure function — it only reads/computes/returns or
// throws, exactly the design's Family D discipline ("no process-exit
// machinery"). The process boundary (argv parsing, stdout, exit codes)
// lives entirely in cli/fae.mjs, the one file allowed to touch it — the
// same split the module tree draws between cli/*.py's PORTED VERBATIM
// verb files and cli/_runner.py's dispatch shell.
//
// Scope, stated explicitly (never a silent gap): the design's own
// apps/jsfars module tree (spec S9) names "validate, lint, show, search,
// witness, witness-log, discharge, replay" for cli/jsfars.mjs, but lists
// no analyze/ directory anywhere in JS's module tree — bm25 search is
// gen-1 Python-only territory (S6's provenance triage: "analyze/ (all
// modules) — Port near-verbatim" is a pyfars-only row). `search` is
// therefore not implemented here; runValidate/runLint/runShow/runWitness/
// runWitnessLog/runDischarge/runReplay are. See this app's README STATUS
// section for the block, stated the same way.

import { discharge as computeDischarge } from "../kernel/discharge.mjs";
import { readSeavt } from "../kernel/event-log.mjs";
import { getRecord } from "../kernel/record-store.mjs";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { replayEventLog, serializeState } from "../kernel/replay.mjs";
import { validateWitness } from "../kernel/witness.mjs";
import { composeRules } from "../closure/rules/compose-rules.mjs";
import { loadFlatfiles } from "../substrate/store.mjs";

// Debitum (design spec S8): the sigma battery alone, a MUST-constraint
// pass over a corpus root — gen-1's `closure/rule/*` minus the two
// dropped ad hoc rules (S6), composed by closure/rules/compose-rules.mjs.
// JS carries exactly one rule set today (no separate MUST-only vs.
// style-only split the way gen-1's Python closure/rule/ package draws
// one), so validate and lint are the same debitum battery under two
// names — a documented scope decision (README STATUS), not a hidden gap:
// `officium.md`'s warning is about conflating debitum with officium
// (discharge), not about splitting debitum into finer sub-batteries,
// which nothing in the design spec requires JS to do yet.
export async function runValidate(root, options = {}) {
  const { notes, diagnostics: parseDiagnostics } = await loadFlatfiles(root, options);
  const ruleDiagnostics = composeRules(notes, options);
  return { notes: notes.length, diagnostics: [...parseDiagnostics, ...ruleDiagnostics] };
}

export const runLint = runValidate;

// One flatfile's parsed Tier A record, by slug or by its corpus-relative
// path — null when no such note exists under root.
export async function runShow(root, target) {
  const { notes } = await loadFlatfiles(root);
  return notes.find((note) => note.slug === target || note.path === target) ?? null;
}

// One Witness, by its own content-identity id, re-validated on read (the
// same shape/id-round-trip check kernel/replay.mjs's fold already runs
// per witness) — null when the record store has nothing at that id, and
// a thrown validation error when it does but fails validateWitness.
export async function runWitness(root, witnessId) {
  const record = getRecord(root, witnessId);
  if (record === null) return null;
  return validateWitness(record);
}

// The raw SEAVT rows for one channel/day partition (kernel/event-log.mjs's
// readSeavt, unchanged), each row's v resolved to its full witness body
// from the content-addressed record store when locally readable — a
// lower-level view than runReplay's folded belief/registry/witness state,
// one journal partition file at a time rather than the whole log.
export async function runWitnessLog(root, channel, at) {
  return readSeavt(root, channel, at).map((row) => ({
    ...row,
    entry: { ...row.entry, witness: getRecord(root, termToJson(row.entry.v)) },
  }));
}

// Deterministic replay (kernel/replay.mjs) of root's whole event log,
// reshaped for CLI/JSON output: FOUR values as their [positive, negative]
// evidence-bit pairs, plus the canonical replay digest (serializeState's
// bytes, hex-encoded) two independent replays of the same log agree on.
export async function runReplay(root, options = {}) {
  const state = replayEventLog(root, options);
  return {
    belief: Object.fromEntries(
      Object.entries(state.belief).map(([target, value]) => [target, [value.positiveEvidence, value.negativeEvidence]]),
    ),
    records: state.records,
    witnesses: state.witnesses,
    digest: serializeState(state).toString("hex"),
  };
}

// Officium (design spec S8): the full H*_t fixed point for one record —
// {operative, sat_shadow, tr_shadow, free_shadow}, never coerced to a
// boolean — folded from root's whole event log via kernel/discharge.mjs.
// Strictly stronger than a clean runValidate/runLint pass; recordId may
// name either a Tier B record or a Witness (discharge.mjs's sigmaHolds/
// deltaHolds accept both, per record-types.mjs's own FOREIGN_TIER_B_TYPES
// carve-out for Witness). { found: false } when recordId resolves to
// neither.
export async function runDischarge(root, recordId) {
  const state = replayEventLog(root);
  const record = state.records[recordId] ?? state.witnesses[recordId];
  if (record === undefined) return { found: false, recordId, state: null };
  const records = Object.values(state.records);
  const witnesses = Object.values(state.witnesses);
  return { found: true, recordId, state: computeDischarge(record, records, witnesses) };
}

/**
 * integrations/filesystem/services/conurbation — host binding: read N
 * data roots' own recorded claim-session material and glue it into one
 * conurbation reading. Lives here, not under `src/coordination` (the pure
 * domain `glueClaimSessions`/`claimSessionObservationOfRow` come from):
 * this module's own distinguishing operation (`discoverDataRoots`) is
 * concrete filesystem I/O, and dependencies belong pointing FROM an
 * effectful adapter INTO the pure domain it realizes, never the reverse —
 * the same reason `core/persistence` stays host-neutral while `services/`
 * depends on it, not vice versa. Nesting this binding inside
 * `src/coordination` itself (as an earlier pass at this move did) inverted
 * that: it made the "pure" coordination domain transitively depend on a
 * concrete filesystem choice through its own subtree.
 *
 * Each data root's own admitted logs (`data/journals/YYYY/MM/DD/*-admit-*.jsonl`,
 * the journal's cross-feed scan) already carry whatever
 * claim-session rows that data root wrote for a date — work-ledger
 * obligations, obsticulation-derived obstructions, host-session work claims,
 * whatever it recorded. Reconstructing those rows back into
 * `ClaimSessionObservation`s (`claimSessionObservationOfRow`) and handing N
 * data-root bundles to `glueClaimSessions` — already proven at N session
 * transcripts via `readClaudeSessionFleetReadout` — is the whole conurbation
 * reading: no new gluing math, only a new source of bundles. `glued.coordination`
 * is the real coordination-cohomology rank of how well those data roots
 * currently cohere, the same reading a session fleet already gets.
 */
import path from "node:path";

import { operation } from "../../../rpc/operation.mjs";

import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";

import { claimSessionObservationOfRow, glueClaimSessions } from "@red-cup-engineering/relating/running/session";
import { classifyCalmOfGlue } from "../../../claims/calm.mjs";

/** Directory names a data-root walk never descends into: process/VCS
 *  scaffolding (`node_modules`, `dist`, `.tmp`) and a data root's own tiers
 *  (`data`, `content`) — tiers hold logs/state/records/documents, never a
 *  nested data root, so descending into one only costs time for no finds. */

/** True iff `dir` itself is inhabited — bears its own deposited tiers (a
 *  `data/journals` directory). A directory named `data` is a data root's PLATE
 *  tier, never itself a data root (the directory grammar: `data/` holds
 *  logs→state→records and cannot enclose sites) — without this guard, one
 *  stray deposit at `<root>/data/data/journals` would read as a data root
 *  captured inside `<root>/data/**`. `services/filesystem`'s
 *  `enclosingClaimDataRoot` checks the same inhabitation fact walking
 *  upward from a target path; this is the downward-facing form `discoverDataRoots`
 *  needs, kept local here rather than imported because `services/filesystem`
 *  is mid-rename elsewhere in this tree as this module is written. */
export function isDataRoot(dir) {
  const resolved = path.resolve(dir);
  return journal.discoverRoots(resolved, 0).includes(resolved);
}

/** One data root `discoverDataRoots` found: its absolute path and its
 *  path relative to the search root (`"root"` when the data root IS the
 *  search root itself). This is a filesystem ADDRESS, not an earned name —
 *  `dataRootQualifiedMount`'s own doctrine (`src/presentation/conurbation.mts`)
 *  is that a constituent's name is earned by its material, never guessed
 *  from where it sits; this is only the locator a caller needs to reach it. */

/**
 * Walk `root` for every directory bearing its own `data/journals`
 * (`isDataRoot`, above) — root included, when
 * inhabited. Descent continues past a found data root: `/home/emsenn/info`
 * itself already deposits its own logs (hook-event admissions not owned by
 * any one constituent) while obsmetrologia/metroplat/each site underneath it
 * deposit theirs — a data root bearing nested constituent data roots is
 * the ordinary conurbation shape, not an error, so both the enclosing
 * enclosing data root and its constituents are reported.
 */
export function discoverDataRoots(root) {
  const resolvedRoot = path.resolve(root);
  return Object.freeze(journal.discoverRoots(resolvedRoot).map((dir) => {
    const relativePath = path.relative(resolvedRoot, dir);
    return Object.freeze({ path: dir, relativePath: relativePath === "" ? "root" : relativePath });
  }));
}

/** One data root this conurbation reads: its own token (see
 *  `src/presentation/conurbation.mjs`'s addressing doctrine — earned, not
 *  derived from the path) and its own data root. */

/** One data root's own claim-session material for a date, reconstructed
 *  from its admitted logs — real recorded rows, not a test fixture. Rows
 *  that do not parse as claim-session rows (a different feed sharing the
 *  same admitted log file) are silently skipped, same as every other reader
 *  over a mixed daily log directory. */
export function readDataRootClaimBundle(dataRoot, date) {
  const folded = journal.scanAll(dataRoot.dataRoot, date, [], (observations, row) => {
    const observation = claimSessionObservationOfRow(row, dataRoot.token);
    if (observation !== null) observations.push(observation);
    return observations;
  });
  return Object.freeze({
    kind: "metroplat.claim-session.observation-bundle",
    source: dataRoot.token,
    observations: Object.freeze(folded.result),
    evidence: Object.freeze([`settlement:${dataRoot.token}`, `rows:${folded.rows}`]),
  });
}

  

/**
 * Read N data roots' own claim-session material for one date and glue it
 * into one conurbation reading. This is the data-root generalization
 * of `readClaudeSessionFleetReadout`'s session-level glue: same math
 * (`glueClaimSessions`), a different entity reading its bundles from.
 */
export function readConurbationCut(dataRoots, date) {
  const bundles = dataRoots.map((dataRoot) => readDataRootClaimBundle(dataRoot, date));
  const glued = glueClaimSessions(bundles);
  return Object.freeze({
    kind: "metroplat.conurbation.cut",
    date,
    settlements: Object.freeze(dataRoots.map((dataRoot) => dataRoot.token)),
    glued,
    calm: classifyCalmOfGlue(glued),
  });
}

export function readConurbationReadout(root, options) {
  const conurbation = path.resolve(root);
  const constituents = journal.discoverRoots(conurbation).map((dir) => {
      const span = journal.admissionSpan(dir);
      return Object.freeze({
        root: dir,
        relative: path.relative(conurbation, dir) || ".",
        tiers: Object.freeze({
          logs: true,
          state: options.statPathOrNull(path.join(dir, "data", "state"))?.isDirectory() === true,
          records: options.statPathOrNull(path.join(dir, "data", "records"))?.isDirectory() === true,
          content: options.statPathOrNull(path.join(dir, "content"))?.isDirectory() === true,
        }),
        firstAdmission: span.first,
        lastAdmission: span.last,
        feeds: span.feeds,
      });
  });
  constituents.sort((left, right) => left.relative.localeCompare(right.relative));
  return Object.freeze({
    kind: "metroplat.holography.conurbation-settlement",
    conurbation,
    constituents: Object.freeze(constituents),
    count: constituents.length,
  });
}

export function conurbationOperations(binding) {
  return Object.freeze([
    operation({
      verb: "conurbation",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Discover inhabited data roots beneath this directory.",
      description: "Domain: {}. Reads the configured data root as a conurbation and reports inhabited constituents plus their recorded admission span.",
      run: () => readConurbationReadout(binding.dataRoot, binding),
    }),
  ]);
}

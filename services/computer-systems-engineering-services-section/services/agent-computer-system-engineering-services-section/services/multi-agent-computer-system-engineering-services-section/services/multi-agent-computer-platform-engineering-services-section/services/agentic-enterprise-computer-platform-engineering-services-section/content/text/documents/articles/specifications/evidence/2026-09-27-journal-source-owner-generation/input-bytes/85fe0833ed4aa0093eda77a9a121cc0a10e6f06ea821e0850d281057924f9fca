/** The one owner of the relationship between the log tier's canonical path
 *  segment and the filesystem locations the journal resolves from it.
 *
 *  The segment is NOT restated here. It is derived from the log tier's
 *  `pathSegment` in the artifact tier table (`lib/records/persistence.mts`),
 *  which already builds artifact paths (`lib/addressing/data-artifact-address.mts`)
 *  and derives tier regexes (`lib/addressing/legibility.mts`). Before this
 *  module the journal restated the segment as three independent `/data/logs/`
 *  string markers, so renaming the tier's segment silently desynchronized
 *  path-building from path-resolution. Derive; never restate. */
import path from "node:path";

import { artifactTier } from "@red-cup-engineering/eavt-services-section/statement";

/** The log tier's POSIX path segment under a settlement root — the directory
 *  holding the journal's content-addressed `objects/`, its causal-admission
 *  `index/`, and the dated statement feeds. */
export const journalSegment = artifactTier("log").pathSegment;

/** The host-native `<sep>data<sep>journals<sep>` marker used to locate the
 *  journal store inside an absolute path. */
const journalMarker = `${path.sep}${journalSegment.split("/").join(path.sep)}${path.sep}`;

/** The pre-rename segment. A path bearing this is a stale journal address, not
 *  a standalone journal, and must never resolve silently (see below). */
const supersededMarker = `${path.sep}data${path.sep}logs${path.sep}`;

/** The store directory for a journal addressed outside any settlement. */
const standaloneDirectory = ".metroplat-journal";

function markerIndex(absolute) {
  return absolute.indexOf(journalMarker);
}

/** Refuse a journal path under the superseded `data/logs` segment.
 *
 *  Such a path is unambiguously a stale address: either a caller that outlived
 *  the rename, or a store that was never relocated. Resolving it as a
 *  standalone journal would silently open an empty `.metroplat-journal`
 *  beside a real corpus and admit new statements into it — a quiet split-brain
 *  that reads as an empty journal rather than as an error. Only an address
 *  bearing neither segment is genuinely standalone. */
function refuseSupersededSegment(absolute, logPath) {
  if (!absolute.includes(supersededMarker)) return;
  throw new TypeError(
    `journal path lies under the superseded "data/logs" segment: ${logPath}\n`
    + `The journal segment is now "${journalSegment}". Relocate the store, or update the caller to address it.\n`
    + `Refusing to resolve this as a standalone journal, which would silently admit statements into an empty store.`,
  );
}

/** Resolve the artifact store root enclosing `logPath` — the `data/journals`
 *  directory itself when the path lies inside a settlement, else a
 *  `.metroplat-journal` store beside it for a standalone journal. */
export function artifactStoreRoot(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at >= 0) return absolute.slice(0, at + journalMarker.length - 1);
  refuseSupersededSegment(absolute, logPath);
  return path.join(path.dirname(absolute), standaloneDirectory);
}

/** The directory to walk when collecting every received witness reachable from
 *  `logPath`: the whole store for a settled journal, else the standalone
 *  journal's own directory. */
export function receivedSearchRoot(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at >= 0) return absolute.slice(0, at + journalMarker.length - 1);
  refuseSupersededSegment(absolute, logPath);
  return path.dirname(absolute);
}

/** The settlement root enclosing `logPath` — the directory that *contains* the
 *  journal segment, i.e. one level above {@link artifactStoreRoot}. */
export function settlementRootOf(logPath) {
  const absolute = path.resolve(logPath);
  const at = markerIndex(absolute);
  if (at < 0) {
    refuseSupersededSegment(absolute, logPath);
    return undefined;
  }
  return absolute.slice(0, at);
}

/** The journal store directory a settlement root would hold. */
export function journalDirectoryOf(dataRoot) {
  return path.resolve(dataRoot, ...journalSegment.split("/"));
}

// Pure matching over an already-observed shape: tests a token against each
// file's full relative path string, never a basename alone. walkPosixPaths
// never records a directory as its own entry (a directory only ever shows up
// as a segment inside a file's path), so this firm's real service/directory
// identifiers ("witness-journal-rdf-projection-service/") are only visible to a
// full-path test — a basename-only matcher would systematically miss them.
// Never touches the filesystem and never walks; operates on any array of
// {path} records (a PosixPathWalk.files array, or a plain subset of one),
// same "pure function over an already-walked file list" contract as
// sliceFilesByType.

const RANK = Object.freeze({ "exact-basename": 0, "path-substring": 1 });
const SCORE = Object.freeze({ "exact-basename": 1, "path-substring": 0.8 });

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function basenameOf(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

// The basename with its final extension stripped ("WitnessJournal.md" -> "WitnessJournal"),
// so a file literally named after the token (any extension) counts as an
// exact-basename hit, not just a path-substring one.
function basenameStemOf(basename) {
  const dot = basename.lastIndexOf(".");
  return dot <= 0 ? basename : basename.slice(0, dot);
}

function folded(value, caseSensitive) {
  return caseSensitive ? value : value.toLowerCase();
}

function separatorStripped(value) {
  return value.replace(/[-_]/g, "");
}

// A camelCase hump is a spelling of the word separator, not a case claim:
// the capital in "witnessJournal" encodes the same boundary "-" does in
// "witness-journal", so it is decapitalized before matching even under
// case-sensitivity. A leading capital ("WitnessJournal") is a real case
// claim and is preserved.
function humpFolded(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, (_, before, hump) => `${before}${hump.toLowerCase()}`);
}

// The token matches with separator tolerance: "WitnessJournal",
// "witnessJournal", and "witness-journal" each find "witness-journal" in a
// path (subject to case-sensitivity on non-hump letters). Built as a regex
// whose characters admit an optional separator between them, so the match
// slice returned is the *original* path text.
function separatorTolerantRegExpSource(needle) {
  return separatorStripped(humpFolded(needle)).split("").map(escapeRegExp).join("[-_]?");
}

function matchedTextFor(path, needle, caseSensitive, wordBoundary) {
  const source = separatorTolerantRegExpSource(needle);
  if (source === "") return null;
  const flags = caseSensitive ? "" : "i";
  if (!wordBoundary) {
    const match = new RegExp(source, flags).exec(path);
    return match === null ? null : match[0];
  }
  const boundaryRe = new RegExp(`(?:^|[^A-Za-z0-9])(${source})(?=[^A-Za-z0-9]|$)`, flags);
  const match = boundaryRe.exec(path);
  return match === null ? null : match[1];
}

/**
 * Test `token` against each entry's full relative `path` (case-folded
 * substring by default). Returns a frozen array of match records ordered by
 * rank — an exact, case-folded basename match outranks a path-substring
 * match found elsewhere in the path — then alphabetically by path, the same
 * strict-rank-then-alphabetical shape jsnode-topology's searchPackages uses
 * for name/tag/description. `options.caseSensitive` and
 * `options.wordBoundary` opt into exact-case and `\b`-delimited testing.
 */
export function matchFilenameToken({ token, files, options = {} } = {}) {
  if (typeof token !== "string" || token.trim() === "") throw new TypeError("token is required");
  if (!Array.isArray(files)) throw new TypeError("files must be an array");
  const caseSensitive = options.caseSensitive === true;
  const wordBoundary = options.wordBoundary === true;
  const needle = folded(token, caseSensitive);

  const matches = [];
  for (const file of files) {
    if (typeof file?.path !== "string") continue;
    const matchedText = matchedTextFor(file.path, needle, caseSensitive, wordBoundary);
    if (matchedText === null) continue;
    const base = basenameOf(file.path);
    const strippedNeedle = separatorStripped(humpFolded(needle));
    const isExactBasename =
      separatorStripped(humpFolded(folded(base, caseSensitive))) === strippedNeedle ||
      separatorStripped(humpFolded(folded(basenameStemOf(base), caseSensitive))) === strippedNeedle;
    const matchKind = isExactBasename ? "exact-basename" : "path-substring";
    matches.push({
      path: file.path,
      matchKind: "filename-path",
      matchedText,
      rank: RANK[matchKind],
      score: SCORE[matchKind],
    });
  }

  matches.sort((a, b) => a.rank - b.rank || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return Object.freeze(
    matches.map((match) => Object.freeze({
      path: match.path,
      matchKind: match.matchKind,
      matchedText: match.matchedText,
      score: match.score,
    })),
  );
}

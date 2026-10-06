/** Pure read-through caching law for territory-wide log discovery. The cache
 *  never touches a filesystem effect itself: the structural signature that
 *  decides whether to reuse the previous discovery, and the log discovery and
 *  reads that fill a miss, all arrive as required functions on `source` --
 *  values the caller at the kernel edge supplies (`write-journal-store.mjs`'s
 *  `territorySignature`, threaded in by `journal.mjs`) -- never an import. */
import path from "node:path";

/** Injected log discovery and exact-content reads. */

const territoryLogPathsCache = new Map();

/** Clear the bounded directory-discovery cache. */
export function clearTerritoryEventsCache() {
  territoryLogPathsCache.clear();
}

/** Reuse the previous whole-territory log-path discovery when
 *  `computeSignature()`'s result is unchanged, else re-run the (expensive,
 *  full-walk) `discover` function. */
function readThroughTerritoryLogPaths(root, discover, computeSignature) {
  const key = path.resolve(root);
  const signature = computeSignature();
  const cached = territoryLogPathsCache.get(key);
  if (cached !== undefined && cached.signature === signature) return cached.logPaths;
  const logPaths = discover();
  if (territoryLogPathsCache.size >= 128) territoryLogPathsCache.delete(territoryLogPathsCache.keys().next().value);
  territoryLogPathsCache.set(key, Object.freeze({ signature, logPaths }));
  return logPaths;
}

/**
 * @param root Settlement root.
 * @param source Log discovery, exact-content reads, and the territory's
 *   structural signature (`territorySignature`), all supplied by the caller.
 * @returns Current verified events, reusing bounded directory discovery.
 */
export function readThroughTerritoryEvents(
  root,
  source,
) {
  const logPaths = readThroughTerritoryLogPaths(root, source.discoverLogPaths, source.territorySignature);
  const events = Object.freeze(logPaths.flatMap((logPath) =>
    source.readLog(logPath)));
  return Object.freeze({ logPaths, events });
}

/**
 * @param root Settlement root.
 * @param source Date-scoped log discovery and read operations.
 * @returns Current verified events for the discovered logs.
 */
export function readThroughDateEvents(
  root,
  source,
) {
  const logPaths = source.discoverLogPaths();
  const events = Object.freeze(logPaths.flatMap((logPath) => {
    const admitted = source.readLog(logPath);
    if (source.onEvent !== undefined) for (const event of admitted) source.onEvent(logPath, event);
    return admitted;
  }));
  return Object.freeze({ logPaths, events });
}

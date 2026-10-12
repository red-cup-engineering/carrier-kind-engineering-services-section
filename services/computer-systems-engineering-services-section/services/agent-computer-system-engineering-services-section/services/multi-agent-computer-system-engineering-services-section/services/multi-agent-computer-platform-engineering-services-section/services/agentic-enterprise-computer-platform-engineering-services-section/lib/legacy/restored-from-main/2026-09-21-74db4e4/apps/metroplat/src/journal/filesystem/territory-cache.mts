import path from "node:path";

import { journalDirectoryOf } from "../store-root.mts";
import { pathExists, readDirectoryEntries, statPathOrNull } from "../../lib/filesystem/index.mts";

/** Injected log discovery and exact-content reads. */
export interface ScannedEventsSource<Event> {
  readonly discoverLogPaths: () => readonly string[];
  readonly readLog: (logPath: string) => readonly Event[];
}

export interface ScannedEventsRead<Event> {
  readonly logPaths: readonly string[];
  readonly events: readonly Event[];
}

interface LogPathsCacheEntry {
  readonly signature: string;
  readonly logPaths: readonly string[];
}

const territoryLogPathsCache = new Map<string, LogPathsCacheEntry>();

function directorySignature(dirPath: string): string {
  const stat = statPathOrNull(dirPath);
  return stat === null ? "absent" : `${stat.mtimeMs}:${stat.size}`;
}

/** A cheap structural signature over every dated log directory under one
 * settlement root: three bounded `readdir` passes (years, months, days),
 * never a walk of the files inside them. Changes exactly when a new dated
 * log directory or a new feed directly under one appears. */
function territoryStructuralSignature(root: string): string {
  const logsRoot = journalDirectoryOf(root);
  if (!pathExists(logsRoot)) return "absent";
  const parts: string[] = [];
  let years;
  try {
    years = readDirectoryEntries(logsRoot);
  } catch {
    return "absent";
  }
  for (const year of years) {
    if (!year.isDirectory() || !/^\d{4}$/u.test(year.name)) continue;
    const yearDir = path.join(logsRoot, year.name);
    let months;
    try {
      months = readDirectoryEntries(yearDir);
    } catch {
      continue;
    }
    for (const month of months) {
      if (!month.isDirectory()) continue;
      const monthDir = path.join(yearDir, month.name);
      let days;
      try {
        days = readDirectoryEntries(monthDir);
      } catch {
        continue;
      }
      for (const day of days) {
        if (!day.isDirectory()) continue;
        const dayDir = path.join(monthDir, day.name);
        parts.push(`${year.name}-${month.name}-${day.name}:${directorySignature(dayDir)}`);
      }
    }
  }
  return parts.sort().join("|");
}

/** Clear the bounded directory-discovery cache. */
export function clearTerritoryEventsCache(): void {
  territoryLogPathsCache.clear();
}

/** Reuse the previous whole-territory log-path discovery when the
 * territory's structural signature is unchanged, else re-run the
 * (expensive, full-walk) `discover` function. */
function readThroughTerritoryLogPaths(root: string, discover: () => readonly string[]): readonly string[] {
  const key = path.resolve(root);
  const signature = territoryStructuralSignature(root);
  const cached = territoryLogPathsCache.get(key);
  if (cached !== undefined && cached.signature === signature) return cached.logPaths;
  const logPaths = discover();
  if (territoryLogPathsCache.size >= 128) territoryLogPathsCache.delete(territoryLogPathsCache.keys().next().value!);
  territoryLogPathsCache.set(key, Object.freeze({ signature, logPaths }));
  return logPaths;
}

/**
 * @param root Settlement root.
 * @param source Log discovery and read operations.
 * @returns Current verified events, reusing bounded directory discovery.
 */
export function readThroughTerritoryEvents<Event>(
  root: string,
  source: ScannedEventsSource<Event>,
): ScannedEventsRead<Event> {
  const logPaths = readThroughTerritoryLogPaths(root, source.discoverLogPaths);
  const events = Object.freeze(logPaths.flatMap((logPath) =>
    source.readLog(logPath)));
  return Object.freeze({ logPaths, events });
}

/**
 * @param root Settlement root.
 * @param source Date-scoped log discovery and read operations.
 * @returns Current verified events for the discovered logs.
 */
export function readThroughDateEvents<Event>(
  root: string,
  source: ScannedEventsSource<Event>,
): ScannedEventsRead<Event> {
  const logPaths = source.discoverLogPaths();
  const events = Object.freeze(logPaths.flatMap((logPath) =>
    source.readLog(logPath)));
  return Object.freeze({ logPaths, events });
}

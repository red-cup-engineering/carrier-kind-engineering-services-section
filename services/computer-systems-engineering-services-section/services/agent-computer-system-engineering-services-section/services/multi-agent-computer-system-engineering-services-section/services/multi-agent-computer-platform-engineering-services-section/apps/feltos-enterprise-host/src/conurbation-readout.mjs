import path from "node:path";
import { logDates } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const SKIPPED = new Set(["node_modules", ".git", "dist", ".tmp", ".metroplat-tmp", "data", "content"]);
const LOG_DIRECTORY = /^([a-z]+(?:-[a-z]+)*)-logs$/u;

/** Whether a directory is an inhabited settlement: it keeps a `data` directory of records, state or logs. */
function inhabited(dir, options) {
  return ["logs", "state", "records"].some((tier) => options.statPathOrNull(path.join(dir, "data", tier))?.isDirectory() === true);
}

/** The settlements beneath `root` (itself included), found by the directories they keep, to `maxDepth` levels. */
function discoverRoots(root, options, maxDepth = 7) {
  const found = [];
  const visit = (dir, depth) => {
    if (depth > maxDepth) return;
    if (path.basename(dir) !== "data" && inhabited(dir, options)) found.push(dir);
    let entries;
    try { entries = options.readDirectoryEntries(dir); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || SKIPPED.has(entry.name)) continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  };
  visit(root, 0);
  return found.sort((left, right) => left.localeCompare(right));
}

/** The types a settlement keeps logs of, with the first and last date any of them has a log. */
function logSpan(dir, options) {
  const types = [];
  try {
    for (const entry of options.readDirectoryEntries(path.join(dir, "data", "logs"))) {
      const match = entry.isDirectory() ? LOG_DIRECTORY.exec(entry.name) : null;
      if (match !== null) types.push(match[1]);
    }
  } catch { /* a settlement with no logs has no span */ }
  let first = null, last = null;
  for (const type of types) {
    for (const date of logDates(dir, type)) {
      if (first === null || date < first) first = date;
      if (last === null || date > last) last = date;
    }
  }
  return { first, last, feeds: types.length };
}

/** Inspect the settlements a FeltOS host can see on its filesystem. */
export function readConurbationReadout(root, options) {
  const conurbation = path.resolve(root);
  const constituents = discoverRoots(conurbation, options).map((dir) => {
    const span = logSpan(dir, options);
    return Object.freeze({
      root: dir,
      relative: path.relative(conurbation, dir) || ".",
      tiers: Object.freeze({
        logs: options.statPathOrNull(path.join(dir, "data", "logs"))?.isDirectory() === true,
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
  return Object.freeze([operation({
    verb: "conurbation",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Discover inhabited data roots beneath this directory.",
    description: "Domain: {}. Reads the configured data root as a conurbation and reports inhabited constituents plus the span of dates their logs cover.",
    run: () => readConurbationReadout(binding.dataRoot, binding),
  })]);
}

import path from "node:path";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

/** Inspect the settlements a FeltOS host can see on its filesystem. */
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
  return Object.freeze([operation({
    verb: "conurbation",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Discover inhabited data roots beneath this directory.",
    description: "Domain: {}. Reads the configured data root as a conurbation and reports inhabited constituents plus their recorded admission span.",
    run: () => readConurbationReadout(binding.dataRoot, binding),
  })]);
}

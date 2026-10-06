/** Durable causal section reads and follows over one journal artifact. */
import { causalGraphOf, topologicalOrder } from "@red-cup-engineering/semiotic-eavt-services-section/journal/causal-graph";

import { journal } from "./journal.mjs";

/** Read one causally ordered durable section. */
export function readJournalSection(log) {
  const events = journal.read(log);
  const graph = causalGraphOf(events);
  return Object.freeze({
    kind: "metroplat.journal.section",
    events: topologicalOrder(graph),
    frontier: Object.freeze([...graph.heads].sort()),
    externalCauses: Object.freeze([...graph.externalCauses].sort()),
    graph,
  });
}

function causalPast(section, frontier) {
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const parent of section.graph.parents.get(id) ?? []) visit(parent);
  };
  for (const id of frontier) visit(id);
  return seen;
}

function pollInterval(value) {
  if (value === undefined) return 50;
  if (!Number.isFinite(value) || value < 10) throw new RangeError("journal follow pollIntervalMs must be at least 10ms");
  return Math.trunc(value);
}

function aborted(signal) {
  return signal?.aborted ?? false;
}

async function waitForDurableChange(milliseconds, signal) {
  if (aborted(signal)) return false;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(true), milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Follow durable history after a causal cursor.
 *
 * Polling is intentionally only a wake mechanism: every yielded event is read
 * back from content-addressed journal storage. A later notification accelerator
 * may shorten the wait but cannot become the source of truth.
 */
export async function* followJournalSection(
  log,
  options = {},
) {
  const interval = pollInterval(options.pollIntervalMs);
  const first = readJournalSection(log);
  const seen = new Set(causalPast(first, options.after ?? []));
  for (;;) {
    if (aborted(options.signal)) return;
    const section = readJournalSection(log);
    for (const event of section.events) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      yield event;
      if (aborted(options.signal)) return;
    }
    if (!await waitForDurableChange(interval, options.signal)) return;
  }
}

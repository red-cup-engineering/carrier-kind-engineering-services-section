/** Durable causal section reads and follows over one journal artifact. */
import { dataArtifactHandlePath, type DataArtifactHandle } from "../lib/addressing/index.mts";
import { causalGraphOf, topologicalOrder, type CausalGraph } from "./causal-graph.mts";
import type { JournalWitness } from "./event.mts";
import { readEvents } from "./filesystem/events.mts";

export interface JournalSection {
  readonly kind: "metroplat.journal.section";
  readonly events: readonly JournalWitness[];
  readonly frontier: readonly string[];
  readonly externalCauses: readonly string[];
  readonly graph: CausalGraph;
}

export interface JournalFollowOptions {
  /** Causal frontier already observed by this reader. */
  readonly after?: readonly string[];
  readonly signal?: AbortSignal;
  readonly pollIntervalMs?: number;
}

/** Read one causally ordered durable section. */
export function readJournalSection(log: DataArtifactHandle): JournalSection {
  const events = readEvents(dataArtifactHandlePath(log, "log"));
  const graph = causalGraphOf(events);
  return Object.freeze({
    kind: "metroplat.journal.section" as const,
    events: topologicalOrder(graph),
    frontier: Object.freeze([...graph.heads].sort()),
    externalCauses: Object.freeze([...graph.externalCauses].sort()),
    graph,
  });
}

function causalPast(section: JournalSection, frontier: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const visit = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const parent of section.graph.parents.get(id) ?? []) visit(parent);
  };
  for (const id of frontier) visit(id);
  return seen;
}

function pollInterval(value: number | undefined): number {
  if (value === undefined) return 50;
  if (!Number.isFinite(value) || value < 10) throw new RangeError("journal follow pollIntervalMs must be at least 10ms");
  return Math.trunc(value);
}

function aborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted ?? false;
}

async function waitForDurableChange(milliseconds: number, signal: AbortSignal | undefined): Promise<boolean> {
  if (aborted(signal)) return false;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(value);
    };
    const onAbort = (): void => finish(false);
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
  log: DataArtifactHandle,
  options: JournalFollowOptions = {},
): AsyncGenerator<JournalWitness> {
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


/**
 * integrations/web/core/microsub/timeline — a Microsub timeline page over
 * admitted entries.
 *
 * Sorts admitted entries newest-first (by `updated`/`published`, `uid`
 * tiebreak), then reuses `projections/pagination`'s `paginateCursor` — the
 * one shared cursor-pagination law, since a timeline must stay stable as
 * new entries arrive, unlike an offset page. No pagination law of its own.
 */
import { normalizeEntry, type MicrosubEntry } from "./codec.mts";
import { paginateCursor } from "../../http/pagination.mts";

export interface MicrosubTimeline {
  readonly items: readonly MicrosubEntry[];
  readonly paging?: Readonly<{ before?: string; after?: string }>;
}

export interface MicrosubTimelineOptions {
  readonly base?: string;
  readonly path?: string;
  readonly before?: string;
  readonly after?: string;
  readonly limit?: number;
}

function rank(entry: MicrosubEntry): string {
  return entry.updated ?? entry.published ?? "";
}

/** Sort admitted entries newest-first, then bound them into one Microsub timeline page. */
export function microsubTimeline(entries: readonly MicrosubEntry[], opts: MicrosubTimelineOptions = {}): MicrosubTimeline {
  const normalized = entries.map(normalizeEntry);
  const sorted = [...normalized].sort((left, right) => {
    const leftRank = rank(left);
    const rightRank = rank(right);
    return leftRank === rightRank ? left.uid.localeCompare(right.uid) : rightRank.localeCompare(leftRank);
  });
  const page = paginateCursor(sorted, (entry) => entry.uid, {
    base: opts.base ?? "http://localhost/",
    path: opts.path ?? "/microsub",
    limit: opts.limit ?? 20,
    ...(opts.before === undefined ? {} : { before: opts.before }),
    ...(opts.after === undefined ? {} : { after: opts.after }),
  });
  const paging: { before?: string; after?: string } = {};
  if (page.links.next !== undefined) paging.after = page.items.at(-1)!.uid;
  if (opts.after !== undefined) paging.before = opts.after;
  return Object.freeze({
    items: page.items,
    ...(Object.keys(paging).length > 0 ? { paging: Object.freeze(paging) } : {}),
  });
}

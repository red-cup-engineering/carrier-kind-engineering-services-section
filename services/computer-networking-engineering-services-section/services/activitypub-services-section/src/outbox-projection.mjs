/**
 * outbox-projection -- publish what this actor currently affirms.
 *
 * The mirror of `./inbound`: given a subject's settled four-valued algebra (`{ affirmed, denied,
 * contradicted }`, as {@link settleObservations} produces), rebuild its object and wrap it in a
 * `Create` (ActivityPub 5.1: the outbox is an OrderedCollection of the actor's activities). A subject
 * whose cells settled to `contradicted` is annotated `_contested` with each side's witnesses -- the
 * disagreement is published as disagreement, not resolved by whichever claim arrived last.
 */
import { activity as buildActivity, article as buildArticle, note as buildNote, orderedCollection, PUBLIC } from "./as2.mjs";

/** Gather a subject's affirmed cells into one object literal (repeated predicates become arrays). */
export function cellsToObject(subject, affirmed) {
  const fields = {};
  for (const cell of affirmed) {
    if (cell.predicate === "type") continue;
    fields[cell.predicate] = cell.predicate in fields ? [].concat(fields[cell.predicate], [cell.object]) : cell.object;
  }
  const typed = affirmed.find((cell) => cell.predicate === "type");
  return { id: subject, type: typed?.object ?? "Note", ...fields };
}

/** The typed AS2 object for a settled subject (Note, Article, or the reassembled literal). */
export function objectFor(subject, algebra, { attributedTo } = {}) {
  const raw = cellsToObject(subject, algebra?.affirmed ?? []);
  const common = { id: subject, attributedTo };
  if (raw.type === "Article") return buildArticle({ ...common, name: raw.name, content: raw.content, summary: raw.summary, url: raw.url, published: raw.published, updated: raw.updated, tag: raw.tag });
  if (raw.type === "Note") return buildNote({ ...common, content: raw.content, summary: raw.summary, inReplyTo: raw.inReplyTo, published: raw.published, tag: raw.tag });
  const { id, type, ...rest } = raw;
  return { type, id, attributedTo, ...rest };
}

/** One outbox item: the subject's object in a `Create`, `_contested` when any cell settled contradicted. */
export function activityFor(subject, algebra, { actor, mintActivityId = (s) => `${s}#create` } = {}) {
  if (typeof actor !== "string") throw new TypeError("activityFor requires the publishing actor");
  const object = objectFor(subject, algebra, { attributedTo: actor });
  const create = buildActivity("Create", { id: mintActivityId(subject), actor, object, published: object.published, to: [PUBLIC] });
  const contradicted = algebra?.contradicted ?? [];
  return contradicted.length === 0 ? create : { ...create, _contested: true, _contradictions: contradicted.map(({ predicate, object: value, affirmedBy, deniedBy }) => ({ predicate, object: value, affirmedBy, deniedBy })) };
}

/**
 * The actor's whole outbox as an `OrderedCollection`, newest first (Core 5.2). `settle(subject)`
 * returns the subject's algebra; `stamp(algebra)` (default `algebra.t`) orders it.
 */
export function outboxCollection({ id, actor, subjects, settle, mintActivityId, stamp = (algebra) => algebra?.t }) {
  const items = subjects.map((subject) => {
    const algebra = settle(subject);
    return { at: String(stamp(algebra) ?? ""), item: activityFor(subject, algebra, { actor, mintActivityId }) };
  });
  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return orderedCollection({ id, orderedItems: items.map((entry) => entry.item), totalItems: items.length });
}

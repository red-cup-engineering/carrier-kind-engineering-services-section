/**
 * microblog -- a short note as a federated object.
 *
 * A note arrives as a settled finite algebra (`{ subject, affirmed: [{ predicate, object }] }`); only
 * its *affirmed* cells describe it, so a denied or contradicted claim is never published as positive
 * metadata. {@link normalizeNote} derives the canonical Note; {@link noteObject}, {@link createActivity},
 * {@link updateActivity} and {@link deleteActivity} turn it into the ActivityStreams documents a
 * microblog publishes (ActivityPub 6.2 Create, 6.3 Update, 6.4 Delete with a Tombstone). The note
 * body is supplied by the caller (the site's own projection), so the federated `content` is byte-for-byte
 * what an HTML reader sees.
 */
import { activity, note as buildNote, PUBLIC, tombstone } from "./as2.mjs";

/** Predicate -> Note field. Names mirror the AS2 Note vocabulary and the microformats2 `h-entry` properties. */
export const NOTE_PREDICATE_MAP = Object.freeze({
  content: { field: "content" },
  body: { field: "content" },
  summary: { field: "summary" },
  name: { field: "name" },
  title: { field: "name" },
  published: { field: "published" },
  date: { field: "published" },
  updated: { field: "updated" },
  author: { field: "author" },
  "in-reply-to": { field: "inReplyTo" },
  inReplyTo: { field: "inReplyTo" },
  tag: { field: "tags", repeatable: true },
  category: { field: "tags", repeatable: true },
  syndication: { field: "syndication", repeatable: true },
  "u-syndication": { field: "syndication", repeatable: true },
});

export const isNotePredicate = (predicate) => Object.hasOwn(NOTE_PREDICATE_MAP, predicate);

/** Fold affirmed cells into note fields: repeatable fields accumulate (deduplicated), the rest take the last. */
export function fieldsFromCells(cells) {
  const fields = {};
  for (const { predicate, object } of cells ?? []) {
    const declaration = NOTE_PREDICATE_MAP[predicate];
    if (declaration === undefined || object === null || object === undefined || object === "") continue;
    if (declaration.repeatable) {
      const list = (fields[declaration.field] ??= []);
      if (!list.includes(object)) list.push(object);
    } else fields[declaration.field] = object;
  }
  return fields;
}

/** A URL path segment from text: lower-case ASCII word runs joined by `-`. */
export const slugify = (value) => String(value ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Join a base URL and a path with one slash at the seam. */
export function joinUrl(base, path) {
  const b = String(base ?? "").replace(/\/+$/, "");
  const p = String(path ?? "").replace(/^\/+/, "");
  return p === "" ? b : `${b}/${p}`;
}

/** The canonical Note of `{ algebra, slug?, path?, id?, url?, author? }`; `id` is the AS2 identity, `url` the HTML permalink. */
export function normalizeNote(input, { baseUrl = "", notePath = "" } = {}) {
  if (input === null || typeof input !== "object") throw new TypeError("normalizeNote: input must be an object");
  const algebra = input.algebra;
  if (algebra === null || typeof algebra !== "object") throw new TypeError("normalizeNote: input.algebra is required");
  const fields = fieldsFromCells(Array.isArray(algebra.affirmed) ? algebra.affirmed : []);
  const subject = algebra.subject === undefined || algebra.subject === null ? "" : String(algebra.subject);
  const slug = input.slug ? slugify(input.slug) : slugify(subject);
  const path = input.path ?? joinUrl(notePath, slug);
  const id = input.id ?? (/^[a-z][a-z0-9+.-]*:\/\//i.test(subject) ? subject : joinUrl(baseUrl, path));
  return Object.freeze({
    subject, slug, id, url: input.url ?? id,
    content: typeof fields.content === "string" ? fields.content : "",
    summary: typeof fields.summary === "string" ? fields.summary : undefined,
    name: typeof fields.name === "string" ? fields.name : undefined,
    published: fields.published === undefined ? undefined : String(fields.published),
    updated: fields.updated === undefined ? undefined : String(fields.updated),
    author: input.author ?? fields.author,
    inReplyTo: fields.inReplyTo === undefined ? undefined : String(fields.inReplyTo),
    tags: [...(fields.tags ?? [])],
    syndication: [...(fields.syndication ?? [])],
    algebra, fields,
  });
}

/** Newest first by `published` (RFC 3339 instants compare lexically), undated last, then by subject: a total order (Core 5.2). */
export function reverseChronological(notes) {
  return [...(notes ?? [])].sort((a, b) => {
    const ap = a.published ?? "";
    const bp = b.published ?? "";
    if (ap && bp && ap !== bp) return ap < bp ? 1 : -1;
    if (ap !== bp) return ap ? -1 : 1;
    return a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0;
  });
}

const hashtag = (tag) => ({ type: "Hashtag", name: `#${String(tag).replace(/^#+/, "")}` });

/** The AS2 Note of a canonical note. `bodyHtml` is the published body; tags become `Hashtag` objects. */
export function noteObject(canonical, bodyHtml, { attributedTo, followers } = {}) {
  return buildNote({
    id: canonical.id,
    url: canonical.url !== canonical.id ? canonical.url : undefined,
    content: bodyHtml ?? canonical.content,
    attributedTo,
    summary: canonical.summary,
    inReplyTo: canonical.inReplyTo,
    published: canonical.published,
    updated: canonical.updated,
    cc: followers === undefined ? undefined : [followers],
    tag: canonical.tags.length > 0 ? canonical.tags.map(hashtag) : undefined,
  });
}

function requireActor(options) {
  if (typeof options?.actor !== "string") throw new TypeError("the publishing actor IRI is required");
  return options.actor;
}

/** `Create{Note}`, public with the actor's followers on `cc` so it reaches their home timelines. */
export function createActivity(canonical, bodyHtml, options = {}) {
  const actor = requireActor(options);
  const { mintActivityId = (id) => `${id}#create`, followers } = options;
  return activity("Create", {
    id: mintActivityId(canonical.id), actor,
    object: noteObject(canonical, bodyHtml, { attributedTo: actor, followers }),
    published: canonical.published,
    to: [PUBLIC], cc: followers === undefined ? undefined : [followers],
  });
}

/** `Update{Note}`: the note as edited, stamped with `updated` (required: an Update without a new instant is not an edit). */
export function updateActivity(canonical, bodyHtml, options = {}) {
  const actor = requireActor(options);
  const updated = options.updated ?? canonical.updated;
  if (typeof updated !== "string") throw new TypeError("an Update requires the instant of the edit");
  const { mintActivityId = (id) => `${id}#update-${updated}`, followers } = options;
  return activity("Update", {
    id: mintActivityId(canonical.id), actor,
    object: noteObject({ ...canonical, updated }, bodyHtml, { attributedTo: actor, followers }),
    published: updated,
    to: [PUBLIC], cc: followers === undefined ? undefined : [followers],
  });
}

/** `Delete{Tombstone}` of a note (ActivityPub 6.4), so peers answer the note's IRI with 410 Gone. */
export function deleteActivity(canonical, options = {}) {
  const actor = requireActor(options);
  const deleted = options.deleted ?? new Date().toISOString();
  const { mintActivityId = (id) => `${id}#delete`, followers } = options;
  return activity("Delete", {
    id: mintActivityId(canonical.id), actor,
    object: tombstone(canonical.id, { formerType: "Note", published: canonical.published, deleted }),
    published: deleted,
    to: [PUBLIC], cc: followers === undefined ? undefined : [followers],
  });
}

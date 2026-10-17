/**
 * as2 -- dependency-free ActivityStreams 2.0 object builders (W3C Recommendation, Core and
 * Vocabulary) for the actors, objects, activities and collections an ActivityPub node authors.
 *
 * Fedify owns wire parsing, signing and delivery; this module owns the plain JSON-LD documents the
 * node authors before it hands them to Fedify (`Activity.fromJsonLd`) or serves them itself. Every
 * builder emits the normative `@context` and `type`, prunes absent fields, and refuses documents the
 * standards forbid (an actor without `inbox`/`outbox` -- ActivityPub 4.1; an activity of an unknown
 * type; a non-IRI id).
 */
import { ACTIVITYSTREAMS_CONTEXT, ACTIVITYSTREAMS_PUBLIC } from "./activitystreams.mjs";

export const AS2_CONTEXT = ACTIVITYSTREAMS_CONTEXT;
/** The security vocabulary context that resolves `publicKey` on an actor. */
export const SECURITY_CONTEXT = "https://w3id.org/security/v1";
/** The Public addressing collection (ActivityPub 5.6): a magic IRI, never delivered to. */
export const PUBLIC = ACTIVITYSTREAMS_PUBLIC;

/** Every Activity subtype of the ActivityStreams 2.0 Vocabulary (section 3.1). */
export const ACTIVITY_TYPES = Object.freeze([
  "Accept", "Add", "Announce", "Arrive", "Block", "Create", "Delete", "Dislike", "Flag", "Follow",
  "Ignore", "Invite", "Join", "Leave", "Like", "Listen", "Move", "Offer", "Question", "Read",
  "Reject", "Remove", "TentativeAccept", "TentativeReject", "Travel", "Undo", "Update", "View",
]);

/** The ActivityStreams 2.0 actor types (Vocabulary section 3.2). */
export const ACTOR_TYPES = Object.freeze(["Application", "Group", "Organization", "Person", "Service"]);

/**
 * Activities whose natural audience is the public stream. Everything else (Follow, Accept, Reject,
 * Block, Undo, ...) is addressed explicitly by its author: a Block in particular is never delivered
 * (ActivityPub, Block Activity: servers SHOULD NOT deliver a Block to its object).
 */
const PUBLIC_BY_DEFAULT = new Set(["Create", "Update", "Delete", "Announce", "Like"]);

function pruned(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) if (value !== null && value !== undefined) out[key] = value;
  return out;
}

function iri(value, label) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new TypeError(`${label} must be an IRI string`);
  try { new URL(value); } catch { throw new TypeError(`${label} must be an absolute IRI`); }
  return value;
}

function audience(value) {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? [...value] : [value];
}

function content(fields) {
  return {
    content: fields.content,
    ...(fields.content === undefined ? {} : { mediaType: fields.mediaType ?? "text/html" }),
  };
}

/** An AS2 `Note` (Vocabulary: Note) -- the short status object. */
export function note(fields = {}) {
  return pruned({
    "@context": AS2_CONTEXT,
    type: "Note",
    id: iri(fields.id, "Note id"),
    attributedTo: fields.attributedTo,
    ...content(fields),
    summary: fields.summary,
    inReplyTo: fields.inReplyTo,
    published: fields.published,
    updated: fields.updated,
    url: fields.url,
    to: audience(fields.to ?? [PUBLIC]),
    cc: audience(fields.cc),
    tag: fields.tag,
    attachment: fields.attachment,
  });
}

/** An AS2 `Article` (Vocabulary: Article) -- the long-form post. */
export function article(fields = {}) {
  return pruned({
    "@context": AS2_CONTEXT,
    type: "Article",
    id: iri(fields.id, "Article id"),
    name: fields.name,
    summary: fields.summary,
    attributedTo: fields.attributedTo,
    ...content(fields),
    url: fields.url,
    published: fields.published,
    updated: fields.updated,
    to: audience(fields.to ?? [PUBLIC]),
    cc: audience(fields.cc),
    tag: fields.tag,
  });
}

/**
 * An AS2 actor. ActivityPub 4.1 requires `inbox` and `outbox`; 4.1 recommends `following`,
 * `followers` and `liked`; `preferredUsername` is the WebFinger-visible handle (3.1). A
 * `publicKeyPem` adds the `publicKey` block and its security context.
 */
export function actor(fields = {}) {
  const type = fields.type ?? "Person";
  if (!ACTOR_TYPES.includes(type)) throw new TypeError(`unknown actor type: ${JSON.stringify(type)}`);
  const id = iri(fields.id, "actor id");
  if (id === undefined) throw new TypeError("actor id is required");
  for (const required of ["inbox", "outbox"]) if (typeof fields[required] !== "string") throw new TypeError(`actor ${required} is required (ActivityPub 4.1)`);
  const hasKey = typeof fields.publicKeyPem === "string" && fields.publicKeyPem.length > 0;
  return pruned({
    "@context": hasKey ? [AS2_CONTEXT, SECURITY_CONTEXT] : AS2_CONTEXT,
    type,
    id,
    preferredUsername: fields.preferredUsername,
    name: fields.name,
    summary: fields.summary,
    url: fields.url,
    inbox: iri(fields.inbox, "actor inbox"),
    outbox: iri(fields.outbox, "actor outbox"),
    followers: fields.followers,
    following: fields.following,
    liked: fields.liked,
    endpoints: fields.sharedInbox === undefined ? fields.endpoints : { ...(fields.endpoints ?? {}), sharedInbox: fields.sharedInbox },
    icon: fields.icon,
    publicKey: hasKey ? { id: fields.publicKeyId ?? `${id}#main-key`, owner: id, publicKeyPem: fields.publicKeyPem } : undefined,
  });
}

/** An AS2 `Person` actor. */
export const person = (fields = {}) => actor({ ...fields, type: "Person" });

/**
 * An activity envelope. `actor` and `object` are required for every type (a Question may omit the
 * object); a Block defaults to no audience and is refused if addressed to Public.
 */
export function activity(type, fields = {}) {
  if (!ACTIVITY_TYPES.includes(type)) throw new TypeError(`unknown activity type: ${JSON.stringify(type)} (expected one of ${ACTIVITY_TYPES.join(", ")})`);
  if (typeof fields.actor !== "string" && (fields.actor === null || typeof fields.actor !== "object")) throw new TypeError(`${type} actor is required`);
  if (fields.object === undefined && type !== "Question") throw new TypeError(`${type} object is required`);
  const to = audience(fields.to ?? (PUBLIC_BY_DEFAULT.has(type) ? [PUBLIC] : undefined));
  if (type === "Block" && [...(to ?? []), ...(audience(fields.cc) ?? [])].includes(PUBLIC)) throw new TypeError("a Block is never addressed to Public");
  return pruned({
    "@context": AS2_CONTEXT,
    type,
    id: iri(fields.id, `${type} id`),
    actor: fields.actor,
    object: fields.object,
    target: fields.target,
    origin: fields.origin,
    result: fields.result,
    summary: fields.summary,
    published: fields.published,
    to,
    cc: audience(fields.cc),
    bto: audience(fields.bto),
    bcc: audience(fields.bcc),
  });
}

/** A `Tombstone` (Vocabulary: Tombstone) left where a deleted object was; ActivityPub 6.4 and 7 answer it with 410. */
export function tombstone(id, extra = {}) {
  return pruned({
    "@context": AS2_CONTEXT,
    type: "Tombstone",
    id: iri(id, "Tombstone id"),
    formerType: extra.formerType,
    published: extra.published,
    updated: extra.updated,
    deleted: extra.deleted,
  });
}

/** An `OrderedCollection` (Core 5.2): either inline `orderedItems`, or a `first` page link. */
export function orderedCollection(fields = {}) {
  const items = fields.orderedItems;
  return pruned({
    "@context": AS2_CONTEXT,
    type: "OrderedCollection",
    id: fields.id,
    totalItems: fields.totalItems ?? (Array.isArray(items) ? items.length : undefined),
    first: fields.first,
    last: fields.last,
    orderedItems: items,
  });
}

/** An `OrderedCollectionPage` (Core 5.4) of an ordered collection. */
export function orderedCollectionPage(fields = {}) {
  if (typeof fields.partOf !== "string") throw new TypeError("an OrderedCollectionPage names the collection it is partOf");
  if (!Array.isArray(fields.orderedItems)) throw new TypeError("an OrderedCollectionPage carries orderedItems");
  return pruned({
    "@context": AS2_CONTEXT,
    type: "OrderedCollectionPage",
    id: fields.id,
    partOf: fields.partOf,
    next: fields.next,
    prev: fields.prev,
    totalItems: fields.totalItems,
    orderedItems: fields.orderedItems,
  });
}

/**
 * Whether `value` is an ActivityStreams 2.0 document: an object with a string `type` whose
 * `@context` (when present) names the AS2 context, alone or in an array.
 */
export function isAS2(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const type = value.type;
  if (!(typeof type === "string" ? type.length > 0 : Array.isArray(type) && type.length > 0 && type.every((t) => typeof t === "string"))) return false;
  const context = value["@context"];
  if (context === undefined) return true;
  const names = (c) => c === AS2_CONTEXT;
  return names(context) || (Array.isArray(context) && context.some(names));
}

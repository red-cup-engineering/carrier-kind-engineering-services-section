import { Activity } from "@fedify/vocab";
import { createActivityPubProvider } from "./provider.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "./activitystreams.mjs";


function text(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function httpUrl(value, label) {
  const url = new URL(text(value, label));
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new TypeError(`${label} must be an HTTP(S) URL`);
  return url;
}

function optionalText(value, label) {
  if (value === undefined) return undefined;
  return text(value, label);
}

function publicationTags(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new TypeError("ActivityPub publication tags must be an array of strings");
  const tags = value.map((tag) => {
    const name = text(tag, "ActivityPub publication tag").replace(/^#+/u, "");
    return Object.freeze({ type: "Hashtag", name: `#${name}` });
  });
  return tags.length === 0 ? undefined : Object.freeze(tags);
}

/** Project one explicit published document into a public Create{Article}. */
export function projectPublicationActivity(publication, { origin, identifier }) {
  if (publication === null || typeof publication !== "object" || Array.isArray(publication)) {
    throw new TypeError("ActivityPub publication must be an object");
  }
  const canonicalOrigin = httpUrl(origin, "ActivityPub publication origin");
  const actor = new URL(`/actors/${encodeURIComponent(text(identifier, "ActivityPub actor identifier"))}`, canonicalOrigin).href;
  const url = httpUrl(publication.url, "ActivityPub publication URL");
  if (url.origin !== canonicalOrigin.origin) throw new TypeError("ActivityPub publication URL must share the configured origin");
  if (url.hash !== "") throw new TypeError("ActivityPub publication URL must not contain a fragment");
  const title = text(publication.title, "ActivityPub publication title");
  const content = text(publication.content, "ActivityPub publication content");
  const explicitActivityId = publication.activityId === undefined ? undefined : httpUrl(publication.activityId, "ActivityPub publication activityId");
  if (explicitActivityId !== undefined && explicitActivityId.origin !== canonicalOrigin.origin) {
    throw new TypeError("ActivityPub publication activityId must share the configured origin");
  }
  const activityId = explicitActivityId?.href ?? `${url.href}#activitypub-create`;
  const published = optionalText(publication.published, "ActivityPub publication published time");
  const updated = optionalText(publication.updated, "ActivityPub publication updated time");
  const summary = optionalText(publication.summary, "ActivityPub publication summary");
  const tags = publicationTags(publication.tags);
  return Object.freeze({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: activityId,
    type: "Create",
    actor,
    to: ACTIVITYSTREAMS_PUBLIC,
    ...(published === undefined ? {} : { published }),
    object: Object.freeze({
      id: url.href, type: "Article", attributedTo: actor, name: title, content, url: url.href,
      ...(summary === undefined ? {} : { summary }),
      ...(published === undefined ? {} : { published }),
      ...(updated === undefined ? {} : { updated }),
      ...(tags === undefined ? {} : { tag: tags }),
    }),
  });
}

/** Make the minimal outbox contract required by a site generator. */
export function createPublicationOutbox({ origin, identifier, listPublications }) {
  if (typeof listPublications !== "function") throw new TypeError("ActivityPub listPublications must be a function");
  return Object.freeze({
    async listOutbox({ cursor } = {}) {
      if (cursor !== undefined && cursor !== null) return Object.freeze({ items: Object.freeze([]) });
      const publications = await listPublications();
      if (!Array.isArray(publications)) throw new TypeError("ActivityPub listPublications must return an array");
      const items = await Promise.all(publications.map(async (publication) => Activity.fromJsonLd(projectPublicationActivity(publication, { origin, identifier }))));
      return Object.freeze({ items: Object.freeze(items) });
    },
  });
}

/**
 * A compose-ready profile for a published site. It exposes discovery, actor,
 * and outbox routing through the regular provider. Inbound delivery is opt-in:
 * without `inbox`, POSTs are refused instead of accepted and discarded.
 */
export function createPublicationActivityPubProvider(options) {
  if (options === null || typeof options !== "object") throw new TypeError("ActivityPub publication provider options are required");
  const { listPublications, inbox, appendToOutbox, ...providerOptions } = options;
  if (appendToOutbox !== undefined) {
    throw new TypeError("ActivityPub publication profile does not support appendToOutbox; its generator owns the publication list");
  }
  const outbox = createPublicationOutbox({ origin: providerOptions.origin, identifier: providerOptions.identifier, listPublications });
  if (inbox !== undefined && (inbox === null || typeof inbox !== "object" || typeof inbox.onActivity !== "function")) {
    throw new TypeError("ActivityPub publication inbox must expose onActivity");
  }
  const provider = createActivityPubProvider({
    ...providerOptions, listOutbox: outbox.listOutbox,
    onActivity: inbox?.onActivity ?? (async () => {}),
    authorizeInbox: inbox?.authorizeInbox ?? (async () => false),
    ...(inbox?.inboxIndex === undefined ? {} : { inboxIndex: inbox.inboxIndex }),
    ...(inbox?.followers === undefined ? {} : { followers: inbox.followers }),
  });
  const inboxPaths = new Set([`/actors/${provider.identifier}/inbox`, "/inbox"]);
  async function fetch(request) {
    if (inbox === undefined && request.method === "POST" && inboxPaths.has(new URL(request.url).pathname)) {
      return new Response(null, { status: 405, headers: { allow: "GET", "cache-control": "no-store" } });
    }
    return provider.fetch(request);
  }
  return Object.freeze({ ...provider, fetch, outbox });
}

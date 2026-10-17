import { createFederation, importJwk, MemoryKvStore } from "@fedify/fedify";
import { Accept, Activity, Announce, Create, Delete, Endpoints, Follow, Like, Note, Person, PropertyValue, Reject, Service, Undo, Update, isActor } from "@fedify/vocab";

/** The activities an actor may publish to its own outbox (ActivityPub 6: Create, Update, Delete, Like, Announce, Undo). */
const PUBLISHABLE_ACTIVITIES = Object.freeze([Create, Update, Delete, Announce, Like, Undo]);
import { ACTIVITYSTREAMS_CONTEXT } from "./activitystreams.mjs";

export const ACTIVITYPUB_MEDIA_TYPE = "application/activity+json";

/**
 * Deliver one already-authored activity to every one of an actor's recorded
 * followers through Fedify's own fanout primitive (`Context.sendActivity`),
 * rather than hand-rolling per-inbox HTTP delivery.
 *
 * This deliberately does NOT use Fedify's `"followers"` magic-string
 * recipient (`context.sendActivity(sender, "followers", activity)`): that
 * mode resolves recipients by calling this SAME actor's followers
 * *collection* dispatcher (`setFollowersDispatcher` below) and requires each
 * returned item to satisfy Fedify's `Recipient` interface (`id`, `inboxId`,
 * `endpoints`). Our followers dispatcher deliberately returns bare `URL`s
 * instead — the correct, standards-conformant public representation (a
 * remote server's `GET .../followers` should see a plain list of actor IDs,
 * not our locally-fabricated guesses at each follower's `type`/`inbox`
 * shape stuffed into an embedded object) — and AS2's own `Collection.items`
 * setter enforces `Object | Link | URL` items, which a plain `{id, inboxId,
 * endpoints}` record fails. A bare `URL` satisfies collection rendering but
 * not the `Recipient` contract `getFollowers()` needs, so the magic-string
 * mode silently resolves to zero inboxes here.
 *
 * Fedify's `sendActivity` has a second, explicit-recipients form for
 * exactly this case: `sendActivity(sender, recipients: Recipient[],
 * activity, options)`. We build that `Recipient[]` ourselves, straight from
 * the SAME `followers.list()` adapter the collection dispatcher itself
 * reads — the Accept-era followers recorded there are the recipient set —
 * and hand it to Fedify. This is still Fedify's own signing, per-inbox
 * queueing, and retry machinery end to end (the identical code path the
 * magic-string mode would have used once it had resolved recipients); the
 * only difference is where the recipient list came from.
 *
 * `createActivityPubProvider`'s own `publish()` below is the single place
 * that calls this — the live `POST /actors/{identifier}/outbox` route and
 * any direct in-process caller both go through `publish()`, so there is
 * exactly one broadcast code path regardless of which caller triggered it.
 *
 * Fedify itself supplies the per-recipient isolation and retry semantics
 * this requires: when a durable queue is configured (as every local-server
 * and cloud-server deployment in this package does), each follower's inbox
 * becomes its own queued outbox job with its own backoff/retry schedule —
 * one dead follower's inbox failing and retrying does not block or delay
 * delivery to any other follower. `orderingKey` is set to the activity's own
 * id so that, per Fedify's contract, activities for the same object are
 * still delivered in order to any one recipient even though recipients are
 * otherwise delivered to in parallel.
 */
async function sendActivityToFollowers({ federation, origin, identifier, activity, followers, options }) {
  const recipients = [];
  let cursor;
  do {
    const page = await followers.list(Object.freeze({ identifier, cursor, limit: 100 }));
    for (const entry of page.items) {
      recipients.push(Object.freeze({
        id: new URL(entry.actorId),
        inboxId: new URL(entry.inboxId),
        endpoints: entry.sharedInboxId ? Object.freeze({ sharedInbox: new URL(entry.sharedInboxId) }) : null,
      }));
    }
    cursor = page.nextCursor;
  } while (cursor !== undefined);
  if (recipients.length === 0) return;
  const context = federation.createContext(new URL(origin), undefined);
  await context.sendActivity(
    { identifier },
    recipients,
    activity,
    { orderingKey: activity.id?.href ?? undefined, ...options },
  );
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredFunction(value, label) {
  if (typeof value !== "function") throw new TypeError(`${label} must be a function`);
  return value;
}

function identityAttachments(cell, controller) {
  if (cell === undefined && controller === undefined) return [];
  if (typeof cell !== "string" || !/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(cell)) {
    throw new TypeError("ActivityPub cell identity must be one canonical SHA-256 ni URI");
  }
  if (typeof controller !== "string" || !/^did:pkh:eip155:\d+:0x[0-9a-fA-F]{40}$/u.test(controller)) {
    throw new TypeError("ActivityPub cell controller must be one did:pkh EVM account");
  }
  return [
    new PropertyValue({ name: "Capability Cell", value: cell }),
    new PropertyValue({ name: "Controller", value: controller }),
  ];
}

function actorDescription(value, requestedIdentifier) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const identifier = requiredText(value.identifier ?? requestedIdentifier, "ActivityPub actor identifier");
  if (identifier !== requestedIdentifier) throw new TypeError("ActivityPub actor resolver returned a different identifier");
  const keyPairs = value.keyPairs;
  if (!Array.isArray(keyPairs) || keyPairs.length < 2) {
    throw new TypeError(`ActivityPub actor ${identifier} requires imported RSA and Ed25519 key pairs`);
  }
  return Object.freeze({
    identifier,
    actorName: requiredText(value.actorName ?? value.name, "ActivityPub actor name"),
    summary: requiredText(value.summary, "ActivityPub actor summary"),
    actorType:value.actorType==='Person'?'Person':'Service',
    keyPairs,
    attachments: Array.isArray(value.attachments) ? value.attachments : identityAttachments(value.cell, value.controller),
  });
}

export async function importActorKeyPairs(material) {
  if (!Array.isArray(material) || material.length < 2) {
    throw new TypeError("ActivityPub actor keys must contain RSA and Ed25519 key pairs");
  }
  const pairs = [];
  for (const [index, pair] of material.entries()) {
    if (pair === null || typeof pair !== "object" || pair.privateKey === undefined || pair.publicKey === undefined) {
      throw new TypeError(`ActivityPub actor key pair ${index} must contain publicKey and privateKey JWKs`);
    }
    pairs.push(Object.freeze({
      privateKey: await importJwk(pair.privateKey, "private"),
      publicKey: await importJwk(pair.publicKey, "public"),
    }));
  }
  const algorithms = new Set(pairs.map((pair) => pair.privateKey.algorithm.name));
  if (!algorithms.has("RSASSA-PKCS1-v1_5") || !algorithms.has("Ed25519")) {
    throw new TypeError("ActivityPub actor keys must include RSASSA-PKCS1-v1_5 and Ed25519");
  }
  return Object.freeze(pairs);
}

/**
 * Construct one customer-scoped ActivityPub federation service. Fedify owns
 * protocol parsing, content negotiation, discovery, signatures, proofs,
 * idempotency, and delivery. The customer owns its actor metadata, keys,
 * accepted activity callback, and outbox view.
 */
export function createActivityPubProvider(options) {
  if (options === null || typeof options !== "object") throw new TypeError("ActivityPub provider options are required");
  const singleIdentifier = options.resolveActor === undefined
    ? requiredText(options.identifier, "ActivityPub actor identifier")
    : (options.identifier === undefined ? undefined : requiredText(options.identifier, "ActivityPub actor identifier"));
  const singleActor = options.resolveActor === undefined ? actorDescription({
    identifier: singleIdentifier,
    actorName: options.actorName,
    summary: options.summary,
    keyPairs: options.keyPairs,
    cell: options.cell,
    controller: options.controller,
  }, singleIdentifier) : undefined;
  const resolveActorInput = options.resolveActor ?? (async (requestedIdentifier) => requestedIdentifier === singleIdentifier ? singleActor : null);
  const resolveActor = async (requestedIdentifier) => {
    if (typeof requestedIdentifier !== "string" || requestedIdentifier === "") return null;
    const value = await resolveActorInput(requestedIdentifier);
    return value === null || value === undefined ? null : actorDescription(value, requestedIdentifier);
  };
  const identifiers = Object.freeze([...(options.identifiers ?? (singleIdentifier === undefined ? [] : [singleIdentifier]))]);
  if (identifiers.length === 0 || identifiers.some((value) => typeof value !== "string" || value === "" || value.includes("/")) || new Set(identifiers).size !== identifiers.length) {
    throw new TypeError("ActivityPub provider identifiers must be a nonempty set of distinct identifier segments");
  }
  const identifier = singleIdentifier ?? identifiers[0];
  const onActivity = requiredFunction(options.onActivity, "ActivityPub onActivity");
  const outbox = options.outbox;
  if (outbox !== undefined) for (const method of ["append", "listOutbox", "count", "get"]) requiredFunction(outbox[method], `ActivityPub outbox ${method}`);
  const actorUri = (handle) => new URL(`/actors/${handle}`, options.origin).href;
  const listOutbox = requiredFunction(options.listOutbox ?? (outbox === undefined ? undefined : ({ identifier, cursor, publicOnly }) => outbox.listOutbox({ actorId: actorUri(identifier), cursor, publicOnly })), "ActivityPub listOutbox");
  const authorizeInbox = requiredFunction(options.authorizeInbox, "ActivityPub authorizeInbox");
  const inboxIndex = options.inboxIndex;
  if (inboxIndex !== undefined && (!inboxIndex || typeof inboxIndex.list !== "function")) {
    throw new TypeError("ActivityPub inboxIndex must expose bounded list");
  }
  const followers = options.followers;
  if (followers !== undefined) {
    for (const method of ["add", "remove", "list", "count"]) {
      if (!followers || typeof followers[method] !== "function") {
        throw new TypeError(`ActivityPub followers adapter must expose ${method}`);
      }
    }
  }
  const appendToOutbox = options.appendToOutbox ?? outbox?.append;
  if (appendToOutbox !== undefined && typeof appendToOutbox !== "function") {
    throw new TypeError("ActivityPub appendToOutbox must be a function");
  }
  if (options.manuallyStartQueue !== undefined && typeof options.manuallyStartQueue !== "boolean") {
    throw new TypeError("ActivityPub manuallyStartQueue must be an explicit boolean");
  }
  const federation = createFederation({
    kv: options.kv ?? new MemoryKvStore(),
    ...(options.origin === undefined ? {} : { origin: options.origin }),
    ...(options.queue === undefined ? {} : { queue: options.queue }),
    ...(options.allowPrivateAddress === undefined ? {} : { allowPrivateAddress: options.allowPrivateAddress }),
    ...(options.manuallyStartQueue === undefined ? {} : { manuallyStartQueue: options.manuallyStartQueue }),
  });

  federation
    .setActorDispatcher("/actors/{identifier}", async (ctx, requestedIdentifier) => {
      const actor = await resolveActor(requestedIdentifier);
      if (actor === null) return null;
      const dispatchedKeys = await ctx.getActorKeyPairs(requestedIdentifier);
      return new (actor.actorType==='Person'?Person:Service)({
        id: ctx.getActorUri(requestedIdentifier),
        preferredUsername: requestedIdentifier,
        name: actor.actorName,
        summary: actor.summary,
        attachments: actor.attachments,
        inbox: ctx.getInboxUri(requestedIdentifier),
        outbox: ctx.getOutboxUri(requestedIdentifier),
        ...(followers === undefined ? {} : { followers: ctx.getFollowersUri(requestedIdentifier) }),
        endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
        publicKey: dispatchedKeys[0]?.cryptographicKey,
        assertionMethods: dispatchedKeys.map((pair) => pair.multikey),
      });
    })
    .setKeyPairsDispatcher(async (_contextData, requestedIdentifier) =>
      (await resolveActor(requestedIdentifier))?.keyPairs ?? []);

  if (followers !== undefined) {
    federation
      // ActivityStreams collections list followers by bare actor ID (the
      // convention every independent implementation follows — Mastodon
      // included); items must also be one of Object|Link|URL for Fedify to
      // serialize the collection at all, which a plain {id, inboxId,
      // endpoints} record is not. Delivery still has each follower's real
      // inbox: it is captured at Follow time from the verified actor
      // document and used immediately for the Accept, and retained here in
      // storage for any future outbox broadcast-to-followers feature.
      .setFollowersDispatcher("/actors/{identifier}/followers", async (_ctx, requestedIdentifier, cursor) => {
        if (await resolveActor(requestedIdentifier) === null) return null;
        const result = await followers.list(Object.freeze({ identifier: requestedIdentifier, cursor: cursor ?? undefined, limit: 100 }));
        if (result === null || typeof result !== "object" || !Array.isArray(result.items)) {
          throw new TypeError("ActivityPub followers.list must return { items, nextCursor? }");
        }
        return Object.freeze({
          items: Object.freeze(result.items.map((entry) => new URL(entry.actorId))),
          ...(result.nextCursor === undefined ? {} : { nextCursor: result.nextCursor }),
        });
      })
      .setCounter(async (_ctx, requestedIdentifier) => {
        if (await resolveActor(requestedIdentifier) === null) return null;
        return await followers.count(Object.freeze({ identifier: requestedIdentifier }));
      });
  }

  // Custody retention and the customer callback fire for every verified
  // inbox arrival, regardless of activity type: Fedify's listener registry
  // dispatches exactly one handler per activity (the most specific
  // registered class), so Follow/Undo — handled below for their own
  // protocol-level side effects — must each still route through this same
  // helper to stay inside custody discipline.
  //
  // An admission refusal (the house's TypeError) is a verdict on the activity, not a failure of
  // this node: it is answered to its sender as a Reject naming the refused activity and the reason
  // (the ActivityStreams reply to an activity its recipient will not act on), and the delivery
  // settles, so the sender learns its move was not played instead of retrying it forever. Any
  // other error leaves the delivery failed and retryable. Returns whether the activity was admitted.
  const dispatchActivity = async (ctx, activity) => {
    const senderActor = await activity.getActor(ctx).catch(() => null);
    try {
      await admitActivity(ctx, activity, senderActor);
      return true;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await rejectRefused(ctx, activity, senderActor, error.message);
      return false;
    }
  };
  const rejectRefused = async (ctx, activity, senderActor, reason) => {
    // Accept and Reject are themselves replies; refusing one answers nothing.
    if (activity instanceof Accept || activity instanceof Reject || activity.id === null) return;
    const recipient = ctx.recipient;
    if (typeof recipient !== "string" || await resolveActor(recipient) === null) return;
    if (!isActor(senderActor) || senderActor.id === null || senderActor.inboxId === null) return;
    const actor = ctx.getActorUri(recipient);
    await ctx.sendActivity({ identifier: recipient }, senderActor, new Reject({
      id: new URL(`#rejects/${encodeURIComponent(activity.id.href)}`, actor),
      actor,
      object: activity,
      to: senderActor.id,
      summary: reason.slice(0, 400),
    }));
  };
  const admitActivity = async (ctx, activity, senderActor) => {
    await onActivity(Object.freeze({
      recipient: ctx.recipient,
      activity,
      jsonLd: await activity.toJsonLd({ format: "compact" }),
      ...(isActor(senderActor) && senderActor.id !== null && senderActor.inboxId !== null ? {
        sender: Object.freeze({
          actorId: senderActor.id.href,
          inboxId: senderActor.inboxId.href,
          sharedInboxId: senderActor.endpoints?.sharedInbox?.href ?? null,
        }),
      } : {}),
    }));
  };

  federation
    .setInboxListeners("/actors/{identifier}/inbox", "/inbox")
    .withIdempotency("per-inbox")
    .on(Activity, dispatchActivity)
    .on(Follow, async (ctx, follow) => {
      if (!await dispatchActivity(ctx, follow) || followers === undefined || follow.id === null) return;
      const recipient = ctx.recipient;
      if (typeof recipient !== "string" || await resolveActor(recipient) === null) return;
      const targetUri = ctx.getActorUri(recipient);
      if (follow.objectId === null || follow.objectId.href !== targetUri.href) return;
      const from = await follow.getActor(ctx);
      if (!isActor(from) || from.id === null || from.inboxId === null) return;
      await followers.add(Object.freeze({
        identifier: recipient,
        actorId: from.id.href,
        inboxId: from.inboxId.href,
        sharedInboxId: from.endpoints?.sharedInbox?.href ?? null,
      }));
      const accept = new Accept({
        id: new URL(`#accepts/${encodeURIComponent(follow.id.href)}`, targetUri),
        actor: targetUri,
        object: follow,
        to: from.id,
      });
      await ctx.sendActivity({ identifier: recipient }, from, accept);
    })
    .on(Undo, async (ctx, undo) => {
      if (!await dispatchActivity(ctx, undo) || followers === undefined || undo.actorId === null) return;
      const object = await undo.getObject(ctx);
      if (!(object instanceof Follow)) return;
      const recipient = ctx.recipient;
      if (typeof recipient !== "string" || await resolveActor(recipient) === null) return;
      const targetUri = ctx.getActorUri(recipient);
      const followActorId = object.actorId?.href;
      // Only the follower who issued the original Follow may undo it, and
      // only when it named this actor as its object.
      if (followActorId === undefined || followActorId !== undo.actorId.href) return;
      if (object.objectId === null || object.objectId.href !== targetUri.href) return;
      await followers.remove(Object.freeze({ identifier: recipient, actorId: followActorId }));
    });

  const publicRead = async (ctx, handle) => ctx.request === undefined || await authorizeInbox(Object.freeze({ identifier: handle, request: ctx.request })) !== true;
  const outboxCallbacks = federation.setOutboxDispatcher(
    "/actors/{identifier}/outbox",
    async (ctx, requestedIdentifier, cursor) => {
      if (await resolveActor(requestedIdentifier) === null) return null;
      const result = await listOutbox(Object.freeze({ identifier: requestedIdentifier, cursor, publicOnly: await publicRead(ctx, requestedIdentifier) }));
      if (result === null || typeof result !== "object" || !Array.isArray(result.items)) {
        throw new TypeError("ActivityPub listOutbox must return { items, nextCursor? }");
      }
      return result;
    },
  ).setCounter(async (ctx, requestedIdentifier) => {
    if (await resolveActor(requestedIdentifier) === null) return null;
    if (outbox !== undefined) return outbox.count({ actorId: actorUri(requestedIdentifier), publicOnly: await publicRead(ctx, requestedIdentifier) });
    const result = await listOutbox(Object.freeze({ identifier: requestedIdentifier, cursor: undefined }));
    return result.totalItems ?? (Array.isArray(result?.items) ? result.items.length : 0);
  });
  if (outbox !== undefined) outboxCallbacks.setFirstCursor(async () => String(Number.MAX_SAFE_INTEGER));

  // Retained activities use indexed custody lookup; authored publication lists
  // keep their own projection, without a second persisted outbox.
  federation.setObjectDispatcher(Create, "/actors/{identifier}/posts/{postId}", async (ctx, { identifier: requestedIdentifier, postId }) => {
    if (await resolveActor(requestedIdentifier) === null) return null;
    const objectUri = ctx.getObjectUri(Create, { identifier: requestedIdentifier, postId }).href;
    if (outbox !== undefined) return outbox.get({ activityId: objectUri, actorId: actorUri(requestedIdentifier), publicOnly: await publicRead(ctx, requestedIdentifier) });
    const result = await listOutbox(Object.freeze({ identifier: requestedIdentifier, cursor: undefined }));
    if (result === null || typeof result !== "object" || !Array.isArray(result.items)) {
      throw new TypeError("ActivityPub listOutbox must return { items, nextCursor? }");
    }
    return result.items.find((item) => item?.id?.href === objectUri) ?? null;
  });

  if (outbox !== undefined) federation.setObjectDispatcher(Activity, "/activities/{activityId}", async (ctx, values) => {
    const activity = await outbox.get({ activityId: ctx.getObjectUri(Activity, values).href });
    if (activity === null) return null;
    const candidate=activity.actorId?new URL(activity.actorId.href):null;
    const handle=candidate?.origin===ctx.getActorUri(identifier).origin&&/^\/actors\/[^/]+$/u.test(candidate.pathname)?decodeURIComponent(candidate.pathname.slice(8)):undefined;
    if (handle === undefined || await resolveActor(handle) === null) return null;
    if (await publicRead(ctx, handle) && await outbox.get({ activityId: activity.id.href, publicOnly: true }) === null) return null;
    return activity;
  });

  federation.setNodeInfoDispatcher("/nodeinfo/2.1", () => ({
    software: {
      name: "activitypub-services-section",
      version: { major: 1, minor: 0, patch: 0 },
    },
    protocols: ["activitypub"],
    services: { inbound: [], outbound: [] },
    openRegistrations: false,
    usage: {
      users: { total: identifiers.length, activeHalfyear: identifiers.length, activeMonth: identifiers.length },
      localPosts: options.localPosts ?? 0,
      localComments: options.localComments ?? 0,
    },
    metadata: {
      semanticRepresentation: "typed SEN",
      protocolOwner: "@red-cup-engineering/activitypub-services-section",
    },
  }));

  /**
   * Append `activityInput` (one already-authored Create{Note}, e.g. from
   * poster.mjs's `buildCreateNote`) to the customer's durable outbox and, if
   * a followers adapter is configured, broadcast it to every recorded
   * follower's inbox via `sendActivityToFollowers` above. This is the ONE
   * place both steps happen — the live HTTP publish route below and any
   * direct in-process caller both call through here, so append-then-
   * broadcast can never be done in only one of the two ways.
   */
  async function publish(activityInput, publishOptions = {}) {
    if (appendToOutbox === undefined) {
      throw new TypeError("ActivityPub provider requires appendToOutbox to publish an activity");
    }
    if (activityInput === null || typeof activityInput !== "object" || Array.isArray(activityInput)) {
      throw new TypeError("ActivityPub publish requires one ActivityStreams activity object");
    }
    const publishingIdentifier = publishOptions.identifier ?? identifier;
    if (await resolveActor(publishingIdentifier) === null) throw new TypeError(`unknown ActivityPub actor ${publishingIdentifier}`);
    const originValue = requiredText(options.origin, "ActivityPub provider origin");
    const activity = await Activity.fromJsonLd(activityInput);
    if (!PUBLISHABLE_ACTIVITIES.some((type) => activity instanceof type)) {
      throw new TypeError("ActivityPub publish accepts only Create, Update, Delete, Announce, Like or Undo activities");
    }
    const expectedActor = new URL(`/actors/${publishingIdentifier}`, originValue).href;
    if (activity.actorIds.length !== 1 || activity.actorIds[0]?.href !== expectedActor) {
      throw new TypeError(`ActivityPub publish activity actor must equal the contracted actor ${expectedActor}`);
    }
    const { appended } = await appendToOutbox(activityInput);
    let broadcast = false;
    let broadcastError = null;
    if (appended && followers !== undefined) {
      try {
        await sendActivityToFollowers({ federation, origin: originValue, identifier: publishingIdentifier, activity, followers });
        broadcast = true;
      } catch (error) {
        // The outbox append already durably succeeded -- the important,
        // irreversible part of "publish". A broadcast failure here (e.g.
        // every follower's inbox unreachable right now) must not un-publish
        // the post or fail the publish call itself; it is logged and
        // surfaced in the receipt instead. When a durable queue is
        // configured (every local-server/cloud-server deployment has one),
        // sendActivityToFollowers only enqueues one job per follower inbox
        // here and this branch is essentially unreachable -- it exists for
        // the no-queue / immediate-send configuration, where Fedify sends
        // to every follower inbox concurrently but surfaces the first
        // rejection to its caller.
        broadcastError = error instanceof Error ? error.message : String(error);
        process.stderr.write(`ActivityPub broadcast failed for ${activity.id?.href ?? "(no id)"}: ${broadcastError}\n`);
      }
    }
    return Object.freeze({
      id: activity.id?.href ?? null,
      appended,
      broadcast,
      ...(broadcastError === null ? {} : { broadcastError }),
    });
  }

  async function fetch(request) {
    const url = new URL(request.url);
    const matched = /^\/actors\/([^/]+)\/(inbox|outbox)$/u.exec(url.pathname);
    const requestedIdentifier = matched === null ? undefined : decodeURIComponent(matched[1]);
    const requestedActor = requestedIdentifier === undefined ? null : await resolveActor(requestedIdentifier);
    const actorInboxPath = requestedIdentifier === undefined ? undefined : `/actors/${encodeURIComponent(requestedIdentifier)}/inbox`;
    const actorOutboxPath = requestedIdentifier === undefined ? undefined : `/actors/${encodeURIComponent(requestedIdentifier)}/outbox`;
    if (requestedActor !== null && request.method === "POST" && url.pathname === actorOutboxPath) {
      const canonicalOrigin = new URL(options.origin ?? url.origin);
      if (appendToOutbox === undefined) {
        return new Response(null, { status: 404, headers: { "cache-control": "private, no-store", vary: "Authorization, Accept" } });
      }
      // Reuses the exact same bearer credential and predicate that gates a
      // privileged read of this actor's own inbox: both are
      // actor-operator-only actions (an ordinary remote server only ever
      // GETs the public outbox collection; only the operator's own
      // poster/publisher may add to it), so one auth check serves both.
      const authorized = await authorizeInbox(Object.freeze({ identifier: requestedIdentifier, request }));
      if (authorized !== true) {
        return new Response(JSON.stringify({
          "@context": ACTIVITYSTREAMS_CONTEXT,
          type: "Reject",
          object: { type: "ActivityPubOutboxRefusal", code: "authorization-required" },
        }), {
          status: 401,
          headers: {
            "content-type": ACTIVITYPUB_MEDIA_TYPE,
            "www-authenticate": `Bearer realm="${canonicalOrigin.origin}${actorOutboxPath}"`,
            "cache-control": "private, no-store",
            vary: "Authorization, Accept",
          },
        });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "ActivityPub publish request body must be JSON" }), {
          status: 400,
          headers: { "content-type": "application/json", "cache-control": "private, no-store" },
        });
      }
      try {
        const receipt = await publish(body, { identifier: requestedIdentifier });
        return new Response(JSON.stringify(receipt), {
          status: receipt.appended ? 201 : 200,
          headers: { "content-type": "application/json", "cache-control": "private, no-store" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
          status: 422,
          headers: { "content-type": "application/json", "cache-control": "private, no-store" },
        });
      }
    }
    if (requestedActor !== null && request.method === "GET" && url.pathname === actorInboxPath) {
      const canonicalOrigin = new URL(options.origin ?? url.origin);
      const authorized = await authorizeInbox(Object.freeze({ identifier: requestedIdentifier, request }));
      if (authorized !== true) {
        return new Response(JSON.stringify({
          "@context": ACTIVITYSTREAMS_CONTEXT,
          type: "Reject",
          object: { type: "ActivityPubInboxRefusal", code: "authorization-required" },
        }), {
          status: 401,
          headers: {
            "content-type": ACTIVITYPUB_MEDIA_TYPE,
            "www-authenticate": `Bearer realm="${canonicalOrigin.origin}${actorInboxPath}"`,
            "cache-control": "private, no-store",
            vary: "Authorization, Accept",
          },
        });
      }
      // Custody retains verified arrivals; it is not a history authority.  An
      // inbox collection exists only when the customer explicitly injects a
      // bounded index capable of serving it.
      if (inboxIndex === undefined) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store", vary: "Authorization, Accept" } });
      const page = url.searchParams.get("page") === "true";
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const listed = await inboxIndex.list(Object.freeze({ identifier: requestedIdentifier, cursor, limit: 100 }));
      if (listed === null || typeof listed !== "object" || !Array.isArray(listed.items)
          || !Number.isSafeInteger(listed.totalItems) || listed.totalItems < 0
          || (listed.nextCursor !== undefined && (typeof listed.nextCursor !== "string" || listed.nextCursor === ""))) {
        throw new TypeError("ActivityPub listInbox must return { items, totalItems, nextCursor? }");
      }
      const inbox = new URL(actorInboxPath, canonicalOrigin);
      const first = new URL(inbox);
      first.searchParams.set("page", "true");
      const body = page
        ? {
            "@context": ACTIVITYSTREAMS_CONTEXT,
            id: (() => {
              const id = new URL(inbox);
              id.search = url.search;
              return id.href;
            })(),
            type: "OrderedCollectionPage",
            partOf: inbox.href,
            orderedItems: listed.items,
            ...(listed.nextCursor === undefined ? {} : {
              next: (() => {
                const next = new URL(first);
                next.searchParams.set("cursor", listed.nextCursor);
                return next.href;
              })(),
            }),
          }
        : {
            "@context": ACTIVITYSTREAMS_CONTEXT,
            id: inbox.href,
            type: "OrderedCollection",
            totalItems: listed.totalItems,
            first: first.href,
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "content-type": ACTIVITYPUB_MEDIA_TYPE,
          "cache-control": "private, no-store",
          vary: "Authorization, Accept",
        },
      });
    }
    // GET collection cursors must use the declared public face even behind a
    // reverse proxy. Leave signed inbound requests on their original verification path.
    const readingRequest = request.method === "GET" && options.origin !== undefined
      ? new Request(new URL(url.pathname + url.search, options.origin), request)
      : request;
    const response = await federation.fetch(readingRequest, { contextData: undefined });
    if (outbox !== undefined && request.method === "GET" && /\/outbox$|\/posts\/|^\/activities\//u.test(url.pathname)) {
      const headers = new Headers(response.headers);
      headers.set("cache-control", "private, no-store");
      headers.set("vary", [headers.get("vary"), "Authorization", "Accept"].filter(Boolean).join(", "));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return response;
  }

  return Object.freeze({
    origin: options.origin,
    identifier,
    identifiers,
    resolveActor,
    routeCapabilities: Object.freeze({ followers: followers !== undefined,dynamicActors:options.dynamicActors===true }),
    // Source-owned startup contract for hosts that own the same durable queue.
    // A registry provider which predates this contract must be refused instead
    // of silently starting a second Fedify delivery consumer.
    queueStartup: options.manuallyStartQueue === true ? "manual" : "automatic",
    federation,
    fetch,
    // Exposed for direct in-process callers (tests, or any customer code
    // that already runs inside this actor's own process); the live
    // `POST /actors/{identifier}/outbox` route above calls the exact same
    // function.
    ...(appendToOutbox === undefined ? {} : { publish, retainOutbound: appendToOutbox }),
    ...(typeof outbox?.retainRequest === "function" ? { retainRequest: outbox.retainRequest } : {}),
    ...(typeof outbox?.requestFor === "function" ? { requestFor: outbox.requestFor } : {}),
  });
}

/**
 * Deliver one already-authored ActivityStreams activity through the customer's
 * ActivityPub face.  The provider supplies protocol signatures and transport;
 * it cannot author or reinterpret the customer's activity.
 */
export async function deliverActivity(provider, input) {
  if (provider === null || typeof provider !== "object") throw new TypeError("ActivityPub provider is required");
  if (input === null || typeof input !== "object") throw new TypeError("ActivityPub delivery input is required");
  const inbox = new URL(requiredText(input.inbox, "ActivityPub recipient inbox"));
  const recipient = new URL(requiredText(input.recipient, "ActivityPub recipient actor"));
  if (inbox.protocol !== "https:" && inbox.hostname !== "127.0.0.1" && inbox.hostname !== "localhost") {
    throw new TypeError("ActivityPub recipient inbox must use HTTPS outside loopback development");
  }
  const activity = await Activity.fromJsonLd(input.activity);
  const identifier = requiredText(input.identifier ?? provider.identifier, "ActivityPub sender identifier");
  if (typeof provider.resolveActor === "function" && await provider.resolveActor(identifier) === null) {
    throw new TypeError(`unknown ActivityPub actor ${identifier}`);
  }
  const expectedActor = new URL(`/actors/${identifier}`, requiredText(provider.origin, "ActivityPub provider origin"));
  if (activity.actorIds.length !== 1 || activity.actorIds[0]?.href !== expectedActor.href) {
    throw new TypeError(`ActivityPub activity actor must equal the contracted actor ${expectedActor.href}`);
  }
  // A queued or failed delivery remains discoverable in the same durable outbox.
  await provider.retainOutbound?.(input.activity);
  const context = provider.federation.createContext(new URL(provider.origin), undefined);
  await context.sendActivity(
    { identifier },
    new Service({ id: recipient, inbox }),
    activity,
  );
  return Object.freeze({
    type: "Accept",
    actor: expectedActor.href,
    object: Object.freeze({
      type: "ActivityPubDeliveryReceipt",
      activity: activity.id?.href ?? null,
      recipient: recipient.href,
      inbox: inbox.href,
      delivered: true,
    }),
  });
}

/** Discover an admitted recipient through Fedify's own WebFinger/actor resolution. */
export async function resolveActivityPubRecipient(provider,address){
 if(typeof address!=='string'||!address.trim()||address.length>2048)throw new TypeError('recipient must be an actor URI or fediverse handle');
 const context=provider.federation.createContext(new URL(provider.origin),undefined);
 const actor=await context.lookupObject(address.trim());
 if(!isActor(actor)||!actor.id||!actor.inboxId)throw new TypeError('recipient has no discoverable actor inbox');
 return Object.freeze({actorId:actor.id.href,inboxId:actor.inboxId.href});
}

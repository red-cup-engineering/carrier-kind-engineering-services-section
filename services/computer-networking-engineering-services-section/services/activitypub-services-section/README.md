# ActivityPub Services Section

This independently hireable provider owns ActivityPub, ActivityStreams 2.0,
WebFinger, NodeInfo 2.1, signature/proof verification, protocol idempotency,
and delivery for customer settlements. It uses Fedify directly. Customers
supply their actor description, persistent protocol keys, accepted-arrival
callback, and outbox view; the provider does not own or reinterpret their RMN
theory.

There is no unsigned-admission mode and no umbrella protocol fallback.

The same customer contract can deliver a customer-authored activity without
embedding ActivityPub in the customer's ScheduleDelivery or other service:

```sh
ACTIVITYPUB_ORIGIN=https://example.net \
ACTIVITYPUB_IDENTIFIER=clockkeeper \
ACTIVITYPUB_KEYS_PATH=./activitypub-keys.json \
ACTIVITYPUB_RECIPIENT=https://customer.example/actor \
ACTIVITYPUB_RECIPIENT_INBOX=https://customer.example/inbox \
  deliver-activitypub-activity < activity.json
```

For a cloud job without standard input, provide the same already-authored JSON
in `ACTIVITYPUB_ACTIVITY_JSON` (maximum 1 MiB).  The command rejects invalid
or oversized environment JSON.

The activity actor must be the exact contracted actor at
`$ACTIVITYPUB_ORIGIN/actors/$ACTIVITYPUB_IDENTIFIER`; the provider signs and
delivers those bytes but does not author them.

Generate a new customer key file once:

```sh
npx generate-activitypub-keys ./activitypub-keys.json
```

The live carrier runs beside a full Union Alpha node. Fedify protocol state,
verified inbox objects, and durable delivery work are actor-owned ERC-5219
resources on `eip155:5615610`; Cloudflare is transport only and holds no actor
state. Configure the carrier with private files and explicit network bindings:

- `ACTIVITYPUB_ORIGIN` (HTTPS)
- `ACTIVITYPUB_IDENTIFIER`
- `ACTIVITYPUB_ACTOR_NAME`
- `ACTIVITYPUB_ACTOR_SUMMARY`
- `ACTIVITYPUB_KEYS_PATH`
- `ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE`
- `EVM_RPC_URL`, `EVM_CHAIN_ID`, and `ONCHAIN_RESOURCE_CONTRACT`
- `EVM_KEYSTORE_PATH` and `EVM_KEYSTORE_PASSWORD_PATH`

Durable customer source data remains outside this protocol provider. The Node
server export is an adapter host: callers must inject their KV, inbox custody,
and queue implementations. Its explicit
`testOnlyInProcess` option permits queue-free loopback tests and must never be
used for a live service. The journal custody and flat-file queue below provide durable delivery and custody on the active
Node host. The retired Google Cloud Tasks runtime has been removed.

## Publication profile

`./publication` is the small composition seam for a static or generated site.
`createPublicationActivityPubProvider()` takes actor keys plus a
`listPublications()` function. Each record supplies a same-origin
`url`, `title`, and rendered HTML `content`, with optional summary, dates, and
tags. The profile projects those records into public `Create{Article}` entries
and reuses this package's WebFinger, NodeInfo, actor, and outbox routing.

Inbound federation is explicit. Without an `inbox: { onActivity, ... }`
contract, `POST /inbox` and `POST /actors/{identifier}/inbox` return `405`;
the profile never accepts a remote activity and silently drops it. A publisher
such as VICTOR can give this profile its generated page records and mount the
returned `fetch(request)` handler in an HTTP carrier, then add durable inbox
custody only when it has an actual receiving workflow.

For a current shared HTTP application, use the `./app` composition profile
instead of claiming a broad `/actors/*` middleware prefix:

```js
import { createPublicationActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/publication";
import { activityPubApplication } from "@red-cup-engineering/activitypub-services-section/app";

const provider = createPublicationActivityPubProvider({
  origin, identifier, actorName, summary, keyPairs, listPublications,
});
const app = activityPubApplication(provider);
```

`activityPubApplication(provider)` returns the current HTTP application value
with one manifest-visible resource for each exact WebFinger, NodeInfo, inbox,
actor, outbox and post-object route, plus the followers route when the provider
was configured with follower custody. Fedify still owns method
admission and all protocol responses. `matchesActivityPubRequest(request,
provider)` exposes the same exact ownership decision for non-App carriers; it
intentionally does not match neighboring `/.well-known/*`, `/actors/*`, or
site artifact routes.

## Follow / Accept / Undo

Fedify owns the protocol; this package wires it. `createActivityPubProvider`
accepts an optional `followers` adapter (`add`, `remove`, `list`, `count` —
see `./journal-custody`'s journal-backed implementation) and, when one is
supplied:

- an inbound, signature-verified `Follow` addressed to the actor is retained
  through the same custody path as every other verified arrival, the
  follower is recorded, and a signed `Accept{Follow}` is sent back to the
  follower's own inbox via Fedify's sender (`Context.sendActivity`);
- an inbound, signature-verified `Undo{Follow}` — only from the same actor
  who issued the original `Follow`, naming this actor as its object — removes
  the follower record;
- the actor document advertises a real `followers` collection URL
  (`Context.getFollowersUri`), and `GET .../followers` returns an
  `OrderedCollection` with a correct `totalItems` and a page of follower IDs
  (bare actor URLs — the convention every independent implementation
  follows; not full embedded actor documents).

Without a `followers` adapter, none of the above wires up: the actor's
`followers` field stays absent (as before), and a `Follow` is retained as a
plain unanswered arrival, same as any other unhandled activity type. The `./local-server` journal custody supplies this adapter.

Native follower histories use the original query's timestamp comparison (`localeCompare`),
which agrees with canonical native ISO instants and preserves accepted original timestamp
spellings without rewriting them. A one-time conversion can carry
`sourceOrder`, an exact nonnegative safe-integer ordinal from the original admitted history,
to preserve append order at equal instants. It only breaks ties within follower history;
it grants no authority and does not alter timestamps. Subsequent native writes omit this
field and follow the received history at an equal instant. Unsequenced native-to-native
ordering is unchanged. Malformed ordinals or conflicting records with the same recipient,
instant and ordinal refuse the reading. The conversion writer and this receiving rule must
be selected together before the migrated state is activated.

Follower storage only remembers each follower's own actor ID; the inbox used
to send the `Accept` is resolved live from the verified actor document at
`Follow` time, not read back from storage — so the collection endpoint can
list bare IDs (satisfying Fedify's `OrderedCollection` item-type constraint)
without giving up delivery accuracy for the one thing this package actually
delivers to a follower today, the `Accept`. Broadcasting future outbox
activity to the full followers set (`ctx.sendActivity(sender, "followers",
activity)`) is not wired up yet — it needs each follower's inbox available at
dispatch time — and is not exercised by anything in this package as it
stands.

## Running a local instance

`./local-server` (bin `serve-local-activitypub-provider`) keeps one state directory:
verified arrivals, followers and the outbox as immutable records in the
semiotic-eavt store (`./journal-custody`), a flat-file Fedify KV store
(`./flatfile-kv`) and a flat-file message queue (`./flatfile-queue`). No network
credentials, no external service — state and any pending queued deliveries
survive a process restart because they live in that directory.

Generate keys and start one actor:

```sh
node src/keys.mjs ./alice/keys.json

ACTIVITYPUB_ORIGIN=http://127.0.0.1:8001 \
ACTIVITYPUB_IDENTIFIER=alice \
ACTIVITYPUB_ACTOR_NAME=Alice \
ACTIVITYPUB_ACTOR_SUMMARY="Alice, a local devbox actor" \
ACTIVITYPUB_KEYS_PATH=./alice/keys.json \
ACTIVITYPUB_STATE_DIR=./alice \
HOST=127.0.0.1 PORT=8001 \
  node src/local-server.mjs
```

This prints `{"actor":"http://127.0.0.1:8001/actors/alice","bearerTokenPath":"…"}`
and serves WebFinger, the actor document, and NodeInfo immediately. The
inbox bearer token itself is never printed — not to stdout, not to stderr,
so it never lands in a service journal — only where it was persisted:

- by default, `<ACTIVITYPUB_STATE_DIR>/bearer-token` — e.g.
  `./alice/bearer-token` above — written 0600 the first time it's needed;
- or the exact path named in `ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE`, if set —
  the same env var and file contract (one private regular file, mode
  `0600`, at least 32 characters) `./server`'s `readBearerToken` already
  reads on the cloud path, so one file can back either.

An ordinary restart **reuses** the persisted token — a client or script that
captured it once keeps working. To rotate (issue a new token and overwrite
the file), set `ACTIVITYPUB_ROTATE_BEARER_TOKEN=true` for that one boot; drop
it again afterward so the *next* restart goes back to reusing what was just
issued. Passing `bearerToken` directly as a `serveLocalActivityPubProvider`
option (as the in-process test suite does) always bypasses persistence
entirely — nothing is written to disk, matching the previous ephemeral
behavior, which is also what happens when no state path is configured for
persistence to key off at all.

```sh
curl "http://127.0.0.1:8001/.well-known/webfinger?resource=acct:alice@127.0.0.1:8001"
curl -H "accept: application/activity+json" "http://127.0.0.1:8001/actors/alice"
curl "http://127.0.0.1:8001/nodeinfo/2.1"
```

To prove a real signed inbox/outbox round trip, start a second actor the same
way on another port (add `ACTIVITYPUB_ALLOW_PRIVATE_ADDRESS=true` on the
*receiver* only — Fedify must dereference the sender's loopback actor
document to verify its signature) and deliver a customer-authored activity
with `deliver-activitypub-activity`:

```sh
ACTIVITYPUB_ORIGIN=http://127.0.0.1:8001 \
ACTIVITYPUB_IDENTIFIER=alice \
ACTIVITYPUB_ACTOR_NAME=Alice \
ACTIVITYPUB_ACTOR_SUMMARY="Alice, a local devbox actor" \
ACTIVITYPUB_KEYS_PATH=./alice/keys.json \
ACTIVITYPUB_RECIPIENT=http://127.0.0.1:8002/actors/bob \
ACTIVITYPUB_RECIPIENT_INBOX=http://127.0.0.1:8002/actors/bob/inbox \
  node src/deliver.mjs < pulse.json
```

then read it back from Bob's own inbox collection (using the bearer token
persisted at Bob's `bearerTokenPath`, e.g. `cat ./bob/bearer-token`):

```sh
curl -H "accept: application/activity+json" -H "authorization: Bearer $BOB_TOKEN" \
  "http://127.0.0.1:8002/actors/bob/inbox?page=true"
```

The delivered activity's Data Integrity proof is verified by Fedify before
`onActivity` ever fires; the journal custody then retains it
content-addressed and immutable, exactly as `./r2-custody` does for the cloud
path. Killing and restarting Bob's process against the same
`ACTIVITYPUB_STATE_DIR` leaves `totalItems` on his inbox collection
unchanged — this was verified directly, not assumed.

Two honest limits of this v1 local proof: both actors ran as loopback
processes on one machine, so this exercises real Fedify signing and
verification but not real DNS/TLS/WebFinger-domain federation against an
independent host; and the local inbox scan (`inboxIndex`) is a devbox
convenience this package's R2 custody deliberately does not offer in
production, because R2 has no cheap history scan — don't expect an inbox
collection endpoint from the cloud path.

A customer that is a Capability Cell also supplies `ACTIVITYPUB_CELL_ID` and
`ACTIVITYPUB_CONTROLLER`. The provider projects both into standard
`PropertyValue` actor attachments so an independent observer can bind the
federated face to the active cell identity and its sovereign controller.
# Union transport

This service is the public transport membrane for every Union autonomic actor.

One actor has one public ActivityPub face. Its ActivityStreams activities carry one
CloudEvents envelope. The CloudEvent data is an actual A2A `ROLE_AGENT`
message with exactly one RFC 6920-named `application/rmn+cbor` part. UCAN, CapTP,
x402, and EVM are not empty sibling labels: they occur only when the admitted A2A
message actually carries such an authority, invocation, settlement, or anchor.
A2A is an operation language inside the federated ActivityPub carrier, not a second
public transport or a neighboring server.

The shared `projectRmnActivity` and `extractRmnActivity` functions enforce that nesting
for every caller. A direct public `/a2a` listener is not a valid Union deployment.

The nesting is specified as ActivityPub++ in
[`content/text/documents/articles/specifications/2026-09-27-specification-of-activitypub-plus-plus.md`](content/text/documents/articles/specifications/2026-09-27-specification-of-activitypub-plus-plus.md).
That file and the Internet-Draft beside it (`draft-emsenn-activitypub-plus-plus-00.xml`) are renderings of the
companion `.specification.json` record; edit the record and render both again with the specification section's
`render-specification` and `render-specification-rfcxml` scripts. The function names above are now
`projectSenActivity` and `extractSenActivity`, and the media type is `application/sen+cbor`.

# FeltOS enterprise host

FeltOS owns this process, its listeners, federation, and lifecycle. The selected
MetroPlat instance declaration loads the MetroPlat enterprise library and its
selected operations and applications. The host declaration and private process
environment remain distinct from the instance's configuration and state.

## Separate ActivityPub ingress

Set `ACTIVITYPUB_PROJECTION_PORT` in the host's private environment to open an
additional **127.0.0.1-only ActivityPub listener**. The existing
`feltos-enterprise-serve` executable owns both listeners. No launcher wrapper,
second actor, copied key material, mailbox, or additional protocol is needed.
The option is off by default.

The projection mounts `activityPubApplication` from the **same** ActivityPub
provider used by the full host. Its route manifest is owned by
`@red-cup-engineering/activitypub-services-section/app`: WebFinger, NodeInfo,
shared and actor inboxes, actor documents, outbox, follower collection when
supported, and individual posts. The canonical actor inbox route also retains
its bearer-protected GET reader (`/actors/<identifier>/inbox?page=true`): a
missing or invalid inbox bearer token receives HTTP 401. Keep that token private
and use the loopback listener for authorized inbox reads. The projection does
not mount MCP, login, OAuth, enterprise operations, settlement, or health
endpoints.
It does not change ActivityPub request methods, signature verification, provider
identity, or the provider's existing admission and outbound behavior.

Verified SEN arrivals are retained as source-arrival evidence and, when addressed
to a seated character, as the exact typed message in that character's inbox.
An inbox message such as `codex.assignment` does not start a Codex task, invoke a
model, create a task-journal entry, or send a `codex.report`. People and native
work-allocation operations select and admit work through their existing paths.
SignCell person-demand evidence keeps its structured-work admission path;
general messages remain inbox evidence and are not converted into demands.

This is an ingress boundary, not an authorization boundary for work. Select and
authorize the instance's capabilities separately. Configuring an outbox, node
actors, a work peer, schedules, or upstream services still has its existing
effects. Do not enable them merely to prove connectivity.

### Configuration

Alongside the existing complete ActivityPub and MetroPlat settings:

```dotenv
HOST=127.0.0.1
PORT=18839
ACTIVITYPUB_PROJECTION_PORT=18840
PUBLIC_BASE_URL=https://your-approved-public-origin.example
ACTIVITYPUB_ORIGIN=https://your-approved-public-origin.example
```

These are illustrative ports and an example origin, not a deployment. Preflight
refuses invalid ports, equal full/projection ports, nonnumeric-loopback `HOST`,
incomplete ActivityPub configuration, non-HTTPS ActivityPub origins, and origins
that differ from `PUBLIC_BASE_URL`. `PORT` and `ACTIVITYPUB_PROJECTION_PORT` must
be integers 1 through 65535. `HOST` may be `127.0.0.1` or `::1`; the separate
projection is always IPv4 loopback. Validation occurs before platform startup,
state-directory creation, or provider key initialization.

Keep the approved private environment, keys, inbox-read token, database and
session secret out of Git. Use private persistent storage and appropriate file
permissions. Reuse the same declared instance ID, actor ID, HTTPS origin, key
path and database path across restarts. An arbitrary new temporary origin is a
new identity/public-address decision, not a transparent restart.

Use the existing selected workspace install/release owner to install the host's
dependency closure. Give each supervised instance its own explicit private
environment and home/state paths. Node's `--env-file` does **not** override
ambient process values; a process launched from another instance's environment
can otherwise inherit its namespace or state paths. Use a clean service
environment rather than sourcing a private file as shell code. For an installed
source checkout, this Bash example isolates instance settings while retaining
the executor's approved egress proxy/certificate configuration:

```bash
PRIVATE_ENV=/absolute/private/host.env
SERVICE_HOME=/absolute/private/home
PROXY_ENV=()
for KEY in HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy NODE_EXTRA_CA_CERTS SSL_CERT_FILE NODE_USE_ENV_PROXY; do
  if [[ -v "$KEY" ]]; then PROXY_ENV+=("$KEY=${!KEY}"); fi
done
LOCAL_NO_PROXY="${NO_PROXY:-${no_proxy:-}},127.0.0.1,localhost,::1"
pnpm --filter @red-cup-engineering/feltos-enterprise-host exec \
  env -i PATH="$PATH" HOME="$SERVICE_HOME" "${PROXY_ENV[@]}" \
  NO_PROXY="$LOCAL_NO_PROXY" no_proxy="$LOCAL_NO_PROXY" \
  node --env-file="$PRIVATE_ENV" scripts/feltos-enterprise-serve.mjs
```

The private file must include the absolute `FELTOS_ENTERPRISE_HOST` declaration
path and all approved instance-specific settings. Prepare the service home and
private paths before starting. Do not dump the environment, enable shell tracing
around credentials, or log tunnel authentication material. The launch does not
modify the executor's egress policy or create authentication grants.

### Exposure and supervision

Point an approved HTTPS reverse proxy or supported tunnel **only** at the
ActivityPub projection port. Never expose the full listener merely to get AP
reachability. Preserve the public Host authority and request body/signature
headers according to the transport contract. This setting does not create a
tunnel, grant public access, install a transport client, or prove peer delivery.

The existing supervised `federation` provider owns projection startup and
shutdown. A bind or provider failure is reported by the full host's local
`/healthz` under `phases.federation`; the platform remains degraded and retries
using its existing backoff. It does not become ready until the projection has
bound successfully. A failed attempt closes its resources before retrying.
The shared AP provider is not installed into the full entrance until projection
binding succeeds. Shutdown resets full-entrance provider routes, stops AP
projection ingress, then closes its provider/queue/storage and federation.
Repeated shutdown calls share the platform's existing close promise.

Use the deployment owner's supervisor and release/rollback process for durable
hosting. Keep one supervisor/process per state namespace. A second running
process must not share a private state directory even if configured with
another port. A successful loopback listener is not evidence that a cloud
executor persists across session or machine restarts.

The public AP listener deliberately has no health endpoint. Check health on the
private full listener and inspect the canonical actor endpoint separately. An
HTTP 200 or a queued outbound activity is not a receiving proof: retain exact
activity/actor IDs, sender delivery evidence, and the independent receiver's
signed response and resulting state. Do not store authentication material in
receipts.

For the complete authorized setup and verification workflow, see
[Connect a ChatGPT Dot to MetroPlat](../../../../../../../../../../../../../561-group-services-section/services/561-group-computer-services-section/content/text/documents/articles/teaching-articles/guides/connect-chatgpt-dot-to-metroplat.md).

## Known-intermittent peers hold and pull

A node with no inbound transport while it is away, such as a colony in an ephemeral cloud
environment, cannot be pushed to. Its peers hold what they address to it, and it pulls when it runs.

- On the holding node, `web.peerPresences` in the host declaration maps a peer actor to
  `known-intermittent`. This grants the peer nothing. Its work moves and actor-request results
  addressed to that actor are kept in the `held-peer-delivery` journal in the data root, and are not
  pushed (`deliverOrHold`).
- The holding node serves them at its instance actor's outbox,
  `GET /actors/<instance>/outbox?held-for=<peer actor>[&after=<custodied continuation>]`, only when the
  request's HTTP signature verifies as that same peer actor and the peer is still declared
  known-intermittent. Unsigned pulls get 401, and any other signer gets 403. Without `held-for`, the
  outbox is unchanged. Continuations are recipient-bound semantic-journal records containing
  native per-feed byte positions. Only their fixed-length content identity travels in the signed
  URL, so daily-feed history cannot exhaust the HTTP header budget. The retained frontier survives
  restart, clock rollback, newly discovered earlier feeds, and later appends to already-read feeds.
  A page acknowledges at most its fifty emitted deliveries; unsent tails remain readable.
- On the intermittent node, `web.presence: "known-intermittent"` (or `METROPLAT_PRESENCE`) makes its
  `work-peer-catch-up` schedule pull from each work peer before it pushes. The schedule is due at
  start, so the pull also runs at boot. Each pulled activity must be authored on that peer's origin
  and addressed to this node. It then enters the ordinary arrival path, where the standing checks
  still apply. The resume point for each peer is kept in `work-peer-pulled.jsonl`.

To verify the signed pull, the holding node must be able to read the puller's actor key. A colony
that is never reachable cannot be verified, so its pull is refused (fail-closed).

## Focused verification

```sh
pnpm --filter @red-cup-engineering/feltos-enterprise-host test
```

`test/activitypub-projection.test.mjs` uses disposable state and fixture
providers. It checks config refusal, actual loopback HTTP route exclusion,
provider sharing, retry cleanup, late startup drain, and repeated close/port
reuse. It creates no real actor keys, sends no external activity, and does not
establish real federation or Group office authority.

### Commands use the current actor mesh

`world-command` reads current office standing before submitting a power.
A submission pins the installed operation declaration, keeps the signed actor
as the invocation subject, and returns a request identity and recipient. It is
an undertaking to obtain an effect; it does not report that effect as completed.
`messages [cursor]` reads this actor's private durable inbox, retaining the full
correlated result in `Comm.Inbox`. `message actor@instance <words or request JSON>`
uses the same transport as FeltOS human accounts.

A hosted micro-enterprise has an `enterprise-<id>` inbox (non-handle identities
use a stable digest). Its `programs.json` offers only installed verbs derived
from its current offices; its Agent Card links that reading and the actual inbox.
`@<enterprise-id> <power> <input>` submits to that enterprise's actor. A bare
power submits to the offering instance actor. Actor identities, offers and
current office standing derive from the authored agency and host-owned ports;
withdrawal invalidates them. No command-local operation dispatcher remains.

The host projects its own current network faces to their authored characters
without substituting the signature-admitted principal. Foreign lookalike URLs
have no such relationship. Receiving still checks native operation standing,
applicable grants and law. A declaration address identifies the declaration;
a hosted JavaScript closure still needs its own semantic proof and body identity.

### Development acts on accepted source

An authored software-change requirement declares sourceBase, the original
immutable Git commit before its intended delivery. The host owns the territory,
reading and writing lanes, checks and current office admission. Inquiry requires
no Git delivery.

aoe-develop-software consumes the requirement through research, architecture,
HLD, LLD and artifact specifications, fabricates source and verifies the actual
consumer. Before mutation it prepares only the proposed byte transformation over
that exact original source. After local acceptance, current authority activates
the existing source-receiving queue. It returns submitted with the candidate
reference, commit and transformation identity. Independent receiving and runtime
release remain further effects; a submitted candidate does not prove deployment.

If authority or delivery fails after local acceptance, the response is
awaiting-delivery and retains the accepted effect. The same operation takes
resume: {question, effect} under the same current authored requirement and
office. This submits the same immutable candidate without repeating inference or
source mutation. Missing ancestry, substituted bytes and obsolete requirements
are refused. Unrelated checkout contents, index and HEAD remain outside delivery.

The controlled native demonstration follows actor intent to a generated consumer,
queue discovery, independent source composition, byte-addressed materialization,
atomic promotion and the released consumer's effect. Public host rollout and
semantic Hoare proof require their own observed evidence.

A seated enterprise can price its offered native operations by declaring `x402` terms on its existing agency record: `price: {amountAtomic, asset}` with the exact CAIP-19 ERC-20 asset, `payTo`, `assetExtra: {name, version}`, and `facilitatorUrl`. Optional `requestPricing` uses the existing canonical JSON byte-band tariff; `maxTimeoutSeconds` is from 1 through 3600 (default 300). These are owner-declared commercial terms, not intrinsic function prices or operation authority. No chain, token, treasury backing or exchange rate is inferred. Internal Besu settlement requires an actually deployed compatible asset and hired facilitator.

The enterprise actor's `programs.json` carries these terms beside its actual operation descriptors. The existing signed ActivityPub++ client sends a SEN operation request. After native authority and domain admission, its addressed reply carries the official x402 v2 challenge in A2A message metadata and its native `taskId`. The owner signs that challenge with an x402 client and submits the same operation/input plus `taskId` and `paymentPayload` through `createActorClient.send`, the mesh's `submit` options, or those envelope fields in the existing structured message command. They stay outside the operation input. Full A2A JSON-RPC v0.1 extension conformance is not claimed: this is the ActivityPub++/SEN carrier with actual v2 protocol objects.

Settlement is attempted once, retained before execution, and returned in the original private actor thread. A reported charge survives a failed native operation; an uncertain settlement holds the task without automatic repayment or execution. The existing processing journal retains the quote, signed attempt, ordered transitions and reported receipts; it does not manufacture buyer acceptance, independent transfer confirmation or sovereign book admission. A fresh signed continuation reuses this task state after restart. Native input, actor, recipient and operation substitutions are refused.

Owned operations route to their actual offering enterprise; competing offers require an explicit enterprise selection. The instance no longer publishes or executes unpriced copies of seated enterprise operations, and character inboxes receive messages rather than act as duplicate compute providers. The bulk arrival collector skips ActivityPub++ actor invocations because the addressed signed inbox owns their authority and payment admission. Other admitted arrival processing remains available.

The paid actor boundary depends directly on the official `@x402/core` and `@x402/evm` 2.19.0 SDKs. It does not import or install the commodity-market package and its seller applications. Native owner terms use exact asset-bound atomic amounts. Optional canonical-input byte bands are the seated owner’s actor tariff; the held SDK quote is payable, and the tariff is not measured compute cost or a currency conversion.

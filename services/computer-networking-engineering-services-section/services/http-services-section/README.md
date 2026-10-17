# HTTP services section

This package owns HTTP transports, request-body handling, response representations,
negotiation, and events. Its public entry points are declared in `package.json`.

The shared `./fetch-text` HTTP polling producer admits a caller-selected,
non-negative safe-integer retry count. Its historical six-retry cap is not a
protocol rule, and invalid settings now refuse instead of silently becoming
four. Retry selection and backoff remain host responsibilities; a larger budget
does not imply an HTTP availability guarantee or a published/installed release.

## Protocol capabilities

`content-digest` generates and checks RFC 9530 Content-Digest over exact message-content bytes. `makeContentDigest({carrier,algorithms?})` accepts a strict media-typed Base64 carrier and SHA-256/SHA-512 selections; `verifyContentDigest({carrier,contentDigest})` reports supported matches and unsupported algorithms separately. A valid mismatch is an outcome; malformed fields are refused. This is not Repr-Digest, a signature, or authentication. The paid carrier admits 65536 decoded bytes and 16384 field bytes.

Existing node message signatures retain their Ed25519/covered-component/peer-key profile while reading and writing native structured dictionaries and inner lists through the serialization supplier. The configured peer public key still decides signer authority.

`json-api-query` reads a JSON HTTP API from a query that is data (`src/json-api-query.schema.json`): an RFC 6570 URI template expanded by `uri-services-section`, the variables every call shares, and RFC 6901 pointers to the response's result array and total count. `queryJsonApi(query, variables)` fetches through `fetch-json` and returns `{uri, count, results}`; an API is added by writing its query, not a client.


## Source receiving

The 42 `src` modules, three exported scripts, 25 original tests, and manifest were
restored from `emsenn/bare-cedar-fog` commit
`aeedb1e9e671c24986c1b4f5e1ddbe4e4f8fb6f6`, under
`lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-networking-engineering-services-section/services/http-services-section`.
The receiving repository is `red-cup-engineering/computer-engineering-services-section`, at
`services/computer-networking-engineering-services-section/services/http-services-section`.
This README is new receiving documentation; no donor README was present.

The package allowlist now includes `scripts`, so the declared URL canonicalization,
JSON-fetch, and text-fetch exports are included in packed source. The restored
source version remains `0.6.1`; this change does not publish or replace a registry
artifact with that version.

## JSON-RPC composition

`./json-rpc` retains its bounded Fetch transport and request-envelope wrapper.
Response validation delegates to the existing
`@red-cup-engineering/json-rpc-transport-service` workspace package (`0.1.0`).
The reviewed supplier source is Computer commit
`681933326fc8f9b6d6250978a838c696d5ad8245`, path
`services/networking-services-section/services/http-engineering-services-section/services/json-rpc-transport-service`,
with `src/json-rpc.mjs` blob `2d7545c4a1649c6394081dfaec4d407715aa5ece`.
These two HTTP owner paths remain distinct.

The local transport keeps the public HTTP `BodyReadError` constructor used by
`./body/web` and the application error handler. It reads each response body once,
preserving the existing byte bound, timeout, URL, headers, and injected Fetch
contract. Shared response admission enforces JSON-RPC 2.0 version, request ID,
exclusive result/error members, and structured error shape. Null-ID parse and
invalid-request errors remain observable; uncorrelated successes are refused.

## Verification boundary

Tests use injected responses for the transport contract. The package-export test
runs `npm pack --dry-run --offline --ignore-scripts` and checks every declared
export target. Workspace dependencies must resolve to their actual owning
packages. Source restoration and these checks do not establish the complete
HTTP dependency graph, a published artifact, or a running host.


## Authenticated RFC 6920 byte exchange over the original NI custody space

Use the existing `./ni` export, `niResource`, to mount
`GET|HEAD /.well-known/ni/sha-256/<digest>`. The provider can be the
original `@red-cup-engineering/immutable-content-custody-service/space`
instance. That Data/URI package exposes `head(ni)` and `range(ni,interval)`;
the existing Network service now consumes those methods directly, rather than
requiring code to copy objects into a second HTTP store.

```js
import { niResource } from "@red-cup-engineering/http-services-section/ni";
import { createContentAddressedSpace } from "@red-cup-engineering/immutable-content-custody-service/space";

const contentSpace = createContentAddressedSpace({
  root: "/srv/561/shared-content", durableRoot: "/srv/561/shared-content",
  namespaces: ["science/l-space", "engineering/source"],
});
const ni = niResource(contentSpace, {
  maximumResponseBytes: 8 * 1024 * 1024,
  canRead: (ctx, address) => ctx.installedPrincipalCanReadNI(address),
});
```

The example's authorization method is a **host-supplied interface**, not a
defined feature or a caller-authored grant. An installed host must bind it to
its own independent, current principal/resource/effect decision, before
mounting `ni` in its existing HTTP application. A private shared content space
**refuses to mount** without `canRead`; denied names return 404 before the
store's `head` runs. Host-authorized responses default to
`Cache-Control: private, no-store`. Unconditionally public NI stores retain
their original public-route contract, unchanged. A host cannot opt private
content into `public` shared caching.

An authorized request can resolve a **raw-byte content name**, a conditional
ETag request, or a single byte range. Reading an original NI file validates
the complete held bytes through the already-owned custody service before any
portion is returned. The Networking adapter refuses a missing or short body
after `head`, rather than emitting a falsely successful 206 response. A large
unranged GET receives 413 before materialization and the caller can instead
request bounded ranges; HEAD can describe a large original object without
buffering its body. Empty content is represented by the standard SHA-256 NI
of an empty byte sequence and a zero-length HTTP response.

This is an **actual network entrypoint library** over the same original bytes.
It is not an installed listener, an IPFS block/CAR exchange service, a 9P
filesystem, a Git transfer protocol, or a Guix substitute. The future adapters
for CID, Git object/ref, Guix derivation/path and FluffOS object names must
preserve those **distinct typed external coordinates** and independently
record their mapping to the bytes' original NI. L-Space, CAIRN and Semioverse
readers may consume the same NI through their established rights; semantic
predication, Chu/FOUR/sheaf interpretation and governance require additional
admitted relations, never inferred from content coincidence.

Real Group-wide availability still requires the source-owned immutable
registry package to be published, the exact native frozen release to be
installed into LAGOON/Guix, a common storage root or independently admitted
peer-bytes provider, and separately authorized HTTP/agent transport mounts.
Source merge alone cannot be called a running federated namespace.


## Peer receiving into the SAME original NI custody

The package's new `./ni-peer` export, `createNiPeerReceiver`, is the
outbound counterpart to its **existing** `./ni` `niResource` route. This
permits independently authorized 561 code hosts to exchange one immutable
byte object without exporting private filesystem paths or choosing a new
hash namespace. Both ends use the same canonical RFC 6920 NI producer.

```js
import { createNiPeerReceiver } from "@red-cup-engineering/http-services-section/ni-peer";
const receiver = createNiPeerReceiver({
  peerOrigin: "https://admitted-peer.example",
  contentSpace: installedOriginalNiContentSpace,
  canReceive: (context, ni) => installedCurrentReceiverAuthority(context, ni),
  fetchImpl: installedAuthenticatedFetch,
});
const receipt = await receiver.receive(originalContentNi, nativeActorContext);
```

`installedOriginalNiContentSpace`, `installedCurrentReceiverAuthority`
and `installedAuthenticatedFetch` are independently installed **host
capabilities**, not exported symbols or user-supplied request arguments.
Their implementation and durable-root custody remain with the original
Operations/Networking/File owners. The caller may select **only** one
canonical NI after admission, not a peer URL, credentials, headers, arbitrary
filesystem path, content body or namespace change.

The peer origin is fixed on construction to one credential-free HTTPS
origin; the original `fetchWithoutRedirects` owns redirect refusal.
`canReceive` must positively admit the current actor and exact NI before
network IO. A separate remote `niResource.canRead` must admit the same NI
on the sender. The response must be HTTP 200 at the original URL, with an
unencoded raw-byte stream bounded by the receiver's configured memory
budget (default 8 MiB). Content-Length, if supplied, must equal the actual
received length. The URI owner's original `makeNiUri` recomputes the
address over the exact bytes. On mismatch, redirect, oversized body or
refusal, **nothing is published in local custody**.

The receiver stores matching bytes through the original content space's
strict first-write publication, demands its `durable: true` receipt, and
reads the original NI bytes back before reporting
`ni.peer-receiving.v1`. Original source MIME type is *not* authority for
the receiving host: new peer-custodied bytes use
`application/octet-stream`; any specialized linguistic, media, Git,
Guix or governance reading needs a separately witnessed typed relation.
Empty raw-byte objects and same-NI repeats are supported. Only an
authorized local name-binding operation can advance a Plan 9-like
namespace; receiving never creates an unsolicited name.

This is a reusable, bounded host-to-host **producer**, not a live
federation by source merge. An actually installed peer, pinned runtime,
network origin, original GitHub/science source, authorized identity,
DurableRoot and a distinct successfully receiving host remain necessary.
The 561 Group's foreign Git OIDs, IPFS CIDs, Guix paths and FluffOS object
names stay typed external references, not the original NI bytes.


## Complete immutable NI collection receiving across hosts

The same **original** `createNiPeerReceiver` now provides
`receiveTree(rootNi, context, selection?)`, in addition to
`receive(ni, context)`. Sending only a Merkle root is **not** a shared
collection: the receiver must independently read and retain its canonical
child tree nodes and raw leaves before publishing the root.

The installed host supplies one original URI Content Custody `./space`
instance with `inspectTreeBytes`, `retainTree`, `readTree`, `head`,
`get`, and `retain`; these methods are supplied by the canonical
`@red-cup-engineering/immutable-content-custody-service` source starting
with the 0.5.2 candidate, **not** copied into Networking. As before, the
host supplies one fixed HTTPS peer origin, a Fetch port, and
`canReceive(context, ni)` for **each** NI independently.

```js
import { createNiPeerReceiver } from
  "@red-cup-engineering/http-services-section/ni-peer";

const receiver = createNiPeerReceiver({
  peerOrigin: "https://admitted-peer.example",
  contentSpace: installedOriginalNiContentSpace,
  canReceive: (actor, ni) => installedReaderGrant(actor, ni),
  canBind: (actor, {name, expected, ni}) =>
    installedNamePublishGrant(actor, name, expected, ni),
  fetchImpl: installedAuthenticatedFetch,
});
const receipt = await receiver.receiveTree(existingRootNi, actor, {
  name: "science/l-space", expected: previousRootNiOrNull,
});
```

The names `installedOriginalNiContentSpace`, `installedReaderGrant`,
`installedNamePublishGrant`, `installedAuthenticatedFetch`,
`existingRootNi`, and `previousRootNiOrNull` are **installed-host
inputs**, not package exports or default grants. A caller may omit the
third argument entirely to receive an immutable DAG **without**
publishing a mutable name. To bind the received root, the host must
supply `canBind` separately from read/receive authority; the original
contentSpace owns `bind({name,expected,ni})`, namespace admission, and
compare-and-publish. Losing a named-root race does not replace the
winner. A remote tree link never grants a reader permission to fetch
that child.

The Networking layer uses its unchanged `fetchWithoutRedirects`,
per-object bounded raw byte read and original NI checksum. A root
must carry the canonical Content Custody tree media type
`application/vnd.561.content-tree+json`. Before following any
descendant, the receiver calls **the source-owned canonical
`inspectTreeBytes` decoder**; children are visited one at a time and
separately authorized. Leaves use original durable
`contentSpace.retain`, preserving any previously accepted LOCAL
media-type sidecar and otherwise storing raw octets. Nested typed
trees use original `retainTree` after all their children are held.
The receiver rejects any mismatch between the received NI and the
original custodian's canonical materialization. It neither converts
Git OIDs, IPFS CIDs, Guix paths nor a foreign tree media label into
local semantic or disclosure authority.

Defaults are a maximum of **512 distinct objects**, **16 descendant
levels**, **8 MiB per received object**, and **64 MiB total raw bytes**
per call, all bounded by host configuration. Reused leaf NI objects
are fetched once; each traversed path still obeys the depth bound.
Malformed tree bytes, unavailable children, unauthorized reads, byte
limits, stale name roots, and changed publication authority refuse
without claiming that a complete collection was received. Previously
held immutable child bytes can remain harmlessly unreferenced after
such a refusal; the named frontier does not move until the complete
original DAG has been retained.

A reader on the receiving host can then use the **already-existing**
CAIRN `GET /api/marks/tree` and TUFTE `/tree` projections against
the installed space, with their independent host grants. The receive
receipt lists root NI, object count, total transferred bytes, typed
tree count, and (only if authorized) the original named publication
outcome. A loaded Wang tile, beadwork thread relation, Heyting fiber,
Chu dual, or sheaf Laplacian is **not inferred** from coincident tree
paths. The corresponding theory and its witnessed source remain with
Lenticule Science and the original Sign libraries.

This is implemented Networking **source**, not evidence that an
HTTPS peer, package 0.5.2/HTTP 0.6.4, CAIRN site, 9P mount, IPFS
network, Guix store or public `l-space.561.group` deployment is
already installed. Remote peer and original Source Custody packages
must still be published/installed and the distinct reader and
publisher capabilities independently supplied.

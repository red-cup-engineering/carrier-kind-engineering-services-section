/**
 * Transfer one original raw NI object between independently admitted hosts.
 *
 * This is a Networking transport over the ORIGINAL URI/NI and immutable-content
 * custody services. It never mints an alternative CID/OID/store key, chooses a
 * caller-provided origin, grants an actor an effect, or changes a namespace.
 * A host installs one peer origin, secured Fetch port and current per-NI
 * authorization. The received original bytes are committed by its own
 * first-write durable custody publisher, not by this transport.
 */
import { isNiUri, makeNiUri, niWellKnownPath } from "@red-cup-engineering/uri-services-section/ni-uri";
import { fetchWithoutRedirects } from "./fetch-without-redirects.mjs";

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_TREE_OBJECTS = 512;
const DEFAULT_TREE_DEPTH = 16;
const DEFAULT_TRANSFER_BYTES = 64 * 1024 * 1024;
// The canonical source grammar, representation and decoder remain owned by
// contentSpace.inspectTreeBytes/retainTree, not by this networking transport.
const CONTENT_TREE_MIME = "application/vnd.561.content-tree+json";

function originalPeerOrigin(value) {
  if (typeof value !== "string") throw new TypeError("NI peer: one host-installed origin is required");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash)
    throw new TypeError("NI peer: origin must be exact credential-free HTTPS without path, query or fragment");
  return url.origin;
}

function exactPositive(value, label) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(`NI peer: ${label} must be a positive safe integer`);
  return value;
}

async function boundedBody(response, maximumBytes) {
  const advertised = response.headers?.get("content-length");
  if (advertised !== null && advertised !== undefined) {
    if (!/^(0|[1-9][0-9]*)$/u.test(advertised) || !Number.isSafeInteger(Number(advertised)))
      throw new TypeError("NI peer: content-length is malformed");
    if (Number(advertised) > maximumBytes)
      throw new RangeError("NI peer: original body exceeds the installed byte budget");
  }
  if (response.body === null) {
    if (advertised !== null && advertised !== undefined && Number(advertised) !== 0)
      throw new TypeError("NI peer: nonempty body disappeared before receiving");
    return new Uint8Array(0);
  }
  if (typeof response.body?.getReader !== "function")
    throw new TypeError("NI peer: a bounded byte stream is required");
  const reader = response.body.getReader(), chunks = [];
  let count = 0, complete = false;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) { complete = true; break; }
      if (!(result.value instanceof Uint8Array))
        throw new TypeError("NI peer: raw source stream must yield byte chunks");
      if (result.value.byteLength > maximumBytes - count)
        throw new RangeError("NI peer: original body exceeds the installed byte budget");
      chunks.push(Uint8Array.from(result.value));
      count += result.value.byteLength;
    }
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (advertised !== null && advertised !== undefined && count !== Number(advertised))
    throw new TypeError("NI peer: received body length differs from HTTP declaration");
  const joined = new Uint8Array(count);
  let cursor = 0;
  for (const chunk of chunks) { joined.set(chunk, cursor); cursor += chunk.length; }
  return joined;
}

/**
 * Installed, single-peer NI receiver. A source's content-type is presentation
 * testimony, not part of a raw-byte NI or local metadata authority: the local
 * first write uses application/octet-stream by construction. Another typed
 * interpretation must be separately admitted as a relation, not overwrite it.
 */
export function createNiPeerReceiver({
  peerOrigin, contentSpace, canReceive, canBind,
  fetchImpl = globalThis.fetch,
  maximumBytes = DEFAULT_MAX_BYTES, timeoutMs = DEFAULT_TIMEOUT_MS,
  maximumTreeObjects = DEFAULT_TREE_OBJECTS,
  maximumTreeDepth = DEFAULT_TREE_DEPTH,
  maximumTransferBytes = DEFAULT_TRANSFER_BYTES,
} = {}) {
  const origin = originalPeerOrigin(peerOrigin);
  if (contentSpace?.kind !== "semiotic-content.addressed-space.v1" ||
      typeof contentSpace.retain !== "function" || typeof contentSpace.get !== "function")
    throw new TypeError("NI peer: the original installed content space is required");
  if (typeof canReceive !== "function" || typeof fetchImpl !== "function")
    throw new TypeError("NI peer: separate original receive authority and host Fetch port are required");
  exactPositive(maximumBytes, "maximumBytes");
  exactPositive(timeoutMs, "timeoutMs");
  exactPositive(maximumTreeObjects, "maximumTreeObjects");
  exactPositive(maximumTreeDepth, "maximumTreeDepth");
  exactPositive(maximumTransferBytes, "maximumTransferBytes");
  if (canBind !== undefined && typeof canBind !== "function")
    throw new TypeError("NI peer: root publication authority must be an installed function");

  // One original, redirect-refusing, NI-verified transfer primitive for a
  // single object and for each child of an immutable collection. The remote
  // origin is installed ONCE; caller input selects NI only. Independent
  // canReceive admission precedes any network request or local lookup.
  const fetchOriginalBytes = async (ni, context, budget) => {
    if (!isNiUri(ni)) throw new TypeError("NI peer: one canonical raw-byte NI is required");
    if ((await canReceive(context, ni)) !== true)
      throw new TypeError("NI peer: the current principal is not admitted to receive this NI");
    const target = origin + niWellKnownPath(ni);
    const response = await fetchWithoutRedirects(target, {
      method: "GET", headers: { accept: "application/octet-stream" },
      signal: AbortSignal.timeout(timeoutMs),
    }, fetchImpl);
    if (response?.status !== 200) {
      await response?.body?.cancel().catch(() => {});
      throw new Error("NI peer: original HTTP GET did not return 200");
    }
    if (response.url && response.url !== target) {
      await response.body?.cancel().catch(() => {});
      throw new TypeError("NI peer: response came from another URL");
    }
    const encoding = response.headers?.get("content-encoding");
    if (encoding && encoding.toLowerCase() !== "identity") {
      await response.body?.cancel().catch(() => {});
      throw new TypeError("NI peer: encoded/transformed source is not raw NI bytes");
    }
    const mediaType = response.headers?.get("content-type") ?? "application/octet-stream";
    const bytes = await boundedBody(response, budget);
    if (makeNiUri(bytes) !== ni)
      throw new TypeError("NI peer: received bytes do not have the requested original NI identity");
    return { bytes, mediaType };
  };

  // Original Content Custody alone owns typed first writes, immutable MIME
  // sidecars, durable barriers, and readback. A foreign HTTP Content-Type
  // never replaces an existing local presentation or grants interpretation.
  const retainRawBytes = async (ni, bytes) => {
    const present = typeof contentSpace.head === "function"
      ? await contentSpace.head(ni) : await contentSpace.get(ni);
    if (present !== null && (present.ni !== ni ||
        typeof present.mediaType !== "string" || !present.mediaType ||
        /[\r\n]/u.test(present.mediaType) ||
        (present.size !== undefined && present.size !== bytes.byteLength)))
      throw new TypeError("NI peer: retained original presentation is inconsistent with this NI");
    const mediaType = present?.mediaType ?? "application/octet-stream";
    const held = await contentSpace.retain(bytes, { mediaType });
    if (held?.ni !== ni || held.byteLength !== bytes.byteLength || held.durable !== true)
      throw new Error("NI peer: durable first-write custody was not received");
    const actual = await contentSpace.get(ni);
    if (!actual || actual.ni !== ni || !(actual.bytes instanceof Uint8Array) ||
        actual.bytes.byteLength !== bytes.byteLength || makeNiUri(actual.bytes) !== ni)
      throw new Error("NI peer: original local custody readback failed");
    return actual;
  };
  return Object.freeze({
    kind: "ni.peer-receiver.v1",
    peerOrigin: origin,
    async receive(ni, context) {
      const { bytes } = await fetchOriginalBytes(ni, context, maximumBytes);
      await retainRawBytes(ni, bytes);
      return Object.freeze({
        kind: "ni.peer-receiving.v1", ni, peerOrigin: origin,
        byteLength: bytes.byteLength, durable: true,
      });
    },

    /**
     * Materialize a complete, BOUNDED source-owned immutable Merkle tree
     * from the same peer. A root alone is not a shared content space:
     * all declared descendants must be separately admitted and retained.
     * The original contentSpace canonical decoder is mandatory; this module
     * does not implement a second tree encoding or infer graph semantics.
     *
     * Optional namespace settlement requires a separate installed canBind
     * decision and the original expected-root compare-and-publish. No name
     * is created by ordinary receipt. Immutable orphan bytes after a losing
     * writer or denied descendant are harmless but never reported as delivery.
     */
    async receiveTree(rootNi, context, selection = {}) {
      if (!isNiUri(rootNi))
        throw new TypeError("NI peer tree: one canonical root NI is required");
      if (!selection || typeof selection !== "object" || Array.isArray(selection))
        throw new TypeError("NI peer tree: optional binding must be one exact name and expected root");
      // Admission is over one immutable proposal. Re-reading an accessor or
      // mutable caller object after an asynchronous grant could publish a
      // DIFFERENT namespace from the one independently authorized.
      const keys = Reflect.ownKeys(selection);
      const binding = keys.length !== 0;
      if (binding && (keys.length !== 2 || !keys.includes("name") ||
          !keys.includes("expected")))
        throw new TypeError("NI peer tree: optional binding must be one exact name and expected root");
      const nameField = binding ? Object.getOwnPropertyDescriptor(selection, "name") : null;
      const expectedField = binding ? Object.getOwnPropertyDescriptor(selection, "expected") : null;
      if (binding && (!nameField?.enumerable || !expectedField?.enumerable ||
          !Object.hasOwn(nameField, "value") || !Object.hasOwn(expectedField, "value")))
        throw new TypeError("NI peer tree: publishing needs plain own data fields, not accessor grants");
      const proposal = binding ? Object.freeze({
        name: nameField.value, expected: expectedField.value, ni: rootNi,
      }) : null;
      if (typeof contentSpace.inspectTreeBytes !== "function" ||
          typeof contentSpace.retainTree !== "function" ||
          typeof contentSpace.readTree !== "function" ||
          typeof contentSpace.head !== "function")
        throw new TypeError("NI peer tree: original canonical tree inspector and publisher are required");
      if (binding && (typeof proposal.name !== "string" || !proposal.name ||
          (proposal.expected !== null && !isNiUri(proposal.expected)) ||
          typeof canBind !== "function" || typeof contentSpace.bind !== "function"))
        throw new TypeError("NI peer tree: publishing a root requires independent host name authority and expected NI");
      if (binding && (await canBind(context, proposal)) !== true)
        throw new TypeError("NI peer tree: current principal is not admitted to publish this root");

      const completed = new Set(), active = new Set();
      let transferredBytes = 0, trees = 0;
      async function materialize(ni, depth, root = false) {
        if (depth > maximumTreeDepth)
          throw new RangeError("NI peer tree: immutable collection exceeds the installed depth limit");
        if (completed.has(ni)) return;
        if (active.has(ni))
          throw new TypeError("NI peer tree: repeated active Merkle descendant");
        if (completed.size + active.size >= maximumTreeObjects)
          throw new RangeError("NI peer tree: immutable collection exceeds the installed object limit");
        active.add(ni);
        try {
          const remaining = maximumTransferBytes - transferredBytes;
          const { bytes, mediaType } = await fetchOriginalBytes(
            ni, context, Math.min(maximumBytes, remaining));
          transferredBytes += bytes.byteLength;
          const isTree = mediaType === CONTENT_TREE_MIME;
          if (root && !isTree)
            throw new TypeError("NI peer tree: root was not an explicitly typed immutable collection");
          if (isTree) {
            // The original Content Custody decoder verifies canonical UTF-8,
            // exact field shape/order and names, unique slots and child NIs.
            const tree = contentSpace.inspectTreeBytes(bytes);
            for (const entry of tree.entries)
              await materialize(entry.ni, depth + 1);
            const held = await contentSpace.retainTree(tree.entries);
            if (held?.ni !== ni || held.byteLength !== bytes.byteLength || held.durable !== true)
              throw new TypeError("NI peer tree: original canonical tree publication differs from received bytes");
            const admitted = await contentSpace.readTree(ni);
            if (admitted?.kind !== tree.kind || admitted.version !== tree.version ||
                admitted.entries.length !== tree.entries.length)
              throw new TypeError("NI peer tree: original retained tree could not be read");
            trees++;
          } else {
            const previous = await contentSpace.head(ni);
            if (previous?.mediaType === CONTENT_TREE_MIME)
              throw new TypeError("NI peer tree: remote raw label conflicts with an existing typed tree");
            await retainRawBytes(ni, bytes);
          }
          completed.add(ni);
        } finally {
          active.delete(ni);
        }
      }
      await materialize(rootNi, 0, true);

      let publication;
      if (binding) {
        // Authorization is current at the actual mutable-name transition.
        if ((await canBind(context, proposal)) !== true)
          throw new TypeError("NI peer tree: root publication authority changed");
        const published = await contentSpace.bind({
          name: proposal.name, expected: proposal.expected, ni: proposal.ni,
        });
        if (published?.ni !== rootNi || published?.name !== proposal.name ||
            typeof published.published !== "boolean")
          throw new TypeError("NI peer tree: original named-root publication was not received");
        publication = Object.freeze({
          name: proposal.name, before: proposal.expected, published: published.published,
        });
      }
      return Object.freeze({
        kind: "ni.peer-tree-receiving.v1",
        rootNi, peerOrigin: origin, byteLength: transferredBytes,
        objectCount: completed.size, treeCount: trees, durable: true,
        ...(publication === undefined ? {} : { publication }),
      });
    },
  });
}

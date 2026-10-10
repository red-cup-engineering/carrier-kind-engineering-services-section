/**
 * The machine-neutral public statement a System node makes to another
 * System node. It advertises transport locations only: no user, session,
 * model, or header value becomes authority by appearing here.
 */
import { createPrivateKey, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { signRequest, verifyRequest } from "@red-cup-engineering/http-services-section/message-signatures";
import { wellKnown } from "@red-cup-engineering/http-services-section/well-known";

import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { parse } from "@red-cup-engineering/json-services-section";
import { cloudEventContract, cloudEventIdentity } from "@red-cup-engineering/json-services-section/cloudevent-identity";

export const SYSTEM_NODE_WELL_KNOWN_NAME = "system-node";
export const SYSTEM_NODE_CONTRACT_VERSION = 1;

/** The receipt a peer returns after its local `/arrivals` admission. */

const NODE_ID = /^[a-z][a-z0-9-]{0,62}$/u;

function originOf(value, label) {
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new TypeError(`System node ${label} must be an absolute HTTP(S) origin`); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError(`System node ${label} must be an absolute HTTP(S) origin`);
  }
  return parsed.origin;
}

function peerOrigins(value) {
  if (value === undefined || value.trim() === "") return Object.freeze([]);
  const peers = value.split(",").map((item) => originOf(item.trim(), "peer"));
  if (new Set(peers).size !== peers.length) throw new TypeError("System node peers must not repeat an origin");
  return Object.freeze(peers.sort());
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function string(recordValue, key, label) {
  const value = recordValue[key];
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label}.${key} must be a non-empty string`);
  return value;
}

function rejectUnexpectedFields(recordValue, allowed, label) {
  const unexpected = Object.keys(recordValue).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new TypeError(`${label} contains unsupported fields: ${unexpected.sort().join(", ")}`);
}

/** Decode the small, transport-only node advertisement; unknown authority claims are not accepted. */
export function systemNodeFromJson(value) {
  const candidate = record(value, "System node advertisement");
  rejectUnexpectedFields(candidate, ["kind", "version", "id", "origin", "endpoints", "peers", "key"], "System node advertisement");
  if (candidate.kind !== "system.node" || candidate.version !== SYSTEM_NODE_CONTRACT_VERSION) {
    throw new TypeError("unsupported System node contract");
  }
  const endpointValue = candidate.endpoints;
  if (endpointValue === undefined) throw new TypeError("System node advertisement.endpoints is required");
  const endpoints = record(endpointValue, "System node advertisement.endpoints");
  rejectUnexpectedFields(endpoints, ["http", "arrivals"], "System node advertisement.endpoints");
  const peers = candidate.peers;
  if (!Array.isArray(peers) || !peers.every((peer) => typeof peer === "string")) throw new TypeError("System node advertisement.peers must be strings");
  const node = systemNode({
    id: string(candidate, "id", "System node advertisement"),
    origin: string(candidate, "origin", "System node advertisement"),
    peers,
    ...(candidate.key === undefined ? {} : { key: string(candidate, "key", "System node advertisement") }),
  });
  const expected = node.endpoints;
  if (string(endpoints, "http", "System node advertisement.endpoints") !== expected.http
    || string(endpoints, "arrivals", "System node advertisement.endpoints") !== expected.arrivals) {
    throw new TypeError("System node advertisement endpoints must be derived from its origin");
  }
  return node;
}

/** Fetch and validate a peer's public transport advertisement. */
export async function discoverSystemNode(origin, fetcher = fetch) {
  const peerOrigin = originOf(origin, "peer");
  const response = await fetcher(`${peerOrigin}/.well-known/${SYSTEM_NODE_WELL_KNOWN_NAME}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new TypeError(`System node discovery failed with HTTP ${response.status}`);
  const node = systemNodeFromJson(parse(await response.text()));
  if (node.origin !== peerOrigin) throw new TypeError("System node advertisement origin does not match the discovered peer origin");
  return node;
}

function peerArrivalReceipt(value) {
  const candidate = record(value, "System peer arrival receipt");
  if (candidate.kind !== "system.arrival.receipt" || typeof candidate.ok !== "boolean") throw new TypeError("invalid System peer arrival receipt");
  const obstructions = candidate.obstructions;
  if (!Array.isArray(obstructions) || !obstructions.every((item) => typeof item === "string")) throw new TypeError("invalid System peer arrival receipt obstructions");
  return Object.freeze({
    kind: "system.arrival.receipt",
    ok: candidate.ok,
    cloudEventIdentity: string(candidate, "cloudEventIdentity", "System peer arrival receipt"),
    packetDigest: string(candidate, "packetDigest", "System peer arrival receipt"),
    obstructions: Object.freeze(obstructions),
  });
}

/**
 * Replay one canonical CloudEvent to the peer's receipt boundary. The peer
 * owns deduplication and all later authority decisions; this performs no
 * state copying and sends no session, role, or principal assertion.
 */
export async function replayCloudEventToSystemPeer(peer, event, fetcher = fetch) {
  const canonicalEvent = cloudEventContract.assert(event, "federated arrival CloudEvent");
  const response = await fetcher(peer.endpoints.arrivals, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/cloudevents+json",
    },
    body: canonicalJson(canonicalEvent),
  });
  if (!response.ok) throw new TypeError(`System peer arrival failed with HTTP ${response.status}`);
  const receipt = peerArrivalReceipt(parse(await response.text()));
  if (receipt.cloudEventIdentity !== cloudEventIdentity(canonicalEvent)) throw new TypeError("System peer arrival receipt identifies a different CloudEvent");
  return receipt;
}

/** Construct a content-stable node advertisement from explicit deployment data. */
export function systemNode(input) {
  if (!NODE_ID.test(input.id)) throw new TypeError("System node id must be a lowercase DNS label");
  const origin = originOf(input.origin, "origin");
  const peers = Object.freeze([...(input.peers ?? []).map((peer) => originOf(peer, "peer"))].sort());
  if (new Set(peers).size !== peers.length) throw new TypeError("System node peers must not repeat an origin");
  if (peers.includes(origin)) throw new TypeError("System node peers must not include its own origin");
  if (input.key !== undefined) createPublicKey(input.key);
  return Object.freeze({
    kind: "system.node",
    version: SYSTEM_NODE_CONTRACT_VERSION,
    id: input.id,
    origin,
    endpoints: Object.freeze({ http: `${origin}/`, arrivals: `${origin}/arrivals` }),
    peers,
    // The node's Ed25519 public key (SPKI PEM): what a peer verifies this node's signed settlement
    // exchange requests (RFC 9421) against.
    ...(input.key === undefined ? {} : { key: input.key }),
  });
}

/** The node's signing key: SYSTEM_NODE_KEY names an Ed25519 private key PEM file. */
export function systemNodeKeyFromProcessEnvironment(env) {
  const file = env.SYSTEM_NODE_KEY?.trim();
  if (file === undefined || file === "") return undefined;
  const privateKey = createPrivateKey(readFileSync(file, "utf8"));
  if (privateKey.asymmetricKeyType !== "ed25519") throw new TypeError("SYSTEM_NODE_KEY must name an Ed25519 private key");
  return privateKey;
}

/** Resolve an optional deployment node. Partial configuration is refused. */
export function systemNodeFromProcessEnvironment(env) {
  const id = env.SYSTEM_NODE_ID?.trim();
  const origin = env.SYSTEM_NODE_ORIGIN?.trim();
  if (id === undefined && origin === undefined) return undefined;
  if (id === undefined || id === "" || origin === undefined || origin === "") throw new TypeError("System node configuration requires both SYSTEM_NODE_ID and SYSTEM_NODE_ORIGIN");
  const privateKey = systemNodeKeyFromProcessEnvironment(env);
  const key = privateKey === undefined ? undefined : createPublicKey(privateKey).export({ type: "spki", format: "pem" });
  return systemNode({ id, origin, peers: peerOrigins(env.SYSTEM_NODE_PEERS), ...(key === undefined ? {} : { key }) });
}

/** Private, exact feed grants per peer origin; an advertised peer has no journal access by default. */
export function systemSettlementFeedGrants(env, node) {
  const raw = env.SYSTEM_NODE_SETTLEMENT_FEEDS?.trim();
  const configured = raw ? record(parse(raw), "System settlement feed grants") : {};
  const grants = new Map();
  for (const [origin, labels] of Object.entries(configured)) {
    if (originOf(origin, "settlement peer") !== origin || !node.peers.includes(origin)) {
      throw new TypeError(`System settlement feed grant names an unconfigured peer: ${origin}`);
    }
    if (!Array.isArray(labels) || labels.length === 0
      || !labels.every((label) => typeof label === "string" && /^[a-z0-9][a-z0-9._-]*$/u.test(label))
      || new Set(labels).size !== labels.length) {
      throw new TypeError(`System settlement feed grant for ${origin} must name distinct feed labels`);
    }
    grants.set(origin, Object.freeze([...labels]));
  }
  return Object.freeze({ labelsFor: (origin) => grants.get(origin) ?? Object.freeze([]) });
}

/**
 * Declared peer keys: SYSTEM_NODE_PEER_KEYS is a JSON object from a configured peer origin to its
 * Ed25519 public key (SPKI PEM). A known-intermittent peer (a colony in an ephemeral environment)
 * cannot be dialed while it is away, so its signed requests are verified against the key it declared
 * rather than one fetched live (Lenticule swarm theory: a PeerRecord holds the peer's signing key,
 * and a peer's absence reads unknown, never refused).
 */
export function systemNodeDeclaredPeerKeys(env, node) {
  const raw = env.SYSTEM_NODE_PEER_KEYS?.trim();
  const configured = raw ? record(parse(raw), "System node declared peer keys") : {};
  const keys = new Map();
  for (const [origin, pem] of Object.entries(configured)) {
    if (originOf(origin, "declared-key peer") !== origin || !node.peers.includes(origin)) {
      throw new TypeError(`System node declared peer key names an unconfigured peer: ${origin}`);
    }
    if (typeof pem !== "string" || pem.length === 0) throw new TypeError(`System node declared peer key for ${origin} must be a PEM string`);
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") throw new TypeError(`System node declared peer key for ${origin} must be Ed25519`);
    keys.set(origin, key.export({ type: "spki", format: "pem" }));
  }
  return keys;
}

/** How a node reaches its peers' settlements: signed holdings reads and transfers (RFC 9421 over
 *  the node's key), and the public keys of its configured peers. A peer's declared key
 *  (`declaredKeys`, from `systemNodeDeclaredPeerKeys`) is used as held, without dialing the peer;
 *  any other is resolved from its advertisement. A discovery that fails is not kept: the peer was
 *  away or answered badly, which says nothing lasting about its key, so the next request asks again. */
export function systemSettlementPeering(node, privateKey, fetcher = fetch, { declaredKeys = new Map() } = {}) {
  const keys = new Map();
  const peerKey = async (origin) => {
    if (!node.peers.includes(origin)) return undefined;
    if (declaredKeys.has(origin)) return declaredKeys.get(origin);
    if (!keys.has(origin)) {
      const discovery = discoverSystemNode(origin, fetcher).then((peer) => peer.key);
      keys.set(origin, discovery);
      discovery.catch(() => { if (keys.get(origin) === discovery) keys.delete(origin); });
    }
    return keys.get(origin);
  };
  const post = async (origin, pathname, value) => {
    const body = canonicalJson(value);
    const headers = signRequest({ method: "POST", path: pathname, body, keyId: node.origin, privateKey });
    const response = await fetcher(`${origin}${pathname}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...headers }, body });
    if (!response.ok) throw new TypeError(`System peer ${origin}${pathname} answered HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return parse(await response.text());
  };
  return Object.freeze({
    peerKey,
    /** Verify an incoming exchange request: signed by a configured peer's key. */
    verify: (request) => verifyRequest({ ...request, publicKeyFor: peerKey }),
    holdingsOf: (origin, date) => post(origin, "/settlement/holdings", { date }),
    transferTo: (origin, transfer) => post(origin, "/settlement/transfer", transfer),
  });
}

/** Verify an exact signed peer request before reading or merging a settlement. */
export async function settlementExchangeResponse(req, exchange) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  const verdict = await exchange.verify({ method: req.method ?? "POST", path: pathname, body, headers: req.headers });
  if (!verdict.ok) return { status: 401, value: { error: "unauthorized-peer", reason: verdict.reason } };
  const feedLabels = exchange.feedLabelsFor(verdict.keyId);
  if (feedLabels.length === 0) return { status: 403, value: { error: "settlement-feed-grant-required" } };
  try {
    const value = JSON.parse(body);
    return { status: 200, value: pathname === "/settlement/holdings"
      ? exchange.holdings(value.date, feedLabels)
      : exchange.merge(value, feedLabels) };
  } catch (error) {
    return { status: 422, value: { error: "settlement-exchange-refused", reason: error instanceof Error ? error.message : String(error) } };
  }
}

/** A read-only, cacheable discovery resource for the canonical node contract. */
export function systemNodeResource(node) {
  const resources = wellKnown([{
    name: SYSTEM_NODE_WELL_KNOWN_NAME,
    repr: jsonRepr(node, { cacheControl: "public, max-age=300" }),
    produces: ["application/json"],
  }]).resources ?? Object.freeze([]);
  const resource = resources[0];
  if (resource === undefined) throw new Error("System node discovery resource was not constructed");
  return resource;
}

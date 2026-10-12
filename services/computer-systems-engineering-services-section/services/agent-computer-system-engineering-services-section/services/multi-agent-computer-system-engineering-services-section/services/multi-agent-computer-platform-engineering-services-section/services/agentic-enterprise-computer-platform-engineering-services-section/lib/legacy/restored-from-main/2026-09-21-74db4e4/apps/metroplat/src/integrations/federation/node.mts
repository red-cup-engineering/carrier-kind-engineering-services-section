/**
 * The machine-neutral public statement a MetroPlat node makes to another
 * MetroPlat node. It advertises transport locations only: no user, session,
 * model, or header value becomes authority by appearing here.
 */
import { jsonRepr, wellKnown, type Resource } from "../http/index.mts";
import type { ProcessEnvironment } from "@red-cup-engineering/node-process-services-section";
import { canonicalBytes } from "../../lib/identity/index.mts";
import { parse, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { cloudEventContract, cloudEventIdentity, type CloudEvent } from "../../lib/codecs/cloudevents/index.mts";

export const METROPLAT_NODE_WELL_KNOWN_NAME = "metroplat-node";
export const METROPLAT_NODE_CONTRACT_VERSION = 1 as const;

export interface MetroplatNode {
  readonly kind: "metroplat.node";
  readonly version: typeof METROPLAT_NODE_CONTRACT_VERSION;
  readonly id: string;
  readonly origin: string;
  readonly endpoints: Readonly<{
    readonly http: string;
    readonly mcp: string;
    readonly arrivals: string;
  }>;
  readonly peers: readonly string[];
}

/** The receipt a peer returns after its local `/arrivals` admission. */
export interface MetroplatPeerArrivalReceipt {
  readonly kind: "metroplat.arrival.receipt";
  readonly ok: boolean;
  readonly cloudEventIdentity: string;
  readonly packetDigest: string;
  readonly obstructions: readonly string[];
}

export type MetroplatFetch = (input: string, init?: RequestInit) => Promise<Response>;

const NODE_ID = /^[a-z][a-z0-9-]{0,62}$/u;

function originOf(value: string, label: string): string {
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { throw new TypeError(`MetroPlat node ${label} must be an absolute HTTP(S) origin`); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError(`MetroPlat node ${label} must be an absolute HTTP(S) origin`);
  }
  return parsed.origin;
}

function peerOrigins(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim() === "") return Object.freeze([]);
  const peers = value.split(",").map((item) => originOf(item.trim(), "peer"));
  if (new Set(peers).size !== peers.length) throw new TypeError("MetroPlat node peers must not repeat an origin");
  return Object.freeze(peers.sort());
}

function record(value: JsonValue, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value as JsonRecord;
}

function string(recordValue: JsonRecord, key: string, label: string): string {
  const value = recordValue[key];
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label}.${key} must be a non-empty string`);
  return value;
}

function rejectUnexpectedFields(recordValue: JsonRecord, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(recordValue).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new TypeError(`${label} contains unsupported fields: ${unexpected.sort().join(", ")}`);
}

/** Decode the small, transport-only node advertisement; unknown authority claims are not accepted. */
export function metroplatNodeFromJson(value: JsonValue): MetroplatNode {
  const candidate = record(value, "MetroPlat node advertisement");
  rejectUnexpectedFields(candidate, ["kind", "version", "id", "origin", "endpoints", "peers"], "MetroPlat node advertisement");
  if (candidate.kind !== "metroplat.node" || candidate.version !== METROPLAT_NODE_CONTRACT_VERSION) {
    throw new TypeError("unsupported MetroPlat node contract");
  }
  const endpointValue = candidate.endpoints;
  if (endpointValue === undefined) throw new TypeError("MetroPlat node advertisement.endpoints is required");
  const endpoints = record(endpointValue, "MetroPlat node advertisement.endpoints");
  rejectUnexpectedFields(endpoints, ["http", "mcp", "arrivals"], "MetroPlat node advertisement.endpoints");
  const peers = candidate.peers;
  if (!Array.isArray(peers) || !peers.every((peer) => typeof peer === "string")) throw new TypeError("MetroPlat node advertisement.peers must be strings");
  const node = metroplatNode({
    id: string(candidate, "id", "MetroPlat node advertisement"),
    origin: string(candidate, "origin", "MetroPlat node advertisement"),
    peers,
  });
  const expected = node.endpoints;
  if (string(endpoints, "http", "MetroPlat node advertisement.endpoints") !== expected.http
    || string(endpoints, "mcp", "MetroPlat node advertisement.endpoints") !== expected.mcp
    || string(endpoints, "arrivals", "MetroPlat node advertisement.endpoints") !== expected.arrivals) {
    throw new TypeError("MetroPlat node advertisement endpoints must be derived from its origin");
  }
  return node;
}

/** Fetch and validate a peer's public transport advertisement. */
export async function discoverMetroplatNode(origin: string, fetcher: MetroplatFetch = fetch): Promise<MetroplatNode> {
  const peerOrigin = originOf(origin, "peer");
  const response = await fetcher(`${peerOrigin}/.well-known/${METROPLAT_NODE_WELL_KNOWN_NAME}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new TypeError(`MetroPlat node discovery failed with HTTP ${response.status}`);
  const node = metroplatNodeFromJson(parse(await response.text()) as JsonValue);
  if (node.origin !== peerOrigin) throw new TypeError("MetroPlat node advertisement origin does not match the discovered peer origin");
  return node;
}

function peerArrivalReceipt(value: JsonValue): MetroplatPeerArrivalReceipt {
  const candidate = record(value, "MetroPlat peer arrival receipt");
  if (candidate.kind !== "metroplat.arrival.receipt" || typeof candidate.ok !== "boolean") throw new TypeError("invalid MetroPlat peer arrival receipt");
  const obstructions = candidate.obstructions;
  if (!Array.isArray(obstructions) || !obstructions.every((item) => typeof item === "string")) throw new TypeError("invalid MetroPlat peer arrival receipt obstructions");
  return Object.freeze({
    kind: "metroplat.arrival.receipt",
    ok: candidate.ok,
    cloudEventIdentity: string(candidate, "cloudEventIdentity", "MetroPlat peer arrival receipt"),
    packetDigest: string(candidate, "packetDigest", "MetroPlat peer arrival receipt"),
    obstructions: Object.freeze(obstructions),
  });
}

/**
 * Replay one canonical CloudEvent to the peer's receipt boundary. The peer
 * owns deduplication and all later authority decisions; this performs no
 * state copying and sends no session, role, or principal assertion.
 */
export async function replayCloudEventToMetroplatPeer(peer: MetroplatNode, event: CloudEvent, fetcher: MetroplatFetch = fetch): Promise<MetroplatPeerArrivalReceipt> {
  const canonicalEvent = cloudEventContract.assert(event, "federated arrival CloudEvent") as CloudEvent;
  const response = await fetcher(peer.endpoints.arrivals, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/cloudevents+json",
    },
    body: canonicalBytes(canonicalEvent as unknown as JsonValue),
  });
  if (!response.ok) throw new TypeError(`MetroPlat peer arrival failed with HTTP ${response.status}`);
  const receipt = peerArrivalReceipt(parse(await response.text()) as JsonValue);
  if (receipt.cloudEventIdentity !== cloudEventIdentity(canonicalEvent)) throw new TypeError("MetroPlat peer arrival receipt identifies a different CloudEvent");
  return receipt;
}

/** Construct a content-stable node advertisement from explicit deployment data. */
export function metroplatNode(input: Readonly<{ id: string; origin: string; peers?: readonly string[] }>): MetroplatNode {
  if (!NODE_ID.test(input.id)) throw new TypeError("MetroPlat node id must be a lowercase DNS label");
  const origin = originOf(input.origin, "origin");
  const peers = Object.freeze([...(input.peers ?? []).map((peer) => originOf(peer, "peer"))].sort());
  if (new Set(peers).size !== peers.length) throw new TypeError("MetroPlat node peers must not repeat an origin");
  if (peers.includes(origin)) throw new TypeError("MetroPlat node peers must not include its own origin");
  return Object.freeze({
    kind: "metroplat.node",
    version: METROPLAT_NODE_CONTRACT_VERSION,
    id: input.id,
    origin,
    endpoints: Object.freeze({ http: `${origin}/`, mcp: `${origin}/mcp`, arrivals: `${origin}/arrivals` }),
    peers,
  });
}

/** Resolve an optional deployment node. Partial configuration is refused. */
export function metroplatNodeFromProcessEnvironment(env: ProcessEnvironment = process.env): MetroplatNode | undefined {
  const id = env.METROPLAT_NODE_ID?.trim();
  const origin = env.METROPLAT_NODE_ORIGIN?.trim();
  if (id === undefined && origin === undefined) return undefined;
  if (id === undefined || id === "" || origin === undefined || origin === "") throw new TypeError("MetroPlat node configuration requires both METROPLAT_NODE_ID and METROPLAT_NODE_ORIGIN");
  return metroplatNode({ id, origin, peers: peerOrigins(env.METROPLAT_NODE_PEERS) });
}

/** A read-only, cacheable discovery resource for the canonical node contract. */
export function metroplatNodeResource(node: MetroplatNode): Resource {
  const resources = wellKnown([{
    name: METROPLAT_NODE_WELL_KNOWN_NAME,
    repr: jsonRepr(node, { cacheControl: "public, max-age=300" }),
    produces: ["application/json"],
  }]).resources ?? Object.freeze([]);
  const resource = resources[0];
  if (resource === undefined) throw new Error("MetroPlat node discovery resource was not constructed");
  return resource;
}

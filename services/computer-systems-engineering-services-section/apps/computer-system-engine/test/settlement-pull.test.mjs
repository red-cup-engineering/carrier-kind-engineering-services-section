import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { directoryRemote, pull } from "@red-cup-engineering/semiotic-eavt-services-section/exchange";
import { each, readHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { settlementExchangeResponse, systemNode, systemSettlementPeering, systemSettlementTypeGrants } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { pullType } from "../scripts/system-federate.mjs";

// Lenticule swarm theory, replay-from-peer: a node that cannot be dialed brings itself up to date
// by pulling heads and the records the heads reach. The merge is idempotent, commutative and monotone.

const HUB = "https://cold-red-gate.test";
const COLONY = "https://soft-grass-pebble.test";
const DAYS = ["2026-10-10", "2026-10-11"];
const ROOT_NAME = "@red-cup-engineering/computer-system-engine";

function arrival(root, day, n) {
  appendArrivalAtRoot(root, {
    specversion: "1.0", id: `hub-arrival-${day}-${n}`, source: "urn:system:cold-red-gate", type: "org.emsenn.system.test.arrival",
    time: `${day}T00:00:0${n}.000Z`, datacontenttype: "application/json", data: { n },
  }, { rootName: ROOT_NAME });
}

/** Requests to the hub, served by its real exchange boundary; the colony's advertisement is reachable. */
function network({ hubRoot, hubNode, colonyNode, grants }) {
  const hubKey = generateKeyPairSync("ed25519");
  const hubPeering = systemSettlementPeering(hubNode, hubKey.privateKey, async (url) => {
    if (url === `${COLONY}/.well-known/system-node`) return new Response(JSON.stringify(colonyNode), { status: 200 });
    return new Response("not found", { status: 404 });
  });
  const remote = directoryRemote(hubRoot);
  const exchange = {
    verify: hubPeering.verify,
    typesFor: (origin) => grants[origin] ?? [],
    heads: (object) => remote.heads(object),
    get: (type, address) => remote.get(type, address),
  };
  return async (url, init) => {
    const target = new URL(url);
    assert.equal(target.origin, HUB, "the colony only ever dials out");
    const body = Buffer.from(init.body, "utf8");
    const req = { url: target.pathname, method: init.method, headers: Object.fromEntries(Object.entries(init.headers).map(([k, v]) => [k.toLowerCase(), v])), async *[Symbol.asyncIterator]() { yield body; } };
    const answer = await settlementExchangeResponse(req, exchange);
    return new Response(JSON.stringify(answer.value), { status: answer.status });
  };
}

function scene(grants) {
  const temporary = mkdtempSync(path.join(tmpdir(), "settlement-pull-"));
  const hubRoot = path.join(temporary, "hub");
  const colonyRoot = path.join(temporary, "colony");
  const colonyKey = generateKeyPairSync("ed25519");
  const colonyNode = systemNode({ id: "soft-grass-pebble", origin: COLONY, peers: [HUB], key: colonyKey.publicKey.export({ type: "spki", format: "pem" }) });
  const hubNode = systemNode({ id: "cold-red-gate", origin: HUB, peers: [COLONY] });
  for (const day of DAYS) for (const n of [1, 2, 3]) arrival(hubRoot, day, n);
  const fetcher = network({ hubRoot, hubNode, colonyNode, grants: grants ?? { [COLONY]: ["arrival"] } });
  const peering = systemSettlementPeering(colonyNode, colonyKey.privateKey, fetcher);
  return { temporary, hubRoot, colonyRoot, peering };
}

const held = (root) => [...each(root, "arrival")].map(({ address }) => address).sort();

test("a colony that cannot be dialed pulls what it lacks and converges on the hub's records and heads", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    assert.equal(held(colonyRoot).length, 0);
    const summary = await pullType(peering, colonyRoot, HUB, "arrival", 64);
    assert.equal(summary.heads, DAYS.length);
    assert.equal(summary.converged, DAYS.length);
    assert.equal(summary.records, 6);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
    for (const day of DAYS) assert.deepEqual(readHead(colonyRoot, "arrival", day).frontier, readHead(hubRoot, "arrival", day).frontier);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("pulling again admits nothing: replay is idempotent", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    await pullType(peering, colonyRoot, HUB, "arrival", 64);
    const again = await pullType(peering, colonyRoot, HUB, "arrival", 64);
    assert.equal(again.records, 0);
    assert.equal(again.converged, 0);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a colony that holds some of a day pulls only the rest, and the heads meet", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    arrival(colonyRoot, DAYS[0], 1);
    arrival(colonyRoot, DAYS[0], 9);
    const summary = await pullType(peering, colonyRoot, HUB, "arrival", 64);
    assert.equal(summary.records, 5, "the shared arrival is not fetched again");
    assert.equal(held(colonyRoot).length, 7, "the colony keeps its own arrival too");
    assert.equal(held(hubRoot).length, 6);
    assert.equal(readHead(colonyRoot, "arrival", DAYS[0]).frontier.length, 4);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a peer with no grant is refused a pull and receives nothing", async () => {
  const { temporary, colonyRoot, peering } = scene({});
  try {
    await assert.rejects(pullType(peering, colonyRoot, HUB, "arrival", 64), /HTTP 403/u);
    assert.equal(held(colonyRoot).length, 0);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a peer is refused a type it is not granted", async () => {
  const { temporary, colonyRoot, peering } = scene();
  try {
    await assert.rejects(pullType(peering, colonyRoot, HUB, "arrival-processing", 64), /HTTP 403/u);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("an unsigned pull is refused", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "settlement-pull-"));
  try {
    const hubRoot = path.join(temporary, "hub");
    const colonyNode = systemNode({ id: "soft-grass-pebble", origin: COLONY, peers: [HUB] });
    const fetcher = network({ hubRoot, hubNode: systemNode({ id: "cold-red-gate", origin: HUB, peers: [COLONY] }), colonyNode, grants: { [COLONY]: ["arrival"] } });
    const response = await fetcher(`${HUB}/settlement/heads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ object: "arrival" }) });
    assert.equal(response.status, 401);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a grant names plain store types of a configured peer", () => {
  const node = systemNode({ id: "cold-red-gate", origin: HUB, peers: [COLONY] });
  const grants = systemSettlementTypeGrants({ SYSTEM_NODE_SETTLEMENT_TYPES: JSON.stringify({ [COLONY]: ["arrival", "capability-assertion"] }) }, node);
  assert.deepEqual(grants.typesFor(COLONY), ["arrival", "capability-assertion"]);
  assert.deepEqual(grants.typesFor("https://other.test"), []);
  assert.throws(() => systemSettlementTypeGrants({ SYSTEM_NODE_SETTLEMENT_TYPES: JSON.stringify({ [COLONY]: ["admit-arrival.v1"] }) }, node), /plain store types/u);
  assert.throws(() => systemSettlementTypeGrants({ SYSTEM_NODE_SETTLEMENT_TYPES: JSON.stringify({ "https://other.test": ["arrival"] }) }, node), /unconfigured peer/u);
});

test("the store's pull converges two directories without the network", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "settlement-pull-"));
  try {
    const hubRoot = path.join(temporary, "hub");
    const colonyRoot = path.join(temporary, "colony");
    arrival(hubRoot, DAYS[0], 1);
    const summary = await pull(colonyRoot, directoryRemote(hubRoot), "arrival");
    assert.equal(summary.records, 1);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

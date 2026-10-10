import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { settlementHoldings, settlementTransfer, mergeSettlementTransfer } from "@red-cup-engineering/computer-system-engine/journal/exchange";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { settlementExchangeResponse, systemNode, systemSettlementPeering } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { pullDate } from "../scripts/system-federate.mjs";

// Lenticule swarm theory, replay-from-peer: a node "requests, admits, and merges a contiguous range"
// of what a peer holds, so a sovereign node that cannot be dialed brings itself up to date by
// pulling. merge-peer: the merge is idempotent, commutative and monotone.

const HUB = "https://cold-red-gate.test";
const COLONY = "https://soft-grass-pebble.test";
const DATE = "2026-10-10";
const ROOT_NAME = "@red-cup-engineering/computer-system-engine";

function arrival(root, n) {
  appendArrivalAtRoot(root, {
    specversion: "1.0", id: `hub-arrival-${n}`, source: "urn:system:cold-red-gate", type: "org.emsenn.system.test.arrival",
    time: `${DATE}T00:00:0${n}.000Z`, datacontenttype: "application/json", data: { n },
  }, { rootName: ROOT_NAME });
}

/** Requests to the hub, served by its real exchange boundary; the colony's advertisement is reachable. */
function network({ hubRoot, hubNode, colonyNode, grants }) {
  const hubKey = generateKeyPairSync("ed25519");
  const hubPeering = systemSettlementPeering(hubNode, hubKey.privateKey, async (url) => {
    if (url === `${COLONY}/.well-known/system-node`) return new Response(JSON.stringify(colonyNode), { status: 200 });
    return new Response("not found", { status: 404 });
  });
  const exchange = {
    verify: hubPeering.verify,
    feedLabelsFor: (origin) => grants[origin] ?? [],
    holdings: (date, feedLabels) => settlementHoldings(hubRoot, date, { feedLabels }),
    merge: (transfer, feedLabels) => mergeSettlementTransfer(hubRoot, transfer, { feedLabels }),
    transfer: (date, holdings, limit, feedLabels) => settlementTransfer(hubRoot, date, holdings, { limit, feedLabels }),
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
  for (const n of [1, 2, 3]) arrival(hubRoot, n);
  const fetcher = network({ hubRoot, hubNode, colonyNode, grants: grants ?? { [COLONY]: ["arrival"] } });
  const peering = systemSettlementPeering(colonyNode, colonyKey.privateKey, fetcher);
  return { temporary, hubRoot, colonyRoot, peering };
}

const held = (root) => Object.values(settlementHoldings(root, DATE, { feedLabels: ["arrival"] }).feeds).flat().sort();

test("a colony that cannot be dialed pulls what it lacks and converges on the hub's holdings", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    assert.equal(held(colonyRoot).length, 0);
    const receipts = await pullDate(peering, colonyRoot, HUB, DATE, 500, ["arrival"]);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].admitted, receipts[0].received);
    assert.ok(receipts[0].admitted >= 3);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("pulling again admits nothing: replay is idempotent", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    await pullDate(peering, colonyRoot, HUB, DATE, 500, ["arrival"]);
    assert.deepEqual(await pullDate(peering, colonyRoot, HUB, DATE, 500, ["arrival"]), []);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a bounded pull asks again for the rest and reaches the same holdings", async () => {
  const { temporary, hubRoot, colonyRoot, peering } = scene();
  try {
    const receipts = await pullDate(peering, colonyRoot, HUB, DATE, 1, ["arrival"]);
    assert.ok(receipts.length >= 3, `one witness per answer, got ${JSON.stringify(receipts)}`);
    assert.deepEqual(held(colonyRoot), held(hubRoot));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a peer with no feed grant is refused a pull and receives nothing", async () => {
  const { temporary, colonyRoot, peering } = scene({});
  try {
    await assert.rejects(pullDate(peering, colonyRoot, HUB, DATE, 500, ["arrival"]), /HTTP 403/u);
    assert.equal(held(colonyRoot).length, 0);
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
    const response = await fetcher(`${HUB}/settlement/pull`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: DATE, holdings: { feeds: {} } }) });
    assert.equal(response.status, 401);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

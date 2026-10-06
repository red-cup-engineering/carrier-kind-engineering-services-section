import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { ARRIVAL_FEED } from "@red-cup-engineering/computer-system-engine/rpc/arrival";
import {
  discoverSystemNode,
  systemNode,
  systemNodeFromJson,
  systemNodeFromProcessEnvironment,
  systemNodeResource,
  replayCloudEventToSystemPeer,
} from "@red-cup-engineering/computer-system-engine/rpc/node";

test("the canonical System node contract advertises only typed transport discovery", async () => {
  const node = systemNode({
    id: "cold-red-gate",
    origin: "https://ops.561.group",
    peers: ["https://bare-cedar-fog.example"],
  });
  assert.deepEqual(node, {
    kind: "system.node",
    version: 1,
    id: "cold-red-gate",
    origin: "https://ops.561.group",
    endpoints: { http: "https://ops.561.group/", arrivals: "https://ops.561.group/arrivals" },
    peers: ["https://bare-cedar-fog.example"],
  });
  const resource = systemNodeResource(node);
  assert.equal(resource.match, "/.well-known/system-node");
  const response = await resource.handler({ params: {}, locals: {}, trace: { kind: "test", id: "node", entries: [] } });
  assert.equal(response.type, "application/json; charset=utf-8");
  assert.match(response.body, /"system.node"/u);
  assert.match(response.body, /"arrivals":"https:\/\/ops\.561\.group\/arrivals"/u);
  assert.doesNotMatch(response.body, /subject|principal|session|model|authority/i);
});

test("a node deployment requires complete explicit node configuration", () => {
  assert.equal(systemNodeFromProcessEnvironment({}), undefined);
  assert.throws(() => systemNodeFromProcessEnvironment({ SYSTEM_NODE_ID: "cold-red-gate" }), /requires both/u);
  assert.throws(() => systemNode({ id: "cold-red-gate", origin: "https://ops.561.group/path" }), /origin/u);
  assert.throws(() => systemNode({ id: "cold-red-gate", origin: "https://ops.561.group", peers: ["https://ops.561.group"] }), /own origin/u);
  const parsed = systemNodeFromProcessEnvironment({
    SYSTEM_NODE_ID: "bare-cedar-fog",
    SYSTEM_NODE_ORIGIN: "https://bare-cedar-fog.example",
    SYSTEM_NODE_PEERS: "https://ops.561.group",
  });
  assert.equal(parsed?.id, "bare-cedar-fog");
  assert.deepEqual(parsed?.peers, ["https://ops.561.group"]);
});

test("node discovery refuses authority fields and an advertisement for another origin", async () => {
  const valid = systemNode({ id: "cold-red-gate", origin: "https://ops.561.group" });
  assert.throws(() => systemNodeFromJson({ ...valid, subject: "actor:forged" }), /unsupported fields/u);
  assert.throws(() => systemNodeFromJson({ ...valid, endpoints: { ...valid.endpoints, authority: "forged" } }), /unsupported fields/u);
  await assert.rejects(
    discoverSystemNode("https://peer.example", async () => new Response(JSON.stringify(valid), { status: 200 })),
    /does not match/u,
  );
});

function nodeFetch(nodes) {
  return async (url, init = {}) => {
    const target = new URL(url);
    const node = nodes.get(target.origin);
    if (node === undefined) return new Response("not found", { status: 404 });
    if (target.pathname === "/.well-known/system-node") return new Response(JSON.stringify(node.advertisement), { status: 200 });
    if (target.pathname !== "/arrivals" || init.method !== "POST") return new Response("not found", { status: 404 });
    // This is the same local receipt hook that the real POST /arrivals route
    // invokes. It stores a receipt only; it never dispatches the event body.
    const receipt = appendArrivalAtRoot(node.root, JSON.parse(init.body), { rootName: "@red-cup-engineering/computer-system-engine" });
    return new Response(JSON.stringify(receipt), { status: 200 });
  };
}

test("two isolated System nodes discover and replay CloudEvents bidirectionally through receipt-only arrivals", async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), "system-node-federation-"));
  try {
    const bareCedarFog = systemNode({ id: "bare-cedar-fog", origin: "https://bare-cedar-fog.test", peers: ["https://cold-red-gate.test"] });
    const coldRedGate = systemNode({ id: "cold-red-gate", origin: "https://cold-red-gate.test", peers: ["https://bare-cedar-fog.test"] });
    const nodes = new Map([
      [bareCedarFog.origin, { advertisement: bareCedarFog, root: path.join(temporary, "bare-cedar-fog") }],
      [coldRedGate.origin, { advertisement: coldRedGate, root: path.join(temporary, "cold-red-gate") }],
    ]);
    const fetcher = nodeFetch(nodes);
    const discoveredColdRedGate = await discoverSystemNode(coldRedGate.origin, fetcher);
    const discoveredBareCedarFog = await discoverSystemNode(bareCedarFog.origin, fetcher);
    const fromBareCedarFog = {
      specversion: "1.0", id: "bare-cedar-fog-to-cold-red-gate", source: "urn:system:bare-cedar-fog", type: "org.emsenn.system.test.arrival",
      time: "2026-09-09T00:00:00.000Z", datacontenttype: "application/json", data: { evidence: "only" },
    };
    const fromColdRedGate = {
      specversion: "1.0", id: "cold-red-gate-to-bare-cedar-fog", source: "urn:system:cold-red-gate", type: "org.emsenn.system.test.arrival",
      time: "2026-09-09T00:00:01.000Z", datacontenttype: "application/json", data: { evidence: "only" },
    };
    const first = await replayCloudEventToSystemPeer(discoveredColdRedGate, fromBareCedarFog, fetcher);
    const retry = await replayCloudEventToSystemPeer(discoveredColdRedGate, fromBareCedarFog, fetcher);
    const reverse = await replayCloudEventToSystemPeer(discoveredBareCedarFog, fromColdRedGate, fetcher);
    assert.equal(first.ok, true);
    assert.deepEqual(retry, first, "a retry carries the same content-addressed receipt");
    assert.equal(reverse.ok, true);
    const day = "2026-09-09T00:00:00.000Z";
    assert.equal(openJournal(nodes.get(coldRedGate.origin).root).read(journal.feed(nodes.get(coldRedGate.origin).root, ARRIVAL_FEED, day, { subject: "arrival", rootName: "@red-cup-engineering/computer-system-engine" })).length, 1);
    assert.equal(openJournal(nodes.get(bareCedarFog.origin).root).read(journal.feed(nodes.get(bareCedarFog.origin).root, ARRIVAL_FEED, day, { subject: "arrival", rootName: "@red-cup-engineering/computer-system-engine" })).length, 1);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

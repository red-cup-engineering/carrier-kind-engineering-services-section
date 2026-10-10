#!/usr/bin/env node
/** Fixture-only receiving check: an opening played under a caller's identity on the source board ->
 * signed Semioverse evidence -> the same thread on the peer's board, its player intact. No
 * production identity, opening, or outcome. */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { activityPubActorsAtHost, createActivityPubNodeArrivalHandler } from "../src/activitypub-node.mjs";
import { admitWorkPeerGrants, hostedWorkOpening } from "../src/federated-work.mjs";

const state = await mkdtemp(path.join(tmpdir(), "federated-work-intake-"));
const sourceRoot = path.join(state, "source");
const peerRoot = path.join(state, "peer");
const agencyRoot = path.join(state, "agency");
const sourceOrigin = "http://127.0.0.1:18897";
const peerOrigin = "http://127.0.0.1:18898";
const account = "fixture:work-intake-caller";
const config = { instance: { name: "fixture-source" }, publicBaseUrl: sourceOrigin,
  workPeers: [{ actor: `${peerOrigin}/actors/metroplat` }], activityPub: { instanceActor: { identifier: "metroplat" } } };
const originalFetch = globalThis.fetch;
let source, peer;
let providerAvailable = true;
let failDelivery = false;
const received = [];
const requests = [];
try {
  await mkdir(agencyRoot, { recursive: true });
  const actors = (root) => activityPubActorsAtHost({ agencyRoot, host: "fixture",
    keysDirectory: path.join(root, "keys"), instanceActor: { identifier: "metroplat", actorName: "Fixture MetroPlat", summary: "Temporary fixture instance for the signed opening receiving check" } });
  const peerActors = await actors(peerRoot);
  const arrival = createActivityPubNodeArrivalHandler({ dataRoot: peerRoot, rootName: "fixture-peer",
    origin: peerOrigin, actors: peerActors });
  // The peer's peering office grants the source's instance actor the opening it delivers.
  admitWorkPeerGrants({ dataRoot: peerRoot, origin: peerOrigin, issuer: "fixture-peer#peering",
    peers: [{ actor: `${sourceOrigin}/actors/metroplat`, moves: ["opening", "telling"] }], at: new Date().toISOString() });
  peer = await createLocalActivityPubProvider({ origin: peerOrigin, actors: peerActors,
    statePath: path.join(peerRoot, "activitypub.sqlite"), queue: false, allowPrivateAddress: true,
    onActivity: async (input) => { const result = await arrival(input); received.push(result); return result; } });
  source = await createLocalActivityPubProvider({ origin: sourceOrigin, actors: await actors(sourceRoot),
    statePath: path.join(sourceRoot, "activitypub.sqlite"), queue: false, allowPrivateAddress: true, onActivity: async () => {} });
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const local = url.origin === peerOrigin ? peer : url.origin === sourceOrigin ? source : undefined;
    if (local === undefined) return originalFetch(input, init);
    if (request.method === "POST" && url.pathname.endsWith("/inbox") && failDelivery) throw new Error("fixture delivery unavailable");
    const response = await local.provider.fetch(request);
    if (request.method === "POST" && url.pathname.endsWith("/inbox")) requests.push({
      signed: request.headers.has("signature") || request.headers.has("signature-input"), status: response.status, origin: url.origin });
    return response;
  };
  const sourceBinding = defaultFilesystemBinding(sourceRoot);
  const open = hostedWorkOpening({ config, binding: sourceBinding, provider: () => providerAvailable ? source.provider : undefined });
  const request = (id, by = account) => ({ move: "request", by, need: `Fixture receiving check only: ${id}`, conditions: ["the fixture observes it"] });
  const peerBoard = () => workBoardStore(defaultFilesystemBinding(peerRoot)).read();
  const sourceBoard = () => workBoardStore(sourceBinding).read();

  const opened = await open(request("native-request"));
  assert.equal(opened.peerHandoff, "queued");
  assert.equal(received.length, 1);
  const mirrored = peerBoard().threads.find((thread) => thread.id === opened.id);
  assert.equal(mirrored?.opening.by, account, "the peer holds the same thread, its player intact");
  assert.equal(mirrored.standing, "open");

  const retry = await open(request("native-request"));
  assert.equal(retry.id, opened.id, "the same content is the same thread");
  assert.equal(retry.peerHandoff, "queued");
  assert.equal(received.length, 1, "the ActivityPub receiver suppresses repeated evidence identity");
  assert.equal(peerBoard().threads.length, 1);

  await assert.rejects(open({ ...request("prescribing-request"), requirements: ["have codex do the patch"] }), /never|doer|who/u, "an opening naming its doer is refused");
  await assert.rejects(open({ ...request("model-request"), model: "fixture-model" }));

  providerAvailable = false;
  await assert.rejects(open(request("unavailable-request")), /requires the instance ActivityPub actor/u);
  assert.equal(sourceBoard().threads.length, 1, "provider refusal precedes playing the opening");
  providerAvailable = true;

  failDelivery = true;
  const failed = await open(request("retry-request"));
  assert.equal(failed.peerHandoff, "failed");
  assert.ok(sourceBoard().threads.some((thread) => thread.id === failed.id), "played locally though the handoff failed");
  failDelivery = false;
  const recovered = await open(request("retry-request"));
  assert.equal(recovered.id, failed.id);
  assert.equal(recovered.peerHandoff, "queued");
  assert.ok(peerBoard().threads.some((thread) => thread.id === failed.id));
  assert.ok(requests.every((delivery) => delivery.signed && delivery.status < 400));
  assert.equal(requests.filter((delivery) => delivery.origin === sourceOrigin).length, 0, "peer receipt must not reflect work to its sender");
  console.log(JSON.stringify({ kind: "fixture.federated-work-intake", ok: true,
    native: { player: account, thread: opened.id, peer: mirrored.standing },
    retry: { sameThread: true, repeatedPeerOpenings: 0 },
    prescription: "refused", unavailableProvider: "refused-before-play", queueFailure: failed.peerHandoff,
    recovery: recovered.peerHandoff, signedDeliveries: requests.length, peerForwarding: 0 }));
} finally {
  globalThis.fetch = originalFetch;
  await source?.close();
  await peer?.close();
  await rm(state, { recursive: true, force: true });
}

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { extractSignCellEvidenceActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { createServer } from "node:http";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { admitWorkPeerGrants, heldDeliveryResponse, holdForPeer, homeHostOf, hostedWorkOpening, hostedWorkTelling, preparePeerWork, signedRequestActor, workDecisionActivity } from "../src/federated-work.mjs";
import { catchUpWorkPeer, pullHeldFromPeers, signedGetAs } from "../src/work-replication.mjs";
import { heldArrival } from "../src/activitypub-node.mjs";

const ENTERPRISES = [
  { id: "alpha", host: "bare-cedar-fog", sectionPath: "services/alpha-section" },
  { id: "beta", host: "cold-red-gate", sectionPath: "services/beta-section" },
];
const ORIGINS = { "bare-cedar-fog": "https://bare.example", "cold-red-gate": "https://cold.example" };
const actorOf = (host) => `${ORIGINS[host]}/actors/metroplat`;

/** Two nodes, each its own data root and agency root, delivering to one another in process. */
function city() {
  const state = mkdtempSync(join(tmpdir(), "work-forwarding-"));
  const nodes = {};
  for (const host of Object.keys(ORIGINS)) {
    const peer = host === "bare-cedar-fog" ? "cold-red-gate" : "bare-cedar-fog";
    const root = join(state, host);
    const agencyRoot = join(state, `${host}-agency`);
    mkdirSync(agencyRoot, { recursive: true });
    nodes[host] = {
      host, peer, binding: defaultFilesystemBinding(root), agencyRoot,
      config: { instance: { name: host }, publicBaseUrl: ORIGINS[host], agencyRoot, workPeers: [{ actor: actorOf(peer) }], activityPub: { instanceActor: { identifier: "metroplat" } } },
      refusals: [],
    };
    // Each node's peering office grants the other node's instance actor every work move.
    admitWorkPeerGrants({ dataRoot: nodes[host].binding.dataRoot, origin: ORIGINS[host], issuer: `${host}#peering`, peers: nodes[host].config.workPeers, at: "2026-10-03T00:00:00Z" });
  }
  // Delivery: the activity the sender builds is read as the receiver reads signed evidence, then admitted.
  const deliverTo = (from) => async (_provider, { activity }) => {
    const to = nodes[from.peer];
    const evidence = extractSignCellEvidenceActivity({ ...activity, actor: actorOf(from.host) }, { expectedActor: actorOf(from.host), expectedRecipient: actorOf(to.host) });
    try {
      const admit = preparePeerWork({ projection: evidence, senderActorId: actorOf(from.host), origin: ORIGINS[to.host], binding: to.binding, agencyRoot: to.agencyRoot, host: to.host, enterprises: () => ENTERPRISES });
      return admit?.();
    } catch (error) { to.refusals.push(error.message); throw error; }
  };
  for (const node of Object.values(nodes)) {
    node.deliver = deliverTo(node);
    node.provider = () => ({});
    node.open = hostedWorkOpening({ config: node.config, binding: node.binding, provider: node.provider, enterprises: () => ENTERPRISES, deliver: node.deliver });
    node.board = () => workBoardStore(node.binding, { homes: FIXTURE_HOMES }).read();
    node.tell = hostedWorkTelling({ config: node.config, binding: node.binding, provider: node.provider, host: node.host, enterprises: () => ENTERPRISES, deliver: node.deliver });
    node.catchUp = () => catchUpWorkPeer({ config: node.config, provider: {}, binding: node.binding, deliver: node.deliver, host: node.host, agencyRoot: node.agencyRoot, enterprises: () => ENTERPRISES });
  }
  return { nodes, drop: () => rmSync(state, { recursive: true, force: true }) };
}

// Which node a thread is home on is the same everywhere: the host its home enterprise is seated on. Each store is given it.
const FIXTURE_HOMES = () => ({ revision: "fixture", hostOf: (thread) => homeHostOf(thread, ENTERPRISES) });

const aimAt = (at) => ({ move: "aim", by: "enterprise:alpha", purpose: "The harbour stays navigable", scope: ["section:services/beta-section"], at });

test("a thread is at home on the node whose enterprise holds its territory", async () => {
  const c = city();
  try {
    const { bare } = { bare: c.nodes["bare-cedar-fog"] };
    bare.config.deliverWorkToPeer = false;
    const opening = await bare.open(aimAt("2026-10-03T09:00:00Z"));
    const thread = bare.board().threads.find((candidate) => candidate.id === opening.id);
    assert.equal(homeHostOf(thread, ENTERPRISES), "cold-red-gate");
  } finally { c.drop(); }
});

test("a coordinated move on a thread homed on the peer is forwarded, admitted by the home, and comes back as a fact", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"];
    const cold = c.nodes["cold-red-gate"];
    const opened = await bare.open(aimAt("2026-10-03T09:00:00Z"));
    assert.ok(cold.board().threads.some((thread) => thread.id === opened.id), "the opening replicated to the home");
    const result = await bare.tell({ move: "withdraw", thread: opened.id, by: "enterprise:alpha", at: "2026-10-03T10:00:00Z" });
    assert.equal(result.forwarded, true);
    assert.equal(result.to, "cold-red-gate");
    assert.equal(bare.board().threads.find((thread) => thread.id === opened.id).standing, "open", "not played here: this node is not the home");
    // The home admitted it under its own law, on its own board.
    const decided = cold.board().threads.find((thread) => thread.id === opened.id);
    assert.equal(decided.standing, "withdrawn");
    // The home's catch-up sends the decision back as a fact; this node reads the same board.
    const back = await cold.catchUp();
    assert.ok(back.shipped.some(({ record }) => record.move === "withdraw"));
    assert.equal(bare.board().threads.find((thread) => thread.id === opened.id).standing, "withdrawn");
    assert.equal((await cold.catchUp()).shipped.length, 0, "idempotent");
    // The decision is not replayed back to the home, nor decided by the other node.
    assert.equal((await bare.catchUp()).shipped.some(({ record }) => record.move === "withdraw"), false);
  } finally { c.drop(); }
});

test("a peer-forwarded move without an explicit time receives the node's clock before forwarding", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"];
    const cold = c.nodes["cold-red-gate"];
    const opened = await bare.open(aimAt("2026-10-03T09:00:00Z"));
    const result = await bare.tell({ move: "withdraw", thread: opened.id, by: "enterprise:alpha" });
    assert.equal(result.forwarded, true);
    assert.equal(cold.board().threads.find((thread) => thread.id === opened.id).standing, "withdrawn");
    await assert.rejects(
      async () => bare.tell({ move: "withdraw", thread: opened.id, by: "enterprise:alpha", at: "not-an-iso-time" }),
      /a response's time is an ISO time/,
    );
  } finally { c.drop(); }
});

test("a forward to a node that is not the thread's home is refused there", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"];
    const cold = c.nodes["cold-red-gate"];
    const opened = await cold.open({ ...aimAt("2026-10-03T09:00:00Z"), by: "enterprise:beta", scope: ["section:services/alpha-section"] });
    assert.ok(bare.board().threads.some((thread) => thread.id === opened.id));
    // Homed on bare; cold forwarding a move to it is accepted, but bare forwarding to cold is not.
    const forged = hostedWorkTelling({ config: bare.config, binding: bare.binding, provider: bare.provider, host: "cold-red-gate", enterprises: () => ENTERPRISES, deliver: bare.deliver });
    await assert.rejects(forged({ move: "withdraw", thread: opened.id, by: "enterprise:beta", at: "2026-10-03T10:00:00Z" }), /not at home/);
    assert.equal(cold.board().threads.find((thread) => thread.id === opened.id).standing, "open");
  } finally { c.drop(); }
});

test("a decision for a thread homed here, asserted by the peer, is never counted; one for a thread not yet held is unread until its opening arrives", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"];
    const cold = c.nodes["cold-red-gate"];
    // The aim is homed on bare. The peer (cold) asserts it decided a withdrawal before bare holds the opening.
    const homedHere = { ...aimAt("2026-10-03T09:00:00Z"), scope: ["section:services/alpha-section"], by: "enterprise:beta" };
    cold.config.deliverWorkToPeer = false;
    const opened = await cold.open(homedHere);
    const asCold = (decision) => cold.deliver(undefined, { activity: workDecisionActivity({ origin: ORIGINS["cold-red-gate"], identifier: "metroplat", peerActor: actorOf("bare-cedar-fog"), decision, at: decision.at }) });
    const withdrawal = { move: "withdraw", thread: opened.id, by: "enterprise:beta", at: "2026-10-03T10:00:00Z", decidedBy: "cold-red-gate" };
    await asCold(withdrawal);                                       // thread not held on bare: accepted, kept unread
    let board = bare.board();
    assert.equal(board.threads.length, 0);
    assert.ok(board.unread.some(({ move }) => move.decidedBy === "cold-red-gate"), "unread until its opening arrives");
    // The opening arrives; the thread is homed on bare, so cold never decides its coordinated moves.
    cold.config.deliverWorkToPeer = true;
    await cold.catchUp();
    board = bare.board();
    const thread = board.threads.find((candidate) => candidate.id === opened.id);
    assert.ok(thread, "the opening arrived");
    assert.equal(thread.standing, "open", "the peer's decision is not counted");
    assert.ok(board.refused.some(({ why }) => /not home/.test(why)));
  } finally { c.drop(); }
});

const reportAt = (at, evidence = ["fixture:original-evidence"]) => ({
  move: "report", by: "enterprise:alpha", hand: "fixture:first-hand",
  law: "fixture-source-open", subject: "https://github.com/owner/public/issues/2",
  observation: "The reported condition stands open.", evidence,
  context: "The first admitted interpretation.", scope: ["section:services/beta-section"], at,
});
const sayingsOf = thread => [...thread.corroborations, ...(thread.restatements ?? [])];

test("an exact report opening replay does not manufacture a restatement on either node", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"];
    const input = reportAt("2026-10-03T09:00:00Z");
    const first = await bare.open(input), again = await bare.open(input);
    assert.equal(again.id, first.id);
    for (const node of [bare, cold]) {
      const thread = node.board().threads.find(value => value.id === first.id);
      assert.equal(sayingsOf(thread).length, 0);
    }
  } finally { c.drop(); }
});

test("same-condition new evidence reaches both native boards as the emitted telling", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"], shipped = [];
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: bare.provider,
      enterprises: () => ENTERPRISES, deliver: async (provider, request) => {
        shipped.push(extractSignCellEvidenceActivity({ ...request.activity, actor: actorOf(bare.host) }, { expectedActor: actorOf(bare.host), expectedRecipient: actorOf(cold.host) }));
        return bare.deliver(provider, request);
      } });
    const first = await open(reportAt("2026-10-03T09:00:00Z"));
    assert.equal(shipped[0].value.edition, first.edition, "the opening travels under the law that actually admitted it");
    const revised = await open(reportAt("2026-10-03T10:00:00Z", ["fixture:original-evidence", "fixture:new-source-document"]));
    assert.equal(revised.move, "corroborate"); assert.equal(revised.thread, first.id);
    assert.equal(shipped.at(-1).objectKind, "metroplat.work.arena-telling");
    assert.deepEqual(shipped.at(-1).value, Object.fromEntries(Object.entries(revised).filter(([key]) => key !== "peerHandoff")));
    for (const node of [bare, cold]) {
      const thread = node.board().threads.find(value => value.id === first.id);
      assert.equal(node.board().threads.length, 1);
      assert.ok(sayingsOf(thread).some(value => value.evidence.includes("fixture:new-source-document")));
    }
  } finally { c.drop(); }
});

test("new report testimony does not overwrite the first opening's authority or scope", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"];
    const initial = reportAt("2026-10-03T09:00:00Z"); const first = await bare.open(initial);
    await bare.open({ ...reportAt("2026-10-03T10:00:00Z", ["fixture:other-witness"]),
      by: "enterprise:beta", hand: "fixture:other-hand", scope: ["section:services/alpha-section"], context: "A different claimed interpretation." });
    for (const node of [bare, cold]) {
      const thread = node.board().threads.find(value => value.id === first.id);
      assert.equal(thread.opening.by, initial.by); assert.equal(thread.opening.hand, initial.hand);
      assert.deepEqual(thread.opening.scope, initial.scope); assert.equal(thread.opening.context, initial.context);
      assert.ok(sayingsOf(thread).some(value => value.player === "enterprise:beta" && value.evidence.includes("fixture:other-witness")));
    }
  } finally { c.drop(); }
});

test("lost telling acknowledgement retries the same native evidence without another contribution", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"]; let fail = true;
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: bare.provider,
      enterprises: () => ENTERPRISES, deliver: async (provider, request) => {
        const projection = extractSignCellEvidenceActivity({ ...request.activity, actor: actorOf(bare.host) }, { expectedActor: actorOf(bare.host), expectedRecipient: actorOf(cold.host) });
        const result = await bare.deliver(provider, request);
        if (projection.objectKind === "metroplat.work.arena-telling" && fail) { fail = false; throw new Error("acknowledgement lost"); }
        return result;
      } });
    const first = await open(reportAt("2026-10-03T09:00:00Z"));
    const changed = reportAt("2026-10-03T10:00:00Z", ["fixture:changed-evidence"]);
    assert.equal((await open(changed)).peerHandoff, "failed");
    assert.equal((await open(changed)).peerHandoff, "queued");
    for (const node of [bare, cold]) assert.equal(sayingsOf(node.board().threads.find(value => value.id === first.id)).length, 1);
  } finally { c.drop(); }
});

test("new report telling can arrive before its original opening and duplicate delivery converges", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"], queued = [];
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: bare.provider,
      enterprises: () => ENTERPRISES, deliver: async (_provider, request) => { queued.push(request); } });
    const first = await open(reportAt("2026-10-03T09:00:00Z"));
    await open(reportAt("2026-10-03T10:00:00Z", ["fixture:later-evidence"]));
    await bare.deliver(undefined, queued.at(-1));
    assert.equal(cold.board().threads.length, 0); assert.equal(cold.board().awaiting.length, 1);
    await bare.deliver(undefined, queued[0]);
    await bare.deliver(undefined, queued.at(-1));
    await bare.deliver(undefined, queued[0]);
    const thread = cold.board().threads.find(value => value.id === first.id);
    assert.ok(thread); assert.equal(sayingsOf(thread).length, 1);
    assert.ok(sayingsOf(thread)[0].evidence.includes("fixture:later-evidence"));
  } finally { c.drop(); }
});


test("losing the peer binding after opening delivery reports a failed telling handoff", async () => {
  const c = city();
  try {
    const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"];
    const first = await bare.open(reportAt("2026-10-03T09:00:00Z"));
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: bare.provider,
      enterprises: () => ENTERPRISES, deliver: async (provider, request) => {
        await bare.deliver(provider, request);
        bare.config.deliverWorkToPeer = false;
      } });
    const result = await open(reportAt("2026-10-03T10:00:00Z", ["fixture:not-delivered"]));
    assert.equal(result.peerHandoff, "failed");
    assert.equal(sayingsOf(bare.board().threads.find(value => value.id === first.id)).length, 1);
    assert.equal(sayingsOf(cold.board().threads.find(value => value.id === first.id)).length, 0);
  } finally { c.drop(); }
});


/**
 * Bare Cedar Fog as a known-intermittent colony: Cold Red Gate holds what it addresses to it, and the
 * colony pulls it with a request `signer` vouches for. Admission on the colony is the ordinary one.
 */
function intermittent(c, signer = () => actorOf("bare-cedar-fog")) {
  const bare = c.nodes["bare-cedar-fog"], cold = c.nodes["cold-red-gate"];
  cold.config.metroplatDataRoot = cold.binding.dataRoot;
  cold.config.peerPresences = { [actorOf("bare-cedar-fog")]: "known-intermittent" };
  bare.config.metroplatDataRoot = bare.binding.dataRoot;
  bare.config.presence = "known-intermittent";
  const signedGet = async (url) => {
    const response = await heldDeliveryResponse({ config: cold.config, request: new Request(url), signerOf: signer });
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}: ${(await response.json()).reason}`), { statusCode: response.status });
    return response.json();
  };
  const admit = (activity, peer) => {
    const arrival = heldArrival({ activity, peer, origin: ORIGINS["bare-cedar-fog"] });
    const evidence = extractSignCellEvidenceActivity({ ...activity, actor: arrival.sender.actorId }, { expectedActor: arrival.sender.actorId, expectedRecipient: actorOf("bare-cedar-fog") });
    return preparePeerWork({ projection: evidence, senderActorId: arrival.sender.actorId, origin: ORIGINS["bare-cedar-fog"], binding: bare.binding, agencyRoot: bare.agencyRoot, host: "bare-cedar-fog", enterprises: () => ENTERPRISES })?.();
  };
  const pull = () => pullHeldFromPeers({ config: bare.config, binding: bare.binding, signedGet, admit });
  return { bare, cold, pull };
}

test("a move addressed to a known-intermittent peer is held, not pushed, and the peer pulls it onto its board once", async () => {
  const c = city();
  try {
    const { bare, cold, pull } = intermittent(c);
    let pushed = 0;
    const deliver = cold.deliver;
    cold.deliver = async (...args) => { pushed += 1; return deliver(...args); };
    const opening = await hostedWorkOpening({ config: cold.config, binding: cold.binding, provider: cold.provider, enterprises: () => ENTERPRISES, deliver: cold.deliver })(aimAt("2026-10-03T09:00:00Z"));
    assert.equal(opening.peerHandoff, "queued", "holding is the handoff");
    assert.equal(pushed, 0, "nothing is pushed to a peer that cannot receive");
    assert.ok(!bare.board().threads.some((thread) => thread.id === opening.id), "the colony has not received it yet");
    const [first] = await pull();
    assert.equal(first.peer, actorOf("cold-red-gate"));
    assert.equal(first.pulled, 1);
    assert.deepEqual(first.refused, []);
    assert.ok(bare.board().threads.some((thread) => thread.id === opening.id), "the pulled opening is on the colony's board");
    const [again] = await pull();
    assert.equal(again.pulled, 0, "a pull resumes after what it already took");
    // The holding node's catch-up finds the move already held: it notes it handed on and holds nothing twice.
    const caught = await cold.catchUp();
    assert.equal(caught.peers.find(({ peer }) => peer === actorOf("bare-cedar-fog")).held, 1);
    assert.equal(pushed, 0);
    const [third] = await pull();
    assert.equal(third.pulled, 0, "the same activity held again is not served again");
  } finally { c.drop(); }
});

test("a catch-up holds the moves a known-intermittent peer lacks and does not hold them again", async () => {
  const c = city();
  try {
    const { cold } = intermittent(c);
    cold.config.deliverWorkToPeer = false;
    await cold.open(aimAt("2026-10-03T09:00:00Z"));
    cold.config.deliverWorkToPeer = true;
    const first = await cold.catchUp();
    assert.equal(first.peers[0].held, 1);
    assert.equal(first.failed.length, 0);
    const second = await cold.catchUp();
    assert.equal(second.shipped.length + second.failed.length, 0, "a held move is in the ledger of what the peer has been handed");
  } finally { c.drop(); }
});

test("held deliveries are served only to the known-intermittent actor they are held for, on its own signature", async () => {
  const c = city();
  try {
    const { cold } = intermittent(c);
    holdForPeer({ dataRoot: cold.binding.dataRoot, recipient: actorOf("bare-cedar-fog"), activity: { id: "https://cold.example/activities/1", actor: actorOf("cold-red-gate"), to: [actorOf("bare-cedar-fog")] } });
    const url = `${actorOf("cold-red-gate")}/outbox?held-for=${encodeURIComponent(actorOf("bare-cedar-fog"))}`;
    const ask = (signer, at = url) => heldDeliveryResponse({ config: cold.config, request: new Request(at), signerOf: async () => signer });
    assert.equal((await ask(undefined)).status, 401, "an unsigned pull is refused");
    assert.equal((await ask("https://elsewhere.example/actors/metroplat")).status, 403, "another actor cannot pull what is held for this one");
    const held = await ask(actorOf("bare-cedar-fog"));
    assert.equal(held.status, 200);
    const page = await held.json();
    assert.equal(page.orderedItems.length, 1);
    assert.ok(page.next.includes("after="));
    cold.config.peerPresences = {};
    assert.equal((await ask(actorOf("bare-cedar-fog"))).status, 403, "a peer no longer declared intermittent pulls nothing");
    assert.equal(await heldDeliveryResponse({ config: cold.config, request: new Request(`${actorOf("cold-red-gate")}/outbox`), signerOf: async () => undefined }), undefined,
      "the ordinary outbox is not this route");
  } finally { c.drop(); }
});

test("a pulled activity not authored on the peer's origin, or not addressed to the puller, is refused", async () => {
  const c = city();
  try {
    const { cold, pull } = intermittent(c);
    holdForPeer({ dataRoot: cold.binding.dataRoot, recipient: actorOf("bare-cedar-fog"), activity: { id: "https://elsewhere.example/a", actor: "https://elsewhere.example/actors/metroplat", to: [actorOf("bare-cedar-fog")] } });
    holdForPeer({ dataRoot: cold.binding.dataRoot, recipient: actorOf("bare-cedar-fog"), activity: { id: "https://cold.example/b", actor: actorOf("cold-red-gate"), to: ["https://elsewhere.example/actors/metroplat"] } });
    const [result] = await pull();
    assert.equal(result.pulled, 0);
    assert.equal(result.refused.length, 2);
  } finally { c.drop(); }
});

test("a continuous node pulls nothing, and a refused pull is reported, not hidden", async () => {
  const c = city();
  try {
    const { bare, pull } = intermittent(c, () => undefined);
    const [refused] = await pull();
    assert.match(refused.failed, /HTTP 401/);
    assert.equal(refused.away, false);
    bare.config.presence = "continuous";
    assert.deepEqual(await pull(), []);
  } finally { c.drop(); }
});

/** One loopback ActivityPub node: an actual local provider whose requests a `route` may answer first. */
async function loopbackNode(t, name, route = async () => undefined) {
  const root = mkdtempSync(join(tmpdir(), `held-${name}-`));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let local;
  const server = createServer(async (request, response) => {
    try {
      const web = new Request(new URL(request.url, origin), { method: request.method, headers: request.headers });
      const result = await route(web, local) ?? await local.provider.fetch(web);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) { response.writeHead(500); response.end(String(error)); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  local = await createLocalActivityPubProvider({
    origin, stateDirectory: join(root, "state"), queue: false, allowPrivateAddress: true,
    actors: [{ identifier: "metroplat", actorName: name, summary: name, keyPath: join(root, "key.json") }],
  });
  t.after(() => local.close());
  return { origin, actor: `${origin}/actors/metroplat`, provider: local.provider, root };
}

test("an actual signed pull is verified by the holding node's ActivityPub provider", { timeout: 30000 }, async (t) => {
  let config;
  const holder = await loopbackNode(t, "holder", (request, local) => heldDeliveryResponse({ config, request, signerOf: (signed) => signedRequestActor(local.provider, signed) }));
  const colony = await loopbackNode(t, "colony");
  config = { publicBaseUrl: holder.origin, metroplatDataRoot: holder.root, activityPub: { instanceActor: { identifier: "metroplat" } }, peerPresences: { [colony.actor]: "known-intermittent" } };
  const activity = { id: `${holder.origin}/activities/held-1`, type: "Accept", actor: holder.actor, to: [colony.actor] };
  holdForPeer({ dataRoot: holder.root, recipient: colony.actor, activity });
  const unsigned = await fetch(`${holder.actor}/outbox?held-for=${encodeURIComponent(colony.actor)}`, { headers: { accept: "application/activity+json" } });
  assert.equal(unsigned.status, 401);
  const admitted = [];
  const binding = { dataRoot: colony.root };
  const colonyConfig = { presence: "known-intermittent", publicBaseUrl: colony.origin, activityPub: { instanceActor: { identifier: "metroplat" } }, workPeers: [{ actor: holder.actor }] };
  const [result] = await pullHeldFromPeers({ config: colonyConfig, binding, signedGet: signedGetAs(colony.provider, "metroplat"), admit: async (pulled) => { admitted.push(pulled); } });
  assert.equal(result.failed, undefined, result.failed);
  assert.equal(result.pulled, 1);
  assert.deepEqual(admitted, [activity]);
});

test("a result addressed to a known-intermittent requester is held for it; one to a continuous requester is delivered", async () => {
  const root = mkdtempSync(join(tmpdir(), "deliver-or-hold-"));
  try {
    const { deliverOrHold } = await import("../src/federated-work.mjs");
    const colony = "https://soft-grass-pebble.example/actors/metroplat", peer = "https://bare.example/actors/metroplat";
    const config = { metroplatDataRoot: root, peerPresences: { [colony]: "known-intermittent" } };
    const delivered = [];
    const deliver = async (_provider, request) => { delivered.push(request.recipient); return { delivered: true }; };
    const request = (recipient) => ({ identifier: "metroplat", recipient, inbox: `${recipient}/inbox`, activity: { id: `https://cold.example/activities/${recipient.length}`, type: "Accept", actor: "https://cold.example/actors/metroplat", to: [recipient] } });
    const held = await deliverOrHold({ config, deliver, request: request(colony) });
    assert.equal(held.held, true);
    assert.deepEqual(await deliverOrHold({ config, deliver, request: request(peer) }), { delivered: true });
    assert.deepEqual(delivered, [peer]);
    const response = await heldDeliveryResponse({ config: { ...config, publicBaseUrl: "https://cold.example", activityPub: { instanceActor: { identifier: "metroplat" } } },
      request: new Request(`https://cold.example/actors/metroplat/outbox?held-for=${encodeURIComponent(colony)}`), signerOf: async () => colony });
    assert.deepEqual((await response.json()).orderedItems, [request(colony).activity]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

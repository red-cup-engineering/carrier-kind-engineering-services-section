import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { extractSignCellEvidenceActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { admitWorkPeerGrants, homeHostOf, hostedWorkOpening, hostedWorkTelling, preparePeerWork, workDecisionActivity } from "../src/federated-work.mjs";
import { catchUpWorkPeer } from "../src/work-replication.mjs";

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

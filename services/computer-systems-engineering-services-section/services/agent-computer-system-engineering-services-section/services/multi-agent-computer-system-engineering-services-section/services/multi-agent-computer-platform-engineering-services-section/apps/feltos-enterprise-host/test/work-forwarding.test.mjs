import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { extractSignCellEvidenceActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { homeHostOf, hostedWorkOpening, hostedWorkTelling, preparePeerWork, workDecisionActivity } from "../src/federated-work.mjs";
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
      config: { instance: { name: host }, publicBaseUrl: ORIGINS[host], agencyRoot, workPeerActor: actorOf(peer), activityPub: { instanceActor: { identifier: "metroplat" } } },
      refusals: [],
    };
  }
  // Delivery: the activity the sender builds is read as the receiver reads signed evidence, then admitted.
  const deliverTo = (from) => async (_provider, { activity }) => {
    const to = nodes[from.peer];
    const evidence = extractSignCellEvidenceActivity({ ...activity, actor: actorOf(from.host) }, { expectedActor: actorOf(from.host), expectedRecipient: actorOf(to.host) });
    try {
      const admit = preparePeerWork({ projection: evidence, senderActorId: actorOf(from.host), peerActor: actorOf(from.host), binding: to.binding, agencyRoot: to.agencyRoot, host: to.host, enterprises: () => ENTERPRISES });
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

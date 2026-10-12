import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { admitCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { extractSignStuffEvidenceActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import {
  admitWorkPeerGrants, homeHostOf, hostedWorkOpening, preparePeerWork, WORK_ADMISSION_TYPE,
  workDecisionActivity, workForwardActivity, workGrant, workPeersOf,
} from "../src/federated-work.mjs";
import { catchUpWorkPeer } from "../src/work-replication.mjs";

// Receiving conditions 1 and 2 of the 2026-10-09 requirements for capability-bearing federation:
// two isolated nodes, neither configured with a peer actor; the receiver admits by standing alone.

const ENTERPRISES = [
  { id: "alpha", host: "bare-cedar-fog", sectionPath: "services/alpha-section" },
  { id: "beta", host: "cold-red-gate", sectionPath: "services/beta-section" },
];
const ORIGINS = { "bare-cedar-fog": "https://bare.example", "cold-red-gate": "https://cold.example" };
const actorOf = (host) => `${ORIGINS[host]}/actors/metroplat`;
const HOMES = () => ({ revision: "fixture", hostOf: (thread) => homeHostOf(thread, ENTERPRISES) });

/** Each node has only its own data root, agency root and feed. No `workPeers`, no `workPeerActor`. */
function nodes() {
  const state = mkdtempSync(join(tmpdir(), "work-peer-standing-"));
  const made = {};
  for (const host of Object.keys(ORIGINS)) {
    const root = join(state, host);
    const agencyRoot = join(state, `${host}-agency`);
    mkdirSync(agencyRoot, { recursive: true });
    made[host] = {
      host, root, agencyRoot, binding: defaultFilesystemBinding(root),
      config: { instance: { name: host }, publicBaseUrl: ORIGINS[host], metroplatDataRoot: root, agencyRoot, activityPub: { instanceActor: { identifier: "metroplat" } } },
      board: () => workBoardStore(made[host].binding, { homes: HOMES }).read(),
      witnesses: (disposition) => [...each(root, WORK_ADMISSION_TYPE)].map(({ record }) => record).filter((record) => record.disposition === disposition),
    };
  }
  return { bare: made["bare-cedar-fog"], cold: made["cold-red-gate"], drop: () => rmSync(state, { recursive: true, force: true }) };
}

/** The receiver reads the activity as signed evidence from the sender and admits it by the sender's standing. */
const receiving = (from, to, refusals) => async (_provider, { activity, recipient }) => {
  assert.equal(recipient, actorOf(to.host));
  const evidence = extractSignStuffEvidenceActivity({ ...activity, actor: actorOf(from.host) }, { expectedActor: actorOf(from.host), expectedRecipient: actorOf(to.host) });
  try {
    return preparePeerWork({ projection: evidence, senderActorId: actorOf(from.host), origin: ORIGINS[to.host], binding: to.binding, agencyRoot: to.agencyRoot, host: to.host, enterprises: () => ENTERPRISES })?.();
  } catch (error) { refusals.push(error); throw error; }
};

const reportAt = (at, subject, evidence = ["fixture:original-evidence"]) => ({
  move: "report", by: "enterprise:alpha", hand: "fixture:first-hand",
  law: "fixture-source-open", subject,
  observation: "The reported condition stands open.", evidence,
  context: "The first admitted interpretation.", scope: ["section:services/beta-section"], at,
});

test("a peer's work is refused before a grant, admitted after it, held once contested, and refused where refused, each disposition witnessed", async () => {
  const { bare, cold, drop } = nodes();
  try {
    const refusals = [];
    const deliver = receiving(bare, cold, refusals);
    // The sender's peering office grants the receiver; that grant, not configuration, is its peer list.
    admitWorkPeerGrants({ dataRoot: bare.root, origin: ORIGINS["bare-cedar-fog"], issuer: "bare-cedar-fog#peering", peers: [{ actor: actorOf("cold-red-gate") }], at: "2026-10-09T08:00:00Z" });
    assert.deepEqual(workPeersOf(bare.config), [actorOf("cold-red-gate")]);
    assert.deepEqual(workPeersOf(cold.config), [], "the receiver has no peer and no peer actor configured");
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: () => ({}), enterprises: () => ENTERPRISES, deliver });

    // Before a grant: unevidenced, refused with the obstruction naming the missing grant, witnessed.
    const first = await open(reportAt("2026-10-09T09:00:00Z", "https://github.com/owner/public/issues/1"));
    assert.equal(first.peerHandoff, "failed");
    assert.match(refusals[0].message, /holds no standing for https:\/\/cold\.example#work-opening/u);
    assert.equal(refusals[0].obstruction.standing, "unevidenced");
    assert.equal(cold.board().threads.length, 0);
    assert.deepEqual(cold.witnesses("refused").map(({ standing, grant }) => [standing, grant]), [["unevidenced", workGrant(ORIGINS["cold-red-gate"], "opening")]]);

    // After the receiver's peering office grants the sender openings and tellings: held, admitted.
    admitWorkPeerGrants({ dataRoot: cold.root, origin: ORIGINS["cold-red-gate"], issuer: "cold-red-gate#peering", peers: [{ actor: actorOf("bare-cedar-fog"), moves: ["opening", "telling"] }], at: "2026-10-09T09:30:00Z" });
    const caughtUp = await catchUpWorkPeer({ config: bare.config, provider: {}, binding: bare.binding, deliver, host: "bare-cedar-fog", agencyRoot: bare.agencyRoot, enterprises: () => ENTERPRISES });
    assert.equal(caughtUp.failed.length, 0);
    assert.ok(cold.board().threads.some((thread) => thread.id === first.id), "admitted after the grant");
    // A telling, which it holds, is admitted too.
    const told = await open(reportAt("2026-10-09T10:00:00Z", "https://github.com/owner/public/issues/1", ["fixture:original-evidence", "fixture:new-source-document"]));
    assert.equal(told.move, "corroborate");
    assert.equal(told.peerHandoff, "queued");
    assert.ok(cold.witnesses("admitted").some(({ move, standing }) => move === "telling" && standing === "held"));

    // Receiving condition 2: holding #work-telling and not #work-decision, its decision is refused.
    const decision = { move: "withdraw", thread: first.id, by: "enterprise:alpha", at: "2026-10-09T10:30:00Z", decidedBy: "bare-cedar-fog" };
    await assert.rejects(
      deliver(undefined, { recipient: actorOf("cold-red-gate"), activity: workDecisionActivity({ origin: ORIGINS["bare-cedar-fog"], identifier: "metroplat", peerActor: actorOf("cold-red-gate"), decision, at: decision.at }) }),
      /holds no standing for https:\/\/cold\.example#work-decision/u,
    );
    assert.ok(cold.witnesses("refused").some(({ move, standing }) => move === "decision" && standing === "unevidenced"));

    // A revoke reaches the receiver. Its own grant and the revoke join in `can` to a contested
    // standing, so the next opening is held unadmitted, kept for repair, and witnessed.
    admitCapabilityAssertions({ dataRoot: cold.root, date: "2026-10-09", assertions: [revokeAssertion("cold-red-gate#peering", actorOf("bare-cedar-fog"), workGrant(ORIGINS["cold-red-gate"], "opening"), "2026-10-09T11:00:00Z")] });
    const afterRevoke = await open(reportAt("2026-10-09T11:30:00Z", "https://github.com/owner/public/issues/2"));
    assert.equal(cold.board().threads.some((thread) => thread.id === afterRevoke.id), false, "not admitted after the revoke");
    const heldNow = cold.witnesses("held");
    assert.equal(heldNow.length, 1);
    assert.equal(heldNow[0].standing, "contested");
    assert.equal(heldNow[0].move, "opening");
    assert.equal(heldNow[0].value.subject, "https://github.com/owner/public/issues/2", "the held delivery keeps what it carried");

    // A refused standing (told against and never for) refuses: the forward it would carry is refused.
    admitCapabilityAssertions({ dataRoot: cold.root, date: "2026-10-09", assertions: [revokeAssertion("cold-red-gate#peering", actorOf("bare-cedar-fog"), workGrant(ORIGINS["cold-red-gate"], "forward"), "2026-10-09T12:00:00Z")] });
    const forward = { move: "withdraw", thread: first.id, by: "enterprise:alpha", at: "2026-10-09T12:30:00Z" };
    await assert.rejects(
      deliver(undefined, { recipient: actorOf("cold-red-gate"), activity: workForwardActivity({ origin: ORIGINS["bare-cedar-fog"], identifier: "metroplat", peerActor: actorOf("cold-red-gate"), move: forward, at: forward.at }) }),
      /standing for https:\/\/cold\.example#work-forward is refused/u,
    );
    assert.ok(cold.witnesses("refused").some(({ move, standing }) => move === "forward" && standing === "refused"));
    assert.equal(cold.board().threads.find((thread) => thread.id === first.id).standing, "open", "nothing refused or held was played");
  } finally { drop(); }
});

test("a peer's standing is read in the receiver's own feed, not the sender's", async () => {
  const { bare, cold, drop } = nodes();
  try {
    const refusals = [];
    // The sender grants itself every move on the receiver's origin in its own feed: that is no standing on the receiver.
    admitWorkPeerGrants({ dataRoot: bare.root, origin: ORIGINS["cold-red-gate"], issuer: "bare-cedar-fog#peering", peers: [{ actor: actorOf("bare-cedar-fog") }], at: "2026-10-09T08:00:00Z" });
    admitWorkPeerGrants({ dataRoot: bare.root, origin: ORIGINS["bare-cedar-fog"], issuer: "bare-cedar-fog#peering", peers: [{ actor: actorOf("cold-red-gate") }], at: "2026-10-09T08:00:00Z" });
    const open = hostedWorkOpening({ config: bare.config, binding: bare.binding, provider: () => ({}), enterprises: () => ENTERPRISES, deliver: receiving(bare, cold, refusals) });
    const opened = await open(reportAt("2026-10-09T09:00:00Z", "https://github.com/owner/public/issues/3"));
    assert.equal(opened.peerHandoff, "failed");
    assert.equal(refusals[0].obstruction.standing, "unevidenced");
    assert.equal(cold.board().threads.length, 0);
  } finally { drop(); }
});

test("a new peer receives old moves without repeating delivery to a peer whose receipt is already held", async () => {
  const { bare, cold, drop } = nodes();
  try {
    const firstPeer = actorOf("cold-red-gate");
    const laterPeer = "https://later.example/actors/metroplat";
    const grant = (actor) => admitWorkPeerGrants({ dataRoot: bare.root, origin: ORIGINS["bare-cedar-fog"], issuer: "bare-cedar-fog#peering", peers: [{ actor }], at: "2026-10-09T08:00:00Z" });
    grant(firstPeer);
    const open = hostedWorkOpening({ config: { ...bare.config, deliverWorkToPeer: false }, binding: bare.binding, provider: () => ({}), enterprises: () => ENTERPRISES });
    await open(reportAt("2026-10-09T09:00:00Z", "https://github.com/owner/public/issues/99"));
    const attempted = [];
    const deliver = async (_provider, { recipient }) => { attempted.push(recipient); };
    const catchUp = () => catchUpWorkPeer({ config: bare.config, provider: {}, binding: bare.binding, deliver, host: bare.host, agencyRoot: bare.agencyRoot, enterprises: () => ENTERPRISES });
    const initial = await catchUp();
    assert.equal(initial.failed.length, 0);
    assert.deepEqual(attempted, [firstPeer]);
    grant(laterPeer);
    const later = await catchUp();
    assert.equal(later.failed.length, 0);
    assert.deepEqual(attempted, [firstPeer, laterPeer]);
    await catchUp();
    assert.deepEqual(attempted, [firstPeer, laterPeer]);
  } finally { drop(); }
});

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { invocation } from "@red-cup-engineering/computer-system-engine/rpc/invocation";
import { dispatch, authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { extractSignCellEvidenceActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { enterpriseLoopOperations } from "../src/enterprise-loops.mjs";
import { admitWorkPeerGrants, hostedWorkOpening, preparePeerWorkOpening, preparePeerWorkTelling, workOpeningActivity, workTellingActivity, WORK_ADMISSION_OBJECT_KIND } from "../src/federated-work.mjs";
import { catchUpWorkPeer } from "../src/work-replication.mjs";

const AT = "2026-10-11T00:00:00Z";
const input = { move: "aim", purpose: "The original work keeps its admitted source", at: AT };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "host-work-provenance-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const make = name => {
    const agencyRoot = join(root, name, "agency"); mkdirSync(agencyRoot, { recursive: true });
    const binding = { ...defaultFilesystemBinding(join(root, name, "data")), now: () => AT };
    const origin = `https://${name}.example`, actor = `${origin}/actors/metroplat`;
    return { name, binding, agencyRoot, origin, actor, board: workBoardStore(binding),
      config: { instance: { name }, publicBaseUrl: origin, agencyRoot, workPeers: [], activityPub: { instanceActor: { identifier: "metroplat" } } } };
  };
  const local = make("local"), peer = make("peer");
  local.config.workPeers = [{ actor: peer.actor }];
  admitWorkPeerGrants({ dataRoot: peer.binding.dataRoot, origin: peer.origin, issuer: "fixture:peering-office", peers: [{ actor: local.actor }], at: AT });
  const delivered = [];
  const deliver = async (_provider, { activity }) => {
    const projection = extractSignCellEvidenceActivity(activity, { expectedActor: local.actor, expectedRecipient: peer.actor });
    delivered.push(projection);
    const apply = preparePeerWorkOpening({ projection, senderActorId: local.actor, origin: peer.origin, binding: peer.binding, agencyRoot: peer.agencyRoot });
    assert.ok(apply); return apply();
  };
  const open = hostedWorkOpening({ config: local.config, provider: () => ({}), binding: local.binding, deliver });
  const operations = enterpriseLoopOperations({ binding: local.binding, host: local.name, agencyRoot: local.agencyRoot,
    repositoryRoot: root, releaseRoot: root, settlementsRoot: root, workOptions: () => ({}), operations: () => [], open });
  const op = operations.find(x => x.verb === "work-open"), read = operations.find(x => x.verb === "work-board");
  const runtime = { catalog: { byReference: new Map([[op.ref, op]]) }, now: () => AT,
    authorize: authorizationFromStanding(new Map([[op.ref, "held"]])), witness: journalRpcWitness(local.binding.dataRoot) };
  const call = (value, request = "original") => dispatch(runtime, invocation({ request, subject: "fixture:account", operation: op.ref,
    verb: op.verb, resource: "fixture:board", input: value, arguments: {}, caller: { hand: "fixture:account" }, observedAt: AT }));
  return { local, peer, op, read, runtime, call, delivered, deliver };
}

test("actual work-open retains dispatcher witnesses and readback without accepting caller player or causes", async t => {
  const f = fixture(t);
  const receipt = await f.call({ ...input, by: "forged:leader", hand: "forged:session" });
  assert.equal(receipt.ok, true);
  const opening = f.local.board.find(receipt.value.id).opening;
  assert.equal(opening.by, "fixture:account"); assert.equal(opening.hand, "fixture:account");
  const [witness] = f.local.board.witnessesOf(opening);
  assert.equal(witness.causes.length, 1);
  const result = await f.read.execute({ thread: opening.id }, {}, undefined);
  assert.deepEqual(result.threads[0].openingWitnesses, f.local.board.witnessesOf(opening));
  assert.equal(result.threads[0].opening.id, opening.id);
  const before = f.local.board.read();
  const refused = await f.call({ ...input, purpose: "Another work", causes: [artifactId({ forged: true })] }, "forged");
  assert.equal(refused.ok, false);
  assert.deepEqual(f.local.board.read(), before);
  assert.equal(f.delivered.length, 1);
});

test("peer retains offered cause references through its real admission witness without requiring foreign proof locally", async t => {
  const f = fixture(t), receipt = await f.call(input);
  assert.equal(receipt.ok, true);
  const opened = f.local.board.find(receipt.value.id).opening;
  const sourceCauses = f.local.board.witnessesOf(opened)[0].causes;
  const received = f.peer.board.find(opened.id).opening;
  assert.deepEqual(received, opened);
  const [peerWitness] = f.peer.board.witnessesOf(received);
  const arrivals = createSemanticRecordJournal({ root: f.peer.binding.dataRoot, objectKind: WORK_ADMISSION_OBJECT_KIND }).query({ category: "admitted" });
  const admission = arrivals.find(row => peerWitness.causes.includes(row.event));
  assert.ok(admission);
  assert.deepEqual(admission.record.sourceCauses, sourceCauses);
  assert.equal(admission.record.sender, f.local.actor);
  assert.equal(admission.record.subject, f.delivered[0].cloudEvent.id);
  assert.notDeepEqual(peerWitness.causes, sourceCauses, "remote addresses are not installed as local causal predecessors");
  assert.equal(Object.hasOwn(received, "causes"), false);
});

test("historical reopening never installs current invocation provenance locally or at the peer", async t => {
  const f = fixture(t);
  const old = f.local.board.play({ ...input, by: "fixture:account", hand: "fixture:account" });
  const before = f.local.board.witnessesOf(old);
  const receipt = await f.call(input, "later");
  assert.equal(receipt.ok, true);
  assert.deepEqual(f.local.board.witnessesOf(old), before);
  assert.equal(Object.hasOwn(f.delivered[0].value, "causes"), false);
  const arrivals = createSemanticRecordJournal({ root: f.peer.binding.dataRoot, objectKind: WORK_ADMISSION_OBJECT_KIND }).query({ category: "admitted" });
  assert.equal(Object.hasOwn(arrivals[0].record, "sourceCauses"), false);
  assert.equal(f.peer.board.find(old.id).opening.id, old.id);
});

test("catch-up after failed delivery reads the original stored causes, never a newer retry invocation", async t => {
  const f = fixture(t);
  f.local.config.deliverWorkToPeer = false;
  const receipt = await f.call(input);
  assert.equal(receipt.ok, true); assert.equal(f.delivered.length, 0);
  const old = f.local.board.find(receipt.value.id).opening, before = f.local.board.witnessesOf(old);
  f.local.config.deliverWorkToPeer = true;
  const caught = await catchUpWorkPeer({ config: f.local.config, provider: {}, binding: f.local.binding,
    host: f.local.name, agencyRoot: f.local.agencyRoot, deliver: f.deliver });
  assert.equal(caught.shipped.length, 1);
  assert.deepEqual(f.delivered[0].value.causes, before[0].causes);
  assert.deepEqual(f.local.board.witnessesOf(old), before);
  assert.equal(f.peer.board.find(old.id).opening.id, old.id);
});

test("caller cause injection and denied standing never reach the work opening port", async t => {
  const f = fixture(t);
  f.runtime.authorize = authorizationFromStanding(new Map([[f.op.ref, "denied"]]));
  const receipt = await f.call(input);
  assert.equal(receipt.ok, false); assert.equal(receipt.phase, "authorization");
  assert.equal(f.local.board.read().threads.length, 0); assert.equal(f.peer.board.read().threads.length, 0);
  assert.equal(f.delivered.length, 0);
});

function peerProjection(f, activity) {
  return extractSignCellEvidenceActivity(activity, { expectedActor: f.local.actor, expectedRecipient: f.peer.actor });
}
function atPeer(f, projection, prepare) {
  return prepare({ projection, senderActorId: f.local.actor, origin: f.peer.origin,
    binding: f.peer.binding, agencyRoot: f.peer.agencyRoot })();
}

test("repeated peer tellings retain each admission but only one exact authored work fact", async t => {
  const f = fixture(t);
  const receipt = await f.call({ move: "ask", question: "Which record was observed?", at: AT });
  assert.equal(receipt.ok, true);
  const telling = { move: "answer", thread: receipt.value.id, by: "fixture:witness", says: "The original record", at: AT };
  const activity = workTellingActivity({ origin: f.local.origin, identifier: "metroplat", peerActor: f.peer.actor, telling, at: AT });
  const projection = peerProjection(f, activity);
  const first = atPeer(f, projection, preparePeerWorkTelling), before = f.peer.board.witnessesOf(first);
  f.peer.binding.now = () => "2026-10-11T00:01:00Z";
  atPeer(f, projection, preparePeerWorkTelling);
  assert.equal(f.peer.board.find(receipt.value.id).answers.length, 1);
  assert.deepEqual(f.peer.board.witnessesOf(first), before);
  const arrivals = createSemanticRecordJournal({ root: f.peer.binding.dataRoot, objectKind: WORK_ADMISSION_OBJECT_KIND })
    .query({ category: "admitted" }).filter(row => row.record.subject === projection.cloudEvent.id);
  assert.equal(arrivals.length, 2);
  assert.ok(arrivals.every(row => typeof row.event === "string"));
  assert.notEqual(arrivals[0].event, arrivals[1].event);
});

test("an unread peer opening retains one exact row across distinct admission witnesses", t => {
  const f = fixture(t);
  const opening = { id: artifactId({ future: "opening" }), move: "aim", by: "fixture:opener",
    purpose: "A future-edition work remains as said", at: AT, edition: artifactId({ future: "edition" }) };
  const projection = peerProjection(f, workOpeningActivity({ origin: f.local.origin, identifier: "metroplat",
    peerActor: f.peer.actor, opening, at: AT }));
  atPeer(f, projection, preparePeerWorkOpening);
  const records = createSemanticRecordJournal({ root: f.peer.binding.dataRoot, objectKind: "work-arena-move" });
  const before = records.query({ category: "move" });
  f.peer.binding.now = () => "2026-10-11T00:01:00Z";
  atPeer(f, projection, preparePeerWorkOpening);
  assert.equal(before.length, 1);
  assert.deepEqual(before[0].record, opening);
  assert.deepEqual(records.query({ category: "move" }), before);
  const arrivals = createSemanticRecordJournal({ root: f.peer.binding.dataRoot, objectKind: WORK_ADMISSION_OBJECT_KIND })
    .query({ category: "admitted" }).filter(row => row.record.subject === projection.cloudEvent.id);
  assert.equal(arrivals.length, 2);
});

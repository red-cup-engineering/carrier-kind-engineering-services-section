import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { RECEIVING_ATTEMPTS, RECEIVING_RETRY_MS, inferenceReceivingCarrier, parseJudgement, readCommitEvidence } from "../src/carrier/inference-receiving-carrier.mjs";

const MODEL = "qwen/qwen3.8-27b";
const proposal = { receipt: "receipt-9", scope: "scope-9", receiverCondition: "the slice lands", producer: { id: "agy" },
  origin: { office: "junior-engineer", model: "gemini-3.8-flash", session: "s" }, result: { kind: "skill-result", value: { commit: "0123abc" } }, providerEvidence: ["agy-exit:0"] };
const review = { office: "engineering-assurance-engineer", proposal, staffing: { carrier: MODEL } };
const found = [{ label: "commit:0123abc", found: true, text: "diff" }];

function carrierWith(replies, clock = { at: 1_000_000 }) {
  const calls = [];
  const carrier = inferenceReceivingCarrier({
    workerId: "recv", dataRoot: mkdtempSync(path.join(tmpdir(), "inference-receiving-")), nodeName: "n", model: MODEL, family: "alibaba",
    descriptor: () => ({}), readEvidence: async () => found, now: () => clock.at,
    dispatch: async () => { calls.push(1); const reply = replies.shift(); if (reply instanceof Error) throw reply; return reply; },
  });
  return { carrier, calls, clock };
}
const says = (decision, evidence = ["commit:0123abc"]) => ({ text: JSON.stringify({ decision, text: "judged", evidence }), exchanges: [] });

test("the carrier declares its independence class and carries no execution", () => {
  const { carrier } = carrierWith([]);
  assert.equal(carrier.family, "alibaba");
  assert.throws(() => carrier({}), /receiving only/);
});

test("a judgement is made once: a judged receipt is offered for admission again, never judged twice", async () => {
  const { carrier, calls } = carrierWith([says("rejected")]);
  const first = await carrier.receive(review);
  assert.equal(first.judgement.decision, "rejected");
  assert.equal(carrier.receivingFinished(review), true);
  assert.equal(carrier.receivingJudged(review), true);
  const again = await carrier.receive(review);
  assert.deepEqual(again.judgement, first.judgement);
  assert.equal(again.session.id, first.session.id);
  assert.equal(calls.length, 1);
});

test("acceptance that cites nothing it was given is unknown, not an acceptance", async () => {
  const { carrier } = carrierWith([says("accepted", ["commit:fffffff", "a path I imagined"])]);
  const outcome = await carrier.receive(review);
  assert.equal(outcome.judgement.decision, "unverified");
  assert.deepEqual(outcome.judgement.evidence, []);
});

test("a refused or unparseable attempt is retried after the interval, and exhausted after the last attempt", async () => {
  const { carrier, calls, clock } = carrierWith([new Error("provider 429"), { text: "not a judgement" }, { reason: "refused" }, says("unverified")]);
  const outcome = await carrier.receive(review);
  assert.equal(outcome.ok, false);
  assert.match(outcome.errors[0], /429/);
  assert.equal(outcome.judgement, undefined);
  assert.equal(carrier.receivingFinished(review), true, "waiting out the interval, not offered now");
  assert.equal(carrier.receivingExhausted(review), false);
  for (let attempt = 1; attempt < RECEIVING_ATTEMPTS; attempt += 1) {
    clock.at += RECEIVING_RETRY_MS + 1;
    assert.equal(carrier.receivingFinished(review), false, `attempt ${attempt} is due`);
    await carrier.receive(review);
  }
  assert.equal(calls.length, RECEIVING_ATTEMPTS);
  assert.equal(carrier.receivingFinished(review), true);
  assert.equal(carrier.receivingExhausted(review), true);
  assert.equal(carrier.receivingJudged(review), false);
});

test("the typed judgement is read through the fences and reasoning a model wraps it in", () => {
  assert.equal(parseJudgement("<think>hm</think>```json\n{\"decision\":\"accepted\",\"text\":\"ok\",\"evidence\":[\"commit:abc1234\"]}\n```").decision, "accepted");
  assert.equal(parseJudgement("{\"decision\":\"maybe\",\"text\":\"x\",\"evidence\":[]}"), undefined);
});

test("only commits the repository answers to are inspected; a name it cannot find is reported unfound", async () => {
  const exec = (_cmd, args, _options, done) => {
    const verb = args[2];
    if (verb === "cat-file") done(args[4] === "0123abc" ? null : new Error("bad object"), args[4] === "0123abc" ? "commit\n" : "");
    else done(null, `${verb} output for ${args.at(-1)}`);
  };
  const inspected = await readCommitEvidence(proposal, { repositoryRoot: "/repo", exec });
  assert.deepEqual(inspected.map(({ label, found }) => [label, found]), [["commit:0123abc", true]]);
  const missing = await readCommitEvidence({ ...proposal, result: { value: { commit: "deadbee" } } }, { repositoryRoot: "/repo", exec });
  assert.deepEqual(missing.map(({ label, found }) => [label, found]), [["commit:deadbee", false]]);
  assert.deepEqual(await readCommitEvidence(proposal, {}), []);
});

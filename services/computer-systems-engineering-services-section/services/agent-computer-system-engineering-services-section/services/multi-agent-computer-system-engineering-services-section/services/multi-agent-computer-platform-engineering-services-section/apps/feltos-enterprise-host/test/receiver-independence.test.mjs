import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { agencyAt, coordinatingOffice } from "@red-cup-engineering/metroplat/offices";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { outcomeJournal, outcomeOf, proposalResources } from "@red-cup-engineering/organizing/enterprise";
import { ATTEMPT_TYPE, inferenceReceivingCarrier } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/carrier/inference-receiving-carrier";
import { readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { INFERENCE_RECEIVER_DEFAULT_OFFICES, inferenceReceiver, officeReach } from "../src/agency-work.mjs";
import { modelFamily, rankReceivers, receivedOutcomeFields } from "../src/receiver-independence.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const house = here.slice(0, here.indexOf(`${path.sep}services${path.sep}engineering-services-section`));
const scratch = () => mkdtempSync(path.join(tmpdir(), "receiver-independence-"));

const QWEN = "qwen/qwen3.8-27b";
const price = (value) => () => Object.freeze({ price: value, exhausted: false, binding: null });
const receiver = (workerId, family, models, cost, office = "engineering-assurance-engineer") =>
  ({ carrier: { workerId, family, pricing: price(cost) }, models, office, receivesFrom: ["junior-engineer"] });
const codex = receiver("codex", "openai", ["gpt-5.5"], 1);
const antigravity = receiver("antigravity", "google", ["gemini-3.8-flash"], 0.2);
const third = receiver("groq-receiver", "alibaba", [QWEN], 0);
const declared = { codex: "openai", antigravity: "google" };
const familyOf = (character) => declared[character];
const proposalBy = (producer, model) => ({
  receipt: "receipt-1", subject: "subject-1", scope: "scope-1", skill: "engineering-delivery", receiverCondition: "the slice lands and is demonstrated",
  producer: { id: producer, revision: `${producer}:${model}` }, origin: { kind: "office-service", office: "junior-engineer", session: `${producer}-session`, model, invocation: "invocation-1" },
  result: { kind: "skill-result", value: { commit: "0123abc" } }, providerEvidence: ["agy-exit:0"],
});

test("a model's family is read from its name, for every carrier family the house runs", () => {
  assert.equal(modelFamily("gpt-5.5"), "openai");
  assert.equal(modelFamily("openai/gpt-oss-20b"), "openai", "a model's lineage is its maker's, whoever hosts it");
  assert.equal(modelFamily("gemini-3.8-flash"), "google");
  assert.equal(modelFamily(QWEN), "alibaba");
  assert.equal(modelFamily("claude-opus-5-5"), "anthropic");
  assert.equal(modelFamily("metroplat/bounded-inference"), undefined);
});

test("work Antigravity produced is received by the third family before Codex, and by neither's own family", () => {
  const ranked = rankReceivers([codex, antigravity, third], proposalBy("antigravity", "gemini-3.8-flash"), familyOf);
  assert.deepEqual(ranked.map((entry) => entry.carrier.workerId), ["groq-receiver", "codex", "antigravity"]);
  assert.deepEqual(ranked.map((entry) => entry.independence), [0, 0, 3]);
});

test("work Codex produced may go to either independent family; the third is chosen and Antigravity stays the fallback", () => {
  const ranked = rankReceivers([codex, antigravity, third], proposalBy("codex", "gpt-5.5"), familyOf);
  assert.deepEqual(ranked.map((entry) => entry.independence), [0, 0, 3]);
  assert.deepEqual(ranked.slice(0, 2).map((entry) => entry.carrier.workerId).sort(), ["antigravity", "groq-receiver"]);
  assert.equal(rankReceivers([codex, antigravity], proposalBy("codex", "gpt-5.5"), familyOf)[0].carrier.workerId, "antigravity");
});

test("independence outranks price: a dearer receiver of another family beats a free one of the producer's own", () => {
  const sameFamilyFree = receiver("agy-twin", "google", ["gemini-3.8-pro"], 0);
  const dearOutsider = receiver("dear-outsider", "alibaba", [QWEN], 1);
  const ranked = rankReceivers([sameFamilyFree, dearOutsider], proposalBy("antigravity", "gemini-3.8-flash"), familyOf);
  assert.deepEqual(ranked.map((entry) => entry.carrier.workerId), ["dear-outsider", "agy-twin"]);
  assert.deepEqual(ranked.map((entry) => entry.independence), [0, 1]);
});

test("the receiver is offered only the models of another family when it carries several", () => {
  const mixed = receiver("mixed", undefined, ["gemini-3.8-flash", QWEN], 0);
  const [first] = rankReceivers([mixed], proposalBy("antigravity", "gemini-3.8-flash"), familyOf);
  assert.deepEqual(first.models, [QWEN]);
});

test("the host composes the third receiver from the provider CIE admits for zero-cash schema-bound work, receiving only", () => {
  const binding = defaultFilesystemBinding(scratch());
  const compose = (environment) => inferenceReceiver({ binding, identity: { id: "node-1" }, environment: { DIRECT_ENDPOINT_PROVIDER_CONFIG: undefined, ...environment }, repositoryRoot: house });
  assert.equal(compose({}), undefined, "no credential, no carrier");
  assert.equal(compose({ API_KEY_GROQ: "test-credential", METROPLAT_INFERENCE_RECEIVER: "off" }), undefined);
  const carrier = compose({ API_KEY_GROQ: "test-credential" });
  assert.ok(carrier, "an admitted, credentialed zero-cash provider yields the carrier");
  assert.equal(carrier.family, "alibaba");
  assert.equal(carrier.receivingOnly, true);
  assert.deepEqual(carrier.models, [QWEN]);
  assert.deepEqual(carrier.serves, INFERENCE_RECEIVER_DEFAULT_OFFICES);
  assert.equal(carrier.pricing().price, 0);
  assert.throws(() => carrier.adapter({}), /receiving only/);
  assert.notEqual(carrier.family, modelFamily("gpt-5.5"));
  assert.notEqual(carrier.family, modelFamily("gemini-3.8-flash"));
});

test("serving the assurance office alone qualifies it to receive the junior engineer's delivery, and nothing else", () => {
  const binding = defaultFilesystemBinding(scratch());
  const character = "inference-receiver-groq";
  const office = coordinatingOffice(binding, character, "engineering-assurance-engineer", "work-discharge-admit", binding, INFERENCE_RECEIVER_DEFAULT_OFFICES);
  assert.ok(office.receivesFrom.some((ref) => ref === "junior-engineer" || ref.endsWith("#junior-engineer")));
  assert.throws(() => coordinatingOffice(binding, character, "junior-engineer", "work-discharge-admit", binding, INFERENCE_RECEIVER_DEFAULT_OFFICES), /no held office|does not grant/);
  const reach = officeReach(binding, agencyAt(house), character, INFERENCE_RECEIVER_DEFAULT_OFFICES);
  assert.ok(![...reach].some((key) => key.endsWith("#junior-engineer")), "it is never staffed for the duty it receives");
});

test("a judgement from the third receiver is booked on the one outcome path, as the origin office's delivery judged by the assurance office", async () => {
  const dataRoot = scratch();
  const sessions = [];
  const carrier = inferenceReceivingCarrier({
    workerId: "groq-receiver", dataRoot, nodeName: "node-1", model: QWEN, family: "alibaba",
    descriptor: () => ({ provider: "urn:ame:groq-inference-team", model: QWEN }),
    readEvidence: async () => [{ label: "commit:0123abc", found: true, text: "the commit lands the slice and its test" }],
    dispatch: async ({ messages }) => {
      assert.match(messages[1].content, /receiverCondition/);
      assert.match(messages[1].content, /commit:0123abc/);
      return { text: JSON.stringify({ decision: "accepted", text: "the commit lands the slice", evidence: ["commit:0123abc"] }), exchanges: [{ usage: { promptTokens: 900, outputTokens: 80, totalTokens: 980 } }] };
    },
    onReceivingSession: (_review, session) => sessions.push(session),
  });
  const proposal = proposalBy("antigravity", "gemini-3.8-flash");
  const review = { agent: "groq-receiver", office: "engineering-assurance-engineer", proposal, staffing: { carrier: QWEN } };
  assert.equal(carrier.receivingFinished(review), false);
  const outcome = await carrier.receive(review);
  assert.equal(outcome.judgement.decision, "accepted");
  assert.deepEqual(outcome.judgement.evidence, ["commit:0123abc"]);
  assert.equal(outcome.session.model, QWEN);
  assert.equal(sessions[0].id, outcome.session.id, "the host admits the session the judgement is made under");
  assert.deepEqual(outcome.usage, { input_tokens: 900, output_tokens: 80 });
  assert.equal(carrier.receivingJudged(review), true);
  // The attempt is one record of the host's store, a thread named by its receipt's key.
  const key = outcome.task.replace(/^receive-/u, "");
  const attempts = [...walk(dataRoot, ATTEMPT_TYPE, readHead(dataRoot, ATTEMPT_TYPE, key)?.frontier ?? [])].filter((step) => step.record !== undefined);
  assert.deepEqual(attempts.map(({ record }) => [record.attempt, record.judgement.decision]), [[0, "accepted"]]);

  const discharge = { decision: "accepted", text: outcome.judgement.text, evidence: outcome.judgement.evidence };
  const at = "2026-10-04T12:00:00.000Z";
  const journal = outcomeJournal(scratch());
  const resources = proposalResources({ resources: [{ resource: "input-tokens", unit: "token", amount: "900", carrier: QWEN }] });
  journal.record(outcomeOf({ ...receivedOutcomeFields({ proposal, discharge, office: review.office, at }), resources }));
  const [booked] = journal.read();
  assert.equal(booked.source, "work-discharge");
  assert.equal(booked.provider, "junior-engineer");
  assert.equal(booked.judge, "engineering-assurance-engineer");
  assert.equal(booked.verdict, "accepted");
  assert.equal(booked.carrier, "gemini-3.8-flash", "staffing learns on the model that produced, not the one that judged");
  assert.equal(booked.player.bearer, "antigravity");
  assert.ok(booked.evidence.includes("receipt-1") && booked.evidence.includes("commit:0123abc"));
});

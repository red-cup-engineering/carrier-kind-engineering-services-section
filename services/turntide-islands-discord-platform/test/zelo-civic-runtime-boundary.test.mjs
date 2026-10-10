import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { civicAnswerForMessage, shouldReply } from "../src/turntide-software-system/steward.mjs";
import { runCivicScheduledRoutines } from "../src/turntide-software-system/civic-scheduled-routines.mjs";

// The enacted Zelo civic runtime record (causeway-services/turntide-islands-services-section,
// data/records/governance/zelo-civic-runtime.json, version 15) binds this delivery adapter to these rules.
const RUNTIME_RULES = Object.freeze({
  deliveryAdapterIsAuthority: false,
  runtimeMayExpandAuthority: false,
  runtimeMayInferVoteFromDiscord: false,
  runtimeMayCreateBindingActFromRehearsal: false,
  silenceWhenNoMaterialOutput: true,
});

// The civic kernel is Turntide's, loaded from TURNTIDE_PUBLIC_ROOT. This one answers with what it was
// asked, so the test can see exactly what the adapter passed in and what it added on the way out.
const KERNEL = `
import { readFile } from "node:fs/promises";
import path from "node:path";
const answer = (fn) => (context, options = {}) => ({ fn, options });
export async function loadZeloCivicContext(root) { return JSON.parse(await readFile(path.join(root, "context.json"), "utf8")); }
export const formatZelo = (value) => "KERNEL " + JSON.stringify(value);
export const orientTurntider = answer("orientTurntider");
export const explainTurntide = answer("explainTurntide");
export const placeCivicGuide = answer("placeCivicGuide");
export const routineStudio = answer("routineStudio");
export const decisionProcedureWayfinding = answer("decisionProcedureWayfinding");
export const standingWayfinding = answer("standingWayfinding");
export const contestWayfinding = answer("contestWayfinding");
export const tidepoolCivicMap = answer("tidepoolCivicMap");
export const participationPaths = answer("participationPaths");
export const draftProposal = answer("draftProposal");
export const draftRoutineCandidate = answer("draftRoutineCandidate");
export function scheduledCivicReview(context, { state = {} } = {}) {
  return { outputs: context.outputs ?? [], nextState: { ...state, version: 1, initialized: true } };
}
`;

async function civicRoot(t, context = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "zelo-runtime-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "lib"), { recursive: true });
  await mkdir(path.join(root, "data"), { recursive: true });
  await writeFile(path.join(root, "lib", "zelo-civic-service.mjs"), KERNEL);
  await writeFile(path.join(root, "context.json"), JSON.stringify(context));
  return { source: { TURNTIDE_PUBLIC_ROOT: root, TTI_AGENT_DATA_ROOT: path.join(root, "data") }, dataRoot: path.join(root, "data") };
}

class RecordingTransport {
  constructor() { this.sent = []; }
  async createMessage(channelId, input) {
    this.sent.push({ channelId, content: input.content });
    return { id: `sent-${this.sent.length}` };
  }
}

const channel = (name) => ({ id: `channel-${name}`, name });

test("the delivery adapter relays the kernel's answer and adds no authority of its own", async (t) => {
  assert.equal(RUNTIME_RULES.deliveryAdapterIsAuthority, false);
  assert.equal(RUNTIME_RULES.runtimeMayExpandAuthority, false);
  const { source, dataRoot } = await civicRoot(t);
  const answer = await civicAnswerForMessage(channel("dock"), { id: "m1", authorId: "islander", content: "Zelo: what is Turntide?" }, source);
  assert.equal(answer, `KERNEL ${JSON.stringify({ fn: "explainTurntide", options: {} })}`);
  assert.deepEqual(await readdir(dataRoot), []);
});

test("Discord reactions, roles and mentions never become a vote or standing", async (t) => {
  assert.equal(RUNTIME_RULES.runtimeMayInferVoteFromDiscord, false);
  const { source, dataRoot } = await civicRoot(t);
  const place = channel("governance-discussion");
  const bare = { id: "m2", authorId: "islander", content: "Zelo: does this need a vote?" };
  const loud = {
    ...bare,
    id: "m3",
    reactions: [{ emoji: "👍", count: 40 }],
    memberRoles: ["governor", "islander"],
    mentionedUserIds: ["zelo-bot", "governor-1", "governor-2"],
  };
  const quiet = await civicAnswerForMessage(place, bare, source);
  assert.equal(await civicAnswerForMessage(place, loud, source), quiet);
  assert.equal(quiet, `KERNEL ${JSON.stringify({ fn: "decisionProcedureWayfinding", options: { kind: "ordinary-governance-act" } })}`);
  assert.deepEqual(await readdir(dataRoot), []);
});

test("a rehearsal leaves no binding act behind", async (t) => {
  assert.equal(RUNTIME_RULES.runtimeMayCreateBindingActFromRehearsal, false);
  const { source, dataRoot } = await civicRoot(t);
  const answer = await civicAnswerForMessage(channel("governance-proposals"), {
    id: "m4", authorId: "islander", content: "Zelo, walk me through this governance change as a dry run",
  }, source);
  assert.match(answer, /^KERNEL /u);
  assert.deepEqual(await readdir(dataRoot), []);
});

test("scheduled civic review is silent when the kernel has no material output", async (t) => {
  assert.equal(RUNTIME_RULES.silenceWhenNoMaterialOutput, true);
  const { source, dataRoot } = await civicRoot(t, { outputs: [] });
  const transport = new RecordingTransport();
  const run = await runCivicScheduledRoutines({ transport, channels: [channel("governance-action")], source, dataRoot, now: "2026-10-10T12:00:00.000Z" });
  assert.deepEqual(transport.sent, []);
  assert.deepEqual(run.deliveries, []);
});

test("scheduled civic review delivers the kernel's output as written", async (t) => {
  const content = "Decision/action reconciliation found 1 unsettled governance act(s).";
  const { source, dataRoot } = await civicRoot(t, { outputs: [{ routine: "decision-action-reconciliation", channel: "governance-action", content }] });
  const transport = new RecordingTransport();
  await runCivicScheduledRoutines({ transport, channels: [channel("governance-action")], source, dataRoot, now: "2026-10-10T12:00:00.000Z" });
  assert.deepEqual(transport.sent, [{ channelId: "channel-governance-action", content }]);
});

test("Zelo answers a mention anywhere and its name only in the civic places", () => {
  assert.equal(shouldReply("<@zelo-bot> hello", "zelo-bot", "general"), true);
  assert.equal(shouldReply("Zelo: what can I actually do here?", "zelo-bot", "governance-questions"), true);
  assert.equal(shouldReply("zelo, walk me through it", "zelo-bot", "dock"), true);
  assert.equal(shouldReply("Zelo: hello", "zelo-bot", "general"), false);
  assert.equal(shouldReply("I wonder how proposals work", "zelo-bot", "governance-questions"), false);
  assert.equal(shouldReply("zeloto is a word", "zelo-bot", "governance-questions"), false);
  assert.equal(shouldReply("Zelo: hello", "zelo-bot"), false);
});

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import { userSenMessage } from "@red-cup-engineering/a2a-services-section/sen-part";
import { deliverActivity } from "@red-cup-engineering/activitypub-services-section";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { extractSenActivity, projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { readLatestCodexTasks } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/operations";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { characterInboxFeed, officeOperations } from "@red-cup-engineering/metroplat/offices";
import { activityPubActorsAtHost, createActivityPubNodeArrivalHandler } from "../src/activitypub-node.mjs";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function checkoutRoot(from) {
  for (let directory = path.resolve(from); directory !== path.dirname(directory); directory = path.dirname(directory)) {
    if (existsSync(path.join(directory, ".git"))) return directory;
  }
  throw new Error("no Git checkout above the ActivityPub node receiving check");
}
async function until(predicate, label) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = predicate();
    if (value) return value;
    await sleep(10);
  }
  throw new Error(`timed out waiting for ${label}`);
}

const state = await mkdtemp(path.join(tmpdir(), "activitypub-node-receiving-"));
const originalFetch = globalThis.fetch;
let local;
let singleton;
try {
  const origin = "http://127.0.0.1:18807";
  const repository = checkoutRoot(path.dirname(fileURLToPath(import.meta.url)));
  const agencyRoot = path.join(repository, "lib");
  const actors = await activityPubActorsAtHost({ agencyRoot, host: "bare-cedar-fog", keysDirectory: path.join(state, "keys") });
  const requests = [];
  const onActivity = createActivityPubNodeArrivalHandler({
    dataRoot: state,
    rootName: "bare-cedar-fog.561.group",
    origin,
    actors,
  });
  local = await createLocalActivityPubProvider({
    origin,
    statePath: path.join(state, "activitypub.sqlite"),
    actors,
    queue: false,
    allowPrivateAddress: true,
    onActivity,
  });
  globalThis.fetch = async (request, init) => {
    const incoming = request instanceof Request ? request : new Request(request, init);
    const clone = incoming.clone();
    const response = await local.provider.fetch(incoming);
    if (clone.method === "POST" && new URL(clone.url).pathname.endsWith("/inbox")) {
      requests.push({ request: clone, response: response.clone(), body: await clone.json() });
    }
    return response;
  };

  const webfinger = {};
  const actorDocuments = {};
  for (const identifier of ["claude", "codex"]) {
    const lookup = new Request(`${origin}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${identifier}@127.0.0.1:18807`)}`, { headers: { accept: "application/jrd+json" } });
    const response = await local.provider.fetch(lookup);
    webfinger[identifier] = { request: lookup.url, status: response.status, body: await response.json() };
    const actorResponse = await local.provider.fetch(new Request(`${origin}/actors/${identifier}`, { headers: { accept: "application/activity+json" } }));
    actorDocuments[identifier] = await actorResponse.json();
  }

  const assignment = {
    responsibility: "Read one local file",
    instruction: "Read package.json and report its package name. Make no changes.",
    owner: "activitypub-services-section",
    receivingCheck: "The addressed Codex inbox retains this signed message as evidence.",
    effects: "read-only",
  };
  const assignmentKind = "codex.assignment";
  const objectBytes = senActivityObjectBytes({ objectKind: assignmentKind, value: assignment });
  const message = userSenMessage(objectBytes, "codex-assignment.sen.cbor", "urn:a2a:message:receiving-check");
  const activity = projectSenActivity({
    type: "Create", origin, identifier: "claude", recipient: `${origin}/actors/codex`, objectBytes,
    agentCard: `${origin}/actors/claude`, a2aMessage: message, a2aRole: "ROLE_USER", eventTime: new Date().toISOString(),
  });

  const unsignedResponse = await local.provider.fetch(new Request(`${origin}/actors/codex/inbox`, {
    method: "POST", headers: { "content-type": "application/activity+json" }, body: JSON.stringify(activity),
  }));
  await deliverActivity(local.provider, { identifier: "claude", recipient: `${origin}/actors/codex`, inbox: `${origin}/actors/codex/inbox`, activity });
  await until(() => journal.scanCausalSubject(state, characterInboxFeed, "9999-12-31", [], (rows, row) => {
    if (row[2]?.kind === "metroplat.character-inbox-message" && row[2].objectKind === assignmentKind) rows.push(row[2]);
    return rows;
  }).result.length === 1, "Codex assignment in the character inbox");

  const signedAssignment = requests.find((entry) => entry.body.actor === `${origin}/actors/claude`);
  const retainedProjection = extractSenActivity(signedAssignment.body, {
    expectedActor: actorDocuments.claude.id,
    expectedRecipient: actorDocuments.codex.id,
  });
  const tamperedBody = { ...signedAssignment.body, id: `${signedAssignment.body.id}-tampered` };
  const wronglySignedResponse = await local.provider.fetch(new Request(signedAssignment.request.url, {
    method: "POST",
    headers: signedAssignment.request.headers,
    body: JSON.stringify(tamperedBody),
  }));

  const wrongRecipientActivity = projectSenActivity({
    type: "Create", origin, identifier: "claude", recipient: `${origin}/actors/claude`, objectBytes,
    agentCard: `${origin}/actors/claude`, a2aMessage: message, a2aRole: "ROLE_USER", eventTime: new Date().toISOString(),
  });
  const wrongRecipientRequestStart = requests.length;
  try {
    await deliverActivity(local.provider, {
      identifier: "claude", recipient: `${origin}/actors/codex`, inbox: `${origin}/actors/codex/inbox`, activity: wrongRecipientActivity,
    });
  } catch { /* The signed delivery can report the receiver's refusal either in-band or by status. */ }
  const wrongRecipientRejected = requests.length > wrongRecipientRequestStart
    && requests.slice(wrongRecipientRequestStart).every((entry) => entry.response.status >= 400);

  const hookOperation = officeOperations({ dataRoot: state, agencyRoot, now: () => new Date().toISOString() }, () => []).find((entry) => entry.verb === "harness-hook-event-admit");
  const codexActor = actors.find((actor) => actor.identifier === "codex");
  const codexHook = await hookOperation.execute({ harness: "codex", payload: { hook_event_name: "SessionStart", session_id: "receiving-check-codex-session", model: "fixture" } }, [], { invocation: { subject: codexActor.character.id } });
  const codexContext = codexHook.hookSpecificOutput.additionalContext;

  const codexRows = [...readLatestCodexTasks(state).values()];
  const inboxRows = journal.scanCausalSubject(state, characterInboxFeed, "9999-12-31", [], (rows, row) => { rows.push(row[2]); return rows; }).result;
  const arrivalRows = journal.scanCausalSubject(state, "arrival", "9999-12-31", [], (rows, row) => {
    if (row[2]?.kind === "metroplat.arrival.source-witness" && row[2].rootName === "bare-cedar-fog.561.group") rows.push(row[2]);
    return rows;
  }).result;
  const keyFiles = Object.fromEntries(await Promise.all(["claude", "codex"].map(async (identifier) => [identifier, fingerprint(JSON.parse(await readFile(path.join(state, "keys", `${identifier}.json`), "utf8")).map((pair) => pair.publicKey))])));
  singleton = await createLocalActivityPubProvider({
    origin,
    identifier: "legacy",
    actorName: "Legacy single actor",
    summary: "Compatibility form",
    keyPath: path.join(state, "legacy-keys.json"),
    statePath: path.join(state, "legacy.sqlite"),
    queue: false,
    allowPrivateAddress: true,
    onActivity: async () => {},
  });
  const singletonActorStatus = (await singleton.provider.fetch(new Request(`${origin}/actors/legacy`, { headers: { accept: "application/activity+json" } }))).status;
  const retainedAssignment = inboxRows.find((row) => row.kind === "metroplat.character-inbox-message" && row.character === codexActor.character.id && row.objectKind === assignmentKind);
  const exactCustody = {
    oneSourceWitness: arrivalRows.length === 1,
    source: arrivalRows[0]?.cloudEvent.source === actorDocuments.claude.id,
    sourceCommitment: arrivalRows[0]?.cloudEvent.identity === `${actorDocuments.claude.id}#${retainedProjection.cloudEvent.id}`,
    sender: retainedAssignment?.sender === actorDocuments.claude.id,
    content: isDeepStrictEqual(retainedAssignment?.value, assignment),
    envelopeCommitment: retainedAssignment?.id === retainedProjection.envelopeNi,
    exactObjectBytes: Buffer.from(retainedProjection.objectBytes).equals(objectBytes),
    exactA2aProjection: fingerprint(retainedAssignment?.message) === fingerprint(retainedProjection.a2aMessage),
  };
  const proof = {
    actorDocuments: webfinger.claude.status === 200 && webfinger.codex.status === 200
      && actorDocuments.claude.id !== actorDocuments.codex.id
      && JSON.stringify(actorDocuments.claude.publicKey) !== JSON.stringify(actorDocuments.codex.publicKey),
    invalidArrivalsRefused: unsignedResponse.status >= 400 && wronglySignedResponse.status >= 400 && wrongRecipientRejected,
    exactSignedInboxEvidence: Object.values(exactCustody).every(Boolean),
    noAutomaticExecution: codexRows.length === 0 && !inboxRows.some((row) => row.objectKind === "codex.report")
      && !requests.some((entry) => entry.body.actor === actorDocuments.codex.id),
    selectableInboxContext: codexContext.includes("codex.assignment") && codexContext.includes("Read one local file"),
    singletonActorCompatibility: singletonActorStatus === 200,
  };
  const output = {
    ok: Object.values(proof).every(Boolean), proof, exactCustody,
    webfinger,
    actors: Object.fromEntries(Object.entries(actorDocuments).map(([identifier, actor]) => [identifier, { id: actor.id, inbox: actor.inbox, publicKey: actor.publicKey?.id, keyFingerprints: actor.assertionMethod.map((key) => fingerprint(key.publicKeyMultibase)) }])),
    keyCustody: keyFiles,
    requests: requests.map((entry) => ({ method: entry.request.method, url: entry.request.url, signed: entry.request.headers.has("signature") || entry.request.headers.has("signature-input"), status: entry.response.status, actor: entry.body.actor, to: entry.body.to, a2aRole: entry.body.actor.endsWith("/claude") ? "ROLE_USER" : "ROLE_AGENT" })),
    refusals: { unsigned: unsignedResponse.status, wronglySigned: wronglySignedResponse.status, wrongRecipientRejected,
      wrongRecipientStatuses: requests.slice(wrongRecipientRequestStart).map((entry) => entry.response.status) },
    singleIdentifierCompatibility: { actorStatus: singletonActorStatus },
    harnessHook: { CodexSessionReceivesAssignmentAsInboxContext: codexContext.includes("codex.assignment") && codexContext.includes("Read one local file"), additionalContext: codexContext },
    rows: {
      codexTasks: codexRows,
      characterInbox: inboxRows.map(({ message: carried, ...row }) => carried === undefined ? row : ({ ...row, message: { messageId: carried.messageId, contextId: carried.contextId, taskId: carried.taskId, role: carried.role, referenceTaskIds: carried.referenceTaskIds } })),
      arrivals: arrivalRows,
    },
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.ok) process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  await singleton?.close();
  await local?.close();
  await rm(state, { recursive: true, force: true });
}

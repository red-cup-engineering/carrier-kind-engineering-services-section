// ingest.mjs — the act-on-its-own inbox: a governed, replay-deterministic ingest queue that turns
// external messages/events into autonomous governed work. This is the center of gravity for autonomy:
// where swarm stops being a thing you call and starts being a thing that acts on what arrives.
//
// THE LIFT. The single-writer discipline this needs already exists, unused, in
// @561-group/computer/request-queue (createRequestQueue): a network request NEVER touches the trace —
// it is validated into a clean intent and ENQUEUED; the loop is the only writer; arrival timing is
// frozen into DRAIN ORDER exactly once, so replay over a drained sequence is byte-for-byte. We wrap
// that primitive and bolt the swarm-y spine onto its two ends:
//
//   receive(raw)  — the TRUST BOUNDARY. validate(raw) -> intent|null shapes raw JSON from outside into
//                   a known ingest intent or rejects it. An accepted intent is recorded as a durable
//                   EAVT cell at triggers/ingest/<id> (events.mjs:211 writeTrace) — an inbound message
//                   is a DEPOSIT on the ingest field (stigmergy), and two contradicting sources settle
//                   to a HELD ⊤ in that cell, never last-writer — THEN enqueued. A rejected raw never
//                   enters the queue and never appends a trigger; it leaves a named-gap, not a crash.
//
//   drain(agent)  — the SINGLE WRITER. Per intent, in arrival order, every ingested action passes the
//                   THREE gates: it fires runGovernedTool (tool-policy admission of the external sender
//                   as a bounded principal -> Gov regime -> held-⊤ safety) BEFORE any effect. A refused
//                   / unsettled / contested call is surfaced on the result cell, NOT executed. NO
//                   ingested action bypasses the gate.
//
// TIME IS INJECTED. This module owns no clock: no setInterval, no Date.now in a hot path. `now` is
// passed in (the daemon bin owns the wall clock), so a fixed options.now makes every id and every cell
// t-token deterministic — that is what lets a replay over the same drained sequence be byte-identical.

import { createRequestQueue } from "@561-group/computer/request-queue";


import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";

// resolveRunGovernedTool — the drain's governed-execute. An injected options.runGovernedTool (a TEST
// SEAM, mirroring agent-loop.mjs:34) takes precedence, then the real sibling, then a fail-closed stub
// that holds nothing and REFUSES with "active". Fail-closed is the whole point: an ingested action whose
// gate is unavailable must not run.
async function resolveRunGovernedTool(injected) {
  if (typeof injected === "function") return injected;
  try {
    const mod = await import("./governed-tool-runner.mjs");
    if (typeof mod.runGovernedTool === "function") return mod.runGovernedTool;
  } catch {
    /* sibling not yet landed — fall through to fail-closed stub */
  }
  return (root, agent, call) => ({
    tool: call?.name ?? "",
    value: "active",
    gate: "no-runner",
    outcome: "refused",
    traceLog: "",
    reason: "governed-tool-runner unavailable",
    result: { value: null },
  });
}

// the ingest intent shape after validation. validate(raw) returns whatever the app's trust boundary
// produces; ingest only requires it to be a non-null object once accepted. An intent that names a tool
// call drives the gate; the {name, arguments} fields are read at drain time. WHICH intents are valid is
// the app's domain (validate is a PARAMETER), never baked in here.
function intentName(intent) {
  return intent?.name ?? intent?.tool ?? intent?.intent ?? "";
}

// createIngest(root, { validate, runGovernedTool }) — construct the inbox. The validate function is the
// trust boundary handed straight to createRequestQueue (single-writer enqueue). runGovernedTool is the
// gate the drain fires (resolved lazily, fail-closed). Both are PARAMETERS — no policy is baked in here.
export function createIngest(root, options = {}) {
  if (root == null) throw new TypeError("createIngest: root is required");
  const validate = options.validate;
  if (validate !== undefined && typeof validate !== "function") {
    throw new TypeError("createIngest: validate must be a function");
  }
  // createRequestQueue defaults validate to identity-over-non-null-object when undefined.
  const queue = validate ? createRequestQueue(validate) : createRequestQueue();

  const ingest = {
    root,
    queue,
    // the resolved gate is memoized on first drain so a fixed seam is used for the whole run.
    _runGovernedTool: null,
    _runGovernedToolInjected: options.runGovernedTool,
    // arrival counter — append-order witness on each trigger cell, independent of the wall clock.
    _arrived: 0,
  };

  ingest.receive = (rawMessage, receiveOptions = {}) => ingestReceive(ingest, rawMessage, receiveOptions);
  ingest.drain = (agent, drainOptions = {}) => drainIngest(agent, { ...drainOptions, ingest });
  ingest.depth = () => queue.depth();
  ingest.peek = () => queue.peek();
  return ingest;
}

// ingestReceive(ingest, rawMessage, options) — the trust boundary. validate the raw message; on accept,
// record the durable trigger cell (a deposit on the ingest field) THEN enqueue; on reject, leave a
// named-gap (no trace, no crash). Returns { accepted, intent|null, trigger|null, id|null, gap|null }.
export function ingestReceive(ingest, rawMessage, options = {}) {
  const now = options.now ?? new Date().toISOString();

  // validate is run by the queue's push (it is the queue's trust boundary). push returns the accepted
  // intent or null. We DO NOT append to the trace before validation — a network message never touches
  // the log; only a validated intent does (single-writer discipline, request-queue.mjs THE LAW).
  let intent = null;
  let threw = null;
  try {
    intent = ingest.queue.push(rawMessage);
  } catch (error) {
    // a validate that throws is itself a malformed-input fact, not a crash of the inbox.
    threw = error;
  }

  if (intent == null) {
    // NAMED GAP — the message is malformed/rejected. No trigger cell, no enqueue. The gap is surfaced
    // so the caller (and the drain's depth gauge) see a held absence, never a thrown inbox.
    return {
      accepted: false,
      intent: null,
      trigger: null,
      id: null,
      gap: {
        kind: "swarm.ingest.gap",
        reason: threw ? "validate-threw" : "rejected-by-validate",
        error: threw ? String(threw?.message ?? threw) : "",
        created: now,
      },
    };
  }

  // ACCEPTED. Record the durable EAVT trigger cell. Identity is content (stableId) so the same message
  // at the same `now` addresses the same cell — a replayed receive is byte-identical. The arrival index
  // is the append-order witness. Two contradicting sources writing the same (e,a) settle to a held ⊤ in
  // this cell (events.mjs docFromSection class B), never last-writer — the inbox never silently drops a
  // contested source.
  const arrived = ingest._arrived;
  ingest._arrived += 1;
  const id = stableId([intentName(intent), JSON.stringify(rawMessage), now, arrived], "ingest");
  const term = `triggers/ingest/${id}`;
  const doc = {
    kind: "swarm.ingest.trigger",
    id,
    created: now,
    arrived,
    source: options.source ?? intent.source ?? "external",
    sender: options.sender ?? intent.sender ?? "anonymous",
    intentName: intentName(intent),
    intent,
    raw: rawMessage,
    evidence:
      "ingest trigger: an inbound external message is a durable EAVT deposit on the ingest field; a contradicted source is held ⊤, never collapsed to last-writer",
  };
  const trace = writeTrace(ingest.root, term, doc, { t: id });

  return {
    accepted: true,
    intent,
    id,
    trigger: { term, doc, log: trace.log },
    gap: null,
  };
}

// drainIngest(agent, options) — the SINGLE-WRITER drain. options carries { ingest, now, ...gateOptions }.
// Hand the queue everything queued since the last drain (arrival order, frozen once by request-queue),
// and per intent fire the gate. Every ingested action passes runGovernedTool (the three gates) BEFORE
// any effect; the verdict is appended as a durable result cell at triggers/ingest/<id>/result. A held ⊤
// (contested) is surfaced on the result cell, NOT executed — the inbox never collapses a held ⊤.
//
// runAgentLoop is the OPTIONAL richer path: when options.runLoop is provided (and the intent asks for a
// loop), the drain hands the agent the loop instead of a single tool call; that loop itself fires the
// SAME gate per tool (agent-loop.mjs runGovernedTool), so the spine is unbroken either way.
export async function drainIngest(agent, options = {}) {
  const ingest = options.ingest;
  if (ingest == null) throw new TypeError("drainIngest: options.ingest is required");
  if (agent == null) throw new TypeError("drainIngest: agent is required");
  const now = options.now ?? new Date().toISOString();

  // resolve (and memoize) the gate once for this drain run — fail-closed if the sibling is absent.
  if (ingest._runGovernedTool == null) {
    ingest._runGovernedTool = await resolveRunGovernedTool(ingest._runGovernedToolInjected);
  }
  const runGovernedTool = ingest._runGovernedTool;

  // gateOptions are the per-call governance inputs threaded UNCHANGED to runGovernedTool
  // (toolAuthorization / delegationChain — the external sender as a bounded principal — regime,
  // recognition, safetyTerms). `now` rides along so the gate's own cell is deterministic too.
  const { ingest: _ignored, runLoop, ...gateOptions } = options;

  // freeze the arrival-order sequence ONCE (drain), then process it in that exact order. A replay over
  // this same `intents` array is byte-for-byte (request-queue.mjs THE LAW).
  const intents = ingest.queue.drain();

  const results = [];
  for (let i = 0; i < intents.length; i += 1) {
    const intent = intents[i];
    const name = intentName(intent);
    // the tool call the gate runs. An ingest intent IS a tool-call request: its name is the tool, its
    // arguments the payload. The sender's authority is carried on gateOptions.toolAuthorization.
    const call = {
      id: stableId([name, JSON.stringify(intent), now, i], "ingest-call"),
      name,
      arguments: intent.arguments ?? intent.args ?? {},
    };

    // FIRE THE GATE. No ingested action bypasses this. A refused/unsettled/contested run is surfaced on
    // the result cell, never executed past the gate.
    const run = await runGovernedTool(ingest.root, agent, call, gateOptions);

    // optional richer autonomy: a loop, only if asked AND only if the gate did not deny/hold this
    // intent. The loop runs the SAME gate per tool internally, so the spine is unbroken.
    let loop = null;
    if (typeof runLoop === "function" && intent.loop && run.value === "potential") {
      loop = await runLoop({ agent, prompt: intent.loop, root: ingest.root, ...gateOptions });
    }

    // append the durable RESULT cell — one per ingested intent, in arrival order. The held-⊤ value is
    // recorded faithfully (a contested run is value ⊤, outcome "contested"), never collapsed to a
    // yes/no. This is the witness that closes the ingest -> governed-action loop.
    const resultId = stableId([call.id, run.value ?? "", now], "ingest-result");
    const resultTerm = `triggers/ingest/${call.id}/result`;
    const resultDoc = {
      kind: "swarm.ingest.result",
      id: resultId,
      created: now,
      arrived: i,
      agent: agent.name,
      intentName: name,
      callId: call.id,
      value: run.value ?? "",
      gate: run.gate ?? "",
      outcome: run.outcome ?? "",
      reason: run.reason ?? "",
      governedTraceLog: run.traceLog ?? "",
      executed: run.value === "potential",
      contested: run.value === "stable",
      loopRunId: loop?.runId ?? "",
      loopStop: loop?.stop ?? "",
      evidence:
        "ingest result: every ingested action passed the three gates (tool-policy admission, Gov regime, held-⊤ safety) before any effect; a contested action is held ⊤, surfaced not executed",
    };
    const trace = writeTrace(ingest.root, resultTerm, resultDoc, { t: resultId });

    results.push({
      intent,
      call,
      run,
      loop,
      result: { term: resultTerm, doc: resultDoc, log: trace.log },
    });
  }

  return {
    drained: intents.length,
    results,
    // the four-valued tally — how many ingested actions executed, were refused, held unsettled, or
    // surfaced a held ⊤. The held ⊤ is counted, never hidden.
    executed: results.filter((r) => r.run.value === "potential").length,
    contested: results.filter((r) => r.run.value === "stable"),
    refused: results.filter((r) => r.run.value === "active").length,
    unsettled: results.filter((r) => r.run.value === "absurd").length,
    agent,
  };
}

export default createIngest;

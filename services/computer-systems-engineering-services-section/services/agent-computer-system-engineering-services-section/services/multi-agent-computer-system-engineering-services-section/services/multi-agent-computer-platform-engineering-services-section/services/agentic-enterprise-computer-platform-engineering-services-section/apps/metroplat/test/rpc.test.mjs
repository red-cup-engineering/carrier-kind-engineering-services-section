import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { authorizationFromCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { authorizationFromStanding, dispatch } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { createOperationCatalog, operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { invocation } from "@red-cup-engineering/computer-system-engine/rpc/invocation";
import { grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { projectSurface } from "@red-cup-engineering/metroplat/presentation/surface";
import { dispatchProjectedSurface } from "@red-cup-engineering/computer-system-engine/rpc/wire-dispatch";
import { programMcpHandle, routeRequest } from "@red-cup-engineering/metroplat/presentation/serving";
import { mcpToolRefusalContract } from "@red-cup-engineering/mcp-engineering-services-section/catalog";
import { filesystemRpcFeedResponder, journalRpcWitness, rpcEvidenceType } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { each, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { rpcAdmittedStepsOfRows } from "@red-cup-engineering/computer-system-engine/journal/reading/rpc-sequence";
import { eavtKey, eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

const at = () => "2026-07-11T12:00:00.000Z";

function memoryWitness(events, failAt) {
  const heads = new Map();
  return Object.freeze({
    causalHead(invocation) { return heads.get(invocation) ?? Object.freeze([]); },
    admit(evidence) {
      events.push(evidence);
      if (failAt === evidence.kind) throw new Error(`refused ${evidence.kind}`);
      const receipt = Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id: `evidence:${events.length}`,
        evidence: evidence.kind,
        eventIds: Object.freeze([`event:${events.length}`]),
      });
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      heads.set(invocation, receipt.eventIds);
      return receipt;
    },
  });
}

function candidate(operation_, request = "request:1") {
  return invocation({
    request,
    subject: "subject:test",
    operation: operation_.ref,
    verb: operation_.verb,
    resource: "test",
    input: { value: 2 },
    caller: { transport: "test" },
    observedAt: at(),
  });
}

test("RPC witnesses attempt and decision before handler, then witnesses its typed outcome", async () => {
  const order = [];
  const action = operation({ verb: "double", run: ({ value }) => { order.push("handler"); return { value: value * 2 }; } });
  assert.equal(Object.hasOwn(action, "run"), false);
  assert.equal(typeof action.execute, "function");
  assert.equal(Object.getOwnPropertyDescriptor(action, "execute").enumerable, false);
  assert.equal(Object.hasOwn({ ...action }, "execute"), false);
  const catalog = createOperationCatalog([action]);
  const events = [];
  const witness = memoryWitness(events);
  const originalAdmit = witness.admit;
  const orderedWitness = {
    causalHead: witness.causalHead,
    admit(evidence) { order.push(evidence.kind); return originalAdmit(evidence); },
  };
  const receipt = await dispatch({
    catalog,
    witness: orderedWitness,
    authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
    now: at,
  }, candidate(action));
  assert.equal(receipt.ok, true);
  assert.deepEqual(receipt.value, { value: 4 });
  assert.deepEqual(order, ["metroplat.rpc.attempt", "metroplat.rpc.decision", "handler", "metroplat.rpc.outcome"]);
  assert.deepEqual(events.map(({ kind }) => kind), ["metroplat.rpc.attempt", "metroplat.rpc.decision", "metroplat.rpc.outcome"]);
});

test("invocation identity is stable across transport retries with the same request key", () => {
  const action = operation({ verb: "retry", run: (input) => input });
  const first = candidate(action, "stable-request");
  const second = invocation({
    request: "stable-request",
    subject: first.subject,
    operation: first.operation,
    verb: first.verb,
    resource: first.resource,
    input: first.input,
    caller: { transport: "different" },
    observedAt: "2026-07-11T13:00:00.000Z",
    causes: ["different-arrival"],
  });
  assert.equal(first.id, second.id);
});

test("operation references identify semantic declarations and catalogs reject collisions", () => {
  const first = operation({ verb: "identity", summary: "first prose", run: () => 1 });
  const same = operation({ verb: "identity", summary: "changed prose", run: () => 2 });
  const changed = operation({
    verb: "identity",
    effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
    run: () => 1,
  });
  assert.equal(first.ref, same.ref);
  assert.notEqual(first.ref, changed.ref);
  assert.throws(() => createOperationCatalog([first, same]), /duplicate verb/u);
});

test("RPC refuses non-held standing and never reaches the handler", async () => {
  let ran = false;
  const action = operation({ verb: "governed", run: () => { ran = true; return null; } });
  const events = [];
  const receipt = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness(events),
    authorize: authorizationFromStanding(new Map([[action.ref, "contested"]])),
    now: at,
  }, candidate(action));
  assert.equal(receipt.ok, false);
  assert.equal(receipt.phase, "authorization");
  assert.equal(ran, false);
  assert.deepEqual(events.map(({ kind }) => kind), ["metroplat.rpc.attempt", "metroplat.rpc.decision", "metroplat.rpc.outcome"]);
});

test("RPC conjoins operation availability with the subject's FOUR capability standing", async () => {
  let runs = 0;
  const action = operation({ verb: "subject-governed", run: () => { runs += 1; return null; } });
  const available = authorizationFromStanding(new Map([[action.ref, "held"]]));
  const grant = grantAssertion("issuer:test", "subject:test", "test#subject-governed", at());
  const allowed = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness([]),
    authorize: authorizationFromCapabilityAssertions(available, [grant]),
    now: at,
  }, candidate(action, "subject-held"));
  assert.equal(allowed.ok, true);
  assert.equal(runs, 1);

  const unknown = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness([]),
    authorize: authorizationFromCapabilityAssertions(available, []),
    now: at,
  }, candidate(action, "subject-unknown"));
  assert.equal(unknown.ok, false);
  assert.equal(unknown.decision.reading, "unknown");

  const revoke = revokeAssertion("issuer:test", "subject:test", "test#subject-governed", at());
  const contested = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness([]),
    authorize: authorizationFromCapabilityAssertions(available, [grant, revoke]),
    now: at,
  }, candidate(action, "subject-contested"));
  assert.equal(contested.ok, false);
  assert.equal(contested.decision.reading, "contested");
  assert.equal(runs, 1);
});

test("RPC is fail-closed when attempt or decision evidence cannot be admitted", async () => {
  for (const failAt of ["metroplat.rpc.attempt", "metroplat.rpc.decision"]) {
    let ran = false;
    const action = operation({ verb: `closed-${failAt}`, run: () => { ran = true; return null; } });
    const receipt = await dispatch({
      catalog: createOperationCatalog([action]),
      witness: memoryWitness([], failAt),
      authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
      now: at,
    }, candidate(action));
    assert.equal(receipt.ok, false);
    assert.equal(ran, false);
  }
});

test("coordination-required operations cannot execute without a coordinator", async () => {
  let ran = false;
  const action = operation({
    verb: "external",
    relation: "protocol",
    effects: {
      class: "external",
      replay: "coordinated",
      coordination: "coordination-required",
      deterministic: "unmeasured",
      totality: "unmeasured",
    },
    run: () => { ran = true; return null; },
  });
  const receipt = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness([]),
    authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
    now: at,
  }, candidate(action));
  assert.equal(action.effects.coordination, "coordination-required");
  assert.equal(receipt.phase, "coordination");
  assert.equal(ran, false);
});

test("idempotency-key operations receive the content-addressed invocation id", async () => {
  let received;
  const action = operation({
    verb: "idempotent-external",
    effects: {
      class: "external",
      replay: "idempotency-key",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "unmeasured",
    },
    run: (_input, arguments_) => { received = arguments_["idempotency-key"]; return null; },
  });
  const request = candidate(action);
  const receipt = await dispatch({
    catalog: createOperationCatalog([action]),
    witness: memoryWitness([]),
    authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
    now: at,
  }, request);
  assert.equal(receipt.ok, true);
  assert.equal(received, request.id);
});

test("journal RPC evidence forms an attempt → decision → outcome causal chain", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-rpc-"));
  try {
    const action = operation({ verb: "journaled", effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" }, run: (input) => input });
    const request = invocation({
      request: "request:journaled",
      subject: "subject:test",
      operation: action.ref,
      verb: action.verb,
      resource: "test",
      input: null,
      caller: { transport: "test" },
      observedAt: at(),
    });
    const receipt = await dispatch({
      catalog: createOperationCatalog([action]),
      witness: journalRpcWitness(root),
      authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
      now: at,
    }, request);
    assert.equal(receipt.ok, true);
    // The evidence of one invocation is a thread: each piece follows the whole frontier before it.
    const events = [...each(root, rpcEvidenceType)].map(({ address, record }) => ({ id: address, evidence: record.evidence, causes: record.causes ?? [] }));
    assert.equal(events.length, 3);
    const byKind = new Map(events.map((event) => [event.evidence.kind, event]));
    assert.ok(byKind.get("metroplat.rpc.decision").causes.includes(byKind.get("metroplat.rpc.attempt").id));
    assert.ok(byKind.get("metroplat.rpc.outcome").causes.includes(byKind.get("metroplat.rpc.decision").id));

    const responder = filesystemRpcFeedResponder(root, "@emsenn/metroplat", at);
    const response = responder().response;
    assert.equal(response.status, 200);
    assert.equal((response.body.match(/event: datom/gu) ?? []).length, 3);
    assert.match(response.body, /metroplat\.rpc\.attempt/u);
    assert.match(response.body, /metroplat\.rpc\.decision/u);
    assert.match(response.body, /metroplat\.rpc\.outcome/u);

    // The feed's rows are the day's log lines, in the order they were written.
    const rows = [...readLog(root, rpcEvidenceType, at().slice(0, 10))].map(({ line }) => [line.invocation, { kind: line.kind }, line.of, line.at]);
    assert.equal(rows.length, 3);
    const evidenceRows = events.map(({ evidence }) => [null, { kind: evidence.kind }, evidence]);
    assert.deepEqual(rpcAdmittedStepsOfRows(evidenceRows), [{
      actor: "subject:test",
      verb: "journaled",
      argShape: [],
      validated: true,
    }]);
    assert.deepEqual(rpcAdmittedStepsOfRows([...evidenceRows].reverse()), rpcAdmittedStepsOfRows(evidenceRows));
    // Resume from the first line of the day's log and assert against the lines that follow it.
    const [resumeFrom, ...remainingRows] = rows;
    const resumed = responder(eavtKey(resumeFrom)).response;
    assert.equal((resumed.body.match(/event: datom/gu) ?? []).length, remainingRows.length);
    assert.doesNotMatch(resumed.body, new RegExp(eavtRecord(resumeFrom).a.kind.replace(/\./gu, "\\.")));
    for (const row of remainingRows) {
      assert.match(resumed.body, new RegExp(eavtRecord(row).a.kind.replace(/\./gu, "\\.")));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI, HTTP, and MCP projections converge on the same RPC handler", async () => {
  let calls = 0;
  const action = operation({ verb: "echo", run: (input) => { calls += 1; return input; } });
  let assertions = [];
  const surface = projectSurface([action], {
    capabilityAssertions: () => assertions,
  });
  assert.equal(Object.hasOwn(surface, "dispatch"), false);

  const evidence = [];
  const options = {
    subject: "subject:test",
    caller: { transport: "test", seat: "spoofed:caller-metadata" },
    now: at,
    witness: memoryWitness(evidence),
  };
  const unavailable = await dispatchProjectedSurface(surface, ["echo"], "{\"value\":0}", options);
  assert.equal(unavailable.code, 1);
  assert.equal(unavailable.receipt.decision.reading, "unknown");
  assert.equal(calls, 0);

  assertions = [grantAssertion("issuer:test", "subject:test", "infograph#echo", at())];
  const cli = await dispatchProjectedSurface(surface, ["echo"], "{\"value\":1}", options);
  assert.equal(cli.code, 0);

  let arrival = 0;
  const serveOptions = {
    ...options,
    onArrival(event) {
      arrival += 1;
      return { ok: true, cloudEventIdentity: event.id, admission: { statements: [{ id: `arrival:${arrival}` }] } };
    },
  };
  const http = await routeRequest(surface, {
    method: "POST",
    path: "/echo",
    query: {},
    body: "{\"value\":2}",
  }, serveOptions);
  assert.equal(http.status, 200);

  const suppliedEvent = {
    specversion: "1.0",
    id: "activitypub:test",
    source: "https://remote.example/actors/test",
    type: "org.harmonious-union.activitypub.cloudevent.a2a-sen.v1",
    time: "2026-09-02T00:00:00.000Z",
    subject: "https://ops.561.group/actors/metroplat",
    datacontenttype: "application/a2a+json",
    data: { profile: "org.harmonious-union.activitypub.cloudevent.a2a-sen.v1", transport: "A2A", message: {} },
  };
  const admittedArrival = await routeRequest(surface, {
    method: "POST",
    path: "/arrivals",
    query: {},
    body: JSON.stringify(suppliedEvent),
  }, serveOptions);
  assert.equal(admittedArrival.status, 202);
  assert.equal(JSON.parse(admittedArrival.body).cloudEventIdentity, suppliedEvent.id);

  const mcp = await programMcpHandle(surface, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "echo", arguments: { input: { value: 3 } } },
  }, serveOptions);
  assert.equal(mcp.result.content[0].text, "{\"value\":3}");
  assert.equal(calls, 3);
  assertions = [...assertions, revokeAssertion("issuer:test", "subject:test", "infograph#echo", at())];
  const revoked = await dispatchProjectedSurface(surface, ["echo"], "{\"value\":4}", options);
  assert.equal(revoked.code, 1);
  assert.equal(revoked.receipt.decision.reading, "contested");
  assert.equal(calls, 3);
  const attempts = evidence.filter(({ kind }) => kind === "metroplat.rpc.attempt");
  assert.equal(attempts.length, 5);
  assert.ok(attempts.every(({ invocation }) => invocation.subject === "subject:test"));
  assert.ok(attempts.every(({ invocation }) => invocation.caller.seat === "spoofed:caller-metadata"));
});

test("GET /mcp (a streamable-HTTP SSE probe) is refused with 405 and Allow: POST, never a bare 404", async () => {
  const surface = projectSurface([], { capabilityAssertions: () => [] });
  let arrival = 0;
  const options = {
    subject: "subject:test",
    caller: { transport: "test" },
    now: at,
    witness: memoryWitness([]),
    onArrival(event) {
      arrival += 1;
      return { ok: true, cloudEventIdentity: event.id, admission: { statements: [{ id: `arrival:${arrival}` }] } };
    },
  };
  const response = await routeRequest(surface, {
    method: "GET",
    path: "/mcp",
    query: {},
    body: "",
    accept: "text/event-stream",
  }, options);
  assert.equal(response.status, 405);
  assert.equal(response.headers?.Allow, "POST");
  const refusal = JSON.parse(response.body);
  mcpToolRefusalContract.assert(refusal, "GET /mcp method-not-allowed refusal");
  assert.equal(refusal.phase, "transport");
  assert.equal(arrival, 0, "GET /mcp must reach the 405 without requiring an arrival receipt");
});

test("DELETE /mcp is also refused with 405 and Allow: POST", async () => {
  const surface = projectSurface([], { capabilityAssertions: () => [] });
  const options = {
    subject: "subject:test",
    caller: { transport: "test" },
    now: at,
    witness: memoryWitness([]),
    onArrival() { throw new Error("DELETE /mcp must not require arrival admission"); },
  };
  const response = await routeRequest(surface, {
    method: "DELETE",
    path: "/mcp",
    query: {},
    body: "",
  }, options);
  assert.equal(response.status, 405);
  assert.equal(response.headers?.Allow, "POST");
  mcpToolRefusalContract.assert(JSON.parse(response.body), "DELETE /mcp method-not-allowed refusal");
});

test("dispatch refuses a receipt whose value cannot be content-addressed, instead of throwing", async () => {
  // Many items short of the identity module's per-string 262144-byte cap, but
  // whose sum crosses the 1 MiB canonical-JSON limit -- the exact "canonical-limit"
  // obstruction the production crash carried (`agents[0].queue[329].reasons[3]`),
  // not the unrelated per-string obstruction a single giant string would trigger.
  const action = operation({ verb: "oversized", run: () => ({ items: Array.from({ length: 200 }, () => "x".repeat(10_000)) }) });
  const catalog = createOperationCatalog([action]);
  const witness = memoryWitness([]);
  const runtime = {
    catalog,
    witness,
    authorize: authorizationFromStanding(new Map([[action.ref, "held"]])),
    now: at,
  };

  const receipt = await dispatch(runtime, candidate(action));
  assert.equal(receipt.ok, false);
  assert.equal(receipt.phase, "receipt");
  assert.equal(receipt.reasons.length, 1);
  assert.match(receipt.reasons[0], /^canonical-limit at .*: canonical JSON exceeds 1048576 bytes$/);
  assert.equal(receipt.value, undefined, "the oversized value is dropped, not carried past the identity boundary");
  assert.equal(typeof receipt.id, "string");
  assert.ok(receipt.id.length > 0, "a refusal receipt is still content-addressed, over its reduced form");

  // The dispatcher itself keeps serving afterward: a second, independent
  // invocation over the same oversized handler is refused the same way, not
  // left wedged by the first refusal.
  const following = await dispatch(runtime, candidate(action, "request:2"));
  assert.equal(following.ok, false);
  assert.equal(following.phase, "receipt");
  assert.notEqual(following.id, receipt.id);
});

test("a thrown error inside programMcpHandle's dispatch becomes a JSON-RPC -32603 response, and the server keeps answering", async () => {
  const action = operation({ verb: "echo", run: (input) => input });
  const surface = projectSurface([action], {
    capabilityAssertions: () => [grantAssertion("issuer:test", "subject:test", "infograph#echo", at())],
  });
  const witness = memoryWitness([]);
  const call = { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "echo", arguments: { input: { value: 1 } } } };

  // `now` throwing is the simplest deterministic stand-in for "some step inside
  // programMcpHandle's dispatch throws" -- it fires on the very first statement
  // of `admitMcpArrival`, before that function's own try/catch, and before
  // `dispatch()` (whose own paths are now exception-safe after the receipt.mts
  // fix) is ever reached. Nothing upstream of the routeRequest guard catches it.
  let arrival = 0;
  const throwingOptions = {
    subject: "subject:test",
    caller: { transport: "test" },
    now: () => { throw new Error("clock unavailable"); },
    witness,
    onArrival(event) {
      arrival += 1;
      return { ok: true, cloudEventIdentity: event.id, admission: { statements: [{ id: `arrival:${arrival}` }] } };
    },
  };
  const failing = await routeRequest(surface, {
    method: "POST",
    path: "/mcp",
    query: {},
    body: JSON.stringify(call),
  }, throwingOptions);
  assert.equal(failing.status, 200);
  const failingBody = JSON.parse(failing.body);
  assert.equal(failingBody.jsonrpc, "2.0");
  assert.equal(failingBody.id, 7);
  assert.equal(failingBody.error.code, -32603);
  assert.match(failingBody.error.message, /clock unavailable/);
  assert.equal(Object.hasOwn(failingBody.error, "data"), false, "no stack: the response carries the message only");
  assert.equal(failingBody.result, undefined);

  // A following request on the same server, with a working clock, still answers.
  const workingOptions = { ...throwingOptions, now: at };
  const following = await routeRequest(surface, {
    method: "POST",
    path: "/mcp",
    query: {},
    body: JSON.stringify({ ...call, id: 8 }),
  }, workingOptions);
  assert.equal(following.status, 200);
  const followingBody = JSON.parse(following.body);
  assert.deepEqual(JSON.parse(followingBody.result.content[0].text), { value: 1 });
});

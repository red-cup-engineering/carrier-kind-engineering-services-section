import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startHttpProcess } from "./http-process.mjs";

import { assembleDefaultService } from "@red-cup-engineering/metroplat/catalog";
import { activateHttpRequestedCapabilities, assertedHttpSubject, httpProcessConfig } from "@red-cup-engineering/metroplat/http-options";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { grantAssertion, revokeAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";

const AT = "2026-09-01T12:00:00.000Z";
const SUBJECT = "service:metroplat-http:cold-red-gate";
const REQUIRED_READS = ["agent-work-dispatch", "work-item", "milestone"];

async function servedMcpTools(config, signal) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-http-tools-"));
  const env = { ...process.env, METROPLAT_DATA_ROOT: dataRoot, HOST: "127.0.0.1", PORT: "0" };
  delete env.METROPLAT_HTTP_SUBJECT;
  delete env.METROPLAT_HTTP_CAPABILITIES;
  Object.assign(env, config);
  const serverProcess = startHttpProcess(env, signal);
  try {
    signal.throwIfAborted();
    const address = await serverProcess.ready;
    const health = await fetch(new URL("health", address), { signal });
    assert.equal(health.status, 200, await health.text());
    const response = await fetch(new URL("mcp", address), {
      signal,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    const body = await response.text();
    assert.equal(response.status, 200, body);
    const result = JSON.parse(body);
    assert.equal(result.error, undefined, JSON.stringify(result));
    const tools = result.result.tools.map((tool) => tool.name).sort();
    if (tools.includes("work-item")) {
      const called = await fetch(new URL("mcp", address), {
        signal,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "work-item", arguments: { input: {} } } }),
      });
      const callBody = await called.text();
      assert.equal(called.status, 200, callBody);
      const callResult = JSON.parse(callBody);
      assert.equal(callResult.error, undefined, callBody);
      assert.notEqual(callResult.result?.isError, true, callBody);
    }
    return tools;
  } finally {
    await serverProcess.close();
    rmSync(dataRoot, { recursive: true, force: true });
  }
}

function withService(run) {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-http-activation-"));
  try {
    const assembly = assembleDefaultService(defaultFilesystemBinding(dataRoot), "@red-cup-engineering/metroplat");
    return run(dataRoot, assembly);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
}

test("HTTP process configuration keeps anonymous unprivileged unless explicitly configured", () => {
  assert.deepEqual(httpProcessConfig([], {}), { subject: "anonymous", requestedCapabilityVerbs: [], assertedCapabilityVerbs: [] });
  assert.deepEqual(httpProcessConfig([], {
    METROPLAT_HTTP_SUBJECT: SUBJECT,
    METROPLAT_HTTP_CAPABILITIES: REQUIRED_READS.join(","),
  }), { subject: SUBJECT, requestedCapabilityVerbs: REQUIRED_READS, assertedCapabilityVerbs: [] });
  assert.deepEqual(httpProcessConfig(["--subject=anonymous", `--capabilities=${REQUIRED_READS[0]}`], {}), {
    subject: "anonymous",
    requestedCapabilityVerbs: [REQUIRED_READS[0]],
    assertedCapabilityVerbs: [],
  });
  assert.throws(
    () => httpProcessConfig([], { METROPLAT_HTTP_CAPABILITIES: REQUIRED_READS.join(",") }),
    /require an explicit HTTP subject/u,
  );
  assert.throws(() => httpProcessConfig(["--subject"], {}), /requires a non-empty value/u);
  assert.throws(
    () => httpProcessConfig([], { METROPLAT_HTTP_SUBJECT: SUBJECT, METROPLAT_HTTP_CAPABILITIES: "milestone,,work-item" }),
    /comma-separated list/u,
  );
});

test("HTTP process configuration wires asserted capabilities under a gateway token", () => {
  assert.deepEqual(
    httpProcessConfig([], { METROPLAT_HTTP_ASSERTED_CAPABILITIES: "work-item", METROPLAT_HTTP_GATEWAY_TOKEN: "secret" }),
    { subject: "anonymous", requestedCapabilityVerbs: [], assertedCapabilityVerbs: ["work-item"], gatewayToken: "secret" },
  );
  assert.throws(
    () => httpProcessConfig([], { METROPLAT_HTTP_ASSERTED_CAPABILITIES: "work-item" }),
    /require METROPLAT_HTTP_GATEWAY_TOKEN/u,
  );
  assert.throws(
    () => httpProcessConfig(["--asserted-capabilities=work-item"], {
      METROPLAT_HTTP_SUBJECT: SUBJECT,
      METROPLAT_HTTP_CAPABILITIES: "work-item",
      METROPLAT_HTTP_GATEWAY_TOKEN: "secret",
    }),
    /must not overlap requested capabilities/u,
  );
  // The gateway token is env-only: no --gateway-token flag is ever consulted.
  assert.deepEqual(
    httpProcessConfig(["--gateway-token", "ignored"], { METROPLAT_HTTP_ASSERTED_CAPABILITIES: "work-item", METROPLAT_HTTP_GATEWAY_TOKEN: "secret" }).gatewayToken,
    "secret",
  );
});

test("HTTP activation grants exactly the requested read operations and is idempotent", () => withService((dataRoot, assembly) => {
  const config = { subject: SUBJECT, requestedCapabilityVerbs: REQUIRED_READS };
  const activated = activateHttpRequestedCapabilities(dataRoot, assembly.operations, config, () => AT);
  assert.deepEqual(activated.granted, REQUIRED_READS.map((verb) => `infograph#${verb}`));
  assert.deepEqual(activated.alreadyHeld, []);
  assert.deepEqual(
    readCapabilityAssertions(dataRoot)
      .map(({ holder, grants }) => ({ holder, grants }))
      .sort((left, right) => left.grants.localeCompare(right.grants)),
    REQUIRED_READS
      .map((verb) => ({ holder: SUBJECT, grants: `infograph#${verb}` }))
      .sort((left, right) => left.grants.localeCompare(right.grants)),
  );

  const repeated = activateHttpRequestedCapabilities(dataRoot, assembly.operations, config, () => "2026-09-01T12:01:00.000Z");
  assert.deepEqual(repeated.granted, []);
  assert.deepEqual(repeated.alreadyHeld, REQUIRED_READS.map((verb) => `infograph#${verb}`));
  assert.equal(readCapabilityAssertions(dataRoot).length, REQUIRED_READS.length);
}));

test("HTTP process serves only configured read capabilities through MCP", { timeout: 60_000 }, async (t) => {
  const configured = await servedMcpTools({
    METROPLAT_HTTP_SUBJECT: SUBJECT,
    METROPLAT_HTTP_CAPABILITIES: REQUIRED_READS.join(","),
  }, t.signal);
  assert.deepEqual(configured, [...REQUIRED_READS].sort());
  assert.equal(configured.includes("structured-work-intent-admit"), false);
});

test("HTTP process serves no tools without configured standing", { timeout: 60_000 }, async (t) => {
  assert.deepEqual(await servedMcpTools({}, t.signal), []);
});

test("HTTP process readiness reports configuration failure and cleans up the child", { timeout: 30_000 }, async (t) => {
  await assert.rejects(servedMcpTools({ METROPLAT_HTTP_CAPABILITIES: "work-item" }, t.signal), /exited with code 1.*require an explicit HTTP subject/su);
});

test("HTTP listener failure exits unsuccessfully instead of announcing readiness", { timeout: 30_000 }, async (t) => {
  const occupied = createServer();
  await new Promise((resolve, reject) => occupied.once("error", reject).listen(0, "127.0.0.1", resolve));
  try {
    await assert.rejects(servedMcpTools({ PORT: String(occupied.address().port) }, t.signal), /exited with code 1.*EADDRINUSE/su);
  } finally {
    await new Promise((resolve) => occupied.close(resolve));
  }
});

test("HTTP activation refuses unknown, mutating, revoked, and contested requests before mutation", () => {
  for (const requested of [["not-an-operation"], ["structured-work-intent-admit"]]) {
    withService((dataRoot, assembly) => {
      assert.throws(
        () => activateHttpRequestedCapabilities(dataRoot, assembly.operations, { subject: SUBJECT, requestedCapabilityVerbs: requested }, () => AT),
        requested[0] === "not-an-operation" ? /not catalog operations/u : /must be non-mutating/u,
      );
      assert.deepEqual(readCapabilityAssertions(dataRoot), []);
    });
  }

  for (const obstructing of [
    [grantAssertion("test", SUBJECT, "infograph#milestone", AT), revokeAssertion("test", SUBJECT, "infograph#milestone", AT)],
    [
      grantAssertion("test", SUBJECT, "infograph#milestone", AT),
      revokeAssertion("test", SUBJECT, "infograph#milestone", "2026-09-01T12:00:01.000Z"),
      grantAssertion("test", SUBJECT, "infograph#milestone", "2026-09-01T12:00:02.000Z"),
    ],
  ]) {
    withService((dataRoot, assembly) => {
      admitCapabilityAssertions({ dataRoot, date: AT.slice(0, 10), assertions: obstructing });
      const before = readCapabilityAssertions(dataRoot);
      assert.throws(
        () => activateHttpRequestedCapabilities(dataRoot, assembly.operations, { subject: SUBJECT, requestedCapabilityVerbs: ["milestone", "work-item"] }, () => AT),
        /has (denied|contested) standing/u,
      );
      assert.deepEqual(readCapabilityAssertions(dataRoot), before);
    });
  }
});

test("HTTP activation never grants asserted capabilities to the process subject, but does check they are catalog operations", () => withService((dataRoot, assembly) => {
  const config = { subject: SUBJECT, requestedCapabilityVerbs: [], assertedCapabilityVerbs: ["structured-work-intent-admit"] };
  const activated = activateHttpRequestedCapabilities(dataRoot, assembly.operations, config, () => AT);
  assert.deepEqual(activated.granted, []);
  assert.deepEqual(activated.alreadyHeld, []);
  assert.deepEqual(readCapabilityAssertions(dataRoot), []);

  assert.throws(
    () => activateHttpRequestedCapabilities(
      dataRoot,
      assembly.operations,
      { subject: SUBJECT, requestedCapabilityVerbs: [], assertedCapabilityVerbs: ["not-an-operation"] },
      () => AT,
    ),
    /asserted capabilities are not catalog operations/u,
  );
}));

test("assertedHttpSubject recognizes only an exact, length-guarded gateway token and a grammatical subject, never throwing", () => {
  const config = { subject: "anonymous", requestedCapabilityVerbs: [], assertedCapabilityVerbs: [], gatewayToken: "correct-horse-battery" };
  const ASSERTED = "urn:gateway:asserted-actor";
  assert.equal(
    assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": ASSERTED }, config),
    ASSERTED,
  );
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "wrong-token", "x-metroplat-subject": ASSERTED }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-batter", "x-metroplat-subject": ASSERTED }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-subject": ASSERTED }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery" }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": "1-leading-digit" }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": "has space" }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": "" }, config), undefined);
  assert.equal(assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": `x${"a".repeat(512)}` }, config), undefined);
  assert.equal(
    assertedHttpSubject({ "x-metroplat-gateway-token": ["correct-horse-battery"], "x-metroplat-subject": ASSERTED }, config),
    undefined,
  );
  assert.equal(
    assertedHttpSubject({ "x-metroplat-gateway-token": "correct-horse-battery", "x-metroplat-subject": ASSERTED }, { ...config, gatewayToken: undefined }),
    undefined,
  );
  assert.doesNotThrow(() => assertedHttpSubject(null, config));
  assert.doesNotThrow(() => assertedHttpSubject(undefined, config));
  assert.doesNotThrow(() => assertedHttpSubject({}, {}));
});

test("HTTP process authorizes an asserted mutating verb only for a subject holding a capability-assertion grant, never the process subject", { timeout: 60_000 }, async (t) => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-http-asserted-"));
  const GATEWAY_TOKEN = "test-gateway-token-0123456789";
  const ASSERTED_SUBJECT = "urn:gateway:asserted-actor";
  const ASSERTED_VERB = "capability-assertion-admit";
  admitCapabilityAssertions({
    dataRoot,
    date: AT.slice(0, 10),
    assertions: [grantAssertion("test-bootstrap", ASSERTED_SUBJECT, `infograph#${ASSERTED_VERB}`, AT)],
  });
  const env = {
    ...process.env,
    METROPLAT_DATA_ROOT: dataRoot,
    HOST: "127.0.0.1",
    PORT: "0",
    METROPLAT_HTTP_SUBJECT: SUBJECT,
    METROPLAT_HTTP_ASSERTED_CAPABILITIES: ASSERTED_VERB,
    METROPLAT_HTTP_GATEWAY_TOKEN: GATEWAY_TOKEN,
  };
  delete env.METROPLAT_HTTP_CAPABILITIES;
  const serverProcess = startHttpProcess(env, t.signal);
  try {
    const address = await serverProcess.ready;
    const call = (headers) => fetch(new URL(ASSERTED_VERB, address), {
      signal: t.signal,
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", ...headers },
      body: JSON.stringify({ holder: "urn:gateway:other-actor", grants: ["infograph#milestone"] }),
    });

    const asProcessSubject = await call({});
    assert.equal(asProcessSubject.status, 422);
    assert.match(await asProcessSubject.text(), /subject standing is unknown/u);

    const asUngrantedAssertedSubject = await call({
      "x-metroplat-gateway-token": GATEWAY_TOKEN,
      "x-metroplat-subject": "urn:gateway:no-grant-actor",
    });
    assert.equal(asUngrantedAssertedSubject.status, 422);
    assert.match(await asUngrantedAssertedSubject.text(), /subject standing is unknown/u);

    const asGrantedAssertedSubject = await call({
      "x-metroplat-gateway-token": GATEWAY_TOKEN,
      "x-metroplat-subject": ASSERTED_SUBJECT,
    });
    const admittedBody = await asGrantedAssertedSubject.text();
    assert.equal(asGrantedAssertedSubject.status, 200, admittedBody);
    const admitted = JSON.parse(admittedBody);
    assert.equal(admitted.holder, "urn:gateway:other-actor");
  } finally {
    await serverProcess.close();
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { startHttpProcess } from "./http-process.mjs";
import test from "node:test";
import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { rpcEvidenceType } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";

/** The RPC evidence a data root holds, as rows `[entity, { kind }, evidence]`. */
const evidenceRows = (dataRoot) => [...each(dataRoot, rpcEvidenceType)].map(({ record }) => [null, { kind: record.evidence.kind }, record.evidence]);
import { capabilityGrant, grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { admitCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { parseSseStream } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
import { inferenceProviderOperation } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";

const packageRoot = path.resolve(import.meta.dirname, "..");

async function readSseUntil(response, patterns) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (!patterns.every((pattern) => pattern.test(text))) {
      const part = await reader.read();
      if (part.done) break;
      text += decoder.decode(part.value, { stream: true });
    }
    return text;
  } finally {
    await reader.cancel();
  }
}

test("shipped CLI dispatches a canonicalize operation", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-cli-"));
  try {
    const at = "2026-07-12T12:00:00.000Z";
    admitCapabilityAssertions({
      dataRoot,
      rootName: "@red-cup-engineering/metroplat",
      date: at.slice(0, 10),
      assertions: [grantAssertion("test:bootstrap", "anonymous", "infograph#canonicalize", at)],
    });
    const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "scripts/metroplat.mjs", "canonicalize"], {
      cwd: packageRoot,
      env: { ...process.env, METROPLAT_DATA_ROOT: dataRoot },
      input: '{"z":1,"a":2}\n',
      encoding: "utf8",
      timeout: 20_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '{"a":2,"z":1}\n');
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("shipped LSP application retains its request surface", () => {
  const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "scripts/metroplat-lsp.mjs", "--help"], {
    cwd: packageRoot,
    encoding: "utf8",
    timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /textDocument\/definition/u);
  assert.match(result.stdout, /textDocument\/codeAction/u);
});

async function unusedPort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("shipped HTTP application serves its generated health API", { timeout: 30_000 }, async (t) => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-http-"));
  const port = await unusedPort();
  const serverProcess = startHttpProcess({
    ...process.env,
    METROPLAT_DATA_ROOT: dataRoot,
    HOST: "127.0.0.1",
    PORT: String(port),
    METROPLAT_AGENT_WORKER_MODEL: "worker-smoke-model",
    METROPLAT_AGENT_WORKER_ID: "worker-smoke",
    METROPLAT_AGENT_WORKER_INTERVAL_MS: "60000",
  }, t.signal);
  try {
    const address = await serverProcess.ready;
    const response = await fetch(new URL("health", address), { signal: t.signal });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", package: "@red-cup-engineering/metroplat" });
    assert.match(serverProcess.stdout, /agent worker worker-smoke consuming assigned work with worker-smoke-model/u);
  } finally {
    await serverProcess.close();
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("shipped HTTP application serves the witnessed OpenAI-compatible guest ABI", { timeout: 90_000 }, async (t) => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-openai-guest-"));
  const GATEWAY_TOKEN = "test-metroplat-gateway-token";
  const ASSERTED_SUBJECT = "urn:gateway:openai-guest";
  const provider = inferenceProviderOperation(
    "openai.chat-completions",
    () => { throw new Error("reference-only provider must not execute"); },
    {},
    encounterExecutionControl(),
  );
  const at = "2026-07-12T12:00:00.000Z";
  admitCapabilityAssertions({
    dataRoot,
    rootName: "@red-cup-engineering/metroplat",
    date: at.slice(0, 10),
    assertions: [
      grantAssertion("test:bootstrap", "anonymous", capabilityGrant(`inference:${provider.ref}`, provider.verb), at),
      grantAssertion("test:bootstrap", ASSERTED_SUBJECT, capabilityGrant(`inference:${provider.ref}`, provider.verb), at),
    ],
  });
  const port = await unusedPort();
  const upstreamPort = await unusedPort();
  let upstreamRequest;
  let upstreamCalls = 0;
  const upstream = createHttpServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      upstreamCalls += 1;
      upstreamRequest = {
        path: req.url,
        idempotencyKey: req.headers["idempotency-key"],
        authorization: req.headers.authorization,
        body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
      };
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify({
        id: "chatcmpl-shipped-guest",
        object: "chat.completion.chunk",
        created: 1783790400,
        model: "guest-model",
        choices: [{ index: 0, delta: { role: "assistant", content: "guest ABI works" }, finish_reason: "stop" }],
      })}\n\n`);
      res.write(`data: ${JSON.stringify({
        id: "chatcmpl-shipped-guest",
        object: "chat.completion.chunk",
        created: 1783790400,
        model: "guest-model",
        choices: [],
        usage: { prompt_tokens: 3, completion_tokens: 3, total_tokens: 6 },
      })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise((resolve, reject) => upstream.once("error", reject).listen(upstreamPort, "127.0.0.1", resolve));
  const serverProcess = startHttpProcess({
    ...process.env,
    METROPLAT_DATA_ROOT: dataRoot,
    HOST: "127.0.0.1",
    PORT: String(port),
    OPENAI_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    OPENAI_API_KEY: "guest-test-secret",
    METROPLAT_HTTP_GATEWAY_TOKEN: GATEWAY_TOKEN,
  }, t.signal);
  try {
    const address = await serverProcess.ready;
    const health = await fetch(new URL("health", address), { signal: t.signal });
    assert.equal(health.ok, true);
    const forged = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-metroplat-gateway-token": "wrong-gateway-token",
        "x-metroplat-subject": ASSERTED_SUBJECT,
      },
      body: JSON.stringify({ model: "guest-model", messages: [{ role: "user", content: "forged identity" }] }),
    });
    assert.equal(forged.status, 200, await forged.text());
    const forgedRows = evidenceRows(dataRoot);
    const forgedEvidence = JSON.stringify(forgedRows);
    assert.equal(forgedEvidence.includes(`"subject":"${ASSERTED_SUBJECT}"`), false, "a forged gateway subject must be ignored");
    assert.equal(forgedEvidence.includes("\"subject\":\"anonymous\""), true, "an invalid gateway assertion must retain the process subject");
    const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-metroplat-gateway-token": GATEWAY_TOKEN,
        "x-metroplat-subject": ASSERTED_SUBJECT,
      },
      body: JSON.stringify({ model: "guest-model", messages: [{ role: "user", content: "hello" }], user: "guest:smoke" }),
    });
    if (response.status !== 200) assert.fail(`guest ABI returned ${response.status}: ${await response.text()}`);
    const completion = await response.json();
    assert.equal(completion.object, "chat.completion");
    assert.equal(completion.choices[0].message.content, "guest ABI works");
    assert.equal(upstreamRequest.path, "/chat/completions");
    assert.match(upstreamRequest.idempotencyKey, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
    assert.equal(upstreamRequest.authorization, "Bearer guest-test-secret");
    assert.equal(upstreamRequest.body.user, "guest:smoke");
    assert.equal(upstreamRequest.body.stream, true);

    const streamingRequest = { model: "guest-model", messages: [{ role: "user", content: "hello stream" }], user: "guest:stream", stream: true };
    const streaming = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "guest-stream-replay" },
      body: JSON.stringify(streamingRequest),
    });
    assert.equal(streaming.status, 200);
    assert.match(streaming.headers.get("content-type") ?? "", /^text\/event-stream/u);
    const frames = parseSseStream(await streaming.text());
    assert.equal(frames.at(-1).data, "[DONE]");
    assert.equal(frames.every((frame) => typeof frame.id === "string" && frame.id.length > 0), true);
    const streamedText = frames
      .filter((frame) => frame.data !== "[DONE]")
      .map((frame) => JSON.parse(frame.data))
      .flatMap((chunk) => chunk.choices ?? [])
      .map((choice) => choice.delta?.content ?? "")
      .join("");
    assert.equal(streamedText, "guest ABI works");
    const callsAfterFirstStream = upstreamCalls;

    const resumed = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "guest-stream-replay",
        "last-event-id": frames[0].id,
      },
      body: JSON.stringify(streamingRequest),
    });
    assert.equal(resumed.status, 200);
    const resumedFrames = parseSseStream(await resumed.text());
    assert.equal(resumedFrames.at(-1).data, "[DONE]");
    assert.equal(resumedFrames.some((frame) => frame.id === frames[0].id), false);
    assert.equal(upstreamCalls, callsAfterFirstStream, "cursor replay must not execute the provider again");

    const durableRows = evidenceRows(dataRoot);
    const kinds = durableRows.flatMap((row) => {
      const attribute = row[1];
      if (attribute !== null && typeof attribute === "object" && !Array.isArray(attribute) && typeof attribute.kind === "string") {
        return [attribute.kind];
      }
      return [];
    });
    assert.equal(kinds.includes("metroplat.rpc.attempt"), true);
    assert.equal(kinds.includes("metroplat.rpc.decision"), true);
    assert.equal(kinds.includes("metroplat.rpc.outcome"), true);
    const durableText = JSON.stringify(durableRows);
    assert.equal(durableText.includes(ASSERTED_SUBJECT), true, "a token-authenticated gateway subject must be the inference caller");
    assert.equal(durableText.includes("guest-test-secret"), false, "provider credentials must never enter durable evidence");
    assert.equal(durableText.includes("Bearer guest-test-secret"), false, "authorization headers must never enter durable evidence");

    const feedResponse = await fetch(`http://127.0.0.1:${port}/feed`, { signal: AbortSignal.timeout(5_000) });
    assert.equal(feedResponse.status, 200);
    assert.match(feedResponse.headers.get("content-type") ?? "", /^text\/event-stream/u);
    const feedText = await readSseUntil(feedResponse, [/metroplat\.rpc\.attempt/u, /metroplat\.rpc\.decision/u, /metroplat\.rpc\.outcome/u]);
    assert.match(feedText, /metroplat\.rpc\.attempt/u);
    assert.match(feedText, /metroplat\.rpc\.decision/u);
    assert.match(feedText, /metroplat\.rpc\.outcome/u);
  } finally {
    await serverProcess.close();
    upstream.closeAllConnections();
    await new Promise((resolve) => upstream.close(resolve));
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

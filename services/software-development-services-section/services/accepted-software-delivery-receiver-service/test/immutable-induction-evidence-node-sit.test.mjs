import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { AgentCard, Message, Task, TaskState } from "@a2a-js/sdk";
import {
  exportJWK,
  exportPKCS8,
  FlattenedSign,
  flattenedVerify,
  generateKeyPair,
} from "jose";
import {
  agentCardSignatureEvidence,
  createAgentCardSigningConfiguration,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  a2aResultMetadata,
  a2aResultParts,
  discoverA2aClient,
  resumeRmnTask,
  sendRmnTask,
  submitRmnTask,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import {
  extractRmnPart,
  userRmnMessage,
} from "@red-cup-engineering/a2a-rmn-part-service";
import {
  decodeSemantic,
  semanticBytes,
  semanticId,
} from "@red-cup-engineering/rmn-semantic-conformance";
import {
  RECEIVER_ACTOR,
  registerImmutableEvidenceObject,
} from "../src/immutable-induction-evidence.mjs";
import { rawNiUri } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";

const ROOT = resolve(import.meta.dirname, "..");
const ni = rawNiUri;

async function listen(server) {
  await new Promise((accept, reject) => {
    server.listen(0, "127.0.0.1", accept);
    server.once("error", reject);
  });
  return server.address().port;
}

async function signedCard({ baseUrl, keyPair, kid, template }) {
  const publicJwk = {
    ...await exportJWK(keyPair.publicKey),
    kid,
    alg: "EdDSA",
    use: "sig",
  };
  const signing = createAgentCardSigningConfiguration({
    baseUrl,
    kid,
    privateKey: keyPair.privateKey,
    publicJwk,
  });
  const normalized = AgentCard.toJSON(AgentCard.fromJSON(template));
  const card = await signing.agentCardSignatureGenerator(normalized);
  return { card, evidence: agentCardSignatureEvidence(card), jwks: signing.agentCardJwks, publicJwk };
}

function startReceiver(environment) {
  const child = spawn(
    process.execPath,
    [join(ROOT, "bin/serve-immutable-induction-evidence-a2a.mjs")],
    { cwd: ROOT, env: { ...process.env, ...environment }, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (bytes) => { stderr += bytes; });
  const ready = new Promise((accept, reject) => {
    let stdout = "";
    child.stdout.on("data", (bytes) => {
      stdout += bytes;
      if (stdout.includes("\n")) accept(stdout.trim());
    });
    child.once("exit", (code) => reject(new Error(`receiver exited ${code}: ${stderr}`)));
  });
  return { child, ready, stderr: () => stderr };
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((accept) => child.once("exit", accept));
}

test("fresh signed evidence node preserves addressability and durable A2A custody", async (t) => {
  const assayRoot = mkdtempSync(join(tmpdir(), "immutable-evidence-node-sit-"));
  t.after(() => rmSync(assayRoot, { recursive: true, force: true }));
  const receiverKeys = await generateKeyPair("EdDSA", { extractable: true });
  const providerKeys = await generateKeyPair("EdDSA", { extractable: true });
  const receiverKid = "sit-receiver-ed25519";
  const providerKid = "sit-git-ed25519";

  const providerServer = createServer();
  const providerPort = await listen(providerServer);
  const providerBase = `http://127.0.0.1:${providerPort}`;
  const provider = await signedCard({
    baseUrl: providerBase,
    keyPair: providerKeys,
    kid: providerKid,
    template: {
      name: "SIT Git Services",
      description: "test-owned signed provider face",
      version: "1.0.0",
      protocolVersion: "1.0",
      preferredTransport: "JSONRPC",
      url: `${providerBase}/a2a/jsonrpc`,
      supportedInterfaces: [{
        url: `${providerBase}/a2a/jsonrpc`,
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      }],
      capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false, extensions: [] },
      defaultInputModes: ["application/rmn+cbor"],
      defaultOutputModes: ["application/rmn+cbor"],
      skills: [],
    },
  });
  let activeProvider = provider;
  providerServer.removeAllListeners("request");
  providerServer.on("request", (request, response) => {
    if (request.url === "/.well-known/agent-card.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(activeProvider.card));
    } else if (request.url === "/.well-known/jwks.json") {
      response.setHeader("content-type", "application/jwk-set+json");
      response.end(JSON.stringify(activeProvider.jwks));
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  t.after(() => new Promise((accept) => providerServer.close(accept)));

  const portProbe = createServer();
  const receiverPort = await listen(portProbe);
  await new Promise((accept) => portProbe.close(accept));
  const receiverBase = `http://127.0.0.1:${receiverPort}`;
  const cardTemplate = JSON.parse(
    readFileSync(join(ROOT, "content/agent-cards/immutable-induction-evidence-read-node.json"), "utf8")
      .replaceAll("${BASE_URL}", receiverBase),
  );
  const receiver = await signedCard({
    baseUrl: receiverBase,
    keyPair: receiverKeys,
    kid: receiverKid,
    template: cardTemplate,
  });
  const privateKeyPath = join(assayRoot, "receiver-private.pem");
  const jwksPath = join(assayRoot, "receiver-jwks.json");
  const identityPath = join(assayRoot, "receiver-identity.json");
  const routesPath = join(assayRoot, "routes.json");
  const dataRoot = join(assayRoot, "data");
  writeFileSync(privateKeyPath, await exportPKCS8(receiverKeys.privateKey), { mode: 0o600 });
  writeFileSync(jwksPath, JSON.stringify(receiver.jwks));
  writeFileSync(identityPath, JSON.stringify(receiver.evidence));
  writeFileSync(routesPath, JSON.stringify({
    version: 1,
    routes: [{
      actor: "urn:ame:git-services-section",
      account: null,
      agentCardUrl: `${providerBase}/.well-known/agent-card.json`,
    }],
  }));
  const environment = {
    PORT: String(receiverPort),
    HOST: "127.0.0.1",
    BASE_URL: receiverBase,
    AGENT_CARD_SIGNING_KEY: privateKeyPath,
    AGENT_CARD_JWKS: jwksPath,
    AGENT_CARD_SIGNING_KID: receiverKid,
    IMMUTABLE_EVIDENCE_RECEIVER_IDENTITY: identityPath,
    IMMUTABLE_EVIDENCE_DATA_ROOT: dataRoot,
    IMMUTABLE_EVIDENCE_ROUTES: routesPath,
    IMMUTABLE_EVIDENCE_SIGNING_KEY: privateKeyPath,
    IMMUTABLE_EVIDENCE_SIGNING_KID: receiverKid,
    IMMUTABLE_EVIDENCE_SIGNING_JWKS: `${receiverBase}/.well-known/jwks.json`,
    IMMUTABLE_EVIDENCE_VERIFYING_JWKS: jwksPath,
    IMMUTABLE_EVIDENCE_RECEIVER_AGENT: `${receiverBase}/.well-known/agent-card.json`,
    A2A_TASK_STORE_ROOT: join(dataRoot, "a2a", "immutable-evidence-tasks"),
  };
  let running = startReceiver(environment);
  await running.ready;
  t.after(async () => stop(running.child));

  const evidenceRootId = ni(Buffer.from("sit-evidence-root"));
  const objectBytes = semanticBytes({ type: "PreparedGitInductionEvidence", version: 1 });
  const object = registerImmutableEvidenceObject({ dataRoot, evidenceRootId, bytes: objectBytes });
  const now = new Date();

  async function exchange(purpose, sequence) {
    const extra = purpose === "sealed-candidate"
      ? {
          workOrderId: ni(Buffer.from(`work-order-${sequence}`)),
          artifactId: object.objectId,
          candidatePlateId: ni(Buffer.from(`candidate-${sequence}`)),
        }
      : purpose === "publication-phase"
        ? { journalId: ni(Buffer.from(`journal-${sequence}`)), phase: "prepared" }
        : {
            allocationId: ni(Buffer.from(`allocation-${sequence}`)),
            privateIndexId: ni(Buffer.from(`private-index-${sequence}`)),
            journalId: ni(Buffer.from(`journal-${sequence}`)),
          };
    const grant = {
      type: "ImmutableInductionEvidenceReadGrant",
      version: 1,
      purpose,
      issuerActor: RECEIVER_ACTOR,
      recipientActor: "urn:ame:git-services-section",
      receiverActor: RECEIVER_ACTOR,
      receiverCardId: receiver.evidence.card,
      receiverCardSignatureId: receiver.evidence.signature,
      receiverKid: receiver.evidence.kid,
      receiverJwks: receiver.evidence.jwks,
      operation: "read-immutable-induction-evidence-object",
      ...object,
      taskId: ni(Buffer.from(`task-${sequence}`)),
      nonce: createHash("sha256").update(`nonce-${sequence}`).digest("base64url"),
      issuedAt: new Date(now.getTime() - 60_000).toISOString(),
      expiresAt: new Date(now.getTime() + 600_000).toISOString(),
      uses: 1,
      ...extra,
    };
    const request = {
      type: "ImmutableInductionEvidenceReadRequest",
      version: 1,
      purpose,
      grantId: semanticId(grant),
      receiverActor: RECEIVER_ACTOR,
      providerActor: grant.recipientActor,
      providerCardId: provider.evidence.card,
      providerCardSignatureId: provider.evidence.signature,
      providerKid: provider.evidence.kid,
      providerJwks: provider.evidence.jwks,
      objectId: object.objectId,
      sha256: object.sha256,
      length: object.length,
      evidenceRootId,
      taskId: grant.taskId,
      nonce: grant.nonce,
      ...extra,
    };
    const requestBytes = semanticBytes(request);
    const grantJws = await new FlattenedSign(semanticBytes(grant))
      .setProtectedHeader({ alg: "EdDSA", kid: receiverKid, jku: receiver.evidence.jwks, typ: "JOSE" })
      .sign(receiverKeys.privateKey);
    const inputJws = await new FlattenedSign(requestBytes)
      .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: provider.evidence.jwks, typ: "JOSE" })
      .sign(providerKeys.privateKey);
    const message = userRmnMessage(requestBytes, "immutable-evidence-read.rmn.cbor", randomUUID());
    message.metadata = { evidenceReadGrant: grant, evidenceReadGrantJws: grantJws, evidenceReadAuthorization: { inputJws } };
    const result = await sendRmnTask({
      agentUrl: `${receiverBase}/.well-known/agent-card.json`,
      message,
      requireSignature: true,
      pollIntervalMs: 20,
      signal: AbortSignal.timeout(20_000),
    });
    const part = extractRmnPart(a2aResultParts(result.result));
    const decoded = decodeSemantic(part.bytes);
    const jws = a2aResultMetadata(result.result).jws;
    const verified = await flattenedVerify(jws, receiverKeys.publicKey);
    assert.deepEqual(Buffer.from(verified.payload), part.bytes);
    assert.equal(decoded.purpose, purpose);
    assert.deepEqual(Buffer.from(decoded.bytes), objectBytes);
    for (const [field, value] of Object.entries(extra)) assert.equal(decoded[field], value);
    return { message, result, request, grant, grantJws, inputJws };
  }

  const first = await exchange("sealed-candidate", 1);
  await exchange("publication-phase", 2);
  await exchange("private-index-release", 3);

  await stop(running.child);
  running = startReceiver(environment);
  await running.ready;
  const resumed = await resumeRmnTask({
    agentUrl: `${receiverBase}/.well-known/agent-card.json`,
    taskId: first.result.result.id,
    inputNi: first.result.inputNi,
    requireSignature: true,
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(resumed.result.status.state, TaskState.TASK_STATE_COMPLETED);
  assert.equal(resumed.outputNi, first.result.outputNi);

  const equal = await Promise.all([
    sendRmnTask({
      agentUrl: `${receiverBase}/.well-known/agent-card.json`,
      message: first.message,
      requireSignature: true,
      pollIntervalMs: 20,
      signal: AbortSignal.timeout(20_000),
    }),
    sendRmnTask({
      agentUrl: `${receiverBase}/.well-known/agent-card.json`,
      message: first.message,
      requireSignature: true,
      pollIntervalMs: 20,
      signal: AbortSignal.timeout(20_000),
    }),
  ]);
  assert.equal(equal[0].outputNi, first.result.outputNi);
  assert.equal(equal[1].outputNi, first.result.outputNi);

  async function signedRefusal(message, expectedReason) {
    const exchangeResult = await sendRmnTask({
      agentUrl: `${receiverBase}/.well-known/agent-card.json`,
      message,
      requireSignature: true,
      pollIntervalMs: 20,
      signal: AbortSignal.timeout(20_000),
    });
    const part = extractRmnPart(a2aResultParts(exchangeResult.result));
    const refusalResult = decodeSemantic(part.bytes);
    assert.equal(refusalResult.type, "ImmutableInductionEvidenceReadRefusal");
    assert.equal(refusalResult.reason, expectedReason);
    const verified = await flattenedVerify(
      a2aResultMetadata(exchangeResult.result).jws,
      receiverKeys.publicKey,
    );
    assert.deepEqual(Buffer.from(verified.payload), part.bytes);
    return refusalResult;
  }

  const malformedRequest = { ...first.request };
  delete malformedRequest.purpose;
  const malformed = semanticBytes(malformedRequest);
  const addressableMessage = userRmnMessage(malformed);
  addressableMessage.metadata = {
    evidenceReadGrant: first.grant,
    evidenceReadGrantJws: first.grantJws,
    evidenceReadAuthorization: {
      inputJws: await new FlattenedSign(malformed)
        .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: provider.evidence.jwks, typ: "JOSE" })
        .sign(providerKeys.privateKey),
    },
  };
  const refusal = await signedRefusal(addressableMessage, "pre-effect");
  assert.equal(refusal.grantId, semanticId(first.grant));

  const missingGrantIdRequest = { ...first.request };
  delete missingGrantIdRequest.grantId;
  const missingGrantIdBytes = semanticBytes(missingGrantIdRequest);
  const missingGrantIdMessage = userRmnMessage(missingGrantIdBytes);
  missingGrantIdMessage.metadata = {
    evidenceReadGrant: first.grant,
    evidenceReadGrantJws: first.grantJws,
    evidenceReadAuthorization: {
      inputJws: await new FlattenedSign(missingGrantIdBytes)
        .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: provider.evidence.jwks, typ: "JOSE" })
        .sign(providerKeys.privateKey),
    },
  };
  await signedRefusal(missingGrantIdMessage, "pre-effect");

  for (const [invalidGrant, expectedReason] of [
    [(() => {
      const omitted = { ...first.grant };
      delete omitted.receiverActor;
      return omitted;
    })(), "pre-effect"],
    [{ ...first.grant, receiverActor: "urn:ame:wrong-receiver" }, "binding-mismatch"],
  ]) {
    const invalidRequest = {
      ...first.request,
      grantId: semanticId(invalidGrant),
    };
    const invalidRequestBytes = semanticBytes(invalidRequest);
    const invalidGrantMessage = userRmnMessage(invalidRequestBytes);
    invalidGrantMessage.metadata = {
      evidenceReadGrant: invalidGrant,
      evidenceReadGrantJws: await new FlattenedSign(semanticBytes(invalidGrant))
        .setProtectedHeader({ alg: "EdDSA", kid: receiverKid, jku: receiver.evidence.jwks, typ: "JOSE" })
        .sign(receiverKeys.privateKey),
      evidenceReadAuthorization: {
        inputJws: await new FlattenedSign(invalidRequestBytes)
          .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: provider.evidence.jwks, typ: "JOSE" })
          .sign(providerKeys.privateKey),
      },
    };
    await signedRefusal(invalidGrantMessage, expectedReason);
  }

  const cardDriftRequest = {
    ...first.request,
    providerCardId: ni(Buffer.from("wrong-provider-card")),
  };
  const cardDriftBytes = semanticBytes(cardDriftRequest);
  const cardDriftMessage = userRmnMessage(cardDriftBytes);
  cardDriftMessage.metadata = {
    evidenceReadGrant: first.grant,
    evidenceReadGrantJws: first.grantJws,
    evidenceReadAuthorization: {
      inputJws: await new FlattenedSign(cardDriftBytes)
        .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: provider.evidence.jwks, typ: "JOSE" })
        .sign(providerKeys.privateKey),
    },
  };
  await signedRefusal(cardDriftMessage, "actor-route-drift");

  const driftedGrant = { ...first.grant, length: first.grant.length + 1 };
  const driftedGrantJws = await new FlattenedSign(semanticBytes(driftedGrant))
    .setProtectedHeader({ alg: "EdDSA", kid: receiverKid, jku: receiver.evidence.jwks, typ: "JOSE" })
    .sign(receiverKeys.privateKey);
  const grantDriftMessage = structuredClone(first.message);
  grantDriftMessage.messageId = randomUUID();
  grantDriftMessage.metadata.evidenceReadGrant = driftedGrant;
  grantDriftMessage.metadata.evidenceReadGrantJws = driftedGrantJws;
  await signedRefusal(grantDriftMessage, "binding-mismatch");

  writeFileSync(routesPath, JSON.stringify({
    version: 1,
    routes: [{
      actor: "urn:ame:git-services-section",
      account: null,
      agentCardUrl: "http://127.0.0.1:1/.well-known/agent-card.json",
    }],
  }));
  await signedRefusal({ ...structuredClone(first.message), messageId: randomUUID() }, "pre-effect");
  writeFileSync(routesPath, JSON.stringify({
    version: 1,
    routes: [{
      actor: "urn:ame:git-services-section",
      account: null,
      agentCardUrl: `${providerBase}/.well-known/agent-card.json`,
    }],
  }));

  const alternateKeys = await generateKeyPair("EdDSA", { extractable: true });
  const alternateTemplate = AgentCard.toJSON(AgentCard.fromJSON(provider.card));
  alternateTemplate.signatures = [];
  const alternate = await signedCard({
    baseUrl: providerBase,
    keyPair: alternateKeys,
    kid: "sit-git-alternate-ed25519",
    template: alternateTemplate,
  });
  activeProvider = alternate;
  const conflictRequest = {
    ...first.request,
    providerCardId: alternate.evidence.card,
    providerCardSignatureId: alternate.evidence.signature,
    providerKid: alternate.evidence.kid,
    providerJwks: alternate.evidence.jwks,
  };
  const conflictBytes = semanticBytes(conflictRequest);
  const conflictMessage = userRmnMessage(conflictBytes);
  conflictMessage.metadata = {
    evidenceReadGrant: first.grant,
    evidenceReadGrantJws: first.grantJws,
    evidenceReadAuthorization: {
      inputJws: await new FlattenedSign(conflictBytes)
        .setProtectedHeader({
          alg: "EdDSA",
          kid: alternate.evidence.kid,
          jku: alternate.evidence.jwks,
          typ: "JOSE",
        })
        .sign(alternateKeys.privateKey),
    },
  };
  await signedRefusal(conflictMessage, "grant-replay");
  activeProvider = provider;

  const unaddressableBytes = Buffer.from([0xff]);
  const unaddressable = userRmnMessage(unaddressableBytes);
  const submitted = await submitRmnTask({
    agentUrl: `${receiverBase}/.well-known/agent-card.json`,
    message: unaddressable,
    requireSignature: true,
    signal: AbortSignal.timeout(20_000),
  });
  await assert.rejects(
    resumeRmnTask({
      agentUrl: `${receiverBase}/.well-known/agent-card.json`,
      taskId: submitted.taskId,
      inputNi: submitted.inputNi,
      requireSignature: true,
      pollIntervalMs: 20,
      signal: AbortSignal.timeout(20_000),
    }),
    (error) => {
      assert.equal(error.result.status.state, TaskState.TASK_STATE_FAILED);
      assert.match(error.message, /unaddressable-immutable-evidence-input/u);
      return true;
    },
  );
  assert.equal(submitted.inputNi, ni(unaddressableBytes));
  const client = await discoverA2aClient(
    `${receiverBase}/.well-known/agent-card.json`,
    { signal: AbortSignal.timeout(20_000) },
  );
  const retained = Task.toJSON(await client.getTask(
    { id: submitted.taskId, historyLength: 10 },
    { signal: AbortSignal.timeout(20_000) },
  ));
  const retainedUserMessage = retained.history.find((message) => message.role === "ROLE_USER");
  assert.ok(retainedUserMessage);
  assert.equal(
    retainedUserMessage.parts[0]?.mediaType,
    "application/rmn+cbor",
    JSON.stringify(retainedUserMessage),
  );
  const retainedInput = extractRmnPart(
    Message.fromJSON(retainedUserMessage).parts,
  );
  assert.equal(retainedInput.ni, submitted.inputNi);
  assert.equal(ni(retainedInput.bytes), submitted.inputNi);

  for (const body of [
    unaddressable,
    userRmnMessage(semanticBytes(malformedRequest)),
    userRmnMessage(semanticBytes(missingGrantIdRequest)),
  ]) {
    const direct = spawnSync(
      process.execPath,
      [join(ROOT, "bin/execute-immutable-induction-evidence-a2a-message.mjs")],
      {
        cwd: ROOT,
        input: JSON.stringify(body),
        encoding: "utf8",
        env: { PATH: process.env.PATH },
      },
    );
    assert.notEqual(direct.status, 0);
    assert.match(direct.stderr, /unaddressable-immutable-evidence-input/u);
    assert.doesNotMatch(direct.stderr, /IMMUTABLE_EVIDENCE_.+ is required/u);
  }
});

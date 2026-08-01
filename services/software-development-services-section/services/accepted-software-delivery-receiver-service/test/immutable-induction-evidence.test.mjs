import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  exportJWK,
  exportPKCS8,
  FlattenedSign,
  generateKeyPair,
} from "jose";
import {
  agentCardSignatureEvidence,
  createAgentCardSigningConfiguration,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  decodeSemantic,
  semanticBytes,
  semanticId,
} from "@red-cup-engineering/rmn-semantic-conformance";
import {
  RECEIVER_ACTOR,
  readImmutableInductionEvidence,
  registerImmutableEvidenceObject,
} from "../src/immutable-induction-evidence.mjs";
import { rawNiUri } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";

const ni = rawNiUri;

test("signed immutable evidence read is one-effect and byte-identical on replay", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "immutable-evidence-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const providerKeys = await generateKeyPair("EdDSA", { extractable: true });
  const receiverKeys = await generateKeyPair("EdDSA", { extractable: true });
  const providerJwk = await exportJWK(providerKeys.publicKey);
  const receiverJwk = {
    ...await exportJWK(receiverKeys.publicKey),
    kid: "receiver-key",
    alg: "EdDSA",
    use: "sig",
  };
  const providerKid = "assay-provider";
  const baseUrl = "https://provider.assay.invalid";
  const configuration = createAgentCardSigningConfiguration({
    baseUrl,
    kid: providerKid,
    privateKey: providerKeys.privateKey,
    publicJwk: providerJwk,
  });
  const card = {
    name: "assay Git provider",
    description: "test-owned",
    version: "1",
    protocolVersion: "1.0",
    preferredTransport: "JSONRPC",
    url: `${baseUrl}/a2a`,
    supportedInterfaces: [{
      url: `${baseUrl}/a2a`,
      protocolBinding: "JSONRPC",
      protocolVersion: "1.0",
    }],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
      extensions: [],
    },
    defaultInputModes: ["application/rmn+cbor"],
    defaultOutputModes: ["application/rmn+cbor"],
    skills: [],
  };
  const signedCard = await configuration.agentCardSignatureGenerator(card);
  const providerEvidence = agentCardSignatureEvidence(signedCard);
  const receiverBaseUrl = "https://receiver.assay.invalid";
  const receiverConfiguration = createAgentCardSigningConfiguration({
    baseUrl: receiverBaseUrl,
    kid: receiverJwk.kid,
    privateKey: receiverKeys.privateKey,
    publicJwk: receiverJwk,
  });
  const signedReceiverCard = await receiverConfiguration.agentCardSignatureGenerator({
    ...card,
    name: "assay receiver",
    url: `${receiverBaseUrl}/a2a`,
    supportedInterfaces: [{
      url: `${receiverBaseUrl}/a2a`,
      protocolBinding: "JSONRPC",
      protocolVersion: "1.0",
    }],
  });
  const receiverEvidence = agentCardSignatureEvidence(signedReceiverCard);
  const routes = join(root, "routes.json");
  writeFileSync(routes, JSON.stringify({
    version: 1,
    routes: [{
      actor: "urn:ame:git-services-section",
      agentCardUrl: `${baseUrl}/.well-known/agent-card.json`,
      account: null,
    }],
  }));
  const evidenceRootId = ni(Buffer.from("root"));
  const object = Buffer.from([0xa1, 0x61, 0x78, 0x01]);
  const registered = registerImmutableEvidenceObject({
    dataRoot: root,
    evidenceRootId,
    bytes: object,
  });
  const now = new Date("2026-07-24T12:00:00.000Z");
  const common = {
    receiverCardId: receiverEvidence.card,
    receiverCardSignatureId: receiverEvidence.signature,
    receiverKid: receiverEvidence.kid,
    receiverJwks: receiverEvidence.jwks,
  };
  const grant = {
    type: "ImmutableInductionEvidenceReadGrant",
    version: 1,
    purpose: "sealed-candidate",
    issuerActor: RECEIVER_ACTOR,
    recipientActor: "urn:ame:git-services-section",
    receiverActor: RECEIVER_ACTOR,
    ...common,
    operation: "read-immutable-induction-evidence-object",
    ...registered,
    taskId: ni(Buffer.from("task")),
    nonce: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq",
    issuedAt: "2026-07-24T11:59:00.000Z",
    expiresAt: "2026-07-24T12:01:00.000Z",
    uses: 1,
    workOrderId: ni(Buffer.from("work-order")),
    artifactId: registered.objectId,
    candidatePlateId: ni(Buffer.from("candidate")),
  };
  const request = {
    type: "ImmutableInductionEvidenceReadRequest",
    version: 1,
    purpose: grant.purpose,
    grantId: semanticId(grant),
    receiverActor: RECEIVER_ACTOR,
    providerActor: grant.recipientActor,
    providerCardId: providerEvidence.card,
    providerCardSignatureId: providerEvidence.signature,
    providerKid: providerEvidence.kid,
    providerJwks: providerEvidence.jwks,
    objectId: grant.objectId,
    sha256: grant.sha256,
    length: grant.length,
    evidenceRootId: grant.evidenceRootId,
    taskId: grant.taskId,
    nonce: grant.nonce,
    workOrderId: grant.workOrderId,
    artifactId: grant.artifactId,
    candidatePlateId: grant.candidatePlateId,
  };
  const requestBytes = semanticBytes(request);
  const grantJws = await new FlattenedSign(semanticBytes(grant))
    .setProtectedHeader({
      alg: "EdDSA",
      kid: common.receiverKid,
      jku: common.receiverJwks,
      typ: "JOSE",
    })
    .sign(receiverKeys.privateKey);
  const inputJws = await new FlattenedSign(requestBytes)
    .setProtectedHeader({
      alg: "EdDSA",
      kid: providerKid,
      jku: providerEvidence.jwks,
      typ: "JOSE",
    })
    .sign(providerKeys.privateKey);
  const receiverPrivate = await exportPKCS8(receiverKeys.privateKey);
  const options = {
    requestBytes,
    grant,
    grantJws,
    inputJws,
    dataRoot: root,
    routesFile: routes,
    privateKeyPem: receiverPrivate,
    signingKid: common.receiverKid,
    signingJwks: common.receiverJwks,
    receiverCard: {
      card: common.receiverCardId,
      signature: common.receiverCardSignatureId,
      kid: common.receiverKid,
      jwks: common.receiverJwks,
    },
    receiverJwks: { keys: [receiverJwk] },
    receiverAgentUrl: `${receiverBaseUrl}/.well-known/agent-card.json`,
    now,
    discover: async () => signedCard,
    discoverReceiver: async () => signedReceiverCard,
    fetch: async () => ({ ok: true, json: async () => configuration.agentCardJwks }),
  };
  const first = await readImmutableInductionEvidence(options);
  const verifiedReceiverOutput = await import("jose").then(({ flattenedVerify }) =>
    flattenedVerify(first.jws, receiverKeys.publicKey));
  assert.deepEqual(Buffer.from(verifiedReceiverOutput.payload), first.bytes);
  const replay = await readImmutableInductionEvidence({
    ...options,
    now: new Date("2026-07-24T12:00:30.000Z"),
  });
  assert.deepEqual(first.bytes, replay.bytes);
  assert.deepEqual(first.jws, replay.jws);
  assert.deepEqual(Buffer.from(first.result.bytes), object);

  const concurrentGrant = {
    ...grant,
    nonce: "BCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr",
  };
  const concurrentRequest = {
    ...request,
    grantId: semanticId(concurrentGrant),
    nonce: concurrentGrant.nonce,
  };
  const concurrentRequestBytes = semanticBytes(concurrentRequest);
  const concurrentGrantJws = await new FlattenedSign(semanticBytes(concurrentGrant))
    .setProtectedHeader({
      alg: "EdDSA",
      kid: common.receiverKid,
      jku: common.receiverJwks,
      typ: "JOSE",
    })
    .sign(receiverKeys.privateKey);
  const concurrentInputJws = await new FlattenedSign(concurrentRequestBytes)
    .setProtectedHeader({
      alg: "EdDSA",
      kid: providerKid,
      jku: providerEvidence.jwks,
      typ: "JOSE",
    })
    .sign(providerKeys.privateKey);
  const concurrentOptions = {
    ...options,
    requestBytes: concurrentRequestBytes,
    grant: concurrentGrant,
    grantJws: concurrentGrantJws,
    inputJws: concurrentInputJws,
  };
  const [left, right] = await Promise.all([
    readImmutableInductionEvidence({
      ...concurrentOptions,
      now: new Date("2026-07-24T12:00:00.000Z"),
    }),
    readImmutableInductionEvidence({
      ...concurrentOptions,
      now: new Date("2026-07-24T12:00:00.001Z"),
    }),
  ]);
  assert.deepEqual(left.bytes, right.bytes);
  assert.deepEqual(left.jws, right.jws);

  for (const [index, crashPoint] of [
    [0, "consumption-reserved"],
    [1, "consumption-intent"],
  ]) {
    const crashGrant = {
      ...grant,
      nonce: [
        "CDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrs",
        "EFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstu",
      ][index],
    };
    const crashRequest = {
      ...request,
      grantId: semanticId(crashGrant),
      nonce: crashGrant.nonce,
    };
    const crashRequestBytes = semanticBytes(crashRequest);
    const crashGrantJws = await new FlattenedSign(semanticBytes(crashGrant))
      .setProtectedHeader({
        alg: "EdDSA",
        kid: common.receiverKid,
        jku: common.receiverJwks,
        typ: "JOSE",
      })
      .sign(receiverKeys.privateKey);
    const crashInputJws = await new FlattenedSign(crashRequestBytes)
      .setProtectedHeader({
        alg: "EdDSA",
        kid: providerKid,
        jku: providerEvidence.jwks,
        typ: "JOSE",
      })
      .sign(providerKeys.privateKey);
    const carrier = {
      requestBytes: Buffer.from(crashRequestBytes).toString("base64"),
      grant: crashGrant,
      grantJws: crashGrantJws,
      inputJws: crashInputJws,
      dataRoot: root,
      routesFile: routes,
      privateKeyPem: receiverPrivate,
      signingKid: common.receiverKid,
      signingJwks: common.receiverJwks,
      receiverCard: options.receiverCard,
      receiverJwks: options.receiverJwks,
      receiverAgentUrl: options.receiverAgentUrl,
      providerCard: signedCard,
      receiverSignedCard: signedReceiverCard,
      providerJwks: configuration.agentCardJwks,
      now: now.toISOString(),
      crashPoint,
    };
    const crashed = spawnSync(
      process.execPath,
      [join(import.meta.dirname, "fixtures/run-immutable-evidence-core.mjs")],
      { input: JSON.stringify(carrier), encoding: "utf8" },
    );
    assert.equal(crashed.status, 91, crashed.stderr);
    if (crashPoint === "consumption-intent") {
      rmSync(join(
        root,
        "immutable-induction-evidence",
        evidenceRootId.split(";").at(-1),
        "objects",
        `${registered.objectId.split(";").at(-1)}.cbor`,
      ));
    }
    const recovered = spawnSync(
      process.execPath,
      [join(import.meta.dirname, "fixtures/run-immutable-evidence-core.mjs")],
      {
        input: JSON.stringify({ ...carrier, crashPoint: null }),
        encoding: "utf8",
      },
    );
    assert.equal(recovered.status, 0, recovered.stderr);
    const recovery = JSON.parse(recovered.stdout);
    const recoveredResult = decodeSemantic(Buffer.from(recovery.bytes, "base64"));
    assert.deepEqual(Buffer.from(recoveredResult.bytes), object);
    if (crashPoint === "consumption-intent") {
      registerImmutableEvidenceObject({ dataRoot: root, evidenceRootId, bytes: object });
    }
  }

  const privateGrant = {
    ...grant,
    purpose: "private-index-release",
    nonce: "DEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrst",
    allocationId: ni(Buffer.from("allocation")),
    privateIndexId: ni(Buffer.from("private-index")),
    journalId: ni(Buffer.from("private-journal")),
  };
  delete privateGrant.workOrderId;
  delete privateGrant.artifactId;
  delete privateGrant.candidatePlateId;
  const privateRequest = {
    ...request,
    purpose: privateGrant.purpose,
    grantId: semanticId(privateGrant),
    nonce: privateGrant.nonce,
    allocationId: privateGrant.allocationId,
    privateIndexId: privateGrant.privateIndexId,
    journalId: privateGrant.journalId,
  };
  delete privateRequest.workOrderId;
  delete privateRequest.artifactId;
  delete privateRequest.candidatePlateId;
  const privateBytes = semanticBytes(privateRequest);
  const privateGrantJws = await new FlattenedSign(semanticBytes(privateGrant))
    .setProtectedHeader({ alg: "EdDSA", kid: common.receiverKid, jku: common.receiverJwks, typ: "JOSE" })
    .sign(receiverKeys.privateKey);
  const privateInputJws = await new FlattenedSign(privateBytes)
    .setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: providerEvidence.jwks, typ: "JOSE" })
    .sign(providerKeys.privateKey);
  const privateResult = await readImmutableInductionEvidence({
    ...options, requestBytes: privateBytes, grant: privateGrant,
    grantJws: privateGrantJws, inputJws: privateInputJws,
  });
  assert.equal(privateResult.result.purpose, "private-index-release");
  assert.equal(privateResult.result.allocationId, privateGrant.allocationId);
  assert.equal(privateResult.result.privateIndexId, privateGrant.privateIndexId);
  assert.equal(privateResult.result.journalId, privateGrant.journalId);
});

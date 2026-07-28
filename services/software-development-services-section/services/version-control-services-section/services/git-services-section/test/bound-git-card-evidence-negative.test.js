import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exportJWK, exportPKCS8, FlattenedSign, generateKeyPair } from "jose";
import {
  agentCardSignatureEvidence,
  createAgentCardSigningConfiguration,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  RECEIVER_ACTOR,
  readImmutableInductionEvidence,
  registerImmutableEvidenceObject,
} from "../../../../accepted-software-delivery-receiver-service/src/immutable-induction-evidence.mjs";

const ni = (bytes) => `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`;

test("receiver rejects every post-construction Git card-evidence drift before consumption", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-card-negative-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const providerKeys = await generateKeyPair("EdDSA", { extractable: true });
  const receiverKeys = await generateKeyPair("EdDSA", { extractable: true });
  const providerKid = "git-card-negative";
  const providerUrl = "https://git-card-negative.assay.invalid";
  const providerConfiguration = createAgentCardSigningConfiguration({
    baseUrl: providerUrl,
    kid: providerKid,
    privateKey: providerKeys.privateKey,
    publicJwk: await exportJWK(providerKeys.publicKey),
  });
  const providerCard = await providerConfiguration.agentCardSignatureGenerator({
    name: "test Git provider", description: "test-owned", version: "1",
    protocolVersion: "1.0", preferredTransport: "JSONRPC", url: `${providerUrl}/a2a`,
    supportedInterfaces: [{ url: `${providerUrl}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false, extensions: [] },
    defaultInputModes: ["application/rmn+cbor"], defaultOutputModes: ["application/rmn+cbor"], skills: [],
  });
  const providerEvidence = agentCardSignatureEvidence(providerCard);
  const receiverKid = "receiver-card-negative";
  const receiverUrl = "https://receiver-card-negative.assay.invalid";
  const receiverJwk = { ...await exportJWK(receiverKeys.publicKey), kid: receiverKid, alg: "EdDSA", use: "sig" };
  const receiverConfiguration = createAgentCardSigningConfiguration({
    baseUrl: receiverUrl, kid: receiverKid, privateKey: receiverKeys.privateKey, publicJwk: receiverJwk,
  });
  const receiverCard = await receiverConfiguration.agentCardSignatureGenerator({
    name: "test receiver", description: "test-owned", version: "1",
    protocolVersion: "1.0", preferredTransport: "JSONRPC", url: `${receiverUrl}/a2a`,
    supportedInterfaces: [{ url: `${receiverUrl}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false, extensions: [] },
    defaultInputModes: ["application/rmn+cbor"], defaultOutputModes: ["application/rmn+cbor"], skills: [],
  });
  const receiverEvidence = agentCardSignatureEvidence(receiverCard);
  const routesFile = join(root, "routes.json");
  writeFileSync(routesFile, JSON.stringify({ version: 1, routes: [{ actor: "urn:ame:git-services-section", agentCardUrl: `${providerUrl}/.well-known/agent-card.json`, account: null }] }));
  const evidenceRootId = ni(Buffer.from("card-negative-root"));
  const object = Buffer.from([0xa1, 0x61, 0x78, 0x01]);
  const registered = registerImmutableEvidenceObject({ dataRoot: root, evidenceRootId, bytes: object });
  const grant = {
    type: "ImmutableInductionEvidenceReadGrant", version: 1, purpose: "sealed-candidate",
    issuerActor: RECEIVER_ACTOR, recipientActor: "urn:ame:git-services-section",
    receiverActor: RECEIVER_ACTOR,
    receiverCardId: receiverEvidence.card, receiverCardSignatureId: receiverEvidence.signature,
    receiverKid: receiverEvidence.kid, receiverJwks: receiverEvidence.jwks,
    operation: "read-immutable-induction-evidence-object", ...registered,
    taskId: ni(Buffer.from("card-negative-task")), nonce: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq",
    issuedAt: "2026-07-24T11:59:00.000Z", expiresAt: "2026-07-24T12:01:00.000Z", uses: 1,
    workOrderId: ni(Buffer.from("card-negative-work-order")), artifactId: registered.objectId,
    candidatePlateId: ni(Buffer.from("card-negative-candidate")),
  };
  const grantJws = await new FlattenedSign(semanticBytes(grant)).setProtectedHeader({ alg: "EdDSA", kid: receiverEvidence.kid, jku: receiverEvidence.jwks, typ: "JOSE" }).sign(receiverKeys.privateKey);
  const baseline = {
    type: "ImmutableInductionEvidenceReadRequest", version: 1, purpose: grant.purpose,
    grantId: semanticId(grant), receiverActor: RECEIVER_ACTOR, providerActor: grant.recipientActor,
    providerCardId: providerEvidence.card, providerCardSignatureId: providerEvidence.signature,
    providerKid: providerEvidence.kid, providerJwks: providerEvidence.jwks,
    objectId: grant.objectId, sha256: grant.sha256, length: grant.length,
    evidenceRootId: grant.evidenceRootId, taskId: grant.taskId, nonce: grant.nonce,
    workOrderId: grant.workOrderId, artifactId: grant.artifactId, candidatePlateId: grant.candidatePlateId,
  };
  const receiverPrivate = await exportPKCS8(receiverKeys.privateKey);
  const invoke = async (request, crash = () => {}) => {
    const requestBytes = semanticBytes(request);
    const inputJws = await new FlattenedSign(requestBytes).setProtectedHeader({ alg: "EdDSA", kid: providerKid, jku: providerEvidence.jwks, typ: "JOSE" }).sign(providerKeys.privateKey);
    return readImmutableInductionEvidence({
      requestBytes, grant, grantJws, inputJws, dataRoot: root, routesFile,
      privateKeyPem: receiverPrivate, signingKid: receiverEvidence.kid, signingJwks: receiverEvidence.jwks,
      receiverCard: { card: receiverEvidence.card, signature: receiverEvidence.signature, kid: receiverEvidence.kid, jwks: receiverEvidence.jwks },
      receiverJwks: { keys: [receiverJwk] }, receiverAgentUrl: `${receiverUrl}/.well-known/agent-card.json`,
      now: new Date("2026-07-24T12:00:00.000Z"), discover: async () => providerCard,
      discoverReceiver: async () => receiverCard,
      fetch: async () => ({ ok: true, json: async () => providerConfiguration.agentCardJwks }), crash,
    });
  };
  for (const [field, value] of [
    ["providerCardId", ni(Buffer.from("wrong-provider-card"))],
    ["providerCardSignatureId", ni(Buffer.from("wrong-provider-card-signature"))],
    ["providerKid", "wrong-provider-kid"],
    ["providerJwks", "https://wrong-provider-card.assay.invalid/jwks.json"],
  ]) {
    let reachedEffect = false;
    await assert.rejects(invoke({ ...baseline, [field]: value }, () => { reachedEffect = true; }), /actor-route-drift/u, field);
    assert.equal(reachedEffect, false, `${field} reached the consumption effect`);
    assert.equal(existsSync(join(root, "immutable-induction-evidence", evidenceRootId.split(";").at(-1), "consumptions")), false, `${field} created consumption state`);
  }
  const accepted = await invoke(baseline);
  assert.deepEqual(Buffer.from(accepted.result.bytes), object);
});

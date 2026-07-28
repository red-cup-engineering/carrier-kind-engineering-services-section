import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  decodeSemantic,
  normalizeCarrier,
  semanticBytes,
  semanticId,
} from "@red-cup-engineering/rmn-semantic-conformance";
import {
  agentCardSignatureEvidence,
  discoverSignedAgentCard,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import {
  decodeProtectedHeader,
  FlattenedSign,
  flattenedVerify,
  importJWK,
  importPKCS8,
} from "jose";

export const EVIDENCE_OPERATION = "read-immutable-induction-evidence-object";
export const RECEIVER_ACTOR =
  "urn:ame:accepted-software-delivery-receiver-service";
const NI = /^ni:\/\/\/sha-256;([A-Za-z0-9_-]{43})$/u;
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u;
const PURPOSES = new Set(["sealed-candidate", "publication-phase", "private-index-release"]);
const BASE = [
  "type", "version", "purpose", "grantId", "receiverActor", "providerActor",
  "providerCardId", "providerCardSignatureId", "providerKid", "providerJwks",
  "objectId", "sha256", "length", "evidenceRootId", "taskId", "nonce",
];
const EXTRA = {
  "sealed-candidate": ["workOrderId", "artifactId", "candidatePlateId"],
  "publication-phase": ["journalId", "phase"],
  "private-index-release": ["allocationId", "privateIndexId", "journalId"],
};

function fail(code) {
  const error = new Error(code);
  error.reason = code;
  throw error;
}
function exact(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
function rawNi(bytes) {
  return `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`;
}
async function signOutput({ bytes, privateKeyPem, signingKid, signingJwks }) {
  const key = await importPKCS8(privateKeyPem, "EdDSA");
  return new FlattenedSign(bytes)
    .setProtectedHeader({ alg: "EdDSA", kid: signingKid, jku: signingJwks, typ: "JOSE" })
    .sign(key);
}
function canonical(family, bytes) {
  const value = normalizeCarrier(decodeSemantic(bytes));
  if (!Buffer.from(semanticBytes(value)).equals(Buffer.from(bytes))) {
    fail("noncanonical-evidence-carrier");
  }
  const purpose = value?.purpose;
  if (!PURPOSES.has(purpose)) fail("invalid-evidence-purpose");
  const keys = family === "request"
    ? [...BASE, ...EXTRA[purpose]]
      : [
        "type", "version", "purpose", "issuerActor", "recipientActor",
        "receiverActor", "receiverCardId", "receiverCardSignatureId", "receiverKid",
        "receiverJwks", "operation", "objectId", "sha256", "length",
        "evidenceRootId", "taskId", "nonce", "issuedAt", "expiresAt", "uses",
        ...EXTRA[purpose],
      ];
  if (!exact(value, keys)) fail("exact-key-mismatch");
  const expectedType = family === "request"
    ? "ImmutableInductionEvidenceReadRequest"
    : "ImmutableInductionEvidenceReadGrant";
  if (value.type !== expectedType || value.version !== 1) fail("invalid-evidence-type");
  return Object.freeze(value);
}
function directoryFsync(path) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function durableDirectory(path) {
  if (existsSync(path)) return;
  const parent = dirname(path);
  if (parent !== path) durableDirectory(parent);
  try { mkdirSync(path, { mode: 0o700 }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  directoryFsync(parent);
}
function immutableWrite(path, bytes) {
  durableDirectory(dirname(path));
  if (existsSync(path)) {
    if (!readFileSync(path).equals(Buffer.from(bytes))) fail("immutable-object-conflict");
    return;
  }
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    linkSync(temporary, path);
  } catch (error) {
    if (error.code !== "EEXIST" ||
        !readFileSync(path).equals(Buffer.from(bytes))) throw error;
  } finally {
    unlinkSync(temporary);
  }
  directoryFsync(dirname(path));
}
function digestName(ni) {
  const match = NI.exec(ni);
  if (!match) fail("invalid-ni");
  return match[1];
}

export function registerImmutableEvidenceObject({
  dataRoot,
  evidenceRootId,
  bytes,
}) {
  const objectId = rawNi(bytes);
  const root = join(resolve(dataRoot), "immutable-induction-evidence", digestName(evidenceRootId));
  immutableWrite(join(root, "objects", `${digestName(objectId)}.cbor`), bytes);
  return Object.freeze({ evidenceRootId, objectId, sha256: objectId, length: bytes.length });
}

export function readImmutableEvidenceRoutes(path) {
  const body = JSON.parse(readFileSync(path, "utf8"));
  if (!exact(body, ["version", "routes"]) || body.version !== 1 ||
      !Array.isArray(body.routes) || body.routes.length !== 1) fail("actor-route-drift");
  const [route] = body.routes;
  if (!exact(route, ["actor", "account", "agentCardUrl"]) ||
      route.actor !== "urn:ame:git-services-section" || route.account !== null ||
      typeof route.agentCardUrl !== "string") fail("actor-route-drift");
  let url;
  try { url = new URL(route.agentCardUrl); } catch { fail("actor-route-drift"); }
  if (!/^https?:$/u.test(url.protocol) || !url.pathname.startsWith("/")) fail("actor-route-drift");
  return new Map([[route.actor, Object.freeze({ ...route })]]);
}
async function verifyProvider({ request, bytes, inputJws, routesFile, fetch, discover }) {
  const route = readImmutableEvidenceRoutes(routesFile).get(request.providerActor);
  if (!route) fail("actor-route-drift");
  const card = await (discover ?? discoverSignedAgentCard)({
    agentUrl: route.agentCardUrl,
    fetch: fetch ?? globalThis.fetch,
    signal: new AbortController().signal,
  });
  const evidence = agentCardSignatureEvidence(card);
  for (const [suffix, value] of Object.entries({
    CardId: evidence.card,
    CardSignatureId: evidence.signature,
    Kid: evidence.kid,
    Jwks: evidence.jwks,
  })) if (request[`provider${suffix}`] !== value) fail("actor-route-drift");
  const header = decodeProtectedHeader(inputJws);
  if (!exact(header, ["alg", "kid", "jku", "typ"]) ||
      header.typ !== "JOSE" || header.kid !== evidence.kid ||
      header.alg !== evidence.algorithm || header.jku !== evidence.jwks) {
    fail("actor-route-drift");
  }
  const response = await (fetch ?? globalThis.fetch)(evidence.jwks);
  if (!response.ok) fail("jwks-unavailable");
  const matches = (await response.json()).keys.filter(
    (key) => key.kid === header.kid && key.alg === header.alg &&
      !Object.hasOwn(key, "d"),
  );
  if (matches.length !== 1) fail("actor-route-drift");
  const verified = await flattenedVerify(
    { ...inputJws, payload: inputJws.payload ?? Buffer.from(bytes).toString("base64url") },
    await importJWK(matches[0], header.alg),
  );
  if (!Buffer.from(verified.payload).equals(Buffer.from(bytes))) fail("binding-mismatch");
}
async function verifyReceiverGrant({
  grant,
  grantJws,
  receiverCard,
  receiverJwks,
}) {
  if (!grantJws || !receiverJwks) fail("unsigned-evidence-grant");
  for (const [field, value] of Object.entries({
    receiverCardId: receiverCard.card,
    receiverCardSignatureId: receiverCard.signature,
    receiverKid: receiverCard.kid,
    receiverJwks: receiverCard.jwks,
  })) if (grant[field] !== value) fail("actor-route-drift");
  const header = decodeProtectedHeader(grantJws);
  if (!exact(header, ["alg", "kid", "jku", "typ"]) ||
      header.typ !== "JOSE" || header.alg !== "EdDSA" ||
      header.kid !== receiverCard.kid || header.jku !== receiverCard.jwks) {
    fail("actor-route-drift");
  }
  const matches = receiverJwks.keys?.filter(
    (key) => key.kid === header.kid && key.alg === header.alg &&
      !Object.hasOwn(key, "d"),
  ) ?? [];
  if (matches.length !== 1) fail("actor-route-drift");
  const bytes = semanticBytes(grant);
  const verified = await flattenedVerify(
    { ...grantJws, payload: grantJws.payload ?? Buffer.from(bytes).toString("base64url") },
    await importJWK(matches[0], header.alg),
  );
  if (!Buffer.from(verified.payload).equals(Buffer.from(bytes))) fail("binding-mismatch");
}
async function verifyReceiverIdentity({
  receiverAgentUrl,
  receiverCard,
  receiverJwks,
  fetch,
  discoverReceiver,
}) {
  if (typeof receiverAgentUrl !== "string") fail("receiver-card-unavailable");
  const card = await (discoverReceiver ?? discoverSignedAgentCard)({
    agentUrl: receiverAgentUrl,
    fetch: fetch ?? globalThis.fetch,
    signal: new AbortController().signal,
  });
  const evidence = agentCardSignatureEvidence(card);
  for (const [field, value] of Object.entries({
    card: evidence.card,
    signature: evidence.signature,
    kid: evidence.kid,
    jwks: evidence.jwks,
  })) if (receiverCard[field] !== value) fail("actor-route-drift");
  const matches = receiverJwks.keys?.filter(
    (key) => key.kid === evidence.kid && key.alg === evidence.algorithm &&
      !Object.hasOwn(key, "d"),
  ) ?? [];
  if (matches.length !== 1) fail("actor-route-drift");
}

export async function readImmutableInductionEvidence({
  requestBytes,
  grant,
  grantJws,
  inputJws,
  dataRoot,
  routesFile,
  privateKeyPem,
  signingKid,
  signingJwks,
  receiverCard,
  receiverJwks,
  receiverAgentUrl,
  now = new Date(),
  fetch,
  discover,
  discoverReceiver,
  crash = () => {},
}) {
  const request = canonical("request", requestBytes);
  const normalizedGrant = canonical("grant", semanticBytes(grant));
  await verifyReceiverIdentity({
    receiverAgentUrl,
    receiverCard,
    receiverJwks,
    fetch,
    discoverReceiver,
  });
  await verifyReceiverGrant({
    grant: normalizedGrant,
    grantJws,
    receiverCard,
    receiverJwks,
  });
  if (normalizedGrant.operation !== EVIDENCE_OPERATION ||
      normalizedGrant.issuerActor !== RECEIVER_ACTOR ||
      normalizedGrant.receiverActor !== normalizedGrant.issuerActor ||
      normalizedGrant.recipientActor !== request.providerActor ||
      request.receiverActor !== RECEIVER_ACTOR ||
      request.grantId !== semanticId(normalizedGrant) ||
      normalizedGrant.uses !== 1) fail("binding-mismatch");
  for (const key of [
    "purpose", "objectId", "sha256", "length", "evidenceRootId", "taskId",
    "nonce", ...EXTRA[request.purpose],
  ]) if (request[key] !== normalizedGrant[key]) fail("binding-mismatch");
  if (!TIME.test(normalizedGrant.issuedAt) || !TIME.test(normalizedGrant.expiresAt) ||
      now < new Date(normalizedGrant.issuedAt) || now >= new Date(normalizedGrant.expiresAt)) {
    fail("expired-evidence-grant");
  }
  await verifyProvider({ request, bytes: requestBytes, inputJws, routesFile, fetch, discover });
  const root = join(resolve(dataRoot), "immutable-induction-evidence", digestName(request.evidenceRootId));
  // The registered object is a receiver-local immutable byte plate.  Refuse a
  // substituted symlink before it can become an object-read capability.
  const objectPath = join(root, "objects", `${digestName(request.objectId)}.cbor`);
  const consumptionRoot = join(
    root,
    "consumptions",
    digestName(request.grantId),
  );
  const intentPath = join(consumptionRoot, "intent.cbor");
  const resultPath = join(consumptionRoot, "result.cbor");
  const reservationPath = join(consumptionRoot, "reservation.cbor");
  const priorOutcome = () => {
    const prior = decodeSemantic(readFileSync(resultPath));
    if (prior.requestId !== semanticId(request)) fail("grant-replay");
    return Object.freeze({
      bytes: Buffer.from(prior.output),
      jws: prior.jws,
      result: Object.freeze(decodeSemantic(prior.output)),
    });
  };
  if (existsSync(resultPath)) {
    return priorOutcome();
  }
  const consumptionId = semanticId({
    type: "ImmutableInductionEvidenceConsumption",
    grantId: request.grantId,
    requestId: semanticId(request),
    objectId: request.objectId,
  });
  let reservation;
  if (existsSync(reservationPath)) {
    reservation = decodeSemantic(readFileSync(reservationPath));
  } else {
    const candidate = {
      type: "ImmutableInductionEvidenceConsumptionReservation",
      version: 1,
      consumptionId,
      grantId: request.grantId,
      requestId: semanticId(request),
      objectId: request.objectId,
      timestamp: now.toISOString(),
    };
    try {
      immutableWrite(reservationPath, semanticBytes(candidate));
      reservation = candidate;
    } catch (error) {
      if (
        error.code !== "EEXIST" &&
        error.message !== "immutable-object-conflict"
      ) throw error;
      reservation = decodeSemantic(readFileSync(reservationPath));
    }
  }
  if (
    reservation.requestId !== semanticId(request) ||
    reservation.grantId !== request.grantId ||
    reservation.objectId !== request.objectId ||
    reservation.consumptionId !== consumptionId
  ) fail("grant-replay");
  crash("consumption-reserved");
  let intent;
  if (existsSync(intentPath)) {
    intent = decodeSemantic(readFileSync(intentPath));
  } else {
    let stat;
    try { stat = lstatSync(objectPath); } catch { fail("evidence-object-drift"); }
    if (!stat.isFile() || stat.isSymbolicLink()) fail("evidence-object-drift");
    const object = readFileSync(objectPath);
    if (object.length !== request.length || rawNi(object) !== request.objectId ||
        request.sha256 !== request.objectId) fail("evidence-object-drift");
    const candidate = {
      type: "ImmutableInductionEvidenceConsumptionIntent",
      version: 1,
      consumptionId,
      grantId: request.grantId,
      requestId: semanticId(request),
      objectId: request.objectId,
      bytes: object,
      timestamp: reservation.timestamp,
    };
    try {
      immutableWrite(intentPath, semanticBytes(candidate));
      intent = candidate;
    } catch (error) {
      if (
        error.code !== "EEXIST" &&
        error.message !== "immutable-object-conflict"
      ) throw error;
      intent = decodeSemantic(readFileSync(intentPath));
    }
  }
  if (
    intent.requestId !== semanticId(request) ||
    intent.grantId !== request.grantId ||
    intent.objectId !== request.objectId ||
    intent.consumptionId !== consumptionId ||
    Buffer.from(intent.bytes).length !== request.length ||
    rawNi(intent.bytes) !== request.objectId
  ) fail("grant-replay");
  const object = Buffer.from(intent.bytes);
  crash("consumption-intent");
  const result = {
    type: "ImmutableInductionEvidenceObjectResult",
    version: 1,
    purpose: request.purpose,
    requestId: semanticId(request),
    grantId: request.grantId,
    receiverActor: RECEIVER_ACTOR,
    providerActor: request.providerActor,
    receiverCardId: receiverCard.card,
    receiverCardSignatureId: receiverCard.signature,
    receiverKid: receiverCard.kid,
    receiverJwks: receiverCard.jwks,
    providerCardId: request.providerCardId,
    providerCardSignatureId: request.providerCardSignatureId,
    providerKid: request.providerKid,
    providerJwks: request.providerJwks,
    objectId: request.objectId,
    taskId: request.taskId,
    bytes: object,
    sha256: request.sha256,
    length: request.length,
    consumptionId,
    timestamp: intent.timestamp,
  };
  for (const key of EXTRA[request.purpose]) result[key] = request[key];
  const output = semanticBytes(normalizeCarrier(result));
  const jws = await signOutput({ bytes: output, privateKeyPem, signingKid, signingJwks });
  try {
    immutableWrite(resultPath, semanticBytes({
      consumptionId,
      grantId: request.grantId,
      requestId: semanticId(request),
      output,
      jws,
    }));
  } catch (error) {
    if (
      error.code !== "EEXIST" &&
      error.message !== "immutable-object-conflict"
    ) throw error;
    return priorOutcome();
  }
  return Object.freeze({ bytes: output, jws, result: Object.freeze(result) });
}

export async function signEvidenceRefusal({
  requestBytes,
  address,
  reason,
  receiverCard,
  privateKeyPem,
  signingKid,
  signingJwks,
  now = new Date(),
}) {
  if (!address || !PURPOSES.has(address.purpose) || !NI.test(address.grantId)) {
    throw new Error("unaddressable-evidence-refusal");
  }
  const allowed = new Set([
    "malformed-wire", "grant-replay", "actor-route-drift",
    "binding-mismatch", "pre-effect", "unresolved",
  ]);
  const refusal = {
    type: "ImmutableInductionEvidenceReadRefusal",
    version: 1,
    purpose: address.purpose,
    grantId: address.grantId,
    receiverActor: RECEIVER_ACTOR,
    receiverCardId: receiverCard.card,
    receiverCardSignatureId: receiverCard.signature,
    receiverKid: receiverCard.kid,
    receiverJwks: receiverCard.jwks,
    reason: allowed.has(reason) ? reason : "pre-effect",
    state: reason === "unresolved" ? "unresolved" : "pre-effect",
    observedStateId: semanticId({
      requestId: rawNi(requestBytes),
      reason: allowed.has(reason) ? reason : "pre-effect",
    }),
    timestamp: now.toISOString(),
  };
  const bytes = semanticBytes(normalizeCarrier(refusal));
  const jws = await signOutput({ bytes, privateKeyPem, signingKid, signingJwks });
  return Object.freeze({ bytes, jws, result: Object.freeze(refusal) });
}

export function immutableEvidenceRefusalAddress({ requestBytes, grant }) {
  let requestAddress;
  try {
    const request = decodeSemantic(requestBytes);
    if (PURPOSES.has(request?.purpose) && NI.test(request?.grantId)) {
      requestAddress = Object.freeze({
        purpose: request.purpose,
        grantId: request.grantId,
      });
    }
  } catch {}
  let grantAddress;
  try {
    const normalizedGrant = canonical("grant", semanticBytes(grant));
    grantAddress = Object.freeze({
      purpose: normalizedGrant.purpose,
      grantId: semanticId(normalizedGrant),
    });
  } catch {}
  if (
    requestAddress && grantAddress &&
    (requestAddress.purpose !== grantAddress.purpose ||
      requestAddress.grantId !== grantAddress.grantId)
  ) {
    return Object.freeze({ ...grantAddress, addressMismatch: true });
  }
  return grantAddress ?? requestAddress;
}

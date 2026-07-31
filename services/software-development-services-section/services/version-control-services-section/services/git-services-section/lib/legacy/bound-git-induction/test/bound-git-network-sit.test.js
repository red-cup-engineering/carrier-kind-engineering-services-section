import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
} from "jose";
import { privateKeyToAccount } from "viem/accounts";
import {
  agentCardSignatureEvidence,
  createAgentCardSigningConfiguration,
  discoverSignedAgentCard,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import {
  a2aResultMetadata,
  a2aResultParts,
  resumeRmnTask,
  submitRmnTask,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import { userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { serveBoundGitInduction } from "../src/serve-bound-git-induction.js";
import { serveBoundGitProfile } from "../../block-device-io-coordinator/src/serve-bound-git-profile.js";
import { acquireDeviceLock } from "../../block-device-io-coordinator/src/bound-git-profile.js";
import {
  customerGrantMessage,
  readFrozenRoutes,
  signCarrier,
  verifyActorCarrier,
  verifyCustomerGrant,
} from "../src/bound-git-induction-auth.js";
import {
  decodeCarrier,
  deriveManifest,
  encodeArtifact,
  encodeCarrier,
  fixtures,
  normalizeCarrierFamily,
} from "../src/bound-git-induction-wire.js";
import { nonceHistory } from "../src/bound-git-induction-store.js";
import {
  registerImmutableEvidenceObject,
} from "../../../../accepted-software-delivery-receiver-service/src/immutable-induction-evidence.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const RECEIVER_ROOT = resolve(
  ROOT,
  "../../../accepted-software-delivery-receiver-service",
);
const RECEIVER_EXECUTOR = join(
  RECEIVER_ROOT,
  "bin/execute-immutable-induction-evidence-a2a-message.mjs",
);
const ECHO_EXECUTOR = resolve(
  ROOT,
  "node_modules/@red-cup-engineering/a2a-contracted-agent-service/test/fixtures/echo-rmn.mjs",
);
const GRANT_TYPES = {
  GitCustomerGrant: [
    { name: "actorId", type: "bytes32" },
    { name: "actorCardId", type: "bytes32" },
    { name: "actorCardSignatureId", type: "bytes32" },
    { name: "customer", type: "address" },
    { name: "provider", type: "address" },
    { name: "requestId", type: "bytes32" },
    { name: "offerId", type: "bytes32" },
    { name: "contractId", type: "bytes32" },
    { name: "parentEffectId", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "expiry", type: "uint64" },
  ],
};

async function freePort() {
  const server = createNetServer();
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const port = server.address().port;
  await new Promise(resolveClose => server.close(resolveClose));
  return port;
}

function agentCard(name) {
  return {
    name,
    description: `${name} network assay`,
    version: "1.0.0",
    protocolVersion: "1.0",
    preferredTransport: "JSONRPC",
    url: "${BASE_URL}/a2a/jsonrpc",
    supportedInterfaces: [
      {
        url: "${BASE_URL}/a2a/jsonrpc",
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      },
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      extensions: [],
    },
    defaultInputModes: ["application/rmn+cbor"],
    defaultOutputModes: ["application/rmn+cbor"],
    skills: [
      {
        id: name,
        name,
        description: name,
        tags: ["test-owned"],
        examples: [],
        inputModes: ["application/rmn+cbor"],
        outputModes: ["application/rmn+cbor"],
      },
    ],
  };
}

async function identity(root, name, baseUrl) {
  const { privateKey, publicKey } = await generateKeyPair("EdDSA", {
    extractable: true,
  });
  const kid = `${name}-key`;
  const publicJwk = await exportJWK(publicKey);
  const privateKeyPath = join(root, `${name}.pem`);
  writeFileSync(privateKeyPath, await exportPKCS8(privateKey), { mode: 0o600 });
  const cardPath = join(root, `${name}-card.json`);
  writeFileSync(cardPath, JSON.stringify(agentCard(name)));
  return {
    baseUrl,
    cardPath,
    kid,
    privateKey,
    privateKeyPath,
    publicJwk: { ...publicJwk, kid, alg: "EdDSA", use: "sig" },
    signing: createAgentCardSigningConfiguration({
      baseUrl,
      kid,
      privateKey,
      publicJwk,
    }),
  };
}

async function closeServer(server) {
  if (!server?.listening) return;
  await new Promise((accept, reject) =>
    server.close(error => (error ? reject(error) : accept())),
  );
}

async function eventually(check, timeoutMs=10_000){
  const deadline=Date.now()+timeoutMs;
  let last;
  while(Date.now()<deadline){
    try{return await check()}catch(error){last=error}
    await new Promise(accept=>setTimeout(accept,10));
  }
  throw last??new Error("eventually-timeout");
}

function gitExecutorPids(){
  const result=[];
  for(const entry of readdirSync("/proc")){
    if(!/^[0-9]+$/u.test(entry))continue;
    try{
      const command=readFileSync(`/proc/${entry}/cmdline`,"utf8").replaceAll("\0"," ");
      if(command.includes("bound-git-induction-a2a-executor.js"))result.push(Number(entry));
    }catch{}
  }
  return result;
}

function git(root, ...args) {
  const result = spawnSync("/usr/bin/git", ["-C", root, ...args], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return path;
}

async function discoverEvidence(baseUrl) {
  return agentCardSignatureEvidence(
    await discoverSignedAgentCard({
      agentUrl: `${baseUrl}/.well-known/agent-card.json`,
      signal: new AbortController().signal,
    }),
  );
}

test("fresh-process production A2A prepare verifies customer, receiver, Git and coordinator signatures", async t => {
  mkdirSync(join(ROOT, "data/runtime"), { recursive: true });
  const root = mkdtempSync(join(ROOT, "data/runtime/network-sit-"));
  const priorEnvironment = new Map();
  const running = [];
  let rpc;
  let heldDeviceLock;
  t.after(async () => {
    try{heldDeviceLock?.release()}catch{}
    for (const service of running.reverse()) await closeServer(service.server);
    await closeServer(rpc);
    for (const [key, value] of priorEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  });
  const setEnvironment = (key, value) => {
    if (!priorEnvironment.has(key)) priorEnvironment.set(key, process.env[key]);
    process.env[key] = value;
  };

  const ports = Object.fromEntries(
    await Promise.all(
      ["customer", "receiver", "git", "coordinator", "rpc"].map(
        async name => [name, await freePort()],
      ),
    ),
  );
  const identities = {};
  for (const name of ["customer", "receiver", "git", "coordinator"]) {
    identities[name] = await identity(
      root,
      name,
      `http://127.0.0.1:${ports[name]}`,
    );
  }
  identities.receiver.cardPath = join(
    RECEIVER_ROOT,
    "content/agent-cards/immutable-induction-evidence-read-node.json",
  );
  const taskRoot = name => join(root, "tasks", name);
  running.push(
    await serveContractedAgent({
      port: ports.customer,
      host: "127.0.0.1",
      baseUrl: identities.customer.baseUrl,
      agentCard: identities.customer.cardPath,
      executor: process.execPath,
      executorArgs: [ECHO_EXECUTOR],
      timeoutMs: null,
      taskStoreRoot: taskRoot("customer"),
      ...identities.customer.signing,
    }),
  );
  running.push(
    await serveContractedAgent({
      port: ports.receiver,
      host: "127.0.0.1",
      baseUrl: identities.receiver.baseUrl,
      agentCard: identities.receiver.cardPath,
      executor: process.execPath,
      executorArgs: [RECEIVER_EXECUTOR],
      timeoutMs: null,
      taskStoreRoot: taskRoot("receiver"),
      ...identities.receiver.signing,
    }),
  );
  running.push(
    await serveBoundGitProfile({
      port: ports.coordinator,
      host: "127.0.0.1",
      baseUrl: identities.coordinator.baseUrl,
      agentCard: identities.coordinator.cardPath,
      timeoutMs: null,
      taskStoreRoot: taskRoot("coordinator"),
      ...identities.coordinator.signing,
    }),
  );
  running.push(
    await serveBoundGitInduction({
      port: ports.git,
      host: "127.0.0.1",
      baseUrl: identities.git.baseUrl,
      agentCard: identities.git.cardPath,
      timeoutMs: null,
      taskStoreRoot: taskRoot("git"),
      ...identities.git.signing,
    }),
  );

  const evidence = {};
  for (const name of Object.keys(identities)) {
    evidence[name] = await discoverEvidence(identities[name].baseUrl);
  }
  const repository = join(root, "repository");
  mkdirSync(repository, { mode: 0o700 });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Fixture");
  git(repository, "config", "user.email", "fixture@example.invalid");
  mkdirSync(join(repository, "lib"));
  writeFileSync(join(repository, "lib/a"), "old");
  git(repository, "add", "lib/a");
  git(repository, "commit", "-m", "old");
  const repositoryRealpath = realpathSync(repository);
  const gitDirRealpath = realpathSync(join(repository, ".git"));
  const head = git(repository, "rev-parse", "HEAD");
  const filesystem = spawnSync(
    "/usr/bin/findmnt",
    ["-n", "-o", "UUID", "--target", repositoryRealpath],
    { encoding: "utf8" },
  );
  assert.equal(filesystem.status, 0, filesystem.stderr);
  const operation = structuredClone(
    fixtures["PublicOperation/prepare-bound-tree"],
  );
  const descriptor = {
    descriptorId: semanticId({ descriptor: "network-sit" }),
    repositoryId: operation.repositoryId,
    rootRealpath: repositoryRealpath,
    gitDirRealpath,
    liveIndexRealpath: join(gitDirRealpath, "index"),
    objectFormat: "sha1",
    filesystemUuid: filesystem.stdout.trim(),
    deviceRealpath: null,
    deviceRdev: 0,
    ownerUid: process.getuid(),
    rootMode: statSync(repositoryRealpath).mode & 0o7777,
    gitDirMode: statSync(gitDirRealpath).mode & 0o7777,
    deviceLockId: join(root, "device.lock"),
  };
  const artifactBytes = encodeArtifact({
    files: [{ path: "a", content: "new" }],
  });
  const derived = deriveManifest({
    artifactBytes,
    targetRoot: "lib",
    expectedTargetEntries: [
      {
        path: "a",
        mode: "100644",
        blobId: git(repository, "rev-parse", `${head}:lib/a`),
      },
    ],
    objectFormat: "sha1",
  });
  const eoa = privateKeyToAccount(`0x${"11".repeat(32)}`);
  const providerAddress = `0x${"22".repeat(20)}`;
  const customerAccount = `eip155:31337:${eoa.address}`;
  const providerAccount = `eip155:31337:${providerAddress}`;
  Object.assign(operation, {
    customerActor: "urn:ame:test-network-customer",
    customerAccount,
    customerCardId: evidence.customer.card,
    customerCardSignatureId: evidence.customer.signature,
    customerKid: evidence.customer.kid,
    customerJwks: evidence.customer.jwks,
    gitActor: "urn:ame:git-services-section",
    gitAccount: providerAccount,
    gitCardId: evidence.git.card,
    gitCardSignatureId: evidence.git.signature,
    gitKid: evidence.git.kid,
    gitJwks: evidence.git.jwks,
    receiverActor: "urn:ame:accepted-software-delivery-receiver-service",
    receiverCardId: evidence.receiver.card,
    receiverCardSignatureId: evidence.receiver.signature,
    receiverKid: evidence.receiver.kid,
    receiverJwks: evidence.receiver.jwks,
    expectedOldHead: head,
    declaredRef: "refs/heads/main",
    targetRoot: "lib",
    artifactId: derived.artifactId,
    candidatePlateId: derived.manifestId,
  });
  Object.assign(operation.artifactReadGrant, {
    issuerActor: operation.receiverActor,
    recipientActor: operation.gitActor,
    receiverActor: operation.receiverActor,
    receiverCardId: evidence.receiver.card,
    receiverCardSignatureId: evidence.receiver.signature,
    receiverKid: evidence.receiver.kid,
    receiverJwks: evidence.receiver.jwks,
    objectId: derived.artifactId,
    sha256: derived.artifactId,
    length: artifactBytes.length,
    evidenceRootId: operation.evidenceRootId,
    taskId: operation.taskId,
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    workOrderId: operation.workOrderId,
    artifactId: derived.artifactId,
    candidatePlateId: derived.manifestId,
  });
  const receiverDataRoot = join(root, "receiver-data");
  const registered = registerImmutableEvidenceObject({
    dataRoot: receiverDataRoot,
    evidenceRootId: operation.evidenceRootId,
    bytes: artifactBytes,
  });
  assert.equal(registered.objectId, derived.artifactId);
  const normalizedOperation = normalizeCarrierFamily(
    "PublicOperation",
    operation,
  );
  const operationBytes = encodeCarrier("PublicOperation", normalizedOperation);
  const operationJws = await signCarrier({
    bytes: operationBytes,
    privateKeyPem: readFileSync(identities.customer.privateKeyPath, "utf8"),
    kid: evidence.customer.kid,
    jwks: evidence.customer.jwks,
  });
  const evidenceReadGrantJws = await signCarrier({
    bytes: semanticBytes(normalizedOperation.artifactReadGrant),
    privateKeyPem: readFileSync(identities.receiver.privateKeyPath, "utf8"),
    kid: evidence.receiver.kid,
    jwks: evidence.receiver.jwks,
  });
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const requestId = semanticId(normalizedOperation);
  const domain = {
    name: "emsenn Git Services Customer Grant",
    version: "1",
    chainId: 31337,
    verifyingContract: providerAddress,
  };
  const customerGrantSignature = await eoa.signTypedData({
    domain,
    types: GRANT_TYPES,
    primaryType: "GitCustomerGrant",
    message: customerGrantMessage(
      { ...normalizedOperation, requestId },
      providerAccount,
      expiry,
    ),
  });

  const rpcMethods = [];
  rpc = createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    rpcMethods.push(body.method);
    const result = body.method === "eth_getCode" ? "0x" : "0x1";
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  });
  await new Promise((accept, reject) => {
    rpc.once("error", reject);
    rpc.listen(ports.rpc, "127.0.0.1", accept);
  });
  assert.equal(
    (await verifyCustomerGrant({
      operation: normalizedOperation,
      requestId,
      signature: customerGrantSignature,
      expiry,
      providerAccount,
      rpcUrl: `http://127.0.0.1:${ports.rpc}`,
    })).accountKind,
    "eoa",
  );

  const gitRoutes = writeJson(join(root, "git-routes.json"), {
    version: 1,
    routes: [
      {
        actor: operation.customerActor,
        account: customerAccount,
        agentCardUrl: `${identities.customer.baseUrl}/.well-known/agent-card.json`,
      },
      {
        actor: operation.receiverActor,
        account: null,
        agentCardUrl: `${identities.receiver.baseUrl}/.well-known/agent-card.json`,
      },
      {
        actor: "urn:ame:coordinator",
        account: null,
        agentCardUrl: `${identities.coordinator.baseUrl}/.well-known/agent-card.json`,
      },
    ].sort((left, right) => left.actor.localeCompare(right.actor)),
  });
  const coordinatorRoutes = writeJson(join(root, "coordinator-routes.json"), {
    version: 1,
    routes: [
      {
        actor: operation.gitActor,
        account: providerAccount,
        agentCardUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
      },
      {
        actor: operation.receiverActor,
        account: null,
        agentCardUrl: `${identities.receiver.baseUrl}/.well-known/agent-card.json`,
      },
    ].sort((left, right) => left.actor.localeCompare(right.actor)),
  });
  const assayRoutes = writeJson(join(root, "assay-routes.json"), {
    version: 1,
    routes: [{
      actor: operation.gitActor,
      account: providerAccount,
      agentCardUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
    }],
  });
  const receiverRoutes = writeJson(join(root, "receiver-routes.json"), {
    version: 1,
    routes: [{
      actor: operation.gitActor,
      account: null,
      agentCardUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
    }],
  });
  const receiverJwks = writeJson(
    join(root, "receiver-jwks.json"),
    identities.receiver.signing.agentCardJwks,
  );
  const runtimePath = join(root, "runtime.mjs");
  writeFileSync(
    runtimePath,
    "export const loadReceipt=()=>{};export const bindingReceipt=()=>{};export const loadPrepareChain=()=>{};",
  );
  const environment = {
    BOUND_GIT_ROUTES: gitRoutes,
    BOUND_GIT_PROVIDER_ACCOUNT: providerAccount,
    BOUND_GIT_RPC_URL: `http://127.0.0.1:${ports.rpc}`,
    BOUND_GIT_NONCE_ROOT: join(root, "nonces"),
    BOUND_GIT_COORDINATOR_IDENTITY: writeJson(
      join(root, "coordinator-identity.json"),
      {
        coordinatorActor: "urn:ame:coordinator",
        coordinatorAccount: fixtures["ProfileOperation/prepare-profile-operation"].coordinatorAccount,
        coordinatorCardId: evidence.coordinator.card,
        coordinatorCardSignatureId: evidence.coordinator.signature,
        coordinatorKid: evidence.coordinator.kid,
        coordinatorJwks: evidence.coordinator.jwks,
      },
    ),
    BOUND_GIT_COORDINATOR_AGENT: `${identities.coordinator.baseUrl}/.well-known/agent-card.json`,
    BOUND_GIT_RECEIVER_AGENT: `${identities.receiver.baseUrl}/.well-known/agent-card.json`,
    BOUND_GIT_OBJECT_FORMAT: "sha1",
    BOUND_GIT_BINDING: writeJson(join(root, "binding.json"), {
      expectedOldHead: head,
      declaredRef: "refs/heads/main",
    }),
    BOUND_GIT_SIGNING_KEY: identities.git.privateKeyPath,
    BOUND_GIT_SIGNING_KID: evidence.git.kid,
    BOUND_GIT_SIGNING_JWKS: evidence.git.jwks,
    BOUND_GIT_RUNTIME_MODULE: runtimePath,
    BOUND_GIT_COORDINATOR_ROUTES: coordinatorRoutes,
    BOUND_GIT_COORDINATOR_SIGNING_KEY: identities.coordinator.privateKeyPath,
    BOUND_GIT_COORDINATOR_SIGNING_KID: evidence.coordinator.kid,
    BOUND_GIT_COORDINATOR_SIGNING_JWKS: evidence.coordinator.jwks,
    BOUND_GIT_COORDINATOR_DESCRIPTOR: writeJson(
      join(root, "descriptor.json"),
      descriptor,
    ),
    BOUND_GIT_COORDINATOR_DATA_ROOT: join(root, "coordinator-data"),
    IMMUTABLE_EVIDENCE_RECEIVER_IDENTITY: writeJson(
      join(root, "receiver-identity.json"),
      evidence.receiver,
    ),
    IMMUTABLE_EVIDENCE_DATA_ROOT: receiverDataRoot,
    IMMUTABLE_EVIDENCE_ROUTES: receiverRoutes,
    IMMUTABLE_EVIDENCE_SIGNING_KEY: identities.receiver.privateKeyPath,
    IMMUTABLE_EVIDENCE_SIGNING_KID: evidence.receiver.kid,
    IMMUTABLE_EVIDENCE_SIGNING_JWKS: evidence.receiver.jwks,
    IMMUTABLE_EVIDENCE_VERIFYING_JWKS: receiverJwks,
    IMMUTABLE_EVIDENCE_RECEIVER_AGENT: `${identities.receiver.baseUrl}/.well-known/agent-card.json`,
  };
  for (const [key, value] of Object.entries(environment)) {
    setEnvironment(key, value);
  }
  const message = userRmnMessage(operationBytes);
  message.metadata.boundGitAuthorization = {
    operationJws,
    customerGrantSignature,
    customerGrantExpiry: expiry,
    evidenceReadGrantJws,
  };
  heldDeviceLock=acquireDeviceLock(descriptor.deviceLockId);
  const submitted = await submitRmnTask({
    agentUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
    message,
    requireSignature: true,
    signal: new AbortController().signal,
  });
  const interrupted=await eventually(()=>{
    const history=nonceHistory({root:environment.BOUND_GIT_NONCE_ROOT,customer:normalizedOperation.customerAccount,nonce:normalizedOperation.nonce});
    const last=history.at(-1);
    assert.equal(last?.state,"child-requested",JSON.stringify(last));
    assert.equal(typeof last.childTaskId,"string");
    const pids=gitExecutorPids();
    assert.equal(pids.length,1);
    return {childTaskId:last.childTaskId,pid:pids[0]};
  });
  process.kill(interrupted.pid,"SIGKILL");
  await eventually(()=>{
    assert.throws(()=>process.kill(interrupted.pid,0),error=>error?.code==="ESRCH");
    return true;
  });
  heldDeviceLock.release();
  heldDeviceLock=undefined;
  const resumedSubmission=await submitRmnTask({
    agentUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
    message,
    requireSignature: true,
    signal: new AbortController().signal,
  });
  assert.notEqual(resumedSubmission.taskId,submitted.taskId);
  const exchange = await resumeRmnTask({
    agentUrl: `${identities.git.baseUrl}/.well-known/agent-card.json`,
    taskId: resumedSubmission.taskId,
    inputNi: resumedSubmission.inputNi,
    requireSignature: true,
    signal: new AbortController().signal,
  });
  const outputPart = a2aResultParts(exchange.result).find(
    part => part.mediaType === "application/rmn+cbor",
  );
  const outputBytes = Buffer.from(outputPart.content.value);
  let receipt;
  try {
    receipt = decodeCarrier("PublicReceipt", outputBytes);
  } catch {
    const refusal = decodeCarrier("PublicRefusal", outputBytes);
    const records = readdirSync(root, { recursive: true })
      .filter(path =>
        /\.(?:json|jsonl)$/u.test(String(path)) &&
        /^(?:nonces|coordinator-data|tasks)\//u.test(String(path)))
      .map(path => {
        try {
          return [path, readFileSync(join(root, path), "utf8")];
        } catch {
          return [path, "unreadable"];
        }
      });
    assert.fail(`network prepare refused: ${refusal.reason}/${refusal.state} root=${root} rpc=${JSON.stringify(rpcMethods)} ${JSON.stringify(records).slice(0, 16000)}`);
  }
  assert.equal(receipt.outcome, "prepared");
  const metadata = a2aResultMetadata(exchange.result);
  await verifyActorCarrier({
    routes: readFrozenRoutes(assayRoutes),
    actor: receipt.gitActor,
    carrier: receipt,
    bytes: outputBytes,
    jws: metadata.jws,
    prefix: "git",
  });
  assert.ok(receipt.deviceReceiptId.startsWith("ni:///sha-256;"));
  assert.ok(receipt.allocationId.startsWith("ni:///sha-256;"));
  const settledHistory=nonceHistory({root:environment.BOUND_GIT_NONCE_ROOT,customer:normalizedOperation.customerAccount,nonce:normalizedOperation.nonce});
  assert.equal(settledHistory.at(-1).state,"completed");
  assert.equal(settledHistory.find(row=>row.childTaskId)?.childTaskId,interrupted.childTaskId);
  assert.equal(
    readdirSync(taskRoot("coordinator")).filter(name=>name.endsWith(".a2a-task.json.gz")).length,
    1,
  );
  assert.ok(rpcMethods.includes("eth_getCode"));
  const driftOperation=structuredClone(normalizedOperation);
  driftOperation.nonce="ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";
  driftOperation.idempotencyKey="YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY";
  driftOperation.expectedOldHead="f".repeat(40);
  driftOperation.artifactReadGrant.nonce=driftOperation.nonce;
  const normalizedDrift=normalizeCarrierFamily("PublicOperation",driftOperation);
  const driftBytes=encodeCarrier("PublicOperation",normalizedDrift);
  const driftRequestId=semanticId(normalizedDrift);
  const driftExpiry=Math.floor(Date.now()/1000)+3600;
  const driftAuthorization={
    operationJws:await signCarrier({
      bytes:driftBytes,
      privateKeyPem:readFileSync(identities.customer.privateKeyPath,"utf8"),
      kid:evidence.customer.kid,
      jwks:evidence.customer.jwks,
    }),
    customerGrantSignature:await eoa.signTypedData({
      domain,
      types:GRANT_TYPES,
      primaryType:"GitCustomerGrant",
      message:customerGrantMessage({...normalizedDrift,requestId:driftRequestId},providerAccount,driftExpiry),
    }),
    customerGrantExpiry:driftExpiry,
    evidenceReadGrantJws:await signCarrier({
      bytes:semanticBytes(normalizedDrift.artifactReadGrant),
      privateKeyPem:readFileSync(identities.receiver.privateKeyPath,"utf8"),
      kid:evidence.receiver.kid,
      jwks:evidence.receiver.jwks,
    }),
  };
  const driftMessage=userRmnMessage(driftBytes);
  driftMessage.metadata.boundGitAuthorization=driftAuthorization;
  const driftSubmission=await submitRmnTask({
    agentUrl:`${identities.git.baseUrl}/.well-known/agent-card.json`,
    message:driftMessage,
    requireSignature:true,
    signal:new AbortController().signal,
  });
  const driftExchange=await resumeRmnTask({
    agentUrl:`${identities.git.baseUrl}/.well-known/agent-card.json`,
    taskId:driftSubmission.taskId,
    inputNi:driftSubmission.inputNi,
    requireSignature:true,
    signal:new AbortController().signal,
  });
  const driftPart=a2aResultParts(driftExchange.result).find(part=>part.mediaType==="application/rmn+cbor");
  const driftOutput=Buffer.from(driftPart.content.value);
  const driftRefusal=decodeCarrier("PublicRefusal",driftOutput);
  assert.equal(driftRefusal.state,"unresolved");
  assert.equal(driftRefusal.reason,"unresolved");
  const driftMetadata=a2aResultMetadata(driftExchange.result);
  await verifyActorCarrier({
    routes:readFrozenRoutes(assayRoutes),
    actor:driftRefusal.gitActor,
    carrier:driftRefusal,
    bytes:driftOutput,
    jws:driftMetadata.jws,
    prefix:"git",
  });
  const driftHistory=nonceHistory({root:environment.BOUND_GIT_NONCE_ROOT,customer:normalizedDrift.customerAccount,nonce:normalizedDrift.nonce});
  assert.equal(driftHistory.at(-1).state,"unresolved");
  assert.deepEqual(driftHistory.at(-1).publicResultJws,driftMetadata.jws);
  assert.ok(readFileSync(writeJson(join(root, "receipt.json"), receipt)).length);
});

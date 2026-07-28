import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import test from "node:test";
import {
  decodeCarrier,
  deriveManifest,
  encodeArtifact,
  encodeCarrier,
  fixtures,
  normalizeCarrierFamily,
} from "../src/bound-git-induction-wire.js";
import {
  executePublicOperation,
  formProfileOperation,
  handleSignedPublicCarrier,
} from "../src/bound-git-induction-service.js";
import { nonceHistory } from "../src/bound-git-induction-store.js";
import {
  executeProfileOperation,
  readProfileProof,
} from "../../block-device-io-coordinator/src/bound-git-profile.js";

function git(root, ...args) {
  const result = spawnSync("/usr/bin/git", ["-C", root, ...args], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function rawNi(bytes) {
  return `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`;
}

function authenticatedCustomerEvidence(operation) {
  return {
    route: {
      actor: operation.customerActor,
      agentCardUrl: "https://customer.bound-git.test/.well-known/agent-card.json",
      account: operation.customerAccount,
    },
    evidence: {
      card: operation.customerCardId,
      signature: operation.customerCardSignatureId,
      kid: operation.customerKid,
      jwks: operation.customerJwks,
      algorithm: "EdDSA",
    },
  };
}

function evidence(grant, bytes) {
  const request = structuredClone(fixtures[`EvidenceRequest/${grant.purpose}`]);
  Object.assign(request, {
    purpose: grant.purpose,
    grantId: semanticId(normalizeCarrierFamily("EvidenceGrant", grant)),
    receiverActor: grant.issuerActor,
    providerActor: grant.recipientActor,
    objectId: grant.objectId,
    sha256: grant.sha256,
    length: grant.length,
    evidenceRootId: grant.evidenceRootId,
    taskId: grant.taskId,
    nonce: grant.nonce,
  });
  for (const key of [
    "workOrderId",
    "artifactId",
    "candidatePlateId",
    "journalId",
    "phase",
    "allocationId",
    "privateIndexId",
  ]) {
    if (Object.hasOwn(grant, key)) request[key] = grant[key];
  }
  const normalizedRequest = normalizeCarrierFamily("EvidenceRequest", request);
  const result = structuredClone(fixtures[`EvidenceResult/${grant.purpose}`]);
  Object.assign(result, {
    purpose: normalizedRequest.purpose,
    requestId: semanticId(normalizedRequest),
    grantId: normalizedRequest.grantId,
    receiverActor: normalizedRequest.receiverActor,
    providerActor: normalizedRequest.providerActor,
    providerCardId: normalizedRequest.providerCardId,
    providerCardSignatureId: normalizedRequest.providerCardSignatureId,
    providerKid: normalizedRequest.providerKid,
    providerJwks: normalizedRequest.providerJwks,
    receiverCardId: grant.receiverCardId,
    receiverCardSignatureId: grant.receiverCardSignatureId,
    receiverKid: grant.receiverKid,
    receiverJwks: grant.receiverJwks,
    objectId: grant.objectId,
    taskId: normalizedRequest.taskId,
    bytes,
    sha256: grant.sha256,
    length: bytes.length,
  });
  for (const key of [
    "workOrderId",
    "artifactId",
    "candidatePlateId",
    "journalId",
    "phase",
    "allocationId",
    "privateIndexId",
  ]) {
    if (Object.hasOwn(normalizedRequest, key)) result[key] = normalizedRequest[key];
  }
  return {
    request: normalizedRequest,
    result: normalizeCarrierFamily("EvidenceResult", result),
  };
}

test("real prepare, synchronize, publish and receiver-authorized retirement compose through the coordinator", async () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-public-"));
  try {
    git(root, "init", "-b", "main");
    git(root, "config", "user.name", "Fixture");
    git(root, "config", "user.email", "fixture@example.invalid");
    mkdirSync(join(root, "lib"));
    writeFileSync(join(root, "lib/a"), "old");
    git(root, "add", "lib/a");
    git(root, "commit", "-m", "old");

    const head = git(root, "rev-parse", "HEAD");
    const prepare = structuredClone(fixtures["PublicOperation/prepare-bound-tree"]);
    const repositoryId = prepare.repositoryId;
    const descriptor = {
      descriptorId: semanticId({ descriptor: "git-composition-fixture" }),
      repositoryId,
      rootRealpath: root,
      gitDirRealpath: join(root, ".git"),
      liveIndexRealpath: join(root, ".git/index"),
      objectFormat: "sha1",
      filesystemUuid: "fixture",
      deviceLockId: join(root, "device.lock"),
    };
    const dataRoot = join(root, "coordinator");
    const nonceRoot = join(root, "git-nonces");
    const coordinatorIdentity = Object.fromEntries(
      [
        "coordinatorActor",
        "coordinatorAccount",
        "coordinatorCardId",
        "coordinatorCardSignatureId",
        "coordinatorKid",
        "coordinatorJwks",
      ].map(key => [
        key,
        fixtures["ProfileOperation/prepare-profile-operation"][key],
      ]),
    );
    const artifactBytes = encodeArtifact({
      files: [{ path: "a", content: "new" }],
    });
    const oldBlob = git(root, "rev-parse", `${head}:lib/a`);
    const derived = deriveManifest({
      artifactBytes,
      targetRoot: "lib",
      expectedTargetEntries: [
        { path: "a", mode: "100644", blobId: oldBlob },
      ],
      objectFormat: "sha1",
    });
    Object.assign(prepare, {
      repositoryId,
      expectedOldHead: head,
      declaredRef: "refs/heads/main",
      targetRoot: "lib",
      artifactId: derived.artifactId,
      candidatePlateId: derived.manifestId,
    });
    Object.assign(prepare.artifactReadGrant, {
      objectId: derived.artifactId,
      sha256: derived.artifactId,
      length: artifactBytes.length,
      taskId: prepare.taskId,
      workOrderId: prepare.workOrderId,
      artifactId: derived.artifactId,
      candidatePlateId: derived.manifestId,
    });
    const sealed = evidence(prepare.artifactReadGrant, artifactBytes);

    let prepared;
    let prepareProfile;
    let prepareProfileReceipt;
    let receiverReads = 0;
    let retireProfiles = 0;
    const base = {
      nonceRoot,
      coordinatorIdentity,
      binding: {
        expectedOldHead: head,
        declaredRef: "refs/heads/main",
      },
      objectFormat: "sha1",
      authenticate: async operation => authenticatedCustomerEvidence(operation),
      verifyGrant: async () => true,
      loadReceipt: async () => prepared,
      bindingReceipt: async () => prepared,
      loadPrepareChain: async () => ({
        publicOperation: prepare,
        profileOperation: prepareProfile,
        publicReceipt: prepared,
        profileReceipt: prepareProfileReceipt,
      }),
      invokeProfile: async operation => {
        const receipt = executeProfileOperation(operation, {
          descriptor,
          dataRoot,
          hostAssay: () => true,
        });
        if (operation.kind === "prepare-profile-operation") {
          prepareProfile = operation;
          prepareProfileReceipt = receipt;
        }
        if (operation.kind === "retire-profile-operation") retireProfiles += 1;
        return {
          receipt,
          proof: readProfileProof({
            dataRoot,
            operationId: operation.operationId,
          }),
        };
      },
    };

    prepared = await executePublicOperation(prepare, {
      ...base,
      readEvidence: async () => sealed,
    });
    assert.equal(prepared.outcome, "prepared");
    assert.equal(prepared.candidatePlateId, derived.manifestId);
    assert.equal(prepared.allocationId, prepareProfileReceipt.allocationId);

    writeFileSync(join(root, "lib/a"), "new");
    const synchronize = structuredClone(
      fixtures["PublicOperation/synchronize-live-index"],
    );
    Object.assign(synchronize, {
      repositoryId,
      expectedOldHead: head,
      declaredRef: "refs/heads/main",
      privateIndexId: prepared.privateIndexId,
      candidateSubtreeId: prepared.candidateSubtreeId,
      intendedTreeId: prepared.intendedTreeId,
      preparedCommitId: prepared.preparedCommitId,
      preparedReceiptId: semanticId(prepared),
      nonce: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    });
    const synchronizeBytes = Buffer.from("working-tree-published");
    const synchronizeNi = rawNi(synchronizeBytes);
    Object.assign(synchronize.phaseReadGrant, {
      objectId: synchronizeNi,
      sha256: synchronizeNi,
      length: synchronizeBytes.length,
      taskId: synchronize.taskId,
      journalId: synchronize.journalId,
      phase: "working-tree-published",
      nonce: synchronize.nonce,
    });
    const synchronized = await executePublicOperation(synchronize, {
      ...base,
      readEvidence: async () =>
        evidence(synchronize.phaseReadGrant, synchronizeBytes),
    });
    assert.equal(synchronized.outcome, "synchronized");

    const publish = structuredClone(
      fixtures["PublicOperation/publish-declared-ref"],
    );
    Object.assign(publish, {
      repositoryId,
      expectedOldHead: head,
      declaredRef: "refs/heads/main",
      privateIndexId: prepared.privateIndexId,
      candidateSubtreeId: prepared.candidateSubtreeId,
      intendedTreeId: prepared.intendedTreeId,
      preparedCommitId: prepared.preparedCommitId,
      preparedReceiptId: semanticId(prepared),
      nonce: "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
    });
    const publishBytes = Buffer.from("live-index-synchronized");
    const publishNi = rawNi(publishBytes);
    Object.assign(publish.phaseReadGrant, {
      objectId: publishNi,
      sha256: publishNi,
      length: publishBytes.length,
      taskId: publish.taskId,
      journalId: publish.journalId,
      phase: "live-index-synchronized",
      nonce: publish.nonce,
    });
    const published = await executePublicOperation(publish, {
      ...base,
      readEvidence: async () => evidence(publish.phaseReadGrant, publishBytes),
    });
    assert.equal(published.outcome, "published");
    assert.equal(
      git(root, "rev-parse", "refs/heads/main"),
      prepared.preparedCommitId,
    );

    const release = structuredClone(
      fixtures["PrivateIndexReleaseEvidence/journal-complete"],
    );
    Object.assign(release, {
      receiverActor: prepare.receiverActor,
      receiverCardId: prepare.receiverCardId,
      receiverCardSignatureId: prepare.receiverCardSignatureId,
      receiverKid: prepare.receiverKid,
      receiverJwks: prepare.receiverJwks,
      gitActor: prepare.gitActor,
      repositoryId,
      receiverRootId: prepare.receiverRootId,
      evidenceRootId: prepare.evidenceRootId,
      taskId: prepare.taskId,
      workOrderId: prepare.workOrderId,
      journalId: prepare.journalId,
      privateIndexId: prepared.privateIndexId,
      allocationId: prepared.allocationId,
    });
    const releaseEvidence = normalizeCarrierFamily(
      "PrivateIndexReleaseEvidence",
      release,
    );
    const releaseBytes = encodeCarrier(
      "PrivateIndexReleaseEvidence",
      releaseEvidence,
    );
    const retirementEvidenceId = semanticId(releaseEvidence);
    const retire = structuredClone(
      fixtures["PublicOperation/retire-private-index"],
    );
    Object.assign(retire, {
      repositoryId,
      taskId: prepare.taskId,
      privateIndexId: prepared.privateIndexId,
      retirementEvidenceId,
      nonce: "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
    });
    Object.assign(retire.releaseReadGrant, {
      issuerActor: prepare.receiverActor,
      recipientActor: prepare.gitActor,
      receiverCardId: prepare.receiverCardId,
      receiverCardSignatureId: prepare.receiverCardSignatureId,
      receiverKid: prepare.receiverKid,
      receiverJwks: prepare.receiverJwks,
      objectId: retirementEvidenceId,
      sha256: retirementEvidenceId,
      length: releaseBytes.length,
      evidenceRootId: prepare.evidenceRootId,
      taskId: prepare.taskId,
      allocationId: prepared.allocationId,
      privateIndexId: prepared.privateIndexId,
      journalId: prepare.journalId,
      nonce: retire.nonce,
    });
    const releaseExchange = evidence(retire.releaseReadGrant, releaseBytes);
    const releaseResultBytes = encodeCarrier(
      "EvidenceResult",
      releaseExchange.result,
    );
    const releaseResultJws = {
      protected: "cHJvdGVjdGVk",
      payload: releaseResultBytes.toString("base64url"),
      signature: "c2lnbmF0dXJl",
    };
    const retireContext = {
      ...base,
      readEvidence: async () => {
        receiverReads += 1;
        return {
          ...releaseExchange,
          resultBytes: releaseResultBytes,
          resultJws: releaseResultJws,
        };
      },
    };
    const retired = await executePublicOperation(retire, retireContext);
    assert.equal(retired.outcome, "retired");
    assert.equal(retired.releaseResultId, semanticId(releaseExchange.result));
    assert.match(retired.retirementId, /^ni:\/\/\/sha-256;/u);
    assert.equal(
      git(root, "rev-parse", "refs/heads/main"),
      prepared.preparedCommitId,
    );
    assert.deepEqual(readdirSync(join(dataRoot, "private-indexes")), []);

    const replayed = await executePublicOperation(retire, retireContext);
    assert.deepEqual(replayed, retired);
    assert.equal(receiverReads, 1);
    assert.equal(retireProfiles, 1);

    let signatures = 0;
    const signedContext = {
      ...retireContext,
      signResult: async () => {
        signatures += 1;
        return {
          protected: "cHJvdGVjdGVk",
          payload: "cGF5bG9hZA",
          signature: "c2lnbmF0dXJl",
        };
      },
    };
    const retirementBytes = encodeCarrier("PublicOperation", retire);
    const firstSigned = await handleSignedPublicCarrier(
      retirementBytes,
      signedContext,
    );
    const secondSigned = await handleSignedPublicCarrier(
      retirementBytes,
      signedContext,
    );
    assert.deepEqual(secondSigned, firstSigned);
    assert.equal(
      decodeCarrier("PublicReceipt", firstSigned.bytes).outcome,
      "retired",
    );
    assert.equal(signatures, 1);
    assert.equal(receiverReads, 1);
    assert.equal(retireProfiles, 1);
    assert.equal(
      nonceHistory({
        root: nonceRoot,
        customer: retire.customerAccount,
        nonce: retire.nonce,
      }).at(-1).state,
      "completed",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("interrupted child observation resumes the recorded task without resubmission", async () => {
  const root = mkdtempSync(join(tmpdir(), "bound-git-child-resume-"));
  try {
    const operation = structuredClone(
      fixtures["PublicOperation/inspect-binding"],
    );
    const profileFixture =
      fixtures["ProfileOperation/inspect-profile-operation"];
    const coordinatorIdentity = Object.fromEntries(
      [
        "coordinatorActor",
        "coordinatorAccount",
        "coordinatorCardId",
        "coordinatorCardSignatureId",
        "coordinatorKid",
        "coordinatorJwks",
      ].map(key => [key, profileFixture[key]]),
    );
    const prior = structuredClone(
      fixtures["PublicReceipt/prepare-bound-tree"],
    );
    const binding = {
      expectedOldHead: profileFixture.expectedOldHead,
      declaredRef: profileFixture.declaredRef,
    };
    const profile = formProfileOperation(
      operation,
      coordinatorIdentity,
      binding,
    );
    const receipt = structuredClone(
      fixtures["ProfileReceipt/inspect-profile-operation"],
    );
    for (const key of [
      "operationId",
      "publicRequestId",
      "gitActor",
      "gitAccount",
      "gitCardId",
      "gitCardSignatureId",
      "gitKid",
      "gitJwks",
      "coordinatorActor",
      "coordinatorAccount",
      "coordinatorCardId",
      "coordinatorCardSignatureId",
      "coordinatorKid",
      "coordinatorJwks",
      "repositoryId",
      "taskId",
      "sequence",
      "privateIndexId",
    ]) {
      receipt[key] = profile[key];
    }
    let submissions = 0;
    let resumptions = 0;
    const context = {
      nonceRoot: root,
      coordinatorIdentity,
      objectFormat: "sha1",
      binding,
      authenticate: async operation => authenticatedCustomerEvidence(operation),
      verifyGrant: async () => true,
      bindingReceipt: async () => prior,
      invokeProfile: async (_profile, events) => {
        submissions += 1;
        await events.persist({
          taskId: "child-1",
          inputNi: operation.requestId,
        });
        await events.observe({
          state: "observation-interrupted",
          taskId: "child-1",
        });
        throw new Error("transport-interrupted");
      },
      resumeProfile: async (_profile, { taskId }) => {
        resumptions += 1;
        assert.equal(taskId, "child-1");
        return receipt;
      },
    };
    const firstAttempt = await executePublicOperation(operation, context).then(
      value => ({ value }),
      error => ({ error }),
    );
    assert.ok(firstAttempt.error, JSON.stringify(firstAttempt.value));
    assert.match(firstAttempt.error.message, /transport-interrupted/u);
    const completed = await executePublicOperation(operation, context);
    assert.equal(completed.outcome, "inspected");
    assert.equal(submissions, 1);
    assert.equal(resumptions, 1);
    assert.equal(
      nonceHistory({
        root,
        customer: operation.customerAccount,
        nonce: operation.nonce,
      }).at(-1).state,
      "completed",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

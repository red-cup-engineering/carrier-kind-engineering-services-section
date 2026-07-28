import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { induceGithubSoftwareProposalLocally } from "../src/post-attempt.mjs";

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

test("independently induces a multi-file proposal into a new sovereign repository", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "sovereign-induction-fixture-"));
  const source = join(fixture, "source");
  const archive = join(fixture, "source.tar.gz");
  mkdirSync(join(source, "seed"), { recursive: true });
  writeFileSync(join(source, "seed", "package.json"), "{}\n");
  execFileSync("tar", ["-czf", archive, "-C", source, "seed"]);

  const afterPackage = Buffer.from('{"name":"one-capability-cell","bin":{"serve":"./bin/serve.mjs"}}\n');
  const afterServer = Buffer.from('#!/usr/bin/env node\nprocess.stdout.write("ready\\n");\n');
  const changes = [
    { path: "package.json", beforeExisted: true, beforeDigest: digest(Buffer.from("{}\n")), afterDigest: digest(afterPackage), afterBytesBase64: afterPackage.toString("base64") },
    { path: "bin/serve.mjs", beforeExisted: false, beforeDigest: digest(Buffer.alloc(0)), afterDigest: digest(afterServer), afterBytesBase64: afterServer.toString("base64") },
  ];
  const calls = [];
  const api = {
    downloadRepositoryTarball: async (_repository, _commit, destination) => cpSync(archive, destination),
    getTreeEntries: async () => [{ path: "package.json", mode: "100644", sha: "old" }],
    getContentBytes: async (_repository, _commit, path) => path === "package.json" ? Buffer.from("{}\n") : null,
    createOrgRepository: async (owner, value) => calls.push(["createOrgRepository", owner, value.name]),
    createBlob: async (repository, bytes) => ({ sha: `${repository}:${digest(bytes)}` }),
    createTree: async (repository, value) => { calls.push(["createTree", repository, value]); return { sha: "tree" }; },
    createCommit: async (repository, value) => { calls.push(["createCommit", repository, value]); return { sha: "commit" }; },
    createRef: async (repository, ref, sha) => calls.push(["createRef", repository, ref, sha]),
  };
  const induce = (mission) => {
    mkdirSync(join(mission.territory, "bin"), { recursive: true });
    writeFileSync(join(mission.territory, "package.json"), afterPackage);
    writeFileSync(join(mission.territory, "bin/serve.mjs"), afterServer);
    return { appliedPaths: changes.map(({ path }) => path), verification: { passed: true }, acceptance: { passed: true } };
  };

  try {
    const receipt = await induceGithubSoftwareProposalLocally({
      source: { kind: "github-repository", repository: "harmonious-union/seed", commit: "a".repeat(40) },
      proposal: { type: "SoftwareMissionChangeProposal", proposalOnly: true, customerMutation: false, changes },
      writablePaths: ["package.json", "bin"],
      verifyCommand: "node --check bin/serve.mjs",
      target: { repository: "harmonious-union/one-capability-cell", ref: "heads/main", create: true },
    }, { api, induce });

    assert.equal(receipt.repository, "harmonious-union/one-capability-cell");
    assert.equal(receipt.priorCommit, null);
    assert.deepEqual(receipt.inducedPaths, ["package.json", "bin/serve.mjs"]);
    assert.deepEqual(calls.map(([operation]) => operation), ["createOrgRepository", "createTree", "createCommit", "createRef"]);
    assert.equal(calls[1][2].baseTree, undefined);
    assert.deepEqual(calls[2][2].parents, []);
    assert.deepEqual(calls[3].slice(1), ["harmonious-union/one-capability-cell", "refs/heads/main", "commit"]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { GIT_INGRESS, gitObservationEnvironment, runGitStatus } from "../src/git-ingress.mjs";

test("repository observation reaches Git only through the sanctioned ingress", () => {
  let observed;
  const result = runGitStatus(
    { repositoryRoot: "/home/emsenn/info" },
    {
      actor: "urn:ame:test-observer",
      account: "eip155:31337:0x0000000000000000000000000000000000000001",
      operation: ["status", "--porcelain=v1", "--ignore-submodules=all"],
      spawn(command, argv, options) {
        observed = { command, argv, options };
        return { status: 0, stdout: " M source.mjs\n", stderr: "" };
      },
    },
  );
  assert.equal(observed.command, GIT_INGRESS);
  assert.match(observed.command, /\/git-services-section\/scripts\/git-services$/u);
  assert.deepEqual(observed.argv, ["status", "--porcelain=v1", "--ignore-submodules=all"]);
  assert.equal(observed.options.cwd, "/home/emsenn/info");
  assert.deepEqual(observed.options.env, gitObservationEnvironment({
    actor: "urn:ame:test-observer",
    account: "eip155:31337:0x0000000000000000000000000000000000000001",
  }));
  for (const forbidden of ["HOME", "GITHUB_TOKEN", "GH_TOKEN", "SSH_AUTH_SOCK", "GIT_DIR", "GIT_CONFIG_GLOBAL"]) {
    assert.equal(Object.hasOwn(observed.options.env, forbidden), false, `${forbidden} crossed the observation boundary`);
  }
  assert.deepEqual(result, { exitCode: 0, stdout: " M source.mjs\n", stderr: "" });
});

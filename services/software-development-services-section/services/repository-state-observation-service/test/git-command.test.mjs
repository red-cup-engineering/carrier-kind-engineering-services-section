import assert from "node:assert/strict";
import test from "node:test";
import { GIT_EXECUTABLE, runGit } from "../src/git-command.mjs";

test("repository observation runs the standard Git executable", () => {
  let observed;
  const result = runGit(
    { repositoryRoot: "/home/emsenn/info" },
    {
      operation: ["status", "--porcelain=v1", "--ignore-submodules=all"],
      spawn(command, argv, options) {
        observed = { command, argv, options };
        return { status: 0, stdout: " M source.mjs\n", stderr: "" };
      },
    },
  );
  assert.equal(observed.command, GIT_EXECUTABLE);
  assert.equal(observed.command, "/usr/bin/git");
  assert.deepEqual(observed.argv, ["status", "--porcelain=v1", "--ignore-submodules=all"]);
  assert.equal(observed.options.cwd, "/home/emsenn/info");
  assert.equal(Object.hasOwn(observed.options, "env"), false);
  assert.deepEqual(result, { exitCode: 0, stdout: " M source.mjs\n", stderr: "" });
});

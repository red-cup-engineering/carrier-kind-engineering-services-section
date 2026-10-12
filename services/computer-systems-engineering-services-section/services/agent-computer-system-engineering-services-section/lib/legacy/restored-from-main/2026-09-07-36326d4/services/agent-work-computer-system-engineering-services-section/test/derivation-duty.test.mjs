import test from "node:test";
import assert from "node:assert/strict";
import {
  dischargeOfDerivation, helpCommandRequest, isSafeTestScript, nodeTestCountsOfOutput,
  packageDirectoryOfScriptPath, scriptPathOfDutyText, stderrTailOfReceipt, testCommandRequest,
} from "../src/derivation-duty.mjs";

test("scriptPathOfDutyText reads the first scripts/*.mjs|mts|sh path a duty's text names", () => {
  assert.equal(scriptPathOfDutyText("re-run scripts/check-thing.mjs and confirm"), "scripts/check-thing.mjs");
  assert.equal(scriptPathOfDutyText("see scripts/sub/dir/check.sh please"), "scripts/sub/dir/check.sh");
  assert.equal(scriptPathOfDutyText("Session friction: Bash failed while doing a thing"), null);
  assert.equal(scriptPathOfDutyText(undefined), null);
});

test("helpCommandRequest and testCommandRequest form exact JavascriptNodeCommandExecutionRequest@1 shapes", () => {
  const help = helpCommandRequest({ scriptAbsolutePath: "/a/scripts/x.mjs", directory: "/a/scripts" });
  assert.deepEqual(help, { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["/a/scripts/x.mjs", "--help"], directory: "/a/scripts", environment: null, input: null });
  const test_ = testCommandRequest({ directory: "/a" });
  assert.deepEqual(test_, { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "npm", arguments: ["test"], directory: "/a", environment: null, input: null });
});

test("isSafeTestScript admits a plain node --test script and refuses one naming an outside effect", () => {
  assert.equal(isSafeTestScript("node --test \"test/*.test.mjs\""), true);
  assert.equal(isSafeTestScript("rm -rf dist && node --test"), false);
  assert.equal(isSafeTestScript("npm run build && wrangler deploy"), false);
  assert.equal(isSafeTestScript("node --test ../other-package/test"), false);
  assert.equal(isSafeTestScript(undefined), false);
  assert.equal(isSafeTestScript(""), false);
});

test("packageDirectoryOfScriptPath walks up to the nearest ancestor with a package.json", () => {
  const hasPackageJson = (dir) => dir === "/a/b";
  assert.equal(packageDirectoryOfScriptPath("/a/b/scripts/x.mjs", hasPackageJson), "/a/b");
  assert.equal(packageDirectoryOfScriptPath("/x/y/scripts/z.mjs", () => false), null);
});

test("nodeTestCountsOfOutput reads the TAP summary lines", () => {
  const output = "TAP version 13\n# tests 16\n# pass 16\n# fail 0\n";
  assert.deepEqual(nodeTestCountsOfOutput(output), { tests: 16, pass: 16, fail: 0 });
  assert.deepEqual(nodeTestCountsOfOutput("no summary here"), { tests: null, pass: null, fail: null });
});

test("stderrTailOfReceipt returns the last N lines of a receipt's stderr, verbatim", () => {
  const stderr = Array.from({ length: 25 }, (_, i) => `line ${i}`).join("\n");
  const tail = stderrTailOfReceipt({ result: { stderr } }, 20);
  assert.equal(tail.split("\n").length, 20);
  assert.equal(tail.split("\n")[0], "line 5");
  assert.equal(stderrTailOfReceipt({ result: {} }), "");
});

test("dischargeOfDerivation names both commands' exit statuses and the test counts as evidence", () => {
  const discharge = dischargeOfDerivation({
    duty: { scope: "task:friction-command-x-1", intent: "i1" },
    producer: { id: "@red-cup-engineering/agent-work-computer-system-engineering-services-section", revision: "0.2.0" },
    scriptAbsolutePath: "/a/scripts/x.mjs",
    packageDirectory: "/a",
    helpStatus: 0,
    testStatus: 0,
    counts: { tests: 16, pass: 16, fail: 0 },
  });
  assert.equal(discharge.kind, "metroplat.work.discharge");
  assert.equal(discharge.id, "discharge-task:friction-command-x-1");
  assert.deepEqual(discharge.evidence, [
    "command:node /a/scripts/x.mjs --help exit 0",
    "command:npm test in /a exit 0",
    "tests:16 pass:16 fail:0",
  ]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { notifySystemdWhenHttpReady } from "@red-cup-engineering/metroplat/scripts/metroplat-serve";

test("HTTP readiness does not invoke systemd outside a notify service", () => {
  let calls = 0;
  notifySystemdWhenHttpReady({
    runCommand: () => {
      calls += 1;
      throw new Error("must not run");
    },
  });
  assert.equal(calls, 0);
});

test("HTTP readiness notifies only after the listener has selected notify mode", () => {
  const calls = [];
  notifySystemdWhenHttpReady({
    notifySocket: "/run/systemd/notify",
    runCommand: (request) => {
      calls.push(request);
      return { type: "JavascriptNodeCommandExecutionReceipt", version: 1, request, result: { type: "JavascriptNodeCommandExecutionResult", version: 1, status: 0, signal: null, stdout: "", stderr: "", error: "" } };
    },
  });
  assert.deepEqual(calls.map((call) => ({ command: call.command, args: call.arguments })), [{
    command: "/usr/bin/systemd-notify",
    args: ["--ready", "--status=MetroPlat HTTP listener ready"],
  }]);
});

test("a failed readiness notifier keeps the service unready and fails its start", () => {
  assert.throws(() => notifySystemdWhenHttpReady({
    notifySocket: "/run/systemd/notify",
    runCommand: (request) => ({ type: "JavascriptNodeCommandExecutionReceipt", version: 1, request, result: { type: "JavascriptNodeCommandExecutionResult", version: 1, status: 1, signal: null, stdout: "", stderr: "", error: "" } }),
  }), /systemd readiness notification failed with exit code 1/u);
});

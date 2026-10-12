import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

function run(script, arguments_ = []) {
  const result = spawnSync(process.execPath, [`scripts/${script}`, ...arguments_], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("source-direct command tools produce usable world and receipt documents", () => {
  const snapshot = JSON.parse(run("fizzos-world.mjs"));
  assert.equal(snapshot.kind, "fizzos.engine-snapshot.v1");
  assert.match(run("fizzos-look.mjs", ["gardener"]), /Garden/);
  const commandReceipt = JSON.parse(run("fizzos-tell.mjs", ["gardener", "go", "north"]));
  assert.equal(commandReceipt.tick, 1);
  assert.ok(commandReceipt.events.length > 0);
  const tickReceipt = JSON.parse(run("fizzos-tick.mjs"));
  assert.equal(tickReceipt.tick, 1);
});

test("fizzos-serve closes its timer and listener on SIGTERM", async () => {
  const child = spawn(process.execPath, ["scripts/fizzos-serve.mjs"], {
    env: { ...process.env, PORT: "0", FIZZOS_TICK_MS: "50" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  await Promise.race([
    new Promise((resolve) => child.stdout.on("data", () => output.includes("FizzOS listening at") && resolve())),
    new Promise((_, reject) => setTimeout(() => reject(new Error("server did not start")), 2000))
  ]);
  child.kill("SIGTERM");
  const [code, signal] = await Promise.race([
    once(child, "exit"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("server did not stop")), 2000))
  ]);
  assert.equal(code, 0);
  assert.equal(signal, null);
});

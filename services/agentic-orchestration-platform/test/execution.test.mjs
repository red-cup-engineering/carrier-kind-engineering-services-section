import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { spawnSync } from "node:child_process";
import { engine, engineNames, dispatch, serve } from "../src/index.mjs";
import { observation } from "@red-cup-engineering/knowing/dreaming/observation";
import { task } from "@red-cup-engineering/knowing/dreaming/task";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { token, mark, claim } from "@red-cup-engineering/signcell/utterance";
import { predicateOfClaim } from "@red-cup-engineering/signcell/predication";
import { tileManifold } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";

const input = JSON.stringify({ entries: [{ locus: [], act: "daimon" }] });
const now = () => "2026-09-18T12:00:00.000Z";

test("the family executes declared actions and records the resulting carrier under its engine identity", async (t) => {
  const dataRoot = mkdtempSync(join(tmpdir(), "agentic-execution-"));
  t.after(() => rmSync(dataRoot, { recursive: true, force: true }));
  assert.equal(engineNames.length, 9);
  for (const name of engineNames) {
    assert.ok(engine(name).operations.length > 0, name);
    assert.equal(engine(name).discovery.package, `@red-cup-engineering/agentic-${name}-engine`);
  }
  assert.throws(() => engine("toString"), /Unknown engine/);
  const result = await dispatch("play", ["design"], input, { dataRoot, now, caller: { transport: "test" } });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /stable/);
  const logDir = join(dataRoot, "data/log/2026/09/18");
  const files = readdirSync(logDir);
  assert.deepEqual(files, ["2026-09-18-red-cup-engineering-agentic-play-engine-log.jsonl"]);
  const rows = readFileSync(join(logDir, files[0]), "utf8");
  assert.match(rows, /"verb":"design"/);
  assert.match(rows, /stable/);
  const refused = await dispatch("play", ["design"], "not-json", { dataRoot, now });
  assert.notEqual(refused.code, 0);
  assert.equal(readFileSync(join(logDir, files[0]), "utf8"), rows);
});

test("one family server retains admission, discovery, and per-engine invocation logs", async (t) => {
  const dataRoot = mkdtempSync(join(tmpdir(), "agentic-http-"));
  const server = serve({ dataRoot, now });
  const socketPath = join(dataRoot, "http.sock");
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    rmSync(dataRoot, { recursive: true, force: true });
  });
  const call = (path, method = "GET", body) => new Promise((resolve, reject) => {
    const req = request({ socketPath, path, method, headers: { "content-type": "application/json" } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, text }));
    });
    req.on("error", reject);
    req.end(body);
  });
  assert.equal((await call("/")).status, 200);
  const paths = tileManifold(engineNames.map((name) => ({ name, induced: engine(name) })));
  const response = await call(`${paths.get("play")}/design`, "POST", input);
  assert.equal(response.status, 200, response.text);
  assert.match(response.text, /stable/);
  const schema = await call(`${paths.get("knowledge")}/openapi.json`);
  assert.equal(schema.status, 200);
  assert.match(schema.text, /absorb/);
  const file = join(dataRoot, "data/log/2026/09/18/2026-09-18-red-cup-engineering-agentic-play-engine-log.jsonl");
  assert.match(readFileSync(file, "utf8"), /"verb":"design"/);
});

test("the single executable dispatches and preserves bounded knowledge streams", () => {
  const cli = new URL("../src/cli.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [cli.pathname, "play", "design"], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /stable/);
  const canonical = spawnSync(process.execPath, [cli.pathname, "relation", "canonicalize"], { input: '{"b":2,"a":1}', encoding: "utf8" });
  assert.equal(canonical.status, 0, canonical.stderr);
  assert.equal(canonical.stdout.trim(), '{"a":1,"b":2}');
  const stream = spawnSync(process.execPath, [cli.pathname, "knowledge", "dream-stream", "--limit", "2"], { input: JSON.stringify({ observations: [["alpha", "implies", "beta"], ["gamma", "diffracts", "delta"]].map(([subject, predicate, object], index) => observation({ observer: token(mark("reader")), task: task({ subject: token(mark(subject)), predicate: predicateOfClaim(claim(mark(predicate))), object: token(mark(object)) }), evidence: evidence({ for: [mark(String(index))] }) })) }), encoding: "utf8" });
  assert.equal(stream.status, 0, stream.stderr);
  assert.equal(stream.stdout.trim().split("\n").length, 2);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { officeSeats, seatedDispatches } from "../src/dispatch-a-task.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "src", "dispatch-a-task.js");

async function makeRepo() {
  const repoRoot = await mkdtemp(join(tmpdir(), "dispatching-a-task-"));
  const unit = join(repoRoot, "lib", "emsenn");
  await mkdir(join(unit, "content", "offices"), { recursive: true });
  await writeFile(join(unit, "package.json"), JSON.stringify({ name: "emsenn" }));
  await writeFile(join(unit, "content", "offices", "clerk.json"), JSON.stringify({ id: "clerk" }));
  return { repoRoot, unit };
}

test("officeSeats finds an office seated in the unit's own roster", async (t) => {
  const { repoRoot, unit } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  // findUnit walks UP from repoRoot testing repoRoot itself first, so the
  // asking point must be the unit (the dir carrying package.json) or a
  // descendant of it — never the temp dir merely above it.
  const seats = officeSeats("clerk", { repoRoot: unit });
  assert.equal(seats.length, 1);
  assert.match(seats[0], /clerk\.json$/u);
});

test("officeSeats reports no seats for an office that seats nowhere", async (t) => {
  const { unit, repoRoot } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  assert.deepEqual(officeSeats("nobody", { repoRoot: unit }), []);
});

test("seatedDispatches reads the dispatch pool", async (t) => {
  const { repoRoot, unit } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const pool = join(unit, "data", "state", "dispatches");
  await mkdir(join(pool, "2026", "08", "01"), { recursive: true });
  await writeFile(
    join(pool, "2026", "08", "01", "2026-08-01-emsenn-dispatches.jsonl"),
    `${JSON.stringify({ id: "d1", task: "t1", office: "clerk" })}\n`,
  );

  assert.deepEqual(seatedDispatches(pool).map((d) => d.id), ["d1"]);
});

test("CLI refuses a dispatch whose task seats nowhere", async (t) => {
  const { repoRoot, unit } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  await mkdir(join(unit, "data", "state", "tasks"), { recursive: true });

  const r = spawnSync(process.execPath, [SCRIPT, "--root", repoRoot], {
    input: JSON.stringify({ id: "dispatch-1", task: "no-such-task", office: "clerk" }),
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error, /seats nowhere/u);
});

test("CLI refuses a malformed intake missing 'office'", async (t) => {
  const { repoRoot } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const r = spawnSync(process.execPath, [SCRIPT, "--root", repoRoot], {
    input: JSON.stringify({ task: "t1" }),
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error, /office/u);
});

test("CLI --list reports the seated dispatches", async (t) => {
  const { repoRoot, unit } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const pool = join(unit, "data", "state", "dispatches");
  await mkdir(join(pool, "2026", "08", "01"), { recursive: true });
  await writeFile(
    join(pool, "2026", "08", "01", "2026-08-01-emsenn-dispatches.jsonl"),
    `${JSON.stringify({ id: "d1", task: "t1", office: "clerk" })}\n`,
  );

  const r = spawnSync(process.execPath, [SCRIPT, "--root", repoRoot, "--list"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const body = JSON.parse(r.stdout);
  assert.deepEqual(body.dispatches, [{ id: "d1", task: "t1", office: "clerk" }]);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { officeSeats } from "../src/list-open-obligations.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "src", "list-open-obligations.js");

async function makeRepo() {
  const repoRoot = await mkdtemp(join(tmpdir(), "listing-open-obligations-"));
  const unit = join(repoRoot, "lib", "emsenn");
  await mkdir(join(unit, "content", "offices"), { recursive: true });
  await writeFile(join(unit, "package.json"), JSON.stringify({ name: "emsenn" }));
  await writeFile(join(unit, "content", "offices", "clerk.json"), JSON.stringify({ id: "clerk" }));
  return { repoRoot, unit };
}

test("officeSeats resolves nearest, not global — the current resolving-an-identifier law", async (t) => {
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

test("CLI refuses an office argument that seats in no roster", async (t) => {
  const { repoRoot } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const r = spawnSync(process.execPath, [SCRIPT, "--root", repoRoot, "nobody"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error, /seats in no roster/u);
});

test("CLI refuses to read the board inside a goal derivation", async (t) => {
  const { repoRoot } = await makeRepo();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const r = spawnSync(process.execPath, [SCRIPT, "--root", repoRoot], {
    encoding: "utf8",
    env: { ...process.env, GOAL_DERIVATION: "1" },
  });
  assert.equal(r.status, 1);
  const body = JSON.parse(r.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error, /cycle/u);
});

// push-ops-data.test — exercises scripts/push-ops-data.mjs's pure planning/invocation-building
// logic against synthetic tmp directories; never shells out to a real rsync/ssh.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { newestGoalStackRoadmap, plan, push, rsyncInvocations } from "../scripts/push-ops-data.mjs";

test("business-only refresh shares transfer machinery without touching books or world", () => {
  const p = { businessCatalog: "/tmp/business.json", destHost: "test-host", destDir: "~/data" };
  const dry = rsyncInvocations(p, { businessesOnly: true });
  assert.equal(dry.length, 1);
  assert.ok(dry[0].includes("--dry-run"));
  assert.equal(dry[0].at(-1), "test-host:~/data/records/business-catalog.json");
  assert.ok(!rsyncInvocations(p, { businessesOnly: true, apply: true })[0].includes("--dry-run"));
  assert.throws(() => rsyncInvocations({}, { businessesOnly: true }), /businessCatalog is required/);
});

function withDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "push-ops-data-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("newestGoalStackRoadmap picks the lexically-last matching file", () => {
  withDir((dir) => {
    writeFileSync(path.join(dir, "2026-08-30-goal-stack-roadmap.json"), "{}");
    writeFileSync(path.join(dir, "2026-09-02-1840-goal-stack-roadmap.json"), "{}");
    writeFileSync(path.join(dir, "unrelated.json"), "{}");
    assert.equal(newestGoalStackRoadmap(dir), path.join(dir, "2026-09-02-1840-goal-stack-roadmap.json"));
  });
});

test("newestGoalStackRoadmap throws when no matching file exists", () => {
  withDir((dir) => {
    assert.throws(() => newestGoalStackRoadmap(dir), /no \*goal-stack-roadmap\.json found/u);
  });
});

test("plan resolves the newest roadmap and verifies every source exists", () => {
  withDir((dir) => {
    const worldEavt = path.join(dir, "world.eavt");
    writeFileSync(worldEavt, "");
    const roadmapDir = path.join(dir, "records");
    mkdirSync(roadmapDir);
    writeFileSync(path.join(roadmapDir, "2026-09-01-goal-stack-roadmap.json"), "{}");
    const orgMachines = path.join(dir, "org-machines.json");
    writeFileSync(orgMachines, "{}");
    const ledgersDir = path.join(dir, "ledgers");
    mkdirSync(ledgersDir);
    writeFileSync(path.join(ledgersDir, "main.beancount"), "");

    const result = plan({ worldEavt, goalStackRoadmapDir: roadmapDir, orgMachines, ledgersDir, destHost: "test-host", destDir: "~/data" });
    assert.equal(result.worldEavt, worldEavt);
    assert.equal(result.goalStackRoadmap, path.join(roadmapDir, "2026-09-01-goal-stack-roadmap.json"));
    assert.equal(result.orgMachines, orgMachines);
    assert.equal(result.ledgersDir, ledgersDir);
    assert.equal(result.destHost, "test-host");
  });
});

test("plan throws naming the missing source file", () => {
  withDir((dir) => {
    const roadmapDir = path.join(dir, "records");
    mkdirSync(roadmapDir);
    writeFileSync(path.join(roadmapDir, "2026-09-01-goal-stack-roadmap.json"), "{}");
    assert.throws(
      () => plan({ worldEavt: path.join(dir, "missing.eavt"), goalStackRoadmapDir: roadmapDir, orgMachines: path.join(dir, "also-missing.json"), ledgersDir: path.join(dir, "ledgers") }),
      /missing source file/u,
    );
  });
});

test("plan throws when the ledgers directory itself is missing", () => {
  withDir((dir) => {
    const worldEavt = path.join(dir, "world.eavt");
    writeFileSync(worldEavt, "");
    const roadmapDir = path.join(dir, "records");
    mkdirSync(roadmapDir);
    writeFileSync(path.join(roadmapDir, "2026-09-01-goal-stack-roadmap.json"), "{}");
    const orgMachines = path.join(dir, "org-machines.json");
    writeFileSync(orgMachines, "{}");
    assert.throws(
      () => plan({ worldEavt, goalStackRoadmapDir: roadmapDir, orgMachines, ledgersDir: path.join(dir, "missing-ledgers") }),
      /missing source file/u,
    );
  });
});

test("rsyncInvocations appends --dry-run unless apply is true, and shapes all three transfers", () => {
  const pushPlan = { worldEavt: "/a/world.eavt", goalStackRoadmap: "/a/roadmap.json", orgMachines: "/a/org-machines.json", ledgersDir: "/a/ledgers", destHost: "cold-red-gate", destDir: "~/data" };

  const dryRun = rsyncInvocations(pushPlan);
  assert.ok(dryRun[0].includes("--dry-run"));
  assert.deepEqual(dryRun[0].slice(-2), ["/a/world.eavt", "cold-red-gate:~/data/world.eavt"]);
  assert.deepEqual(dryRun[1].slice(-3), ["/a/roadmap.json", "/a/org-machines.json", "cold-red-gate:~/data/records/"]);
  assert.ok(dryRun[2].includes("--dry-run"));
  assert.ok(dryRun[2].includes("--include=*.beancount"));
  assert.ok(dryRun[2].includes("--exclude=*"));
  assert.deepEqual(dryRun[2].slice(-2), ["/a/ledgers/", "cold-red-gate:~/data/ledgers/"]);

  const applied = rsyncInvocations(pushPlan, { apply: true });
  assert.ok(!applied[0].includes("--dry-run"));
  assert.ok(!applied[2].includes("--dry-run"));
});

test("push runs all three rsync invocations in order through the injected runner", () => {
  const pushPlan = { worldEavt: "/a/world.eavt", goalStackRoadmap: "/a/roadmap.json", orgMachines: "/a/org-machines.json", ledgersDir: "/a/ledgers", destHost: "cold-red-gate", destDir: "~/data" };
  const seen = [];
  const invocations = push(pushPlan, { apply: true, runArgs: (args) => seen.push(args) });
  assert.equal(seen.length, 3);
  assert.deepEqual(seen, invocations);
});

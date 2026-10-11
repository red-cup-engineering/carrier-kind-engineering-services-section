import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { turnEnterpriseLoop } from "@red-cup-engineering/feltos/work/enterprise-loop";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { homeHostOf, hostedWorkTelling } from "../src/federated-work.mjs";

const ENTERPRISES = [
  { id: "alpha", host: "bare-cedar-fog", sectionPath: "services/alpha-section" },
  { id: "beta", host: "cold-red-gate", sectionPath: "services/beta-section" },
];
const HOMES = () => ({ revision: "fixture", hostOf: (thread) => homeHostOf(thread, ENTERPRISES) });
const AT = "2026-10-03T10:00:00Z";
const TAG = "derived-by-alpha";

/** The loop of "alpha" (seated on bare-cedar-fog) has an aim it derived in beta's territory (home: cold-red-gate), and its measurement no longer asks it. */
async function turnWith({ port }) {
  const dir = mkdtempSync(join(tmpdir(), "enterprise-loop-forwarding-"));
  const agencyRoot = join(dir, "agency");
  mkdirSync(agencyRoot, { recursive: true });
  const binding = defaultFilesystemBinding(join(dir, "root"));
  const delivered = [];
  const config = { instance: { name: "bare" }, publicBaseUrl: "https://bare.example", agencyRoot, workPeers: [{ actor: "https://cold.example/actors/metroplat" }], activityPub: { instanceActor: { identifier: "metroplat" } } };
  // The host's own telling port forwards a coordinated move to the node its thread is home on.
  const tell = hostedWorkTelling({ config, binding, provider: () => ({}), host: "bare-cedar-fog", enterprises: () => ENTERPRISES, deliver: async (_provider, delivery) => { delivered.push(delivery); } });
  const board = workBoardStore(binding, { homes: HOMES });
  const opening = board.play({ move: "aim", by: "alpha", purpose: "The harbour stays navigable", scope: ["section:services/beta-section"], tags: [TAG], at: "2026-10-03T09:00:00Z" });
  const record = { id: "alpha", key: "alpha", kind: "node", derives: [{ operation: "measure" }] };
  const readDerivation = async () => ({ poster: "alpha", domain: { tags: [TAG] }, openings: [], evidence: "measurement:1" });
  const turned = await turnEnterpriseLoop({ board, ...(port ? { play: tell } : {}), record, bindingOf: () => binding, readDerivation, at: AT });
  const standing = () => board.read(AT).threads.find((thread) => thread.id === opening.id).standing;
  return { dir, delivered, config, turned, standing, home: homeHostOf(board.read(AT).threads.find((thread) => thread.id === opening.id), ENTERPRISES) };
}

test("an enterprise loop's coordinated move on a thread homed elsewhere is forwarded through the play port, not played locally", async () => {
  const run = await turnWith({ port: true });
  try {
    assert.equal(run.home, "cold-red-gate");
    assert.equal(run.turned.derived[0].settled, 1);
    assert.equal(run.delivered.length, 1, "one forward went to the peer");
    assert.equal(run.delivered[0].recipient, run.config.workPeers[0].actor);
    assert.equal(run.standing(), "open", "not played here: this node is not the home");
  } finally { rmSync(run.dir, { recursive: true, force: true }); }
});

test("without a play port the loop plays its response on its own board", async () => {
  const run = await turnWith({ port: false });
  try {
    assert.equal(run.delivered.length, 0);
    assert.equal(run.standing(), "withdrawn");
  } finally { rmSync(run.dir, { recursive: true, force: true }); }
});

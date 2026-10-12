import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";

const homedOn = (host) => () => ({ revision: host, hostOf: () => host });

test("two stores with different homes in one process judge the same peer decision differently", () => {
  const root = mkdtempSync(join(tmpdir(), "work-homes-per-store-"));
  try {
    const binding = defaultFilesystemBinding(root);
    const first = workBoardStore(binding, { homes: homedOn("cold-red-gate") });
    const opened = first.play({ move: "aim", by: "enterprise:beta", purpose: "The harbour stays navigable", scope: ["section:services/alpha-section"], at: "2026-10-03T09:00:00Z" });
    const decision = { move: "withdraw", thread: opened.id, by: "enterprise:beta", at: "2026-10-03T10:00:00Z", decidedBy: "cold-red-gate" };
    put(root, "work-arena-move", decision);
    const standing = (board) => board.read("2026-10-03T11:00:00Z").threads.find((thread) => thread.id === opened.id).standing;
    const agrees = workBoardStore(binding, { homes: homedOn("cold-red-gate") });
    const disagrees = workBoardStore(binding, { homes: homedOn("bare-cedar-fog") });
    const unknown = workBoardStore(binding);
    assert.equal(standing(agrees), "withdrawn", "its decider is home there");
    assert.equal(standing(disagrees), "open", "its decider is not home there");
    assert.ok(disagrees.read("2026-10-03T11:00:00Z").refused.some(({ why }) => /not home/.test(why)));
    assert.equal(standing(unknown), "open", "where no homes are known a peer's decision is kept unread");
    assert.ok(unknown.read("2026-10-03T11:00:00Z").unread.some(({ move }) => move.decidedBy === "cold-red-gate"));
    assert.equal(standing(agrees), "withdrawn", "reading elsewhere changed nothing here");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

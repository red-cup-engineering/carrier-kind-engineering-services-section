import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { ARRIVAL_FEED } from "@red-cup-engineering/computer-system-engine/rpc/arrival";

const packageRoot = path.resolve(import.meta.dirname, "..");
const ROOT_NAME = "@red-cup-engineering/metroplat";

/** The CLI always admits under `ROOT_NAME`, independent of the scratch data
 *  root's own directory name, so the read-back feed handle must name it too. */
function arrivalFeedOn(dataRoot, date) {
  return journal.feed(dataRoot, ARRIVAL_FEED, `${date}T00:00:00.000Z`, { subject: "arrival", rootName: ROOT_NAME });
}

function admitHookEvent(dataRoot, event, args = []) {
  const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), "src/infograph/bin/infograph-admit-hook-event.mjs", ...args], {
    cwd: packageRoot,
    env: { ...process.env, METROPLAT_DATA_ROOT: dataRoot },
    input: `${JSON.stringify(event)}\n`,
    encoding: "utf8",
    timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("infograph-admit-hook-event links a session's second turn to its first", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-hook-admission-cli-"));
  try {
    const sessionId = "hook-admission-cli-session";
    const first = admitHookEvent(dataRoot, {
      hook_event_name: "Stop",
      session_id: sessionId,
      turn_id: "turn-1",
      cwd: "/tmp",
    });
    const second = admitHookEvent(dataRoot, {
      hook_event_name: "UserPromptSubmit",
      session_id: sessionId,
      turn_id: "turn-2",
      cwd: "/tmp",
    });

    const firstId = first.admission.statements[0].id;
    const secondId = second.admission.statements[0].id;
    assert.notEqual(firstId, secondId);

    const date = second.event.time.slice(0, 10);
    const witnesses = openJournal(dataRoot).read(arrivalFeedOn(dataRoot, date));
    const secondWitness = witnesses.find((witness) => witness.id === secondId);
    assert.ok(secondWitness, "second admission's witness must be readable back from the journal");
    assert.deepEqual(secondWitness.core.causes, [firstId]);

    const firstWitness = witnesses.find((witness) => witness.id === firstId);
    assert.ok(firstWitness, "first admission's witness must be readable back from the journal");
    assert.deepEqual(firstWitness.core.causes, []);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("infograph-admit-hook-event tags the caller from --session/--actor when the payload names no session", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-hook-admission-cli-actor-"));
  try {
    const receipt = admitHookEvent(
      dataRoot,
      { hook_event_name: "SessionStart", cwd: "/tmp" },
      ["--session", "flag-supplied-session", "--actor", "operator-1"],
    );
    assert.equal(receipt.ok, true);
    const date = receipt.event.time.slice(0, 10);
    const witnesses = openJournal(dataRoot).read(arrivalFeedOn(dataRoot, date));
    const witness = witnesses.find((entry) => entry.id === receipt.admission.statements[0].id);
    assert.ok(witness);
    assert.equal(witness.observation.seat.actor, "operator-1");
    assert.equal(witness.observation.seat.session, "flag-supplied-session");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

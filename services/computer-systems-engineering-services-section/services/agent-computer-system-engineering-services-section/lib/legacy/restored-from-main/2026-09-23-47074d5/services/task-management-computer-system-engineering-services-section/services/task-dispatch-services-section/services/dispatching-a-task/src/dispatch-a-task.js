#!/usr/bin/env node
/**
 * @skill dispatching-a-task
 * @verb-phrase dispatching a task
 * @closure-kind process
 * @description Hands a seated task to a seated office by raising a dispatch — the record make-a-task.js points at when it says who the task is handed to belongs to the dispatch, never to the record. Refuses a task that seats nowhere, an office that seats in no roster, and a second dispatch of a task already dispatched. Use after raising a task, to put it on the board; a dispatch is open while the task's goal is unachieved, and openness is a readout, never a field. This is the published owner of the office/duty toolkit's dispatch verb — every office consumes it here rather than carrying its own copy.
 *
 * @precondition the intake names a task and an office
 * @precondition the task seats in the tasks pool
 * @precondition the office seats in a roster somewhere in the tree
 * @precondition no seated dispatch already names this task
 * @precondition no dispatch of this id is already seated
 * @postcondition a dispatch record exists that conforms to emsenn/schema/dispatch — task, office, and nothing else of substance
 * @postcondition openness is derivable by re-running the task's goal and is asserted nowhere in the record
 * @witness the id, task, and office of the dispatch raised, and where the office seats
 * @witness on refusal, which end of the hand-off was missing, or which dispatch already holds the task
 *
 * A dispatch is the hand-off: a seated task, joined to the office that will
 * answer for it.
 *
 * The vocabulary is exact, because each record carries one thing and the
 * dispatch is what joins them:
 *
 *   - The TASK carries the goal — commands a machine runs, so the work can fail.
 *   - The DUTY carries the obligation — it stands, and the task discharges
 *     against it.
 *   - The OFFICE carries the answering-for — it outlives whoever holds it.
 *   - The DISPATCH is only the fact that a task and an office were joined,
 *     which is why it holds nothing else of substance.
 *
 * It is handed to an office, never to a person, for the charter's reason
 * exactly: handed to a person it dies with the person. Handed to a session,
 * it dies with the context window.
 *
 * ## Openness is a readout
 *
 * A dispatch is OPEN while the dispatched task's goal is unachieved, and that
 * is derived, never recorded: re-run the goal — `make-a-task.js --verify
 * <task>` — and the board is the truth. The record has no status field, no
 * open key, no closed key, and this is the same rule as the task's: a
 * dispatch that could assert its own closure would be the worker marking the
 * board instead of the goal marking it. The query that reads the whole board
 * this way is @561-group/listing-open-obligations.
 *
 * ## Run it
 *
 * ```sh
 * echo '{"id":"…","task":"<task-id>","office":"<office-id>"}' \
 *   | node .../dispatch-a-task.js
 *
 * node .../dispatch-a-task.js --read <id>
 * node .../dispatch-a-task.js --list
 * ```
 *
 * Input is JSON. Output is JSON. `id` defaults to the task's id — one task,
 * one dispatch, so the task's name is usually the dispatch's.
 *
 * ## What it refuses, and why that is the skill
 *
 * Emitting a dispatch is trivial; what makes it a hand-off rather than a
 * wish is that both ends exist and no other hand holds the same task:
 *
 * - **A task that seats nowhere** — refused. Dispatching it hands an office
 *   nothing and leaves it answering for it anyway. Raise the task first
 *   (making-a-task); a dispatch hands over what exists.
 * - **An office that seats in no roster** — refused. A dispatch to nobody is
 *   the operator keeping the work, with a record saying otherwise.
 * - **A second dispatch of a task already dispatched** — refused, both named.
 *   Two dispatches of one task is two offices answering for one goal — a
 *   contradiction to name, not a queue to append to.
 * - **A dispatch id already seated** — refused, never overwritten.
 *
 * ## When NOT to use
 *
 * - Not to raise the task — that is making-a-task. This hands over what
 *   already seats.
 * - Not to record that dispatched work is done. There is nothing to record:
 *   the goal settles it, and the witness re-runs it (attesting-a-work-product).
 * - Not to reassign a task. A dispatch is not amended; the contradiction of
 *   a second dispatch is deliberate. If the hand-off was wrong, that is a
 *   decision for the offices, taken where decisions are recorded — not a
 *   field to overwrite.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { appendDataRecord, dataDir, findDataRecord, findUnit, readDataPool, resolveIdentifier } from "@561-group/resolving-an-identifier";

const HERE = dirname(fileURLToPath(import.meta.url));

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** @returns the repo root a CLI invocation is scoped to: --root, else cwd */
export function repoRootFromArgv() {
  return argValue("--root") ?? process.cwd();
}

function out(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  process.exit(code);
}

function die(message) {
  out({ ok: false, error: message }, 1);
}

// Walk from the asking point UP, testing <D>/<shape> at each D — the same
// resolution as project-a-skill.js's, because this script runs both flat in
// the pool and projected into a scripts/ directory two levels down, and
// (published) inside a consumer's node_modules, where the walk continues
// past node_modules to the consuming office's own lib/management/skills/.
function findUp(from, shape) {
  let d = from;
  for (;;) {
    const at = join(d, shape);
    if (existsSync(at)) return at;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// The record shape is the glossary's (emsenn/term/dispatch), not this
// module's, and the check runs through READING-A-SCHEMA — the one validator,
// called and never copied. That is what keeps a rushed session from growing
// the record a status field: the term refuses it, and nothing here could
// drift into permitting it.
function violations(record, { repoRoot }) {
  const beside = join(HERE, "read-a-schema.js");
  const reader = existsSync(beside) ? beside : findUp(HERE, "lib/management/skills/read-a-schema.js");
  if (!reader) die(`⊥ cannot find reading-a-schema at or above ${relative(repoRoot, HERE)} — no dispatch is raised on an unchecked record`);
  const r = spawnSync(process.execPath, [reader, "dispatch", "--from", dirname(reader)], {
    input: JSON.stringify(record),
    encoding: "utf8",
  });
  let verdict;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    die(`⊥ reading-a-schema returned nothing parseable: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return verdict.ok ? [] : (verdict.errors ?? [verdict.error]);
}

/**
 * Where an office seats — the shared law's NEAREST strategy, resolved from
 * the calling unit's own root (lib/emsenn under repoRoot). A dispatch is
 * raised at one node, and the office must seat in that node's own roster
 * rather than anywhere in the tree.
 * @param {string} id office id
 * @param {{repoRoot: string}} opts
 * @returns {string[]} every seat found (usually zero or one)
 */
export function officeSeats(id, { repoRoot }) {
  const unitRoot = findUnit(repoRoot) ?? findUnit(HERE);
  if (!unitRoot) return [];
  const hit = resolveIdentifier(id, { kind: "offices", strategy: "nearest", from: unitRoot });
  return hit.ok ? hit.seats : [];
}

/** @returns every dispatch record currently seated in dispatchPool */
export function seatedDispatches(dispatchPool) {
  return readDataPool(dispatchPool, "dispatches").map((r) => r.record);
}

/**
 * Raise a dispatch joining `intake.task` to `intake.office`, refusing an
 * unseated task, an unseated office, or a second dispatch of an
 * already-dispatched task.
 * @param {object} intake {id?, task, office, name?, "recorded-by"?}
 * @param {{repoRoot: string, dispatchPool: string, taskPool: string, dryRun?: boolean}} opts
 * @returns the witness `{ok, dispatched}` — never returns on refusal (exits 1)
 */
export function dispatch(intake, { repoRoot, dispatchPool, taskPool, dryRun = false }) {
  for (const key of ["task", "office"]) {
    if (intake[key] === undefined) die(`dispatch has no '${key}' — a dispatch is a task joined to an office, and it is missing the ${key}`);
  }
  const id = intake.id ?? intake.task;
  if (!ID.test(String(id))) die(`id '${id}' is not kebab-case`);
  if (!ID.test(String(intake.task))) die(`task '${intake.task}' is not kebab-case`);
  if (!ID.test(String(intake.office))) die(`office '${intake.office}' is not kebab-case`);

  // The task must seat. A dispatch of a task that seats nowhere hands the
  // office nothing and leaves it answering for it anyway.
  if (!findDataRecord(taskPool, "tasks", intake.task)) {
    die(`task '${intake.task}' seats nowhere in ${relative(repoRoot, taskPool)} — raise it first (making-a-task); a dispatch hands over what exists`);
  }

  // The office must seat. A dispatch to nobody is the operator keeping the
  // work, with a record saying otherwise.
  const seats = officeSeats(String(intake.office), { repoRoot });
  if (seats.length === 0) {
    die(`office '${intake.office}' seats in no roster — a dispatch to nobody is not a hand-off`);
  }

  // One task, one dispatch. Two dispatches of one task is two offices
  // answering for one goal — a contradiction to name, not a queue to append to.
  const prior = seatedDispatches(dispatchPool).find((d) => d.task === intake.task);
  if (prior) {
    die(`task '${intake.task}' is already dispatched by ${prior.id} (to '${prior.office}') — `
      + `a second dispatch of one task is two offices answering for one goal, a contradiction to name, not a queue to append to`);
  }

  const record = {
    id,
    name: intake.name ?? `${String(intake.task).replace(/-/gu, " ")}, to the ${String(intake.office).replace(/-/gu, " ")}`,
    task: intake.task,
    office: intake.office,
    "x-provenance": {
      "recorded-by": intake["recorded-by"] ?? "claude",
      "recorded-on": new Date().toISOString().slice(0, 10),
    },
  };
  const errs = violations(record, { repoRoot });
  if (errs.length) {
    die(`dispatch does not conform to emsenn/schema/dispatch: ${errs.join("; ")}`);
  }

  if (findDataRecord(dispatchPool, "dispatches", id)) {
    die(`dispatch '${id}' already seats in ${relative(repoRoot, dispatchPool)} — refused, never overwritten`);
  }

  const witness = {
    ok: true,
    dispatched: {
      id,
      pool: relative(repoRoot, dispatchPool),
      task: intake.task,
      office: intake.office,
      "office-record": relative(repoRoot, seats[0]),
    },
  };
  if (dryRun) return { ...witness, dryRun: true };

  appendDataRecord(dispatchPool, "dispatches", record);
  return witness;
}

function printUsage() {
  process.stdout.write(
    [
      "Usage:",
      '  echo \'{"id":"…","task":"<task-id>","office":"<office-id>"}\' \\',
      "    | node dispatch-a-task.js",
      "",
      "  node dispatch-a-task.js --read <id>",
      "  node dispatch-a-task.js --list",
      "  node dispatch-a-task.js --help",
      "",
      "Input is JSON. Output is JSON. A dispatch is raised from data, never from a conversation.",
    ].join("\n") + "\n",
  );
}

/** CLI entry: dispatches from stdin, or serves --read/--list/--help. */
export function main() {
  const repoRoot = repoRootFromArgv();
  const dryRun = process.argv.includes("--dry-run");
  const unit = join(repoRoot, "lib/emsenn");
  // Dispatches and tasks are write-once — a dispatch is never amended, and a
  // task's achievement is derived by re-running its goal, not by editing the
  // record — so per the Chairperson's content/data/lib rule both seat as
  // data/, day-bucketed logs, not one file per slug.
  const dispatchPool = argValue("--pool") ?? dataDir(unit, "dispatches");
  const taskPool = argValue("--task-pool") ?? dataDir(unit, "tasks");

  if (process.argv.includes("--help")) { printUsage(); return; }

  if (argValue("--read")) {
    const id = argValue("--read");
    const found = findDataRecord(dispatchPool, "dispatches", id);
    if (!found) die(`dispatch '${id}' seats nowhere in ${relative(repoRoot, dispatchPool)}`);
    out({ ok: true, dispatch: found.record });
    return;
  }

  if (process.argv.includes("--list")) {
    out({
      ok: true,
      dispatches: seatedDispatches(dispatchPool).map((d) => ({ id: d.id, task: d.task, office: d.office })),
    });
    return;
  }

  const input = readFileSync(0, "utf8").trim();
  if (!input) die("no data on stdin — a dispatch is raised from data, never from a conversation");
  let intake;
  try {
    intake = JSON.parse(input);
  } catch (e) {
    die(`stdin is not JSON: ${e.message}`);
  }
  out(dispatch(intake, { repoRoot, dispatchPool, taskPool, dryRun }));
}

if (import.meta.url === `file://${process.argv[1]}`) main();

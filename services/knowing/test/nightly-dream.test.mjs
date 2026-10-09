import { test } from "node:test";
import assert from "node:assert/strict";

import { latentCellDream, observation, task } from "../src/dreaming/index.mjs";
import { noEvidence } from "@red-cup-engineering/signchain/bilattice";
import { ioPressureOf, openingsOfBoard, owningSection, proposalIdentity, runNightlyDream, temporaryFailure, windowOfSettledRecords } from "../src/dreaming/nightly.mjs";

// The receiving conditions C1 to C3 and C5 of the nightly finite dream, over a fixture board and
// record store bound through the same ports the entry script binds to the node.
const pressure = (avg10) => `some avg10=${avg10} avg60=0.00 avg300=0.00 total=0\nfull avg10=0.00 avg60=0.00 avg300=0.00 total=0\n`;

const record = (admission, section, name, topics) => ({ admission, section, term: { kind: "record", id: name }, topics });

const fixtureRecords = [
  record(1, "science/memory", "alpha", ["sheaf", "memory"]),
  record(2, "science/memory", "beta", ["sheaf", "dreaming"]),
  record(3, "science/semiosis", "gamma", ["memory", "sheaf"]),
];

const dream = (records, options) => latentCellDream(records.map((each) => observation({
  observer: "settled-record-reader",
  task: task({ subject: each.term, predicate: "remembers", object: each.topics }),
  evidence: noEvidence,
})), { ...options, agent: "node-dreamer", observer: "node-dreamer", at: "nightly" });

// A board thread as the `work-board` reader returns it whole: its opening and its standing.
const thread = (opening, standing = "open") => ({ id: `thread-${opening.tags[1]}`, standing, opening });
const topicOf = (opening) => JSON.parse(opening.context).topic;
const witnessCount = (opening) => JSON.parse(opening.context).witnesses.length;

function node({ records = fixtureRecords, threads = [], avg10 = "1.00", cursor = null } = {}) {
  const state = { records: [...records], threads: [...threads], cursor, runRecords: [], opened: [], reads: 0 };
  state.ports = {
    readPressure: async () => pressure(avg10),
    readCursor: async () => state.cursor,
    writeCursor: async (next) => { state.cursor = next; return 64; },
    readRecords: async ({ after, through, limit }) => {
      state.reads += 1;
      return { records: state.records.filter((each) => (after === null || each.admission > after) && (through === null || each.admission <= through)).slice(0, limit) };
    },
    readOpenings: async () => openingsOfBoard(state.threads),
    openOnBoard: async (opening) => { state.opened.push(opening); return { opened: opening.identity }; },
    writeRunRecord: async (run) => { state.runRecords.push(run); return 256; },
  };
  return state;
}

const options = { recordClasses: ["settled-memory"], offices: { "science": "science-officer" }, fallbackOffice: "chief-engineering-officer" };

test("C2: two runs from the same cursor yield identical proposals and identities", async () => {
  const first = node();
  const second = node();
  await runNightlyDream({ ports: first.ports, dream, options });
  await runNightlyDream({ ports: second.ports, dream, options });

  assert.deepEqual(first.opened.map((each) => topicOf(each)), ["sheaf", "memory"]);
  assert.deepEqual(first.opened, second.opened);
  assert.deepEqual(first.opened.map((each) => each.identity), second.opened.map((each) => each.identity));
  assert.equal(JSON.parse(first.opened[0].context).identity, proposalIdentity(dream(fixtureRecords, {}).observations[0]));
  assert.deepEqual(openingsOfBoard(first.opened.map((each) => thread(each))).map((each) => each.identity), openingsOfBoard(second.opened.map((each) => thread(each))).map((each) => each.identity));
});

test("C2: openings carry no allocation and are addressed to the lowest owning section's office", async () => {
  const night = node();
  await runNightlyDream({ ports: night.ports, dream, options });
  const [sheaf, memory] = night.opened;
  assert.equal(sheaf.move, "ask", "the board's opening of a question");
  for (const field of ["serves", "offer", "allocation", "price", "taking", "deadline", "officeService"]) assert.equal(field in sheaf, false, field);
  assert.equal(sheaf.to, "science-officer");
  assert.deepEqual(sheaf.scope, ["section:science", "section:science/memory", "section:science/semiosis"]);
  assert.deepEqual(sheaf.tags.slice(0, 1), ["nightly-dream"]);
  assert.match(sheaf.tags[1], /^dream-[0-9a-f]{64}$/u);
  assert.equal(sheaf.sources[0].kind, "dream-witnesses");
  assert.ok(sheaf.question.length <= 400);
  assert.deepEqual(memory.scope, ["section:science", "section:science/memory", "section:science/semiosis"]);
  assert.equal(owningSection(["science/memory", "operations/node"]), null);
});

test("C2: an opening already open is not opened twice", async () => {
  const night = node();
  await runNightlyDream({ ports: night.ports, dream, options });
  const again = node({ threads: night.opened.map((each) => thread(each)) });
  const { record: run } = await runNightlyDream({ ports: again.ports, dream, options });
  assert.equal(again.opened.length, 0);
  assert.deepEqual(run.suppressed.map((each) => each.reason), ["already-open", "already-open"]);
});

test("C3: an answered opening suppresses its topic until a new witness term appears", async () => {
  const first = node();
  await runNightlyDream({ ports: first.ports, dream, options });
  const answered = first.opened.map((each) => thread(each, topicOf(each) === "sheaf" ? "answered" : "withdrawn"));

  const quiet = node({ threads: answered });
  const { record: quietRun } = await runNightlyDream({ ports: quiet.ports, dream, options });
  assert.equal(quiet.opened.length, 0);
  assert.deepEqual(quietRun.suppressed.map((each) => [each.topic, each.reason]), [["sheaf", "answered-without-new-witness"], ["memory", "answered-without-new-witness"]]);

  const witnessed = node({ threads: answered, records: [...fixtureRecords, record(4, "science/memory", "delta", ["sheaf"])] });
  await runNightlyDream({ ports: witnessed.ports, dream, options });
  assert.deepEqual(witnessed.opened.map((each) => topicOf(each)), ["sheaf"], "sheaf reappears with delta; memory stays closed");
  assert.equal(witnessCount(witnessed.opened[0]), 4);
});

test("C5: a dry run prints the run record and writes no opening, cursor or record", async () => {
  const night = node({ cursor: { after: 0, narrowThrough: null } });
  const { status, record: run } = await runNightlyDream({ ports: night.ports, dream, options: { ...options, dryRun: true } });
  assert.equal(status, 0);
  assert.equal(night.opened.length, 0);
  assert.equal(night.runRecords.length, 0);
  assert.deepEqual(night.cursor, { after: 0, narrowThrough: null });
  assert.equal(run.outcome, "dry-run");
  assert.deepEqual(run.cursorBefore, { after: 0, narrowThrough: null });
  assert.deepEqual(run.cursorAfter, { after: 3, narrowThrough: null });
  assert.equal(run.termsRead, 3);
  assert.equal(run.derived, 2);
  assert.deepEqual(run.opened.map((each) => [each.topic, each.written]), [["sheaf", false], ["memory", false]]);
  assert.deepEqual(run.suppressed, []);
  assert.ok(run.bytesRead > 0);
  assert.equal(run.bytesWritten, 0);
});

test("R16, R17: the cursor advances after the openings land, and the run record names the night", async () => {
  const night = node();
  const { status, record: run } = await runNightlyDream({ ports: night.ports, dream, options: { ...options, maxProposals: 1 } });
  assert.equal(status, 0);
  assert.deepEqual(night.cursor, { after: 3, narrowThrough: null });
  assert.equal(night.runRecords.length, 1);
  assert.equal(run.derived, 2);
  assert.equal(run.opened.length, 1);
  assert.deepEqual(run.capped.map((each) => each.topic), ["memory"]);
  assert.ok(run.bytesWritten > 0);

  const failing = node();
  failing.ports.openOnBoard = async () => { throw new Error("board refused"); };
  await assert.rejects(runNightlyDream({ ports: failing.ports, dream, options }), /board refused/);
  assert.equal(failing.cursor, null, "an unlanded proposal leaves the cursor unmoved");
});

test("R18: a night under I/O pressure exits with the temporary-failure status before reading any record", async () => {
  const night = node({ avg10: "61.50" });
  const { status, record: run } = await runNightlyDream({ ports: night.ports, dream, options });
  assert.equal(status, temporaryFailure);
  assert.equal(run.outcome, "skipped-for-pressure");
  assert.equal(night.reads, 0);
  assert.equal(night.cursor, null);
  assert.equal(ioPressureOf(pressure("60.00")), 60);
});

test("R22: a window wider than maxTerms is refused and the next night reads it narrowed", async () => {
  const night = node();
  const { status, record: run } = await runNightlyDream({ ports: night.ports, dream, options: { ...options, maxTerms: 2 } });
  assert.equal(status, temporaryFailure);
  assert.equal(run.outcome, "refused-window-exceeds-max-terms");
  assert.deepEqual(night.cursor, { after: null, narrowThrough: 2 });
  assert.equal(night.opened.length, 0);

  await runNightlyDream({ ports: night.ports, dream, options: { ...options, maxTerms: 2 } });
  assert.deepEqual(night.cursor, { after: 2, narrowThrough: null });
  assert.deepEqual(night.opened.map((each) => topicOf(each)), ["sheaf"]);

  const window = await windowOfSettledRecords({ cursor: 2, recordClasses: ["settled-memory"], maxTerms: 2, read: night.ports.readRecords });
  assert.deepEqual(window.terms.map((each) => each.term.id), ["gamma"]);
});

test("C5: the entry script's dry run prints the run record of R17 and calls no writing verb", async () => {
  const { main } = await import("../scripts/nightly-dream.mjs");
  const { mkdtemp, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const pressureFile = join(await mkdtemp(join(tmpdir(), "nightly-dream-")), "io");
  await writeFile(pressureFile, pressure("2.00"));
  const calls = [];
  const call = async (verb, input) => {
    calls.push(verb);
    if (verb === "work-board") return { threads: [] };
    if (input.recordClass === "nightly-dream-cursor") return { records: [] };
    return { records: fixtureRecords.filter((each) => input.after === null || each.admission > input.after) };
  };
  let printed = "";
  const status = await main(["--dry-run", "--record-reader", "settled-records", "--record-class", "settled-memory", "--office", "science=science-officer", "--pressure-file", pressureFile], { call, output: { write: (text) => { printed += text; } } });

  assert.equal(status, 0);
  assert.deepEqual([...new Set(calls)].sort(), ["settled-records", "work-board"], "reads only: no work-open, no record writer");
  const run = JSON.parse(printed);
  assert.equal(run.outcome, "dry-run");
  for (const field of ["recordClasses", "cursorBefore", "cursorAfter", "termsRead", "derived", "opened", "suppressed", "bytesRead", "bytesWritten", "pressure"]) assert.ok(field in run, field);
  assert.deepEqual(run.opened.map((each) => [each.topic, each.office, each.written]), [["sheaf", "science-officer", false], ["memory", "science-officer", false]]);
  assert.equal(run.bytesWritten, 0);
});

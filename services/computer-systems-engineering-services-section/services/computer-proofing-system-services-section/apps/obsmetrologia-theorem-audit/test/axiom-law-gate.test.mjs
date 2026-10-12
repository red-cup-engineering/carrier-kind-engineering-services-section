import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  ALLOWED_AXIOMS,
  assembleGateRecord,
  decideBaselineUpdate,
  decideGate,
  isFrontier,
  isViolation,
  summarizeAxiomLaw,
} from "../src/axiom-law-gate.mjs";
import {
  parseArgv,
  readBaselineViolations,
  runAxiomLawGate,
  todayStamp,
} from "../scripts/gate-axiom-law.mjs";

const FIXTURE_TEXT = [
  "Obsmetrologia.A.clean\tQuot.sound",
  "Obsmetrologia.A.none\t",
  "Obsmetrologia.B.propext_violation\tpropext",
  "Obsmetrologia.B.choice_violation\tClassical.choice",
  "Obsmetrologia.C.sorry_violation\tpropext,sorryAx,Quot.sound",
  "Obsmetrologia.D.frontier\tsorryAx,Quot.sound",
  "",
].join("\n");

function enoent() {
  const error = new Error("ENOENT: no such file or directory");
  error.code = "ENOENT";
  return error;
}

// --- src/axiom-law-gate.mjs: violation counting ---

test("ALLOWED_AXIOMS: exactly Quot.sound", () => {
  deepStrictEqual(ALLOWED_AXIOMS, ["Quot.sound"]);
});

test("isViolation: Quot.sound alone and no axioms are not violations", () => {
  strictEqual(isViolation(["Quot.sound"]), false);
  strictEqual(isViolation([]), false);
});

test("isViolation: propext and Classical.choice are each violations, alone or combined", () => {
  strictEqual(isViolation(["propext"]), true);
  strictEqual(isViolation(["Classical.choice"]), true);
  strictEqual(isViolation(["propext", "Quot.sound"]), true);
});

test("isViolation: sorryAx marks a frontier theorem, not a violation, but the law still reads its other axioms", () => {
  strictEqual(isViolation(["sorryAx"]), false);
  strictEqual(isViolation(["sorryAx", "Quot.sound"]), false);
  strictEqual(isViolation(["propext", "sorryAx"]), true);
});

test("isFrontier: sorryAx present or absent", () => {
  strictEqual(isFrontier(["propext", "sorryAx", "Quot.sound"]), true);
  strictEqual(isFrontier(["propext"]), false);
  strictEqual(isFrontier([]), false);
});

test("summarizeAxiomLaw: totals, violations, frontier, profiles, byModule, and top violating modules", () => {
  const rows = [
    { name: "Obsmetrologia.A.clean", axioms: ["Quot.sound"] },
    { name: "Obsmetrologia.A.none", axioms: [] },
    { name: "Obsmetrologia.B.propext_violation", axioms: ["propext"] },
    { name: "Obsmetrologia.B.choice_violation", axioms: ["Classical.choice"] },
    { name: "Obsmetrologia.C.sorry_violation", axioms: ["propext", "sorryAx", "Quot.sound"] },
    { name: "Obsmetrologia.D.frontier", axioms: ["sorryAx", "Quot.sound"] },
  ];
  const summary = summarizeAxiomLaw(rows);
  strictEqual(summary.total, 6);
  strictEqual(summary.violations, 3);
  strictEqual(summary.frontier, 2);
  deepStrictEqual(summary.frontierTheorems, ["Obsmetrologia.C.sorry_violation", "Obsmetrologia.D.frontier"]);
  deepStrictEqual(summary.violatingTheorems, [
    "Obsmetrologia.B.propext_violation",
    "Obsmetrologia.B.choice_violation",
    "Obsmetrologia.C.sorry_violation",
  ]);
  deepStrictEqual(summary.profiles, {
    "Quot.sound": 1,
    none: 1,
    propext: 1,
    choice: 1,
    sorry: 2,
  });
  deepStrictEqual(summary.byModule, {
    A: { theorems: 2, violations: 0 },
    B: { theorems: 2, violations: 2 },
    C: { theorems: 1, violations: 1 },
    D: { theorems: 1, violations: 0 },
  });
  deepStrictEqual(summary.topViolatingModules, [
    ["B", 2],
    ["C", 1],
  ]);
});

test("summarizeAxiomLaw: a module with zero violations does not appear in topViolatingModules", () => {
  const summary = summarizeAxiomLaw([
    { name: "Obsmetrologia.A.clean", axioms: ["Quot.sound"] },
    { name: "Obsmetrologia.A.also_clean", axioms: [] },
  ]);
  deepStrictEqual(summary.topViolatingModules, []);
});

test("summarizeAxiomLaw: caps topViolatingModules at 30", () => {
  const rows = [];
  for (let i = 0; i < 40; i += 1) {
    rows.push({ name: `Obsmetrologia.M${String(i).padStart(2, "0")}.bad`, axioms: ["propext"] });
  }
  const summary = summarizeAxiomLaw(rows);
  strictEqual(summary.topViolatingModules.length, 30);
});

// --- src/axiom-law-gate.mjs: the ratchet decides ---

test("decideGate: violations over baseline fails", () => {
  const outcome = decideGate({ violations: 10, baseline: 5 });
  strictEqual(outcome.overBaseline, true);
  strictEqual(outcome.pass, false);
  strictEqual(outcome.exitCode, 1);
});

test("decideGate: violations at or under baseline passes", () => {
  const atBaseline = decideGate({ violations: 5, baseline: 5 });
  strictEqual(atBaseline.pass, true);
  strictEqual(atBaseline.exitCode, 0);
  const underBaseline = decideGate({ violations: 3, baseline: 5 });
  strictEqual(underBaseline.pass, true);
});

test("decideGate: no baseline on record means the ratchet cannot be violated", () => {
  const clean = decideGate({ violations: 3900, baseline: null });
  strictEqual(clean.overBaseline, false);
  strictEqual(clean.pass, true);
});

// --- src/axiom-law-gate.mjs: ratchet up/down decisions ---

test("decideBaselineUpdate: --init creates the baseline only when absent", () => {
  const created = decideBaselineUpdate({ existing: null, violations: 3900, init: true, ratchet: false });
  deepStrictEqual(created, { write: true, baseline: 3900, reason: "init" });
});

test("decideBaselineUpdate: no baseline and no --init leaves it missing", () => {
  const outcome = decideBaselineUpdate({ existing: null, violations: 3900, init: false, ratchet: false });
  deepStrictEqual(outcome, { write: false, baseline: null, reason: "missing" });
});

test("decideBaselineUpdate: --init is a no-op once a baseline already exists", () => {
  const outcome = decideBaselineUpdate({ existing: 100, violations: 50, init: true, ratchet: false });
  deepStrictEqual(outcome, { write: false, baseline: 100, reason: "unchanged" });
});

test("decideBaselineUpdate: --ratchet lowers the baseline when current violations improve on it", () => {
  const outcome = decideBaselineUpdate({ existing: 100, violations: 50, init: false, ratchet: true });
  deepStrictEqual(outcome, { write: true, baseline: 50, reason: "ratchet" });
});

test("decideBaselineUpdate: --ratchet never raises the baseline on a regression", () => {
  const outcome = decideBaselineUpdate({ existing: 100, violations: 150, init: false, ratchet: true });
  deepStrictEqual(outcome, { write: false, baseline: 100, reason: "unchanged" });
});

test("decideBaselineUpdate: without --ratchet an improvement is not recorded", () => {
  const outcome = decideBaselineUpdate({ existing: 100, violations: 50, init: false, ratchet: false });
  deepStrictEqual(outcome, { write: false, baseline: 100, reason: "unchanged" });
});

test("assembleGateRecord: shape, type, reading, allowedAxioms, embedded gate and summary", () => {
  const rows = [
    { name: "Obsmetrologia.A.clean", axioms: ["Quot.sound"] },
    { name: "Obsmetrologia.B.propext_violation", axioms: ["propext"] },
  ];
  const gate = decideGate({ violations: 1, baseline: 5 });
  const record = assembleGateRecord({
    checkedAt: "2026-09-21T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    rows,
    baseline: 5,
    gate,
  });
  strictEqual(record.type, "ObsmetrologiaAxiomLawGate");
  strictEqual(record.checkedAt, "2026-09-21T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-theorem-axioms.lean");
  deepStrictEqual(record.allowedAxioms, ["Quot.sound"]);
  strictEqual(record.baseline, 5);
  deepStrictEqual(record.gate, gate);
  ok(typeof record.reading === "string" && record.reading.length > 0);
  ok(record.reading.includes("Quot.sound"));
  ok(record.reading.includes("sorryAx"));
  deepStrictEqual(record.summary, summarizeAxiomLaw(rows));
});

// --- scripts/gate-axiom-law.mjs ---

test("parseArgv: --out-dir, --date, --init, --ratchet", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-21", "--init", "--ratchet"]), {
    outDir: "/tmp/x",
    date: "2026-09-21",
    init: true,
    ratchet: true,
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined, init: false, ratchet: false });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("readBaselineViolations: parses the recorded violation count", async () => {
  const count = await readBaselineViolations(async () => JSON.stringify({ violations: 42, recordedAt: "x" }));
  strictEqual(count, 42);
});

test("readBaselineViolations: a missing file (ENOENT) reads as no baseline", async () => {
  const count = await readBaselineViolations(async () => {
    throw enoent();
  });
  strictEqual(count, null);
});

test("readBaselineViolations: a non-ENOENT read failure propagates", async () => {
  let threw = null;
  try {
    await readBaselineViolations(async () => {
      throw new Error("disk on fire");
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("disk on fire"));
});

test("runAxiomLawGate: --init with no baseline on record writes one, counts frontier theorems, and passes at the baseline", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: FIXTURE_TEXT, stderr: "" });
  const writes = [];
  const outcome = await runAxiomLawGate({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    runCommand: fakeRunCommand,
    readBaselineText: async () => {
      throw enoent();
    },
    writeBaselineText: async (text) => writes.push(text),
    init: true,
    ratchet: false,
    now: () => "2026-09-21T00:00:00.000Z",
  });
  strictEqual(outcome.summary.violations, 3);
  strictEqual(outcome.summary.frontier, 2);
  strictEqual(outcome.baselineUpdate.write, true);
  strictEqual(outcome.baselineUpdate.reason, "init");
  strictEqual(outcome.baseline, 3);
  strictEqual(writes.length, 1);
  deepStrictEqual(JSON.parse(writes[0]), { violations: 3, recordedAt: "2026-09-21T00:00:00.000Z" });
  strictEqual(outcome.gate.pass, true);
  strictEqual(outcome.gate.exitCode, 0);
});

test("runAxiomLawGate: --ratchet lowers an existing baseline when violations improve", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: FIXTURE_TEXT, stderr: "" });
  const writes = [];
  const outcome = await runAxiomLawGate({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    runCommand: fakeRunCommand,
    readBaselineText: async () => JSON.stringify({ violations: 10, recordedAt: "2026-09-01T00:00:00.000Z" }),
    writeBaselineText: async (text) => writes.push(text),
    init: false,
    ratchet: true,
    now: () => "2026-09-21T00:00:00.000Z",
  });
  strictEqual(outcome.baselineUpdate.reason, "ratchet");
  strictEqual(outcome.baseline, 3);
  strictEqual(writes.length, 1);
});

test("runAxiomLawGate: a regression against an existing baseline fails without touching the baseline file", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: FIXTURE_TEXT, stderr: "" });
  const writes = [];
  const outcome = await runAxiomLawGate({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    runCommand: fakeRunCommand,
    readBaselineText: async () => JSON.stringify({ violations: 1, recordedAt: "2026-09-01T00:00:00.000Z" }),
    writeBaselineText: async (text) => writes.push(text),
    init: false,
    ratchet: false,
  });
  strictEqual(outcome.baseline, 1);
  strictEqual(writes.length, 0);
  strictEqual(outcome.gate.overBaseline, true);
  strictEqual(outcome.gate.pass, false);
});

test("runAxiomLawGate: no baseline and neither flag leaves the baseline null and passes", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: FIXTURE_TEXT, stderr: "" });
  const writes = [];
  const outcome = await runAxiomLawGate({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    runCommand: fakeRunCommand,
    readBaselineText: async () => {
      throw enoent();
    },
    writeBaselineText: async (text) => writes.push(text),
  });
  strictEqual(outcome.baseline, null);
  strictEqual(writes.length, 0);
  strictEqual(outcome.gate.overBaseline, false);
  strictEqual(outcome.gate.pass, true);
});

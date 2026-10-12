import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  PHYSICS_MODULES,
  assembleCensusRecord,
  describeReading,
  modeOf,
  modeTags,
  parseCensusRows,
  summarizeCensus,
} from "../src/regime-instantiation-census.mjs";
import {
  parseArgv,
  runRegimeCensus,
  todayStamp,
} from "../scripts/census-set-of-regime-instantiations.mjs";

const FIXTURE_TEXT = [
  "#datum\tObsmetrologia.spineData\ttrue",
  "#datum\tObsmetrologia.Flow.NSCFiring.nscRegimeData\tfalse",
  "#datum\tObsmetrologia.Weird.unknownFlagDatum\tunknown",
  "Obsmetrologia.Closure.cohomologyVanishes_iff\t1\tObsmetrologia.ClosureRegime\t\t\tObsmetrologia.cohomologyVanishes\t0",
  "Obsmetrologia.Closure.spine_is_strict\t0\t\tObsmetrologia.spineData\t\tObsmetrologia.classify\t0",
  "Obsmetrologia.Ord.tbWitness_regime_via_ord\t0\t\t\tObsmetrologia.Ord.regimeOfOrdHonest\tObsmetrologia.Ord.regimeOfOrdHonest\t0",
  "Obsmetrologia.AperiodicOrder.Defect.defect_exists\t0\t\t\t\tObsmetrologia.ClosureRegime,Obsmetrologia.ClosureRegime.aperiodic\t1",
  "Obsmetrologia.Ord.regime_of_ord_refines_classify\t1\tObsmetrologia.ClosureRegimeData\tObsmetrologia.spineData\tObsmetrologia.Ord.regimeOfOrd\tObsmetrologia.ClosureRegimeData,Obsmetrologia.classify\t0",
  "",
].join("\n");

test("parseCensusRows: #datum lines (true/false/unknown flags) and 7-field theorem rows", () => {
  const parsed = parseCensusRows(FIXTURE_TEXT);
  deepStrictEqual(parsed.datums, [
    { name: "Obsmetrologia.spineData", countableCofinalityFalse: false },
    { name: "Obsmetrologia.Flow.NSCFiring.nscRegimeData", countableCofinalityFalse: true },
    { name: "Obsmetrologia.Weird.unknownFlagDatum", countableCofinalityFalse: null },
  ]);
  strictEqual(parsed.rows.length, 5);
  deepStrictEqual(parsed.rows[0], {
    theorem: "Obsmetrologia.Closure.cohomologyVanishes_iff",
    hypothesized: true,
    hypothesizedTypes: ["Obsmetrologia.ClosureRegime"],
    handBuilt: [],
    derived: [],
    regimeConstantsUsed: ["Obsmetrologia.cohomologyVanishes"],
    concludesAperiodic: false,
  });
  deepStrictEqual(parsed.rows[3], {
    theorem: "Obsmetrologia.AperiodicOrder.Defect.defect_exists",
    hypothesized: false,
    hypothesizedTypes: [],
    handBuilt: [],
    derived: [],
    regimeConstantsUsed: ["Obsmetrologia.ClosureRegime", "Obsmetrologia.ClosureRegime.aperiodic"],
    concludesAperiodic: true,
  });
});

test("parseCensusRows: blank text parses to no datums and no rows", () => {
  deepStrictEqual(parseCensusRows(""), { datums: [], rows: [] });
});

test("parseCensusRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "Obsmetrologia.Closure.cohomologyVanishes_iff\t1\tObsmetrologia.ClosureRegime\t\t\tObsmetrologia.cohomologyVanishes\t0",
    "",
  ].join("\n");
  deepStrictEqual(parseCensusRows(text), {
    datums: [],
    rows: [
      {
        theorem: "Obsmetrologia.Closure.cohomologyVanishes_iff",
        hypothesized: true,
        hypothesizedTypes: ["Obsmetrologia.ClosureRegime"],
        handBuilt: [],
        derived: [],
        regimeConstantsUsed: ["Obsmetrologia.cohomologyVanishes"],
        concludesAperiodic: false,
      },
    ],
  });
});

test("modeTags/modeOf: hypothesized, hand-built, derived, table-only, and mixed", () => {
  deepStrictEqual(modeTags({ hypothesized: true, handBuilt: [], derived: [] }), ["hypothesized"]);
  strictEqual(modeOf({ hypothesized: true, handBuilt: [], derived: [] }), "hypothesized");

  deepStrictEqual(modeTags({ hypothesized: false, handBuilt: ["Obsmetrologia.spineData"], derived: [] }), ["hand-built"]);
  strictEqual(modeOf({ hypothesized: false, handBuilt: ["Obsmetrologia.spineData"], derived: [] }), "hand-built");

  deepStrictEqual(
    modeTags({ hypothesized: false, handBuilt: [], derived: ["Obsmetrologia.Ord.regimeOfOrdHonest"] }),
    ["derived"],
  );
  strictEqual(
    modeOf({ hypothesized: false, handBuilt: [], derived: ["Obsmetrologia.Ord.regimeOfOrdHonest"] }),
    "derived",
  );

  deepStrictEqual(modeTags({ hypothesized: false, handBuilt: [], derived: [] }), ["table-only"]);
  strictEqual(modeOf({ hypothesized: false, handBuilt: [], derived: [] }), "table-only");

  deepStrictEqual(
    modeTags({ hypothesized: true, handBuilt: ["Obsmetrologia.spineData"], derived: ["Obsmetrologia.Ord.regimeOfOrd"] }),
    ["hypothesized", "hand-built", "derived"],
  );
  strictEqual(
    modeOf({ hypothesized: true, handBuilt: ["Obsmetrologia.spineData"], derived: ["Obsmetrologia.Ord.regimeOfOrd"] }),
    "mixed",
  );
});

test("summarizeCensus: totals, mode counts, byModule, datums, aperiodic conclusions over the fixture", () => {
  const parsed = parseCensusRows(FIXTURE_TEXT);
  const summary = summarizeCensus(parsed);
  strictEqual(summary.total, 5);
  deepStrictEqual(summary.modeCounts, {
    hypothesized: 1,
    "hand-built": 1,
    derived: 1,
    "table-only": 1,
    mixed: 1,
  });
  deepStrictEqual(summary.byModule, {
    Closure: { hypothesized: 1, "hand-built": 1 },
    Ord: { derived: 1, mixed: 1 },
    AperiodicOrder: { "table-only": 1 },
  });
  strictEqual(summary.datumCount, 3);
  strictEqual(summary.datumsWithCountableCofinalityFalse, 1);
  deepStrictEqual(summary.datums, [
    { name: "Obsmetrologia.spineData", module: "spineData", countableCofinalityFalse: false },
    { name: "Obsmetrologia.Flow.NSCFiring.nscRegimeData", module: "Flow", countableCofinalityFalse: true },
    { name: "Obsmetrologia.Weird.unknownFlagDatum", module: "Weird", countableCofinalityFalse: null },
  ]);
  deepStrictEqual(summary.aperiodicConclusions, [
    { theorem: "Obsmetrologia.AperiodicOrder.Defect.defect_exists", module: "AperiodicOrder", mode: "table-only" },
  ]);
  deepStrictEqual(summary.aperiodicByMode, { "table-only": 1 });
});

test("summarizeCensus: physicsModulesWithZeroRegimeTheorems lists every PHYSICS_MODULES entry the rows never touch", () => {
  const parsed = parseCensusRows(FIXTURE_TEXT);
  const summary = summarizeCensus(parsed);
  ok(summary.physicsModulesWithZeroRegimeTheorems.includes("KineticTheory"));
  ok(summary.physicsModulesWithZeroRegimeTheorems.includes("Thermodynamics"));
  ok(summary.physicsModulesWithZeroRegimeTheorems.includes("QuantumContextuality"));
  ok(!summary.physicsModulesWithZeroRegimeTheorems.includes("AperiodicOrder"));
  strictEqual(
    summary.physicsModulesWithZeroRegimeTheorems.length,
    PHYSICS_MODULES.length - 1,
  );
});

test("summarizeCensus: no datums and no rows yields zero totals and every physics module absent", () => {
  const summary = summarizeCensus({ datums: [], rows: [] });
  strictEqual(summary.total, 0);
  deepStrictEqual(summary.modeCounts, {});
  deepStrictEqual(summary.byModule, {});
  strictEqual(summary.datumCount, 0);
  strictEqual(summary.datumsWithCountableCofinalityFalse, 0);
  deepStrictEqual(summary.aperiodicConclusions, []);
  deepStrictEqual(summary.physicsModulesWithZeroRegimeTheorems, PHYSICS_MODULES);
});

test("describeReading: mentions the total, datum counts, and aperiodic count", () => {
  const summary = summarizeCensus(parseCensusRows(FIXTURE_TEXT));
  const reading = describeReading(summary);
  ok(reading.includes("5 regime-bearing theorems"));
  ok(reading.includes("3 concrete ClosureRegimeData datums"));
  ok(reading.includes("1 with countableCofinality = false"));
  ok(reading.includes("1 theorems conclude aperiodic"));
});

test("assembleCensusRecord: shape, type, and reading field", () => {
  const parsed = parseCensusRows(FIXTURE_TEXT);
  const record = assembleCensusRecord({
    checkedAt: "2026-09-04T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-regime-instantiations.lean",
    parsed,
  });
  strictEqual(record.type, "ObsmetrologiaRegimeInstantiationCensus");
  strictEqual(record.checkedAt, "2026-09-04T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-regime-instantiations.lean");
  ok(typeof record.reading === "string" && record.reading.length > 0);
  deepStrictEqual(record.summary, summarizeCensus(parsed));
});

test("parseArgv: --out-dir and --date", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-04"]), {
    outDir: "/tmp/x",
    date: "2026-09-04",
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("runRegimeCensus: injected runner drives control flow and returns raw stdout plus parsed rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { stdout, parsed } = await runRegimeCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-regime-instantiations.lean",
    runCommand: fakeRunCommand,
  });
  strictEqual(stdout, FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 5);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, [
    "env",
    "lean",
    "/pkg/scripts/census-set-of-regime-instantiations.lean",
  ]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runRegimeCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runRegimeCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-regime-instantiations.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-regime-instantiations-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runRegimeCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "#datum\tObsmetrologia.spineData\ttrue\n", stderr: "" });
  let threw = null;
  try {
    await runRegimeCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-regime-instantiations.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-regime-instantiations-failed"));
});

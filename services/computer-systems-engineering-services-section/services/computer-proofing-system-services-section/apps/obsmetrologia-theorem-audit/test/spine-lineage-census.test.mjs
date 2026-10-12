import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleSpineRecord,
  parseSpineRows,
  summarizeSpineLineage,
  TIERS,
} from "../src/spine-lineage-census.mjs";
import {
  parseArgv,
  runSpineCensus,
  todayStamp,
} from "../scripts/census-set-of-spine-lineage.mjs";

const FIXTURE_TEXT = [
  "#theorems\t5",
  "#touching-spine\t3",
  "#deepest\t0-none\t2",
  "#deepest\t3-articulating\t1",
  "#deepest\t5-positing\t2",
  "#module\tArticulating\t1\t1\t3-articulating=1",
  "#module\tAlexandrov\t2\t1\t0-none=1 5-positing=1",
  "#module\tCharge\t1\t1\t5-positing=1",
  "#module\tReal\t1\t0\t0-none=1",
  "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0-none\t",
  "Obsmetrologia.Alexandrov.uses_positing\t5-positing\t3-articulating,5-positing",
  "Obsmetrologia.Articulating.Reflex.flip_flip\t3-articulating\t3-articulating",
  "Obsmetrologia.Reading.settleSpends\t5-positing\t5-positing",
  "Obsmetrologia.Real.Internal.Rat.add_comm\t0-none\t",
  "",
].join("\n");

test("TIERS: standalone first, shallowest to deepest, seven tiers", () => {
  deepStrictEqual(TIERS, [
    "0-none",
    "1-mark",
    "2-utterance",
    "3-articulating",
    "4-predicating",
    "5-positing",
    "6-settling",
  ]);
});

test("parseSpineRows: header lines (#theorems/#touching-spine/#deepest/#module) skipped, theorem rows parsed", () => {
  const parsed = parseSpineRows(FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 5);
  deepStrictEqual(parsed.rows[0], {
    theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty",
    deepestTier: "0-none",
    tiers: [],
  });
  deepStrictEqual(parsed.rows[1], {
    theorem: "Obsmetrologia.Alexandrov.uses_positing",
    deepestTier: "5-positing",
    tiers: ["3-articulating", "5-positing"],
  });
  deepStrictEqual(parsed.rows[4], {
    theorem: "Obsmetrologia.Real.Internal.Rat.add_comm",
    deepestTier: "0-none",
    tiers: [],
  });
});

test("parseSpineRows: blank text parses to no rows", () => {
  deepStrictEqual(parseSpineRows(""), { rows: [] });
});

test("parseSpineRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "#theorems\t1",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0-none\t",
    "",
  ].join("\n");
  deepStrictEqual(parseSpineRows(text), {
    rows: [{ theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", deepestTier: "0-none", tiers: [] }],
  });
});

test("summarizeSpineLineage: computed purely from rows, ignoring header lines entirely", () => {
  const summary = summarizeSpineLineage(parseSpineRows(FIXTURE_TEXT));
  strictEqual(summary.theorems, 5);
  strictEqual(summary.touchingSpine, 3);
  strictEqual(summary.standaloneCount, 2);
  deepStrictEqual(summary.deepestTierDistribution, {
    "0-none": 2,
    "3-articulating": 1,
    "5-positing": 2,
  });
  deepStrictEqual(summary.byModule, {
    Alexandrov: {
      theorems: 2,
      touching: 1,
      standalone: 1,
      deepest: { "0-none": 1, "5-positing": 1 },
    },
    Articulating: {
      theorems: 1,
      touching: 1,
      standalone: 0,
      deepest: { "3-articulating": 1 },
    },
    Charge: {
      theorems: 1,
      touching: 1,
      standalone: 0,
      deepest: { "5-positing": 1 },
    },
    Real: {
      theorems: 1,
      touching: 0,
      standalone: 1,
      deepest: { "0-none": 1 },
    },
  });
  deepStrictEqual(summary.standaloneModules, ["Real"]);
});

test("summarizeSpineLineage: a module where every theorem touches the spine has no standalone entry in standaloneModules", () => {
  const summary = summarizeSpineLineage({
    rows: [
      { theorem: "Obsmetrologia.Reading.a", deepestTier: "5-positing", tiers: ["5-positing"] },
      { theorem: "Obsmetrologia.Reading.b", deepestTier: "6-settling", tiers: ["5-positing", "6-settling"] },
    ],
  });
  strictEqual(summary.touchingSpine, 2);
  strictEqual(summary.standaloneCount, 0);
  deepStrictEqual(summary.standaloneModules, []);
});

test("summarizeSpineLineage: empty rows summarize to all zeros and no modules", () => {
  const summary = summarizeSpineLineage({ rows: [] });
  strictEqual(summary.theorems, 0);
  strictEqual(summary.touchingSpine, 0);
  strictEqual(summary.standaloneCount, 0);
  deepStrictEqual(summary.deepestTierDistribution, {});
  deepStrictEqual(summary.byModule, {});
  deepStrictEqual(summary.standaloneModules, []);
});

test("assembleSpineRecord: shape, type, reading, and embedded source", () => {
  const parsed = parseSpineRows(FIXTURE_TEXT);
  const record = assembleSpineRecord({
    checkedAt: "2026-09-21T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-spine-lineage.lean",
    leanSource: "import Lean\n",
    parsed,
  });
  strictEqual(record.type, "ObsmetrologiaSpineLineageCensus");
  strictEqual(record.checkedAt, "2026-09-21T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-spine-lineage.lean");
  strictEqual(record.leanSource, "import Lean\n");
  ok(typeof record.reading === "string" && record.reading.length > 0);
  ok(record.reading.includes("standalone"));
  ok(record.reading.includes("articulating"));
  deepStrictEqual(record.summary, summarizeSpineLineage(parsed));
});

test("parseArgv: --out-dir and --date", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-21"]), {
    outDir: "/tmp/x",
    date: "2026-09-21",
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("runSpineCensus: injected runner drives control flow and returns raw stdout plus parsed rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { stdout, parsed } = await runSpineCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-spine-lineage.lean",
    runCommand: fakeRunCommand,
  });
  strictEqual(stdout, FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 5);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, ["env", "lean", "/pkg/scripts/census-set-of-spine-lineage.lean"]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runSpineCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runSpineCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-spine-lineage.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-spine-lineage-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runSpineCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "#theorems\t0\n#touching-spine\t0\n", stderr: "" });
  let threw = null;
  try {
    await runSpineCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-spine-lineage.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-spine-lineage-failed"));
});

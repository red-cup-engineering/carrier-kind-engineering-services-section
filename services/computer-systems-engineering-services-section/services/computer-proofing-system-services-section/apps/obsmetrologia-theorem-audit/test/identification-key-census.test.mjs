import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleKeyRecord,
  isCoreKey,
  parseKeyRows,
  summarizeKeys,
} from "../src/identification-key-census.mjs";
import {
  parseArgv,
  runKeyCensus,
  todayStamp,
} from "../scripts/census-set-of-identification-keys.mjs";

const FIXTURE_TEXT = [
  "#theorems\t5",
  "#keys\t3",
  "#key\tcore:funext\t2",
  "#key\tObsmetrologia.Real.Internal.PreRat.setoid\t2",
  "#key\tObsmetrologia.Articulating.reflexSetoid\t1",
  "#hist\t0\t1",
  "#hist\t1\t3",
  "#hist\t2\t1",
  "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0\t",
  "Obsmetrologia.Articulating.Reflex.flip_flip\t1\tObsmetrologia.Articulating.reflexSetoid",
  "Obsmetrologia.Language.Batch.posit_comm\t1\tcore:funext",
  "Obsmetrologia.Real.Internal.Rat.add_comm\t1\tObsmetrologia.Real.Internal.PreRat.setoid",
  "Obsmetrologia.Thermodynamics.htheorem\t2\tcore:funext,Obsmetrologia.Real.Internal.PreRat.setoid",
  "",
].join("\n");

test("isCoreKey: core: prefix marks a Lean-core spend", () => {
  strictEqual(isCoreKey("core:funext"), true);
  strictEqual(isCoreKey("Obsmetrologia.Articulating.reflexSetoid"), false);
});

test("parseKeyRows: header lines skipped or collected, theorem rows parsed", () => {
  const parsed = parseKeyRows(FIXTURE_TEXT);
  deepStrictEqual(parsed.keys, [
    "core:funext",
    "Obsmetrologia.Real.Internal.PreRat.setoid",
    "Obsmetrologia.Articulating.reflexSetoid",
  ]);
  strictEqual(parsed.rows.length, 5);
  deepStrictEqual(parsed.rows[0], {
    theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty",
    keyCount: 0,
    keys: [],
  });
  deepStrictEqual(parsed.rows[4], {
    theorem: "Obsmetrologia.Thermodynamics.htheorem",
    keyCount: 2,
    keys: ["core:funext", "Obsmetrologia.Real.Internal.PreRat.setoid"],
  });
});

test("parseKeyRows: blank text parses to no keys and no rows", () => {
  deepStrictEqual(parseKeyRows(""), { keys: [], rows: [] });
});

test("parseKeyRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "#theorems\t1",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0\t",
    "",
  ].join("\n");
  deepStrictEqual(parseKeyRows(text), {
    keys: [],
    rows: [{ theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", keyCount: 0, keys: [] }],
  });
});

test("summarizeKeys: without a root key nothing is settled and every identified theorem is postulated", () => {
  const summary = summarizeKeys(parseKeyRows(FIXTURE_TEXT));
  strictEqual(summary.theorems, 5);
  strictEqual(summary.keys, 3);
  strictEqual(summary.houseKeys, 2);
  strictEqual(summary.coreKeys, 1);
  deepStrictEqual(summary.keyCountDistribution, { "0": 1, "1": 3, "2": 1 });
  deepStrictEqual(summary.keysRanked, [
    ["Obsmetrologia.Real.Internal.PreRat.setoid", 2],
    ["core:funext", 2],
    ["Obsmetrologia.Articulating.reflexSetoid", 1],
  ]);
  strictEqual(summary.identificationFree, 1);
  strictEqual(summary.onlyCoreKeys, 1);
  strictEqual(summary.anyHouseKey, 3);
  strictEqual(summary.rootKey, null);
  strictEqual(summary.settled, 0);
  strictEqual(summary.postulated, 4);
  deepStrictEqual(summary.byModule, {
    Alexandrov: { theorems: 1, zeroKeys: 1, oneKey: 0, twoOrMore: 0 },
    Articulating: { theorems: 1, zeroKeys: 0, oneKey: 1, twoOrMore: 0 },
    Language: { theorems: 1, zeroKeys: 0, oneKey: 1, twoOrMore: 0 },
    Real: { theorems: 1, zeroKeys: 0, oneKey: 1, twoOrMore: 0 },
    Thermodynamics: { theorems: 1, zeroKeys: 0, oneKey: 0, twoOrMore: 1 },
  });
});

test("summarizeKeys: with a root key, only-root theorems are settled and the rest postulated", () => {
  const summary = summarizeKeys(parseKeyRows(FIXTURE_TEXT), {
    rootKey: "Obsmetrologia.Articulating.reflexSetoid",
  });
  strictEqual(summary.rootKey, "Obsmetrologia.Articulating.reflexSetoid");
  strictEqual(summary.settled, 1);
  strictEqual(summary.postulated, 3);
  strictEqual(summary.identificationFree, 1);
});

test("summarizeKeys: duplicate keys in one row count once", () => {
  const summary = summarizeKeys({
    keys: [],
    rows: [{ theorem: "Obsmetrologia.Real.t", keyCount: 2, keys: ["core:funext", "core:funext"] }],
  });
  deepStrictEqual(summary.keyCountDistribution, { "1": 1 });
  deepStrictEqual(summary.keysRanked, [["core:funext", 1]]);
});

test("assembleKeyRecord: shape, type, reading, and embedded source", () => {
  const parsed = parseKeyRows(FIXTURE_TEXT);
  const record = assembleKeyRecord({
    checkedAt: "2026-09-21T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-identification-keys.lean",
    leanSource: "import Lean\n",
    rootKey: null,
    parsed,
  });
  strictEqual(record.type, "ObsmetrologiaIdentificationKeyCensus");
  strictEqual(record.checkedAt, "2026-09-21T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-identification-keys.lean");
  strictEqual(record.leanSource, "import Lean\n");
  ok(typeof record.reading === "string" && record.reading.length > 0);
  ok(record.reading.includes("Quot.sound"));
  ok(record.reading.includes("funext"));
  deepStrictEqual(record.summary, summarizeKeys(parsed, { rootKey: null }));
});

test("parseArgv: --out-dir, --date, --root-key", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-21", "--root-key", "R"]), {
    outDir: "/tmp/x",
    date: "2026-09-21",
    rootKey: "R",
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined, rootKey: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("runKeyCensus: injected runner drives control flow and returns raw stdout plus parsed rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { stdout, parsed } = await runKeyCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-identification-keys.lean",
    runCommand: fakeRunCommand,
  });
  strictEqual(stdout, FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 5);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, ["env", "lean", "/pkg/scripts/census-set-of-identification-keys.lean"]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runKeyCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runKeyCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-identification-keys.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-identification-keys-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runKeyCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "#theorems\t0\n#keys\t0\n", stderr: "" });
  let threw = null;
  try {
    await runKeyCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-identification-keys.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-identification-keys-failed"));
});

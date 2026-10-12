import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleSiteRecord,
  parseSiteRows,
  summarizeSites,
} from "../src/identification-site-census.mjs";
import {
  parseArgv,
  runSiteCensus,
  todayStamp,
} from "../scripts/census-set-of-identification-sites.mjs";

const FIXTURE_TEXT = [
  "#sites\t2",
  "#site\tObsmetrologia.Real.Internal.Rat.mk",
  "#site\tObsmetrologia.Real.Internal.Rat.leB",
  "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0\t",
  "Obsmetrologia.AperiodicOrder.Crystal.Glass.BasinFreeEnergyBridge.mk.inj\t1\tObsmetrologia.Real.Internal.Rat.leB",
  "Obsmetrologia.Real.Internal.RReal.add_comm\t2\tObsmetrologia.Real.Internal.Rat.mk,Obsmetrologia.Real.Internal.Rat.leB",
  "",
].join("\n");

test("parseSiteRows: #sites total line skipped, #site lines collected, theorem rows parsed", () => {
  const parsed = parseSiteRows(FIXTURE_TEXT);
  deepStrictEqual(parsed.sites, [
    "Obsmetrologia.Real.Internal.Rat.mk",
    "Obsmetrologia.Real.Internal.Rat.leB",
  ]);
  deepStrictEqual(parsed.rows, [
    { theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", siteCount: 0, sites: [] },
    {
      theorem: "Obsmetrologia.AperiodicOrder.Crystal.Glass.BasinFreeEnergyBridge.mk.inj",
      siteCount: 1,
      sites: ["Obsmetrologia.Real.Internal.Rat.leB"],
    },
    {
      theorem: "Obsmetrologia.Real.Internal.RReal.add_comm",
      siteCount: 2,
      sites: ["Obsmetrologia.Real.Internal.Rat.mk", "Obsmetrologia.Real.Internal.Rat.leB"],
    },
  ]);
});

test("parseSiteRows: blank text parses to no sites and no rows", () => {
  deepStrictEqual(parseSiteRows(""), { sites: [], rows: [] });
});

test("parseSiteRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "#sites\t0",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t0\t",
    "",
  ].join("\n");
  deepStrictEqual(parseSiteRows(text), {
    sites: [],
    rows: [{ theorem: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", siteCount: 0, sites: [] }],
  });
});

test("summarizeSites: totals, distribution, mostInherited, sitesByModule, byModule over a zero/one/multi-site fixture", () => {
  const parsed = parseSiteRows(FIXTURE_TEXT);
  const summary = summarizeSites(parsed);
  strictEqual(summary.theorems, 3);
  strictEqual(summary.sites, 2);
  deepStrictEqual(summary.siteCountDistribution, { "0": 1, "1": 1, "2": 1 });
  deepStrictEqual(summary.mostInherited, [
    ["Obsmetrologia.Real.Internal.Rat.leB", 2],
    ["Obsmetrologia.Real.Internal.Rat.mk", 1],
  ]);
  deepStrictEqual(summary.sitesByModule, { Real: 2 });
  deepStrictEqual(summary.byModule, {
    Alexandrov: { theorems: 1, zeroSites: 1, oneSite: 0, twoOrMore: 0 },
    AperiodicOrder: { theorems: 1, zeroSites: 0, oneSite: 1, twoOrMore: 0 },
    Real: { theorems: 1, zeroSites: 0, oneSite: 0, twoOrMore: 1 },
  });
});

test("summarizeSites: mostInherited caps at 30 entries, most-inherited first", () => {
  const sites = Array.from({ length: 40 }, (_, index) => `Obsmetrologia.Real.site${index}`);
  const rows = sites.map((site, index) => ({
    theorem: `Obsmetrologia.Real.theorem${index}`,
    siteCount: 1,
    sites: sites.slice(0, index + 1),
  }));
  const summary = summarizeSites({ sites, rows });
  strictEqual(summary.mostInherited.length, 30);
  strictEqual(summary.mostInherited[0][0], "Obsmetrologia.Real.site0");
  strictEqual(summary.mostInherited[0][1], 40);
});

test("assembleSiteRecord: shape, type, and reading field", () => {
  const parsed = parseSiteRows(FIXTURE_TEXT);
  const record = assembleSiteRecord({
    checkedAt: "2026-09-03T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-identification-sites.lean",
    parsed,
  });
  strictEqual(record.type, "ObsmetrologiaIdentificationSiteCensus");
  strictEqual(record.checkedAt, "2026-09-03T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-identification-sites.lean");
  ok(typeof record.reading === "string" && record.reading.length > 0);
  ok(record.reading.includes("Quot.sound"));
  deepStrictEqual(record.summary, summarizeSites(parsed));
});

test("parseArgv: --out-dir and --date", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-03"]), {
    outDir: "/tmp/x",
    date: "2026-09-03",
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("runSiteCensus: injected runner drives control flow and returns raw stdout plus parsed rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { stdout, parsed } = await runSiteCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-identification-sites.lean",
    runCommand: fakeRunCommand,
  });
  strictEqual(stdout, FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 3);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, [
    "env",
    "lean",
    "/pkg/scripts/census-set-of-identification-sites.lean",
  ]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runSiteCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runSiteCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-identification-sites.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-identification-sites-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runSiteCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "#sites\t0\n", stderr: "" });
  let threw = null;
  try {
    await runSiteCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-identification-sites.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-identification-sites-failed"));
});

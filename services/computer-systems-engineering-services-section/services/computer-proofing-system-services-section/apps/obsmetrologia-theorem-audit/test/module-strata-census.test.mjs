import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleRecord,
  bestSingleMove,
  buildGraph,
  condensationRanks,
  ownerModuleOf,
  parseImports,
  strataOf,
  topLevelOf,
  upwardImports,
} from "../src/module-strata-census.mjs";
import { parseArgv, readLeanFiles, renderSummary, todayStamp } from "../scripts/census-set-of-module-strata.mjs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- parseImports -----------------------------------------------------

test("parseImports: leading-import lines only, doc-block and prose mentions of the word skipped", () => {
  const text = [
    "/--",
    "Some doc block mentioning import  Obsmetrologia.Foo casually, not a real import.",
    "-/",
    "-- import Obsmetrologia.Bar (commented out)",
    "import Obsmetrologia.Baz",
    "   import Obsmetrologia.Qux",
    "This line just talks about importing things.",
  ].join("\n");
  deepStrictEqual(parseImports(text), [
    { module: "Obsmetrologia.Baz", line: 5 },
    { module: "Obsmetrologia.Qux", line: 6 },
  ]);
});

test("parseImports: empty text yields no rows", () => {
  deepStrictEqual(parseImports(""), []);
});

// --- topLevelOf / ownerModuleOf ----------------------------------------

test("topLevelOf: second segment under Obsmetrologia, first segment otherwise", () => {
  strictEqual(topLevelOf("Obsmetrologia.Primitive.Mark"), "Primitive");
  strictEqual(topLevelOf("Lean.Elab.Tactic"), "Lean");
  strictEqual(topLevelOf("Obsmetrologia"), "Obsmetrologia");
});

test("ownerModuleOf: first path component under Obsmetrologia/, null for the root manifest", () => {
  strictEqual(ownerModuleOf("Obsmetrologia/Primitive/Mark.lean"), "Primitive");
  strictEqual(ownerModuleOf("Obsmetrologia/Site.lean"), "Site");
  strictEqual(ownerModuleOf("Obsmetrologia.lean"), null);
});

// --- buildGraph ---------------------------------------------------------

const BUILD_GRAPH_FILES = [
  {
    path: "Obsmetrologia/P/One.lean",
    text: "import Obsmetrologia.P.Two\nimport Obsmetrologia.Q.Foo\nimport Obsmetrologia.Q.Bar\n",
  },
  { path: "Obsmetrologia/P/Two.lean", text: "" },
  { path: "Obsmetrologia/Q/Foo.lean", text: "import Obsmetrologia.P.Two\n" },
];

test("buildGraph: self-imports excluded from edges, same-target imports deduplicated into one counted edge", () => {
  const graph = buildGraph(BUILD_GRAPH_FILES);
  strictEqual(graph.totalFiles, 3);
  strictEqual(graph.totalImportLines, 4);
  deepStrictEqual(graph.moduleFileCounts, { P: 2, Q: 1 });
  deepStrictEqual(graph.nodes, ["P", "Q"]);
  deepStrictEqual(graph.importsOf, { P: ["Q"], Q: ["P"] });
  deepStrictEqual(graph.importedByOf, { P: ["Q"], Q: ["P"] });
  strictEqual(graph.edges.length, 2);
  const pq = graph.edges.find((edge) => edge.from === "P" && edge.to === "Q");
  strictEqual(pq.count, 2);
  deepStrictEqual(pq.examples, [
    { path: "Obsmetrologia/P/One.lean", line: 2 },
    { path: "Obsmetrologia/P/One.lean", line: 3 },
  ]);
  const qp = graph.edges.find((edge) => edge.from === "Q" && edge.to === "P");
  strictEqual(qp.count, 1);
});

// --- strataOf -------------------------------------------------------------

const SMALL_CONFIG = {
  algebra: ["A"],
  language: ["B"],
  geometry: ["C"],
  dynamics: ["D"],
  assignedBy: "test fixture",
};

test("strataOf: module -> stratum lookup, order lowest to highest", () => {
  const { moduleStratum, order } = strataOf(SMALL_CONFIG);
  deepStrictEqual(moduleStratum, { A: "algebra", B: "language", C: "geometry", D: "dynamics" });
  deepStrictEqual(order, ["algebra", "language", "geometry", "dynamics"]);
});

// --- upwardImports / condensationRanks / bestSingleMove (shared acyclic fixture) --

// A(algebra) --upward--> C(geometry); A --> Foreign (unstratified, no files)
// B(language) --downward--> A(algebra)
// D(dynamics) --downward--> B(language)
// C(geometry) has no imports.
const ACYCLIC_FILES = [
  { path: "Obsmetrologia/A/Base.lean", text: "" },
  { path: "Obsmetrologia/A/Reaches.lean", text: "import Obsmetrologia.C.Thing\nimport Foreign.Thing\n" },
  { path: "Obsmetrologia/B/Mid.lean", text: "import Obsmetrologia.A.Base\n" },
  { path: "Obsmetrologia/C/Thing.lean", text: "" },
  { path: "Obsmetrologia/D/Something.lean", text: "import Obsmetrologia.B.Mid\n" },
];

test("upwardImports: one upward import (A->C), one into-unstratified (A->Foreign), downward imports excluded", () => {
  const graph = buildGraph(ACYCLIC_FILES);
  const upward = upwardImports(graph, SMALL_CONFIG);
  strictEqual(upward.total, 1);
  deepStrictEqual(upward.byModule, {
    A: [{ file: "Obsmetrologia/A/Reaches.lean", line: 1, target: "C" }],
  });
  deepStrictEqual(upward.perStratumPair, { "algebra->geometry": 1 });
  strictEqual(upward.totalIntoUnstratified, 1);
  deepStrictEqual(upward.intoUnstratified, [
    { file: "Obsmetrologia/A/Reaches.lean", line: 2, source: "A", target: "Foreign" },
  ]);
});

test("condensationRanks: acyclic staircase C=Foreign=0, A=1, B=2, D=3", () => {
  const graph = buildGraph(ACYCLIC_FILES);
  const { ranks, acyclic, cycles } = condensationRanks(graph);
  strictEqual(acyclic, true);
  deepStrictEqual(cycles, []);
  strictEqual(ranks.C, 0);
  strictEqual(ranks.Foreign, 0);
  strictEqual(ranks.A, 1);
  strictEqual(ranks.B, 2);
  strictEqual(ranks.D, 3);
});

test("bestSingleMove: moving C from geometry to algebra removes the one upward import (A->C stops being upward; moving A instead only relocates the violation onto B->A)", () => {
  const graph = buildGraph(ACYCLIC_FILES);
  const { baselineUpward, bestMove } = bestSingleMove(graph, SMALL_CONFIG);
  strictEqual(baselineUpward, 1);
  deepStrictEqual(bestMove, { module: "C", fromStratum: "geometry", toStratum: "algebra", upwardImportsRemoved: 1 });
});

test("assembleRecord: unstratified module reported, consistent is false, shape carries strata config with assignedBy", () => {
  const graph = buildGraph(ACYCLIC_FILES);
  const record = assembleRecord({ checkedAt: "2026-09-04T00:00:00.000Z", packageRoot: "/pkg", graph, config: SMALL_CONFIG });
  strictEqual(record.type, "ObsmetrologiaModuleStrataCensus");
  deepStrictEqual(record.reading.unstratifiedModules, ["Foreign"]);
  strictEqual(record.reading.consistent, false);
  strictEqual(record.strata.assignedBy, "test fixture");
  strictEqual(record.modules.Foreign.stratum, "unstratified");
  strictEqual(record.modules.Foreign.fileCount, 0);
});

// --- cycle fixture --------------------------------------------------------

const CYCLE_FILES = [
  { path: "Obsmetrologia/X/One.lean", text: "import Obsmetrologia.Y.Two\n" },
  { path: "Obsmetrologia/Y/Two.lean", text: "import Obsmetrologia.X.One\n" },
];

test("condensationRanks: a real two-module cycle is reported explicitly with its files, both members rank 0", () => {
  const graph = buildGraph(CYCLE_FILES);
  const { ranks, acyclic, cycles } = condensationRanks(graph);
  strictEqual(acyclic, false);
  strictEqual(ranks.X, 0);
  strictEqual(ranks.Y, 0);
  strictEqual(cycles.length, 1);
  deepStrictEqual(cycles[0].modules, ["X", "Y"]);
  deepStrictEqual(cycles[0].edges, [
    { from: "X", to: "Y", files: ["Obsmetrologia/X/One.lean:1"] },
    { from: "Y", to: "X", files: ["Obsmetrologia/Y/Two.lean:1"] },
  ]);
});

// --- script-level helpers ---------------------------------------------

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

test("readLeanFiles: recursive walk, forward-slash relative paths, sorted", async () => {
  const root = await mkdtemp(join(tmpdir(), "module-strata-census-"));
  try {
    await mkdir(join(root, "Obsmetrologia", "Z"), { recursive: true });
    await writeFile(join(root, "Obsmetrologia.lean"), "import Obsmetrologia.Z\n", "utf8");
    await writeFile(join(root, "Obsmetrologia", "Z", "Inner.lean"), "", "utf8");
    await writeFile(join(root, "Obsmetrologia", "Z.lean"), "", "utf8");
    const files = await readLeanFiles(root);
    deepStrictEqual(
      files.map((file) => file.path),
      ["Obsmetrologia.lean", "Obsmetrologia/Z.lean", "Obsmetrologia/Z/Inner.lean"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("renderSummary: includes file/edge totals, per-module table, upward totals, and best-move line", () => {
  const graph = buildGraph(ACYCLIC_FILES);
  const record = assembleRecord({ checkedAt: "2026-09-04T00:00:00.000Z", packageRoot: "/pkg", graph, config: SMALL_CONFIG });
  const summary = renderSummary(record);
  ok(summary.includes(`files=${record.reading.totalFiles}`));
  ok(summary.includes("module\tstratum\tfileCount\trank\timports\timportedBy"));
  ok(summary.includes("upward total=1"));
  ok(summary.includes("best single move: C geometry -> algebra removes 1 upward imports"));
});

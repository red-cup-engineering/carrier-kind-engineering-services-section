import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  assemblePointerCensusRecord,
  buildBlueprintScratchLeanSource,
  classifyRow,
  classifyRows,
  extractAllPointers,
  extractBlueprintPointers,
  flattenPointerRows,
  OWNER_LAW_AXIOM,
  parseBlueprintLeanOutput,
  renderPointerRowsTsv,
  stripLatexComments,
  summarizePointerCensus,
  THEOREM_LIKE_ENVIRONMENTS,
  uniquePointerNames,
} from "../src/blueprint-pointer-census.mjs";
import {
  parseArgv,
  readBlueprintTexFiles,
  runBlueprintPointerQuery,
  todayStamp,
} from "../scripts/census-set-of-blueprint-pointers.mjs";

// --- stripLatexComments -------------------------------------------------

test("stripLatexComments: drops from an unescaped % to end of line, keeps line count", () => {
  const text = "a\n% a whole comment line\nb % trailing comment\nc \\% literal percent stays";
  strictEqual(stripLatexComments(text), "a\n\nb \nc \\% literal percent stays");
});

test("stripLatexComments: escaped percent is not a comment start", () => {
  strictEqual(stripLatexComments("100\\% done"), "100\\% done");
});

// --- extractBlueprintPointers --------------------------------------------

test("extractBlueprintPointers: single-name pointer, leanok, label from the environment", () => {
  const text = [
    "\\begin{definition}[Utterance]",
    "  \\label{def:utterance}",
    "  \\lean{Obsmetrologia.Utterance}",
    "  \\leanok",
    "  \\uses{def:mark}",
    "  Prose.",
    "\\end{definition}",
  ].join("\n");
  const pointers = extractBlueprintPointers({ path: "chapters/foo.tex", text });
  deepStrictEqual(pointers, [
    {
      chapterFile: "chapters/foo.tex",
      label: "def:utterance",
      envType: "definition",
      status: "leanok",
      names: ["Obsmetrologia.Utterance"],
    },
  ]);
});

test("extractBlueprintPointers: crammed single-line environment, comma-separated multi-name pointer", () => {
  const text =
    "\\begin{proposition}[Four speech-acts]\\label{thm:phase}\\lean{Obsmetrologia.A, Obsmetrologia.B, Obsmetrologia.C}\\leanok\\uses{thm:x}\\end{proposition}";
  const pointers = extractBlueprintPointers({ path: "chapters/bar.tex", text });
  strictEqual(pointers.length, 1);
  deepStrictEqual(pointers[0].names, ["Obsmetrologia.A", "Obsmetrologia.B", "Obsmetrologia.C"]);
  strictEqual(pointers[0].label, "thm:phase");
  strictEqual(pointers[0].envType, "proposition");
  strictEqual(pointers[0].status, "leanok");
});

test("extractBlueprintPointers: \\notready environment with no \\lean pointer contributes no rows", () => {
  const text = "\\begin{theorem}[Frontier]\\label{thm:frontier}\\notready\\uses{thm:x}";
  deepStrictEqual(extractBlueprintPointers({ path: "chapters/baz.tex", text }), []);
});

test("extractBlueprintPointers: no status tag classifies as none", () => {
  const text = [
    "\\begin{lemma}",
    "  \\label{lem:untagged}",
    "  \\lean{Obsmetrologia.Untagged}",
    "\\end{lemma}",
  ].join("\n");
  const [pointer] = extractBlueprintPointers({ path: "chapters/qux.tex", text });
  strictEqual(pointer.status, "none");
});

test("extractBlueprintPointers: status is scoped to the enclosing environment, not the whole file", () => {
  const text = [
    "\\begin{theorem}\\label{thm:one}\\lean{Obsmetrologia.One}\\leanok\\end{theorem}",
    "\\begin{theorem}\\label{thm:two}\\lean{Obsmetrologia.Two}\\notready\\end{theorem}",
  ].join("\n");
  const pointers = extractBlueprintPointers({ path: "chapters/two.tex", text });
  strictEqual(pointers.length, 2);
  strictEqual(pointers[0].status, "leanok");
  strictEqual(pointers[1].status, "notready");
});

test("extractBlueprintPointers: a commented-out \\lean{...} is not a pointer", () => {
  const text = "% \\lean{Obsmetrologia.Foo}   names the intended formal declaration\n\\begin{remark}\\label{rem:x}\\end{remark}";
  deepStrictEqual(extractBlueprintPointers({ path: "content.tex", text }), []);
});

test("extractBlueprintPointers: every environment in THEOREM_LIKE_ENVIRONMENTS is recognized", () => {
  for (const env of THEOREM_LIKE_ENVIRONMENTS) {
    const text = `\\begin{${env}}\\label{l:${env}}\\lean{Obsmetrologia.${env}Decl}\\leanok\\end{${env}}`;
    const [pointer] = extractBlueprintPointers({ path: "chapters/all-envs.tex", text });
    strictEqual(pointer.envType, env, `expected envType ${env}`);
    strictEqual(pointer.status, "leanok");
  }
});

test("extractBlueprintPointers: nearest preceding label, not necessarily the environment's own first label", () => {
  const text = [
    "\\label{sec:intro}",
    "\\begin{theorem}",
    "  \\label{thm:real}",
    "  \\lean{Obsmetrologia.Real}",
    "  \\leanok",
    "\\end{theorem}",
  ].join("\n");
  const [pointer] = extractBlueprintPointers({ path: "chapters/label.tex", text });
  strictEqual(pointer.label, "thm:real");
});

test("extractBlueprintPointers: a pointer outside any theorem-like environment still gets a row, envType null, status none", () => {
  const text = "\\label{sec:loose}\\lean{Obsmetrologia.Loose}";
  const [pointer] = extractBlueprintPointers({ path: "chapters/loose.tex", text });
  strictEqual(pointer.envType, null);
  strictEqual(pointer.status, "none");
  strictEqual(pointer.label, "sec:loose");
});

test("extractAllPointers: flat-maps across files in order", () => {
  const files = [
    { path: "a.tex", text: "\\begin{theorem}\\label{a}\\lean{Obsmetrologia.A}\\leanok\\end{theorem}" },
    { path: "b.tex", text: "\\begin{theorem}\\label{b}\\lean{Obsmetrologia.B}\\notready\\end{theorem}" },
  ];
  const pointers = extractAllPointers(files);
  deepStrictEqual(pointers.map((p) => p.chapterFile), ["a.tex", "b.tex"]);
});

// --- flattenPointerRows / uniquePointerNames -----------------------------

test("flattenPointerRows: one row per name, sharing the pointer's other fields", () => {
  const pointers = [
    { chapterFile: "a.tex", label: "l", envType: "theorem", status: "leanok", names: ["Obsmetrologia.A", "Obsmetrologia.B"] },
  ];
  deepStrictEqual(flattenPointerRows(pointers), [
    { chapterFile: "a.tex", label: "l", envType: "theorem", status: "leanok", name: "Obsmetrologia.A" },
    { chapterFile: "a.tex", label: "l", envType: "theorem", status: "leanok", name: "Obsmetrologia.B" },
  ]);
});

test("flattenPointerRows: a pointer with no names contributes no rows", () => {
  deepStrictEqual(flattenPointerRows([{ chapterFile: "a.tex", label: "l", envType: "theorem", status: "none", names: [] }]), []);
});

test("uniquePointerNames: deduplicated and sorted", () => {
  const rows = [{ name: "Obsmetrologia.C" }, { name: "Obsmetrologia.A" }, { name: "Obsmetrologia.C" }];
  deepStrictEqual(uniquePointerNames(rows), ["Obsmetrologia.A", "Obsmetrologia.C"]);
});

// --- buildBlueprintScratchLeanSource / parseBlueprintLeanOutput ---------

test("buildBlueprintScratchLeanSource: imports the module, lists every name as a backtick literal", () => {
  const source = buildBlueprintScratchLeanSource({ names: ["Obsmetrologia.A", "Obsmetrologia.B.c"] });
  ok(source.includes("import Obsmetrologia"));
  ok(source.includes("`Obsmetrologia.A"));
  ok(source.includes("`Obsmetrologia.B.c"));
  ok(source.includes("collectAxioms"));
  ok(source.includes("sorryAx"));
});

test("buildBlueprintScratchLeanSource: throws on an empty name list", () => {
  let threw = null;
  try {
    buildBlueprintScratchLeanSource({ names: [] });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof TypeError);
});

test("parseBlueprintLeanOutput: existing theorem, missing name, def-kind with axioms", () => {
  const stdout = [
    "Obsmetrologia.Foo\tyes\ttheorem\tpropext,Quot.sound\tfalse",
    "Obsmetrologia.Missing\tno\t\t\t",
    "Obsmetrologia.Bar\tyes\tdef\t\tfalse",
    "Obsmetrologia.Sorry\tyes\ttheorem\tsorryAx\ttrue",
    "",
  ].join("\n");
  const byName = parseBlueprintLeanOutput(stdout);
  deepStrictEqual(byName.get("Obsmetrologia.Foo"), {
    name: "Obsmetrologia.Foo",
    exists: true,
    kind: "theorem",
    axioms: ["propext", "Quot.sound"],
    sorry: false,
  });
  deepStrictEqual(byName.get("Obsmetrologia.Missing"), {
    name: "Obsmetrologia.Missing",
    exists: false,
    kind: null,
    axioms: [],
    sorry: false,
  });
  deepStrictEqual(byName.get("Obsmetrologia.Bar"), {
    name: "Obsmetrologia.Bar",
    exists: true,
    kind: "def",
    axioms: [],
    sorry: false,
  });
  strictEqual(byName.get("Obsmetrologia.Sorry").sorry, true);
});

test("parseBlueprintLeanOutput: blank text parses to an empty map", () => {
  strictEqual(parseBlueprintLeanOutput("").size, 0);
});

// --- classifyRow ----------------------------------------------------------

test("classifyRow: leanok-missing when leanok names a nonexistent declaration", () => {
  deepStrictEqual(classifyRow({ status: "leanok" }, undefined), ["leanok-missing"]);
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: false, kind: null, axioms: [], sorry: false }), ["leanok-missing"]);
});

test("classifyRow: leanok theorem, sorry-free, only Quot.sound -- the settled state, no finding", () => {
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: [OWNER_LAW_AXIOM], sorry: false }), []);
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: [], sorry: false }), []);
});

test("classifyRow: leanok-def when the resolved kind is not theorem", () => {
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "def", axioms: [], sorry: false }), ["leanok-def"]);
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "structure", axioms: [], sorry: false }), ["leanok-def"]);
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "instance", axioms: [], sorry: false }), ["leanok-def"]);
});

test("classifyRow: leanok-sorry when sorryAx is in the axiom list", () => {
  deepStrictEqual(classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: ["sorryAx"], sorry: true }), ["leanok-sorry"]);
});

test("classifyRow: leanok-outside-law when an axiom other than Quot.sound/sorryAx is present", () => {
  deepStrictEqual(
    classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: ["propext", "Quot.sound"], sorry: false }),
    ["leanok-outside-law"],
  );
  deepStrictEqual(
    classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: ["Classical.choice"], sorry: false }),
    ["leanok-outside-law"],
  );
});

test("classifyRow: sorry takes precedence over leanok-outside-law -- a row never carries both", () => {
  deepStrictEqual(
    classifyRow({ status: "leanok" }, { exists: true, kind: "theorem", axioms: ["propext", "sorryAx"], sorry: true }),
    ["leanok-sorry"],
  );
});

test("classifyRow: leanok-def and an axiom finding can both apply to one row", () => {
  deepStrictEqual(
    classifyRow({ status: "leanok" }, { exists: true, kind: "def", axioms: ["propext"], sorry: false }),
    ["leanok-def", "leanok-outside-law"],
  );
});

test("classifyRow: notready-proved when a notready pointer already resolves to a sorry-free theorem", () => {
  deepStrictEqual(
    classifyRow({ status: "notready" }, { exists: true, kind: "theorem", axioms: [OWNER_LAW_AXIOM], sorry: false }),
    ["notready-proved"],
  );
});

test("classifyRow: notready with sorry, missing, or non-theorem kind is not a finding", () => {
  deepStrictEqual(classifyRow({ status: "notready" }, { exists: true, kind: "theorem", axioms: ["sorryAx"], sorry: true }), []);
  deepStrictEqual(classifyRow({ status: "notready" }, undefined), []);
  deepStrictEqual(classifyRow({ status: "notready" }, { exists: true, kind: "def", axioms: [], sorry: false }), []);
});

test("classifyRow: untagged when the pointer carries neither status tag", () => {
  deepStrictEqual(classifyRow({ status: "none" }, { exists: true, kind: "theorem", axioms: [], sorry: false }), ["untagged"]);
  deepStrictEqual(classifyRow({ status: "none" }, undefined), ["untagged"]);
});

// --- classifyRows / summarizePointerCensus / renderPointerRowsTsv --------

const SAMPLE_POINTERS = [
  { chapterFile: "a.tex", label: "thm:a", envType: "theorem", status: "leanok", names: ["Obsmetrologia.A"] },
  { chapterFile: "a.tex", label: "thm:b", envType: "theorem", status: "leanok", names: ["Obsmetrologia.Missing"] },
  { chapterFile: "b.tex", label: "thm:c", envType: "theorem", status: "notready", names: ["Obsmetrologia.C"] },
  { chapterFile: "b.tex", label: "def:d", envType: "definition", status: "none", names: ["Obsmetrologia.D"] },
];
const SAMPLE_ROWS = flattenPointerRows(SAMPLE_POINTERS);
const SAMPLE_LEAN_BY_NAME = parseBlueprintLeanOutput(
  [
    "Obsmetrologia.A\tyes\ttheorem\tQuot.sound\tfalse",
    "Obsmetrologia.Missing\tno\t\t\t",
    "Obsmetrologia.C\tyes\ttheorem\t\tfalse",
    "Obsmetrologia.D\tyes\tdef\t\tfalse",
  ].join("\n"),
);

test("classifyRows: attaches lean lookup fields and findings per row", () => {
  const rows = classifyRows(SAMPLE_ROWS, SAMPLE_LEAN_BY_NAME);
  deepStrictEqual(
    rows.map((row) => [row.name, row.findings]),
    [
      ["Obsmetrologia.A", []],
      ["Obsmetrologia.Missing", ["leanok-missing"]],
      ["Obsmetrologia.C", ["notready-proved"]],
      ["Obsmetrologia.D", ["untagged"]],
    ],
  );
});

test("summarizePointerCensus: totals, status counts, finding counts, per-chapter breakdown", () => {
  const rows = classifyRows(SAMPLE_ROWS, SAMPLE_LEAN_BY_NAME);
  const summary = summarizePointerCensus({ pointers: SAMPLE_POINTERS, rows });
  strictEqual(summary.totalPointers, 4);
  strictEqual(summary.totalNames, 4);
  deepStrictEqual(summary.statusCounts, { leanok: 2, notready: 1, none: 1 });
  deepStrictEqual(summary.findingCounts, { "leanok-missing": 1, "notready-proved": 1, untagged: 1 });
  deepStrictEqual(summary.byChapter["a.tex"], {
    rows: 2,
    leanok: 2,
    notready: 0,
    none: 0,
    findingCounts: { "leanok-missing": 1 },
  });
  deepStrictEqual(summary.byChapter["b.tex"], {
    rows: 2,
    leanok: 0,
    notready: 1,
    none: 1,
    findingCounts: { "notready-proved": 1, untagged: 1 },
  });
});

test("renderPointerRowsTsv: header row plus one row per name, tab-separated", () => {
  const rows = classifyRows(SAMPLE_ROWS, SAMPLE_LEAN_BY_NAME);
  const tsv = renderPointerRowsTsv(rows);
  const lines = tsv.trimEnd().split("\n");
  strictEqual(lines[0], "chapterFile\tlabel\tenvType\tstatus\tname\texists\tkind\taxioms\tsorry\tfindings");
  strictEqual(lines.length, 5);
  ok(lines[2].includes("Obsmetrologia.Missing\tno\t\t\tfalse\tleanok-missing"));
});

test("assemblePointerCensusRecord: shape, type, reading, embedded summary", () => {
  const rows = classifyRows(SAMPLE_ROWS, SAMPLE_LEAN_BY_NAME);
  const record = assemblePointerCensusRecord({
    checkedAt: "2026-09-21T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    blueprintSourceRoot: "/pkg/lib/obsmetrologia/docs/blueprint/src",
    leanSourcePath: "scratch",
    pointers: SAMPLE_POINTERS,
    rows,
  });
  strictEqual(record.type, "ObsmetrologiaBlueprintPointerCensus");
  strictEqual(record.checkedAt, "2026-09-21T00:00:00.000Z");
  ok(typeof record.reading === "string" && record.reading.length > 0);
  ok(record.reading.includes("leanok-missing"));
  ok(record.reading.includes("leanok-def"));
  ok(record.reading.includes("leanok-sorry"));
  ok(record.reading.includes("leanok-outside-law"));
  ok(record.reading.includes("notready-proved"));
  ok(record.reading.includes("untagged"));
  deepStrictEqual(record.summary, summarizePointerCensus({ pointers: SAMPLE_POINTERS, rows }));
});

// --- scripts/census-set-of-blueprint-pointers.mjs -------------------------

test("parseArgv: --out-dir and --date", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-21"]), { outDir: "/tmp/x", date: "2026-09-21" });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("readBlueprintTexFiles: recursive walk under the blueprint source root, forward-slash relative paths, sorted", async () => {
  const root = await mkdtemp(join(tmpdir(), "blueprint-pointer-census-"));
  try {
    await mkdir(join(root, "chapters", "primitives"), { recursive: true });
    await writeFile(join(root, "content.tex"), "\\input{chapters/x}\n", "utf8");
    await writeFile(join(root, "chapters", "primitives", "01-marks.tex"), "\\lean{Obsmetrologia.Mark}\n", "utf8");
    await writeFile(join(root, "notes.txt"), "not a tex file", "utf8");
    const files = await readBlueprintTexFiles(root);
    deepStrictEqual(
      files.map((file) => file.path),
      ["chapters/primitives/01-marks.tex", "content.tex"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runBlueprintPointerQuery: injected runner drives control flow, writes a scratch file outside packageRoot, parses the result", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: "Obsmetrologia.A\tyes\ttheorem\tQuot.sound\tfalse\n", stderr: "" };
  };
  const { leanByName } = await runBlueprintPointerQuery({
    names: ["Obsmetrologia.A"],
    packageRoot: "/pkg/lib/obsmetrologia",
    runCommand: fakeRunCommand,
  });
  strictEqual(leanByName.get("Obsmetrologia.A").exists, true);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  strictEqual(calls[0].args[0], "env");
  strictEqual(calls[0].args[1], "lean");
  ok(calls[0].args[2].startsWith(tmpdir()));
  ok(!calls[0].args[2].includes("/pkg/lib/obsmetrologia"));
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runBlueprintPointerQuery: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runBlueprintPointerQuery({ names: ["Obsmetrologia.A"], packageRoot: "/pkg/lib/obsmetrologia", runCommand: fakeRunCommand });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-blueprint-pointers-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runBlueprintPointerQuery: throws when nothing parses back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "\n", stderr: "" });
  let threw = null;
  try {
    await runBlueprintPointerQuery({ names: ["Obsmetrologia.A"], packageRoot: "/pkg/lib/obsmetrologia", runCommand: fakeRunCommand });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-blueprint-pointers-failed"));
});

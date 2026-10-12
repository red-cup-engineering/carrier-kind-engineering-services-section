import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleCertificateShapeRecord,
  CERTIFICATE_SHAPE_READING,
  formatStaticRows,
  isSelfCertifying,
  parseShapeRows,
  parseStaticRows,
  scanBoolTables,
  scanPropStructures,
  scanRflTheorems,
  scanStaticFindings,
  scanUnitTypeDefs,
  stripLeanComments,
  structureHeaderIsProp,
  summarizeShapes,
} from "../src/certificate-shape-census.mjs";
import { parseArgv, runShapeCensus, todayStamp } from "../scripts/census-set-of-certificate-shapes.mjs";

const FIXTURE_TEXT = [
  "#theorems\t4",
  "#kinds\trfl\t2",
  "#kinds\tother\t2",
  "Obsmetrologia.Cohomology.hn_vanishes_above_one\tCohomology\trfl\tsame-module\t4\t2\tfalse",
  "Obsmetrologia.Format.card_eight\tFormat\trfl\tsame-module\t0\t0\tfalse",
  "Obsmetrologia.Alexandrov.isOpen_empty\tAlexandrov\tother\tcrosses-module\t1\t0\tfalse",
  "Obsmetrologia.Closure.frontierInputs\tClosure\tother\tcrosses-module\t7\t0\ttrue",
  "",
].join("\n");

// --- parseShapeRows -------------------------------------------------------

test("parseShapeRows: header lines skipped, 7-field rows parsed with correct types", () => {
  const { rows } = parseShapeRows(FIXTURE_TEXT);
  strictEqual(rows.length, 4);
  deepStrictEqual(rows[0], {
    name: "Obsmetrologia.Cohomology.hn_vanishes_above_one",
    module: "Cohomology",
    proofHead: "rfl",
    locality: "same-module",
    hypothesisCount: 4,
    unusedHypotheses: 2,
    propBundle: false,
  });
  strictEqual(rows[3].propBundle, true);
});

test("parseShapeRows: blank text parses to no rows", () => {
  deepStrictEqual(parseShapeRows(""), { rows: [] });
});

test("parseShapeRows: a short line (fewer than 7 fields) is skipped, not crashed on", () => {
  deepStrictEqual(parseShapeRows("garbage\tline\n").rows, []);
});

test("parseShapeRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "#theorems\t1",
    "Obsmetrologia.Format.card_eight\tFormat\trfl\tsame-module\t0\t0\tfalse",
    "",
  ].join("\n");
  const { rows } = parseShapeRows(text);
  strictEqual(rows.length, 1);
  strictEqual(rows[0].name, "Obsmetrologia.Format.card_eight");
});

// --- isSelfCertifying ------------------------------------------------------

test("isSelfCertifying: same-module + trivial head is self-certifying, otherwise not", () => {
  strictEqual(isSelfCertifying({ locality: "same-module", proofHead: "rfl" }), true);
  strictEqual(isSelfCertifying({ locality: "same-module", proofHead: "decide" }), true);
  strictEqual(isSelfCertifying({ locality: "same-module", proofHead: "rfl-bundle" }), true);
  strictEqual(isSelfCertifying({ locality: "same-module", proofHead: "decide-bundle" }), true);
  strictEqual(isSelfCertifying({ locality: "same-module", proofHead: "other" }), false);
  strictEqual(isSelfCertifying({ locality: "crosses-module", proofHead: "rfl" }), false);
  strictEqual(isSelfCertifying({ locality: "no-house-constants", proofHead: "rfl" }), false);
});

// --- stripLeanComments -----------------------------------------------------

test("stripLeanComments: block and line comments removed, newlines preserved for line numbers", () => {
  const text = ["/-- doc about structure Foo -/", "def bar : Nat := 1 -- trailing note", "def baz := 2"].join("\n");
  const stripped = stripLeanComments(text);
  ok(!stripped.includes("structure Foo"));
  ok(!stripped.includes("trailing note"));
  ok(stripped.includes("def bar : Nat := 1"));
  ok(stripped.includes("def baz := 2"));
  strictEqual(stripped.split("\n").length, text.split("\n").length);
});

test("stripLeanComments: nested block comments handled", () => {
  const text = "/- outer /- inner -/ still-comment -/\ndef kept := 1";
  const stripped = stripLeanComments(text);
  ok(!stripped.includes("still-comment"));
  ok(stripped.includes("def kept := 1"));
});

// --- scanUnitTypeDefs -------------------------------------------------------

test("scanUnitTypeDefs: does not span past an unrelated def's own declaration to find a later `: Type := Unit`", () => {
  const files = [
    {
      path: "Obsmetrologia/Cohomology/H.lean",
      text: [
        "def H1Vanishes (D : Cech1) : Prop :=",
        "  Cocycle D →",
        "    (∃ g : Cochain, Coboundary D g) ∧ (∀ g g' : Cochain, Coboundary D g → Coboundary D g' → g = g')",
        "",
        "theorem h1_vanishes (D : Cech1) : H1Vanishes D :=",
        "  fun hcoc => ⟨⟨glue D, glue_coboundary D hcoc⟩, glue_unique D⟩",
        "",
        "def Hn (_n : Nat) : Type := Unit",
      ].join("\n"),
    },
  ];
  const findings = scanUnitTypeDefs(files);
  deepStrictEqual(
    findings.map((f) => f.name),
    ["Hn"],
  );
  strictEqual(findings[0].line, 8);
});

test("scanUnitTypeDefs: matches `def X ... : Type := Unit`/`PUnit`, not doc-comment prose", () => {
  const files = [
    {
      path: "Obsmetrologia/Cohomology/H.lean",
      text: [
        "/-- placeholder `Hn := Unit`. -/",
        "def Hn (_n : Nat) : Type := Unit",
        "def Pu : Type := PUnit",
        "def notThis (n : Nat) : Nat := n",
      ].join("\n"),
    },
  ];
  const findings = scanUnitTypeDefs(files);
  deepStrictEqual(
    findings.map((f) => f.name),
    ["Hn", "Pu"],
  );
  strictEqual(findings[0].line, 2);
  strictEqual(findings[0].kind, "unit-type");
  strictEqual(findings[1].line, 3);
});

// --- structureHeaderIsProp / scanPropStructures -----------------------------

test("structureHeaderIsProp: explicit `: Prop` at depth zero is true", () => {
  strictEqual(structureHeaderIsProp(" (cl : Valuation → Valuation) : Prop where"), true);
  strictEqual(structureHeaderIsProp(" : Prop where"), true);
});

test("structureHeaderIsProp: a Prop-typed parameter does not count as the structure's own sort", () => {
  strictEqual(structureHeaderIsProp(" (approaches : CLehmerSide → Prop) where"), false);
});

test("structureHeaderIsProp: no explicit sort (plain `where`/`extends`) is false", () => {
  strictEqual(structureHeaderIsProp(" {E Q Boundary : Type} where"), false);
  strictEqual(structureHeaderIsProp(" extends FrobeniusAlgebra where"), false);
});

test("scanPropStructures: single-line and multi-line headers both detected, plain structures excluded", () => {
  const files = [
    {
      path: "Obsmetrologia/Language/K.lean",
      text: [
        "structure IsClosureOp (cl : Valuation → Valuation) : Prop where",
        "  mono : True",
        "",
        "structure Settlement.{u, v} {Base : Type u} (Content : Base → Type v)",
        "    (approaches : Base → Prop) :",
        "    Prop where",
        "  point : Base",
        "",
        "structure CausalCarrierReadout (E Q Boundary : Type) where",
        "  event : E",
      ].join("\n"),
    },
  ];
  const findings = scanPropStructures(files);
  deepStrictEqual(
    findings.map((f) => ({ name: f.name, line: f.line })),
    [
      { name: "IsClosureOp", line: 1 },
      { name: "Settlement", line: 4 },
    ],
  );
});

// --- scanBoolTables ----------------------------------------------------------

test("scanBoolTables: `<Enum> → Bool` with `|` case body matches", () => {
  const files = [
    {
      path: "Obsmetrologia/Computing/F.lean",
      text: [
        "def regimeDecidable : ClosureRegime → Bool",
        "  | ClosureRegime.strict => true",
        "  | ClosureRegime.scott  => true",
        "  | _                    => false",
        "",
        "def ofStatus : Bool → Bool → Articulating.Corner",
        "  | true, true => Articulating.Corner.a",
        "",
        "def toStatus : Articulating.Corner → Bool × Bool",
        "  | _ => (true, false)",
      ].join("\n"),
    },
  ];
  const findings = scanBoolTables(files);
  deepStrictEqual(
    findings.map((f) => f.name),
    ["regimeDecidable"],
  );
  strictEqual(findings[0].line, 1);
});

// --- scanRflTheorems -----------------------------------------------------------

test("scanRflTheorems: single-line and multi-line-signature theorems ending `:= rfl` both found", () => {
  const files = [
    {
      path: "Obsmetrologia/Format/F.lean",
      text: [
        "theorem card_eight : all.length = 8 := rfl",
        "",
        "theorem moved_pair (u : Utterance) (a : Articulating) :",
        "    (pair u a).moved = true := rfl",
        "",
        "def notATheorem : Nat := 1",
        "theorem not_rfl : 1 = 1 := by simp",
      ].join("\n"),
    },
  ];
  const findings = scanRflTheorems(files);
  deepStrictEqual(
    findings.map((f) => ({ name: f.name, line: f.line })),
    [
      { name: "card_eight", line: 1 },
      { name: "moved_pair", line: 4 },
    ],
  );
});

test("scanRflTheorems: a `def` closing with `:= rfl` is not counted, `rfl'`-like names are not matched", () => {
  const files = [
    {
      path: "Obsmetrologia/X.lean",
      text: ["def notATheorem (a : Nat) : a = a := rfl", "theorem uses_variant : 1 = 1 := rfl_of_something"].join(
        "\n",
      ),
    },
  ];
  deepStrictEqual(scanRflTheorems(files), []);
});

// --- scanStaticFindings / format+parse roundtrip -------------------------------

test("scanStaticFindings: union of the four scanners, sorted by kind then file then line then name", () => {
  const files = [
    {
      path: "Obsmetrologia/Mix/M.lean",
      text: [
        "def Hn (_n : Nat) : Type := Unit",
        "structure Bundle : Prop where",
        "  ok : True",
        "def table : ClosureRegime → Bool",
        "  | _ => true",
        "theorem t : 1 = 1 := rfl",
      ].join("\n"),
    },
  ];
  const findings = scanStaticFindings(files);
  deepStrictEqual(
    findings.map((f) => f.kind),
    ["bool-table", "prop-structure", "rfl-theorem", "unit-type"],
  );
});

test("formatStaticRows / parseStaticRows: round-trip", () => {
  const findings = [
    { kind: "unit-type", file: "Obsmetrologia/A/B.lean", line: 12, name: "Hn" },
    { kind: "rfl-theorem", file: "Obsmetrologia/A/B.lean", line: 34, name: "card_eight" },
  ];
  const text = formatStaticRows(findings);
  strictEqual(text, "#static\tunit-type\tObsmetrologia/A/B.lean:12\tHn\n#static\trfl-theorem\tObsmetrologia/A/B.lean:34\tcard_eight");
  deepStrictEqual(parseStaticRows(text), findings);
});

// --- summarizeShapes -----------------------------------------------------------

test("summarizeShapes: proofHead/locality distributions, self-certifying signal, unused/propBundle lists", () => {
  const { rows } = parseShapeRows(FIXTURE_TEXT);
  const staticFindings = [{ kind: "rfl-theorem", file: "Obsmetrologia/Format/F.lean", line: 1, name: "card_eight" }];
  const summary = summarizeShapes(rows, staticFindings);

  strictEqual(summary.theorems, 4);
  deepStrictEqual(summary.proofHeadDistribution, { rfl: 2, other: 2 });
  deepStrictEqual(summary.proofHeadByModule, {
    Cohomology: { rfl: 1 },
    Format: { rfl: 1 },
    Alexandrov: { other: 1 },
    Closure: { other: 1 },
  });
  deepStrictEqual(summary.localityDistribution, { "same-module": 2, "crosses-module": 2 });

  strictEqual(summary.selfCertifying.total, 2);
  deepStrictEqual(summary.selfCertifying.byModule, { Cohomology: 1, Format: 1 });
  deepStrictEqual(summary.selfCertifying.top, [
    { name: "Obsmetrologia.Cohomology.hn_vanishes_above_one", module: "Cohomology", proofHead: "rfl" },
    { name: "Obsmetrologia.Format.card_eight", module: "Format", proofHead: "rfl" },
  ]);

  strictEqual(summary.unusedHypotheses.count, 1);
  deepStrictEqual(summary.unusedHypotheses.list, [
    { name: "Obsmetrologia.Cohomology.hn_vanishes_above_one", module: "Cohomology", hypothesisCount: 4, unusedHypotheses: 2 },
  ]);

  strictEqual(summary.propBundle.count, 1);
  deepStrictEqual(summary.propBundle.list, [{ name: "Obsmetrologia.Closure.frontierInputs", module: "Closure" }]);

  strictEqual(summary.static.total, 1);
  deepStrictEqual(summary.static.byKind, { "rfl-theorem": 1 });
  strictEqual(summary.static.rflTheorems.count, 1);
  deepStrictEqual(summary.static.rflTheoremsByModule, { Format: 1 });
});

test("summarizeShapes: self-certifying top is capped at 40 while total/byModule stay exact", () => {
  const rows = [];
  for (let i = 0; i < 45; i += 1) {
    rows.push({
      name: `Obsmetrologia.Mod.t${String(i).padStart(2, "0")}`,
      module: "Mod",
      proofHead: "rfl",
      locality: "same-module",
      hypothesisCount: 0,
      unusedHypotheses: 0,
      propBundle: false,
    });
  }
  const summary = summarizeShapes(rows, []);
  strictEqual(summary.selfCertifying.total, 45);
  strictEqual(summary.selfCertifying.byModule.Mod, 45);
  strictEqual(summary.selfCertifying.top.length, 40);
});

test("summarizeShapes: unused-hypotheses list is capped at 100, sorted by unusedHypotheses desc", () => {
  const rows = [];
  for (let i = 0; i < 105; i += 1) {
    rows.push({
      name: `Obsmetrologia.Mod.t${String(i).padStart(3, "0")}`,
      module: "Mod",
      proofHead: "other",
      locality: "crosses-module",
      hypothesisCount: 3,
      unusedHypotheses: (i % 3) + 1,
      propBundle: false,
    });
  }
  const summary = summarizeShapes(rows, []);
  strictEqual(summary.unusedHypotheses.count, 105);
  strictEqual(summary.unusedHypotheses.list.length, 100);
  strictEqual(summary.unusedHypotheses.truncated, true);
  ok(summary.unusedHypotheses.list[0].unusedHypotheses >= summary.unusedHypotheses.list[1].unusedHypotheses);
});

test("summarizeShapes: empty input summarizes to zeroes without throwing", () => {
  const summary = summarizeShapes([], []);
  strictEqual(summary.theorems, 0);
  strictEqual(summary.selfCertifying.total, 0);
  strictEqual(summary.unusedHypotheses.count, 0);
  strictEqual(summary.propBundle.count, 0);
  strictEqual(summary.static.total, 0);
});

// --- CERTIFICATE_SHAPE_READING / assembleCertificateShapeRecord ----------------

test("CERTIFICATE_SHAPE_READING: plainly a shape signal, not a verdict", () => {
  ok(CERTIFICATE_SHAPE_READING.includes("SHAPE SIGNAL"));
  ok(CERTIFICATE_SHAPE_READING.includes("NOT A VERDICT"));
  ok(CERTIFICATE_SHAPE_READING.includes("self-certifying"));
});

test("assembleCertificateShapeRecord: shape, type, reading, embedded source, computed summary", () => {
  const { rows } = parseShapeRows(FIXTURE_TEXT);
  const record = assembleCertificateShapeRecord({
    checkedAt: "2026-09-21T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-certificate-shapes.lean",
    leanSource: "import Lean\n",
    rows,
    staticFindings: [],
  });
  strictEqual(record.type, "ObsmetrologiaCertificateShapeCensus");
  strictEqual(record.checkedAt, "2026-09-21T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-certificate-shapes.lean");
  strictEqual(record.leanSource, "import Lean\n");
  strictEqual(record.reading, CERTIFICATE_SHAPE_READING);
  deepStrictEqual(record.summary, summarizeShapes(rows, []));
});

// --- wrapper: parseArgv / todayStamp / runShapeCensus ---------------------------

test("parseArgv: --out-dir, --date", () => {
  deepStrictEqual(parseArgv(["--out-dir", "/tmp/x", "--date", "2026-09-21"]), {
    outDir: "/tmp/x",
    date: "2026-09-21",
  });
  deepStrictEqual(parseArgv([]), { outDir: undefined, date: undefined });
});

test("todayStamp: YYYY-MM-DD shape", () => {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(todayStamp()));
});

test("runShapeCensus: injected runner drives control flow and returns raw stdout plus parsed rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { stdout, parsed } = await runShapeCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-certificate-shapes.lean",
    runCommand: fakeRunCommand,
  });
  strictEqual(stdout, FIXTURE_TEXT);
  strictEqual(parsed.rows.length, 4);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, ["env", "lean", "/pkg/scripts/census-set-of-certificate-shapes.lean"]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runShapeCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runShapeCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-certificate-shapes.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-certificate-shapes-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runShapeCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "#theorems\t0\n", stderr: "" });
  let threw = null;
  try {
    await runShapeCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-certificate-shapes.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-certificate-shapes-failed"));
});

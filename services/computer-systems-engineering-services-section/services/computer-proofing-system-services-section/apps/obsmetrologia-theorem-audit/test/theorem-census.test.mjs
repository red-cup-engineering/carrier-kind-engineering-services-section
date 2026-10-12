import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  assembleCensusRecord,
  moduleOf,
  parseCensusRows,
  profileOf,
  summarizeCensus,
} from "../src/theorem-census.mjs";
import {
  parseArgv,
  renderRowsTsv,
  runCensus,
  todayStamp,
} from "../scripts/census-set-of-theorem-axioms.mjs";

test("parseCensusRows: name-only tab, no-axiom, single-axiom, and multi-axiom rows", () => {
  const text = [
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.mk.injEq\tpropext",
    "Obsmetrologia.Closure.Collatz.parentBarrierGap_holds\tpropext,sorryAx,Quot.sound",
    "",
  ].join("\n");
  deepStrictEqual(parseCensusRows(text), [
    { name: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", axioms: [] },
    { name: "Obsmetrologia.Alexandrov.AlexandrovTopology.mk.injEq", axioms: ["propext"] },
    {
      name: "Obsmetrologia.Closure.Collatz.parentBarrierGap_holds",
      axioms: ["propext", "sorryAx", "Quot.sound"],
    },
  ]);
});

test("parseCensusRows: #excluded-auto-generated header line ignored", () => {
  const text = [
    "#excluded-auto-generated\t12",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty\t",
    "",
  ].join("\n");
  deepStrictEqual(parseCensusRows(text), [
    { name: "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty", axioms: [] },
  ]);
});

test("parseCensusRows: blank lines skipped", () => {
  deepStrictEqual(parseCensusRows("\n\n"), []);
  deepStrictEqual(parseCensusRows(""), []);
});

test("profileOf: sorry wins over every other axiom present", () => {
  strictEqual(profileOf(["propext", "sorryAx", "Quot.sound"]), "sorry");
  strictEqual(profileOf(["sorryAx"]), "sorry");
});

test("profileOf: choice wins over propext/Quot.sound but loses to sorry", () => {
  strictEqual(profileOf(["Classical.choice"]), "choice");
  strictEqual(profileOf(["Classical.choice", "propext"]), "choice");
  strictEqual(profileOf(["Classical.choice", "sorryAx"]), "sorry");
});

test("profileOf: propext+Quot.sound, Quot.sound alone, propext alone, none", () => {
  strictEqual(profileOf(["propext", "Quot.sound"]), "propext+Quot.sound");
  strictEqual(profileOf(["Quot.sound"]), "Quot.sound");
  strictEqual(profileOf(["propext"]), "propext");
  strictEqual(profileOf([]), "none");
});

test("moduleOf: second dot-separated segment", () => {
  strictEqual(
    moduleOf("Obsmetrologia.Closure.Collatz.parentBarrierGap_holds"),
    "Closure",
  );
  strictEqual(moduleOf("Obsmetrologia.Real.foo"), "Real");
  strictEqual(moduleOf("bare"), "bare");
});

test("summarizeCensus: total, profiles, byModule, and sorryTheorems over a fixture including a sorry row, a choice row, and a Real-module row", () => {
  const rows = [
    { name: "Obsmetrologia.Real.cauchy_complete", axioms: ["propext", "Quot.sound"] },
    { name: "Obsmetrologia.Real.add_comm", axioms: [] },
    { name: "Obsmetrologia.Closure.Collatz.parentBarrierGap_holds", axioms: ["propext", "sorryAx", "Quot.sound"] },
    { name: "Obsmetrologia.Cohomology.uses_choice", axioms: ["Classical.choice"] },
    { name: "Obsmetrologia.Cohomology.plain", axioms: ["propext"] },
  ];
  const summary = summarizeCensus(rows);
  strictEqual(summary.total, 5);
  deepStrictEqual(summary.profiles, {
    "propext+Quot.sound": 1,
    none: 1,
    sorry: 1,
    choice: 1,
    propext: 1,
  });
  deepStrictEqual(summary.byModule, {
    Real: { "propext+Quot.sound": 1, none: 1 },
    Closure: { sorry: 1 },
    Cohomology: { choice: 1, propext: 1 },
  });
  deepStrictEqual(summary.sorryTheorems, [
    "Obsmetrologia.Closure.Collatz.parentBarrierGap_holds",
  ]);
});

test("assembleCensusRecord: shape and type", () => {
  const rows = [{ name: "Obsmetrologia.A.b", axioms: [] }];
  const record = assembleCensusRecord({
    checkedAt: "2026-09-03T00:00:00.000Z",
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    rows,
  });
  strictEqual(record.type, "ObsmetrologiaTheoremAxiomCensus");
  strictEqual(record.checkedAt, "2026-09-03T00:00:00.000Z");
  strictEqual(record.packageRoot, "/pkg/lib/obsmetrologia");
  strictEqual(record.leanSourcePath, "/pkg/scripts/census-set-of-theorem-axioms.lean");
  deepStrictEqual(record.summary, summarizeCensus(rows));
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

test("renderRowsTsv: name-tab-axioms rows with trailing newline", () => {
  const rows = [
    { name: "A.one", axioms: [] },
    { name: "A.two", axioms: ["propext"] },
    { name: "A.three", axioms: ["propext", "sorryAx", "Quot.sound"] },
  ];
  strictEqual(
    renderRowsTsv(rows),
    "A.one\t\nA.two\tpropext\nA.three\tpropext,sorryAx,Quot.sound\n",
  );
});

test("runCensus: injected runner parses stdout into rows", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return {
      code: 0,
      stdout: "A.one\t\nA.two\tpropext,Quot.sound\n",
      stderr: "",
    };
  };
  const rows = await runCensus({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
    runCommand: fakeRunCommand,
  });
  deepStrictEqual(rows, [
    { name: "A.one", axioms: [] },
    { name: "A.two", axioms: ["propext", "Quot.sound"] },
  ]);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, ["env", "lean", "/pkg/scripts/census-set-of-theorem-axioms.lean"]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runCensus: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-theorem-axioms-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runCensus: throws when zero rows come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "", stderr: "" });
  let threw = null;
  try {
    await runCensus({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/census-set-of-theorem-axioms.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("census-set-of-theorem-axioms-failed"));
});

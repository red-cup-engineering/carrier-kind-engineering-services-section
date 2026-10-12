import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  allTheoremsExist,
  assembleTheoremAuditReport,
  buildScratchLeanSource,
  parseAxiomAuditLine,
  parseAxiomAuditOutput,
  shortName,
  sourceDeclaresName,
} from "../src/theorem-audit.mjs";
import {
  checkSourceDeclares,
  parseArgv,
  runTheoremAudit,
} from "../scripts/audit-set-of-theorems.mjs";

test("parseAxiomAuditLine: no-axiom line", () => {
  const line = "'Obsmetrologia.Computing.HoareProgram.preserves_post' does not depend on any axioms";
  deepStrictEqual(parseAxiomAuditLine(line), {
    theorem: "Obsmetrologia.Computing.HoareProgram.preserves_post",
    exists: true,
    axioms: [],
  });
});

test("parseAxiomAuditLine: axiom-list line", () => {
  const line = "'Obsmetrologia.Computing.keratinousHoareProgram_derives_hoare_program' depends on axioms: [Quot.sound]";
  deepStrictEqual(parseAxiomAuditLine(line), {
    theorem: "Obsmetrologia.Computing.keratinousHoareProgram_derives_hoare_program",
    exists: true,
    axioms: ["Quot.sound"],
  });
});

test("parseAxiomAuditLine: multi-axiom list", () => {
  const line = "'Foo.bar' depends on axioms: [propext, Quot.sound, Classical.choice]";
  const parsed = parseAxiomAuditLine(line);
  deepStrictEqual(parsed.axioms, ["propext", "Quot.sound", "Classical.choice"]);
});

test("parseAxiomAuditLine: unknown identifier (backtick-quoted)", () => {
  const line = "/tmp/x/Scratch.lean:3:14: error(lean.unknownIdentifier): Unknown constant `Obsmetrologia.Nonexistent.ghost_theorem`";
  deepStrictEqual(parseAxiomAuditLine(line), {
    theorem: "Obsmetrologia.Nonexistent.ghost_theorem",
    exists: false,
    axioms: null,
  });
});

test("parseAxiomAuditLine: non-matching line returns null", () => {
  strictEqual(parseAxiomAuditLine("this is unrelated build chatter"), null);
});

test("parseAxiomAuditOutput: mixed batch matches by quoted name, not line order", () => {
  const output = [
    "some build noise",
    "'B.two' depends on axioms: [Quot.sound]",
    "/tmp/Scratch.lean:5:2: error(lean.unknownIdentifier): Unknown constant `C.three`",
    "'A.one' does not depend on any axioms",
    "",
  ].join("\n");
  const rows = parseAxiomAuditOutput(output, ["A.one", "B.two", "C.three", "D.four"]);
  deepStrictEqual(rows, [
    { theorem: "A.one", exists: true, axioms: [] },
    { theorem: "B.two", exists: true, axioms: ["Quot.sound"] },
    { theorem: "C.three", exists: false, axioms: null },
    { theorem: "D.four", exists: null, axioms: null, rawLine: null },
  ]);
});

test("buildScratchLeanSource: emits one #print axioms line per theorem, importing the requested module", () => {
  const source = buildScratchLeanSource({
    importModule: "Obsmetrologia.Computing.HoareProgram",
    theoremNames: ["A.one", "A.two"],
  });
  ok(source.startsWith("import Obsmetrologia.Computing.HoareProgram\n"));
  ok(source.includes("#print axioms A.one\n"));
  ok(source.includes("#print axioms A.two\n"));
});

test("buildScratchLeanSource: refuses an empty theorem list", () => {
  let threw = false;
  try {
    buildScratchLeanSource({ theoremNames: [] });
  } catch (error) {
    threw = error instanceof TypeError;
  }
  ok(threw);
});

test("shortName: last dot segment", () => {
  strictEqual(shortName("Obsmetrologia.Computing.HoareProgram.preserves_post"), "preserves_post");
  strictEqual(shortName("bare"), "bare");
});

test("sourceDeclaresName: fixture .lean text with theorem and def", () => {
  const fixture = [
    "namespace Obsmetrologia.Computing.HoareProgram",
    "",
    "theorem preserves_post (P : HoareProgram Input Output) : True := trivial",
    "",
    "def helper (x : Nat) : Nat := x",
    "",
    "end Obsmetrologia.Computing.HoareProgram",
  ].join("\n");
  ok(sourceDeclaresName(fixture, "Obsmetrologia.Computing.HoareProgram.preserves_post"));
  ok(sourceDeclaresName(fixture, "helper"));
  ok(!sourceDeclaresName(fixture, "Obsmetrologia.Computing.HoareProgram.nonexistent"));
});

test("assembleTheoremAuditReport: summary counts and shape", () => {
  const rows = [
    { theorem: "A", exists: true, axioms: [] },
    { theorem: "B", exists: true, axioms: ["Quot.sound"] },
    { theorem: "C", exists: false, axioms: null },
    { theorem: "D", exists: null, axioms: null, rawLine: null },
  ];
  const report = assembleTheoremAuditReport({ checkedAt: "2026-09-03T00:00:00.000Z", packageRoot: "/pkg", rows });
  strictEqual(report.kind, "obsmetrologia.theorem-audit");
  strictEqual(report.checkedAt, "2026-09-03T00:00:00.000Z");
  strictEqual(report.packageRoot, "/pkg");
  deepStrictEqual(report.rows, rows);
  deepStrictEqual(report.summary, { requested: 4, existing: 2, missing: 1, withAxioms: 1 });
});

test("allTheoremsExist: true only when every row exists", () => {
  ok(allTheoremsExist([{ exists: true }, { exists: true }]));
  ok(!allTheoremsExist([{ exists: true }, { exists: false }]));
  ok(!allTheoremsExist([{ exists: true }, { exists: null }]));
  ok(!allTheoremsExist([]));
});

test("parseArgv: theorem names, --module, --source pairs, --build", () => {
  const parsed = parseArgv([
    "A.one",
    "B.two",
    "--module",
    "Obsmetrologia.Computing.HoareProgram",
    "--source",
    "Obsmetrologia/Computing/HoareProgram.lean",
    "--source",
    "Obsmetrologia/Computing/HoareProgram.lean",
    "--build",
  ]);
  deepStrictEqual(parsed, {
    theoremNames: ["A.one", "B.two"],
    sourcePaths: [
      "Obsmetrologia/Computing/HoareProgram.lean",
      "Obsmetrologia/Computing/HoareProgram.lean",
    ],
    importModule: "Obsmetrologia.Computing.HoareProgram",
    build: true,
  });
});

test("runTheoremAudit: injected runner drives a mixed batch with source-declares pairing", async () => {
  const scratchDir = await mkdtemp(join(tmpdir(), "theorem-audit-fixture-"));
  const sourcePath = join(scratchDir, "Fixture.lean");
  await writeFile(sourcePath, "theorem preserves_post (x : Nat) : True := trivial\n", "utf8");
  try {
    const calls = [];
    const fakeRunCommand = async (command, args, options) => {
      calls.push({ command, args, options });
      return {
        code: 1,
        stdout: "'A.preserves_post' does not depend on any axioms\n",
        stderr: "/tmp/x.lean:2:1: error(lean.unknownIdentifier): Unknown constant `A.ghost`\n",
      };
    };
    const rows = await runTheoremAudit({
      theoremNames: ["A.preserves_post", "A.ghost"],
      sourcePaths: [sourcePath],
      importModule: "A",
      packageRoot: scratchDir,
      runCommand: fakeRunCommand,
    });
    deepStrictEqual(rows, [
      {
        theorem: "A.preserves_post",
        exists: true,
        axioms: [],
        module: "A",
        source: sourcePath,
        sourceDeclares: true,
      },
      { theorem: "A.ghost", exists: false, axioms: null, module: "A" },
    ]);
    strictEqual(calls.length, 1);
    strictEqual(calls[0].command, "lake");
    deepStrictEqual(calls[0].args.slice(0, 2), ["env", "lean"]);
    strictEqual(calls[0].options.cwd, scratchDir);
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }
});

test("runTheoremAudit: --build runs lake build first and refuses on nonzero exit", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args) => {
    calls.push(args.join(" "));
    if (args[0] === "build") return { code: 1, stdout: "", stderr: "build broke" };
    return { code: 0, stdout: "'A.one' does not depend on any axioms\n", stderr: "" };
  };
  let threw = null;
  try {
    await runTheoremAudit({
      theoremNames: ["A.one"],
      packageRoot: "/pkg",
      build: true,
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("theorem-audit-build-refused"));
  deepStrictEqual(calls, ["build"]);
});

test("checkSourceDeclares: false when the source file does not exist", async () => {
  const result = await checkSourceDeclares("/does/not/exist", "Nowhere.lean", "Foo.bar");
  strictEqual(result, false);
});

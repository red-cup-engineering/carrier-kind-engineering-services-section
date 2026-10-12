import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { test } from "node:test";
import {
  diffDeclNames,
  parseDeclNames,
  renderDeclList,
  sortDeclNames,
} from "../src/lean-decls.mjs";
import {
  parseArgv,
  runRegenerateLeanDecls,
} from "../scripts/regenerate-lean-decls.mjs";

const FIXTURE_TEXT = [
  "Obsmetrologia.Charge",
  "Obsmetrologia.Alexandrov.AlexandrovTopology",
  "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty",
  "",
].join("\n");

test("parseDeclNames: one name per line, blank lines skipped, order preserved", () => {
  deepStrictEqual(parseDeclNames(FIXTURE_TEXT), [
    "Obsmetrologia.Charge",
    "Obsmetrologia.Alexandrov.AlexandrovTopology",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty",
  ]);
});

test("parseDeclNames: blank text parses to no names", () => {
  deepStrictEqual(parseDeclNames(""), []);
  deepStrictEqual(parseDeclNames("\n\n"), []);
});

test("parseDeclNames: trims stray whitespace around a name", () => {
  deepStrictEqual(parseDeclNames("  Obsmetrologia.Foo  \r\n"), ["Obsmetrologia.Foo"]);
});

test("sortDeclNames: lexicographic, does not mutate input", () => {
  const input = ["Obsmetrologia.Charge", "Obsmetrologia.Alexandrov.AlexandrovTopology", "Obsmetrologia.Ab"];
  const sorted = sortDeclNames(input);
  deepStrictEqual(sorted, ["Obsmetrologia.Ab", "Obsmetrologia.Alexandrov.AlexandrovTopology", "Obsmetrologia.Charge"]);
  deepStrictEqual(input, ["Obsmetrologia.Charge", "Obsmetrologia.Alexandrov.AlexandrovTopology", "Obsmetrologia.Ab"]);
});

test("sortDeclNames: empty list sorts to empty list", () => {
  deepStrictEqual(sortDeclNames([]), []);
});

test("renderDeclList: one name per line with a trailing newline", () => {
  strictEqual(renderDeclList(["Obsmetrologia.A", "Obsmetrologia.B"]), "Obsmetrologia.A\nObsmetrologia.B\n");
});

test("renderDeclList: empty list renders to the empty string", () => {
  strictEqual(renderDeclList([]), "");
});

test("renderDeclList: single name still gets a trailing newline", () => {
  strictEqual(renderDeclList(["Obsmetrologia.A"]), "Obsmetrologia.A\n");
});

test("diffDeclNames: disappeared and appeared are the symmetric set differences, sorted", () => {
  const oldNames = ["Obsmetrologia.Persistence.Foo", "Obsmetrologia.Charge", "Obsmetrologia.Shared"];
  const newNames = ["Obsmetrologia.Shared", "Obsmetrologia.Real.Bar", "Obsmetrologia.Charge"];
  deepStrictEqual(diffDeclNames(oldNames, newNames), {
    disappeared: ["Obsmetrologia.Persistence.Foo"],
    appeared: ["Obsmetrologia.Real.Bar"],
  });
});

test("diffDeclNames: identical lists diff to nothing", () => {
  deepStrictEqual(diffDeclNames(["Obsmetrologia.A"], ["Obsmetrologia.A"]), { disappeared: [], appeared: [] });
});

test("diffDeclNames: duplicates within one side collapse", () => {
  deepStrictEqual(diffDeclNames(["Obsmetrologia.A", "Obsmetrologia.A"], []), {
    disappeared: ["Obsmetrologia.A"],
    appeared: [],
  });
});

test("parseArgv: --out-path", () => {
  deepStrictEqual(parseArgv(["--out-path", "/tmp/lean_decls"]), { outPath: "/tmp/lean_decls" });
  deepStrictEqual(parseArgv([]), { outPath: undefined });
});

test("runRegenerateLeanDecls: injected runner drives control flow and returns sorted names", async () => {
  const calls = [];
  const fakeRunCommand = async (command, args, options) => {
    calls.push({ command, args, options });
    return { code: 0, stdout: FIXTURE_TEXT, stderr: "" };
  };
  const { names } = await runRegenerateLeanDecls({
    packageRoot: "/pkg/lib/obsmetrologia",
    leanSourcePath: "/pkg/scripts/list-lean-decls.lean",
    runCommand: fakeRunCommand,
  });
  deepStrictEqual(names, [
    "Obsmetrologia.Alexandrov.AlexandrovTopology",
    "Obsmetrologia.Alexandrov.AlexandrovTopology.isOpen_empty",
    "Obsmetrologia.Charge",
  ]);
  strictEqual(calls.length, 1);
  strictEqual(calls[0].command, "lake");
  deepStrictEqual(calls[0].args, ["env", "lean", "/pkg/scripts/list-lean-decls.lean"]);
  strictEqual(calls[0].options.cwd, "/pkg/lib/obsmetrologia");
});

test("runRegenerateLeanDecls: throws with stderr on nonzero exit", async () => {
  const fakeRunCommand = async () => ({ code: 1, stdout: "", stderr: "lean: unknown import" });
  let threw = null;
  try {
    await runRegenerateLeanDecls({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/list-lean-decls.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("regenerate-lean-decls-failed"));
  ok(threw.message.includes("lean: unknown import"));
});

test("runRegenerateLeanDecls: throws when zero names come back even on exit 0", async () => {
  const fakeRunCommand = async () => ({ code: 0, stdout: "\n\n", stderr: "" });
  let threw = null;
  try {
    await runRegenerateLeanDecls({
      packageRoot: "/pkg/lib/obsmetrologia",
      leanSourcePath: "/pkg/scripts/list-lean-decls.lean",
      runCommand: fakeRunCommand,
    });
  } catch (error) {
    threw = error;
  }
  ok(threw instanceof Error);
  ok(threw.message.includes("regenerate-lean-decls-failed"));
});

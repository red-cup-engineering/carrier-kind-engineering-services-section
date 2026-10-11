import assert from "node:assert/strict";
import test from "node:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { decodeLeanGoldenVectorJsonl } from "../src/golden-vector/codec.mjs";
import { judgeGoldenVectors } from "../src/golden-vector/judge.mjs";
import { conformanceSuites, suiteRealization } from "../src/golden-vector/suites.mjs";

for (const name of ["obsmetrologia", "work-arena", "sen-lambda", "band"]) {
  test(`${name} resolves its registered owner and conforms to every committed golden vector`, async (t) => {
    const suite = conformanceSuites.find((candidate) => candidate.name === name);
    assert.ok(suite, `${name} remains a registered suite`);
    const realization = await suiteRealization(suite);
    assert.ok(realization, `${name} has a shipped realization; an obsolete path must not make it pending`);
    const rows = decodeLeanGoldenVectorJsonl(readFileSync(join(suite.package, suite.vectors), "utf8"));
    assert.ok(rows.length > 0, `${name} retains its committed mathematical vectors`);
    const judgment = judgeGoldenVectors(rows, realization);
    assert.deepEqual(judgment.unrealized, [], "every vector operation has its genuine realizer");
    // The existing judge reports extra implementation exports separately; conformance
    // is agreement with every committed mathematical vector, not an invented export ban.
    t.diagnostic(`${rows.length} vectors; extra exports without vectors: ${judgment.unjudged.join(", ") || "none"}`);
    assert.equal(judgment.conforms, true, JSON.stringify(judgment.operations
      .filter((operation) => operation.tally.neg !== 0)
      .map(({ action, rows, tally, disagreements }) => ({ action, rows, tally, first: disagreements[0] }))));
    assert.equal(judgment.operations.reduce((count, operation) => count + operation.tally.pos, 0), rows.length);
  });
}

// Use the exact shipped suite loader in an isolated package layout. These failure
// fixtures cannot replace any realizer used by the positive mathematical assays.
async function withRegisteredOwner({ table }, check) {
  const root = mkdtempSync(join(tmpdir(), "registered-realizer-"));
  try {
    const loader = join(root, "suites.mjs");
    copyFileSync(new URL("../src/golden-vector/suites.mjs", import.meta.url), loader);
    const owner = join(root, "node_modules/@red-cup-engineering/organizing");
    mkdirSync(owner, { recursive: true });
    writeFileSync(join(owner, "package.json"), JSON.stringify({
      name: "@red-cup-engineering/organizing", version: "0.0.0", type: "module",
      exports: { "./enterprise/work-arena-realization": "./realizer.mjs" },
    }));
    if (table === "absent") copyFileSync(new URL("./fixtures/registered-realizer-without-table.mjs", import.meta.url), join(owner, "realizer.mjs"));
    const isolated = await import(pathToFileURL(loader).href);
    const suite = isolated.conformanceSuites.find(({ name }) => name === "work-arena");
    await check(() => isolated.suiteRealization(suite));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("an absent registered realizer module refuses instead of becoming pending", async () => {
  await withRegisteredOwner({ table: "module-absent" }, async (load) => {
    await assert.rejects(load, { code: "ERR_MODULE_NOT_FOUND" });
  });
});

test("a registered module without its realization table refuses instead of becoming pending", async () => {
  await withRegisteredOwner({ table: "absent" }, async (load) => {
    await assert.rejects(load, /registered obsmetrologiaRealization table is missing/);
  });
});

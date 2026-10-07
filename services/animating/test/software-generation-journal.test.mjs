import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { generateSemanticCarriersWork } from "../src/becoming/doing/working/software-change/semantic-carrier-generation.mjs";
import { rewriteModuleSpecifierWork } from "../src/becoming/doing/working/software-change.mjs";

test("AOE codemod retains its exact-source proposal and observation on the shared journal path", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "aoe-codemod-journal-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, "source.mjs");
  const manifestPath = path.join(root, "package.json");
  await writeFile(file, "export { value } from 'old-module';\n");
  const manifest = JSON.stringify({ name: "test-codemod", softwareKind: "component" });
  await assert.rejects(
    rewriteModuleSpecifierWork({ file, from: "old-module", to: "new-module", actor: "test-actor", journalPath: path.join(root, "unowned.jsonl") }),
    /declared package owner/,
  );
  await writeFile(manifestPath, JSON.stringify({ name: "ops.561.group", softwareKind: "instance" }));
  await assert.rejects(
    rewriteModuleSpecifierWork({ file, from: "old-module", to: "new-module", actor: "test-actor", journalPath: path.join(root, "instance.jsonl") }),
    /instance supplies configuration and state/,
  );
  await writeFile(manifestPath, manifest);
  const request = { file, from: "old-module", to: "new-module", actor: "test-actor",
    journalPath: path.join(root, "codemod.jsonl") };
  const planned = await rewriteModuleSpecifierWork(request);
  assert.equal(planned.history[0].predicate, "aoe.software.proposed");
  assert.equal(planned.evidence.graph.edges.some((edge) => edge.edge.predicate === "aoe.software.targets-owner"), true);
  assert.equal(await readFile(file, "utf8"), "export { value } from 'old-module';\n");
  await writeFile(manifestPath, JSON.stringify({ name: "changed-owner", softwareKind: "component" }));
  await assert.rejects(rewriteModuleSpecifierWork({ ...request, write: true }), /journal does not admit/);
  assert.equal(await readFile(file, "utf8"), "export { value } from 'old-module';\n");
  await writeFile(manifestPath, manifest);
  const applied = await rewriteModuleSpecifierWork({ ...request, write: true });
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.history.map((row) => row.predicate), ["aoe.software.proposed", "aoe.software.applied"]);
  assert.equal(await readFile(file, "utf8"), "export { value } from 'new-module';\n");
});

test("AOE generation proposes before writing and refuses changed specifications", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "aoe-generation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const specificationsDir = path.join(root, "specifications");
  const sourceDir = path.join(root, "src");
  await mkdir(specificationsDir);
  await mkdir(sourceDir);
  await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "test-carriers", softwareKind: "component" }));
  const schemaPath = path.join(specificationsDir, "value.schema.json");
  const schema = { type: "object", properties: { value: { type: "string" } },
    "x-codegen": { exportName: "valueSchema", typeName: "Value", runtimeName: "valueType" } };
  await writeFile(schemaPath, JSON.stringify(schema));
  const request = { specificationsDir, outFile: path.join(sourceDir, "generated.mjs"),
    journalPath: path.join(root, "generation.jsonl"), actor: "test-actor" };
  const foreign = await mkdtemp(path.join(tmpdir(), "aoe-generation-foreign-"));
  t.after(() => rm(foreign, { recursive: true, force: true }));
  await writeFile(path.join(foreign, "package.json"), JSON.stringify({ name: "foreign", softwareKind: "application" }));
  await assert.rejects(generateSemanticCarriersWork({ ...request, outFile: path.join(foreign, "generated.mjs") }), /same declared software owner/);
  const planned = await generateSemanticCarriersWork(request);
  assert.equal(planned.status, "planned");
  assert.equal(planned.evidence.graph.edges.some((edge) => edge.edge.predicate === "aoe.software.targets-owner"), true);
  assert.equal(planned.history[0].predicate, "aoe.software.proposed");
  await assert.rejects(readFile(request.outFile), { code: "ENOENT" });
  await writeFile(schemaPath, JSON.stringify({ ...schema, description: "changed" }));
  await assert.rejects(generateSemanticCarriersWork({ ...request, write: true }), /journal does not admit/);
  assert.equal((await readFile(request.journalPath, "utf8")).trim().split("\n").length, 1);
  await writeFile(schemaPath, JSON.stringify(schema));
  const applied = await generateSemanticCarriersWork({ ...request, write: true });
  assert.equal(applied.status, "applied");
  assert.equal(applied.history[1].predicate, "aoe.software.applied");
  assert.match(await readFile(request.outFile, "utf8"), /valueSchema/);
  assert.equal((await generateSemanticCarriersWork({ ...request, check: true })).status, "checked");
});

import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";

test("native deterministic generation reaches a runtime consumer through the existing witnessed source transition", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "native-aoe-generation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repositoryRoot = path.join(root, "repository"), dataRoot = path.join(root, "persistent");
  const owner = path.join(repositoryRoot, "delivery"), specifications = path.join(owner, "specifications");
  await mkdir(specifications, { recursive: true });
  await mkdir(path.join(owner, "src"));
  await writeFile(path.join(owner, "package.json"), JSON.stringify({ name: "controlled-delivery", softwareKind: "component" }));
  const schema = { $id: "urn:controlled:native-delivery", title: "Delivery", description: "A positive delivery amount.",
    type: "object", required: ["amount"], additionalProperties: false,
    properties: { amount: { type: "integer", minimum: 1 } },
    "x-codegen": { exportName: "DeliverySchema", typeName: "Delivery", runtimeName: "Delivery" } };
  const schemaPath = path.join(specifications, "delivery.schema.json");
  await writeFile(schemaPath, JSON.stringify(schema));
  const instance = path.join(root, "instance.json");
  await writeFile(instance, JSON.stringify({ version: 1, instanceOf: "@red-cup-engineering/metroplat",
    operationSources: [{ module: "@red-cup-engineering/animating/semantic-carrier-operations", export: "semanticCarrierOperations" }], applications: [] }));
  const installed = await installedMetroplatInstance(instance, { repositoryRoot, dataRoot }, {}, new URL("../package.json", import.meta.url).pathname);
  const methods = Object.fromEntries(installed.operationSources.flatMap(f => f.operations).map(op => [op.verb, op]));
  const plan = methods["aoe-semantic-carriers-plan"], apply = methods["aoe-semantic-carriers-apply"], check = methods["aoe-semantic-carriers-check"];
  assert.equal(plan.effects.class, "journal-write");
  assert.equal(apply.locus, "owner");
  const request = { owner: "delivery", specificationsDir: "specifications", outFile: "src/generated.mjs", journal: "delivery-generation" };
  // Controlled invocation attribution; this fixture does not establish production authority.
  const context = { invocation: { subject: "urn:controlled:generator-invocation" } };
  await assert.rejects(plan.execute(request), /invoking subject/);
  await assert.rejects(async () => plan.execute({ ...request, actor: "invented-principal" }, {}, context));
  await assert.rejects(plan.execute({ ...request, specificationsDir: "../.." }, {}, context), /escapes/);
  await assert.rejects(apply.execute(request, {}, context), { code: "ENOENT" });
  const planned = await plan.execute(request, {}, context);
  assert.equal(planned.status, "planned");
  assert.equal(planned.history[0].predicate, "aoe.software.proposed");
  assert.equal(planned.history[0].object.intent.actor, context.invocation.subject);
  assert.ok(planned.journalPath.startsWith(dataRoot + path.sep));
  const generated = path.join(owner, request.outFile);
  await assert.rejects(access(generated), { code: "ENOENT" });
  await writeFile(schemaPath, JSON.stringify({ ...schema, description: "revised order" }));
  await assert.rejects(apply.execute(request, {}, context), /journal does not admit/);
  await assert.rejects(access(generated), { code: "ENOENT" });
  await writeFile(schemaPath, JSON.stringify(schema));
  const applied = await apply.execute(request, {}, context);
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.history.map(row => row.predicate), ["aoe.software.proposed", "aoe.software.applied"]);
  const consumer = await import(pathToFileURL(generated));
  assert.deepEqual(admit(consumer.Delivery, { amount: 2 }), { ok: true, value: { amount: 2 } });
  assert.equal(admit(consumer.Delivery, { amount: 0 }).ok, false);
  assert.equal(admit(consumer.Delivery, { amount: 1, invented: true }).ok, false);
  const { journal, ...checkRequest } = request;
  assert.equal((await check.execute(checkRequest, {}, context)).status, "checked");
  await assert.rejects(apply.execute(request, {}, context), /unfinished work/);
  assert.equal((await readFile(planned.journalPath, "utf8")).trim().split("\n").length, 2);
});

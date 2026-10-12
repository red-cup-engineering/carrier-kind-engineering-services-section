import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { installedFixture } from "./fixtures/installed-jsnode-package.mjs";
import {
  operationSourcesFromFern,
  fernCatalogOptionsFrom,
} from "@red-cup-engineering/metroplat/fern-catalog";
import { installedMetroplatFromProcessOptions } from "@red-cup-engineering/metroplat/instance";
import { assembleDefaultService } from "@red-cup-engineering/metroplat/catalog";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";

let fixture;
let options;
let emptyOperationsRoot;
before(() => {
  fixture = installedFixture();
  options = { fern: fixture.fernPath, operationsRoot: fixture.operationsRoot };
  emptyOperationsRoot = path.join(fixture.root, "empty-installation");
  mkdirSync(emptyOperationsRoot);
});
after(() => rmSync(fixture.root, { recursive: true, force: true }));

test("with no --fern the built-in catalog has no installed operations", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-fern-baseline-"));
  try {
    const assembly = assembleDefaultService(defaultFilesystemBinding(dataRoot));
    assert.equal(assembly.catalog.byVerb.has("double-value"), false);
    assert.equal(assembly.catalog.byVerb.has("async-double"), false);
  } finally { rmSync(dataRoot, { recursive: true, force: true }); }
});

test("fernCatalogOptionsFrom projects the process's paired options", () => {
  assert.equal(fernCatalogOptionsFrom({}), undefined);
  assert.equal(fernCatalogOptionsFrom({ fern: "a" }), undefined);
  assert.equal(fernCatalogOptionsFrom({ operationsRoot: "b" }), undefined);
  assert.deepEqual(fernCatalogOptionsFrom({ fern: "a", operationsRoot: "b" }), { fern: "a", operationsRoot: "b" });
});

test("installed operations carry their input and output schemas into the catalog", async () => {
  const sources = await operationSourcesFromFern(options);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].module, "@fixture/shared-execution");
  const byVerb = new Map(sources.flatMap(source => source.operations).map(operation => [operation.verb, operation]));
  for (const verb of ["double-value", "async-double", "bad-result"]) {
    assert.equal(byVerb.get(verb).domain.schema.type, "number");
    assert.equal(byVerb.get(verb).codomain.schema.type, "number");
  }
});

test("service assembly mounts callable sync and async installed operations", async () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-fern-call-"));
  try {
    const sources = await operationSourcesFromFern(options);
    const assembly = assembleDefaultService(defaultFilesystemBinding(dataRoot), "@red-cup-engineering/metroplat", sources);
    assert.equal(assembly.catalog.byVerb.get("double-value").execute(3, {}), 6);
    assert.equal(await assembly.catalog.byVerb.get("async-double").execute(4, {}), 8);
  } finally { rmSync(dataRoot, { recursive: true, force: true }); }
});

test("an admitted package absent from the installation is refused", async () => {
  await assert.rejects(() => operationSourcesFromFern({ fern: fixture.fernPath, operationsRoot: emptyOperationsRoot }));
});

test("no process FERN means no extra operation sources", async () => {
  const installed = await installedMetroplatFromProcessOptions({});
  assert.deepEqual(installed.operationSources, []);
  assert.equal(installed.identity.id, "@red-cup-engineering/metroplat");
});

test("paired process options mount the same installed operation family", async () => {
  const { operationSources: sources } = await installedMetroplatFromProcessOptions(options);
  assert.deepEqual(sources.flatMap(source => source.operations).map(operation => operation.verb).sort(), ["async-double", "bad-result", "double-value"]);
});

test("an instance names the identity shared by its installed surfaces", async () => {
  const instance = path.join(fixture.root, "instance.json");
  writeFileSync(instance, JSON.stringify({
    version: 1,
    instanceOf: "@red-cup-engineering/metroplat",
    identity: { id: "ops.561.group", title: "561 Group operations", origin: "https://ops.561.group" },
    operationSources: [],
  }));
  const installed = await installedMetroplatFromProcessOptions({ instance });
  assert.deepEqual(installed.identity, { id: "ops.561.group", title: "561 Group operations", origin: "https://ops.561.group" });
  assert.equal(installed.identityCell.type, "metroplat.instance.identity.v1");
  assert.equal(installed.identityCell.content.id, installed.identity.id);
  assert.deepEqual(installed.operationSources, []);
  writeFileSync(instance, JSON.stringify({
    version: 1, identity: { id: "ops.561.group", title: "561 Group operations" }, operationSources: [],
  }));
  await assert.rejects(installedMetroplatFromProcessOptions({ instance }), /instanceOf/);
});

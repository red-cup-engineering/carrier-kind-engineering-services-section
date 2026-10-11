import assert from "node:assert/strict";
import test from "node:test";

import {
  assayMcpCatalogDispatch,
  projectMcpToolCatalog,
} from "../src/catalog.mjs";

test("exact tools/list and tools/call names bind", () => {
  const projection = projectMcpToolCatalog([
    { name: "metroplat_metroplex_connect" },
    { name: "metroplat_metroplex_command" },
  ]);
  const assay = assayMcpCatalogDispatch(projection, [
    "metroplat_metroplex_connect",
    "metroplat_metroplex_command",
  ]);

  assert.equal(assay.ok, true);
  assert.deepEqual(assay.transport.missing, []);
  assert.deepEqual(assay.transport.bound, [
    "metroplat_metroplex_connect",
    "metroplat_metroplex_command",
  ]);
  assert.deepEqual(assay.nearMisses, []);
});

test("underscore/hyphen deployment mismatch is diagnosed but never normalized into success", () => {
  const projection = projectMcpToolCatalog([
    { name: "metroplat_metroplex_connect" },
    { name: "metroplat_metroplex_command" },
  ]);
  const assay = assayMcpCatalogDispatch(projection, [
    "metroplat_metroplex-connect",
    "metroplat_metroplex-command",
  ]);

  assert.equal(assay.ok, false);
  assert.deepEqual(assay.transport.bound, []);
  assert.deepEqual(assay.transport.missing, [
    "metroplat_metroplex_connect",
    "metroplat_metroplex_command",
  ]);
  assert.deepEqual(
    assay.nearMisses.map(({ advertised, callable }) => [advertised, callable]),
    [
      ["metroplat_metroplex_connect", "metroplat_metroplex-connect"],
      ["metroplat_metroplex_command", "metroplat_metroplex-command"],
    ],
  );
});

test("an advertised operation with no callable handler remains a hard dispatch obstruction", () => {
  const projection = projectMcpToolCatalog([
    { name: "ops_submit_demand" },
  ]);
  const assay = assayMcpCatalogDispatch(projection, []);

  assert.equal(assay.ok, false);
  assert.deepEqual(assay.transport.missing, ["ops_submit_demand"]);
  assert.deepEqual(assay.nearMisses, []);
});

test("near-miss diagnostics cannot hide exact handlers that are actually present", () => {
  const projection = projectMcpToolCatalog([
    { name: "metroplat_metroplex_connect" },
  ]);
  const assay = assayMcpCatalogDispatch(projection, [
    "metroplat_metroplex_connect",
    "metroplat_metroplex-connect",
  ]);

  assert.equal(assay.ok, true);
  assert.deepEqual(assay.transport.bound, ["metroplat_metroplex_connect"]);
  assert.deepEqual(assay.transport.missing, []);
  assert.deepEqual(assay.nearMisses, []);
});

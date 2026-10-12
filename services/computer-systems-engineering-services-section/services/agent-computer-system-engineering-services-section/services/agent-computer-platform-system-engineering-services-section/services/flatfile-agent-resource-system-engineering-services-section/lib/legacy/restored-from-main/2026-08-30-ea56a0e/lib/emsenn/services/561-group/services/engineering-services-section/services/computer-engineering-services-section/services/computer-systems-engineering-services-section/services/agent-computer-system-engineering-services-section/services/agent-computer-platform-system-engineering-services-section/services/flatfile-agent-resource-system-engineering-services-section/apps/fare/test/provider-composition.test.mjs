import assert from "node:assert/strict";
import test from "node:test";
import { defineProvider } from "../src/provider/provider.mjs";
import { composeProviders, originsOf, serializeComposition } from "../src/provider/compositor.mjs";
import { holds } from "../src/kernel/store.mjs";
import { createRendererRegistry, defineRenderer, renderGraph } from "../src/render/registry.mjs";

const observedAt = "2026-08-20T00:00:00.000Z";
const graph = (resource, cells) => ({ resource, focus: resource, observedAt, cells });

test("providers compose per-resource graphs with provenance and deduplication", async () => {
  const shared = { subject: "urn:a", predicate: "urn:knows", object: "urn:b" };
  const providers = [
    defineProvider({ id: "urn:provider:one", observe: async () => ({ resources: [graph("urn:resource:one", [shared])] }) }),
    defineProvider({ id: "urn:provider:two", observe: async () => ({ resources: [graph("urn:resource:two", [shared])] }) }),
  ];
  const composition = await composeProviders(providers);
  assert.equal(holds(composition.store, shared.subject, shared.predicate, shared.object), true);
  assert.deepEqual(originsOf(composition, shared).map(({ provider }) => provider), ["urn:provider:one", "urn:provider:two"]);
  assert.equal(composition.resources.length, 2);
  assert.equal(serializeComposition(composition).cells.find((cell) => cell.predicate === "urn:knows").origins.length, 2);
});

test("provider failure is explicit: throw by default, diagnostic only when requested", async () => {
  const broken = defineProvider({ id: "urn:provider:broken", observe: async () => { throw new Error("sensor broke"); } });
  await assert.rejects(() => composeProviders([broken]), /sensor broke/u);
  const composition = await composeProviders([broken], { onProviderError: "diagnose" });
  assert.deepEqual(composition.resources, []);
  assert.deepEqual(composition.providers, [{ provider: "urn:provider:broken", status: "failed", resources: 0, cells: 0 }]);
  assert.equal(composition.diagnostics[0].code, "provider-observation-failed");
  assert.match(composition.diagnostics[0].message, /sensor broke/u);
});

test("renderer selection follows the graph selection", async () => {
  const composition = await composeProviders([defineProvider({ id: "urn:provider:one", observe: async () => ({ resources: [graph("urn:resource:one", [{ subject: "urn:a", predicate: "urn:p", object: "urn:b" }])] }) })]);
  const registry = createRendererRegistry([defineRenderer({
    id: "urn:renderer:count", mediaType: "application/json",
    accepts: ({ selection }) => selection?.kind === "cell-count",
    render: ({ composition: value }) => JSON.stringify({ cells: value.store.order.length }),
  })]);
  const rendered = await renderGraph(registry, { composition, selection: { kind: "cell-count" } });
  assert.equal(rendered.renderer, "urn:renderer:count");
  assert.deepEqual(JSON.parse(rendered.body), { cells: composition.store.order.length });
});

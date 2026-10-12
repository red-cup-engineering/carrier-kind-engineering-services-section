#!/usr/bin/env node
import { readFileText } from "@red-cup-engineering/computer-file-engineering-services-section/read-file";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";

import { declareOffer, incomeAccountFor } from "../../../src/offer.mjs";
import { resolveBinding } from "../../../src/compute-binding.mjs";
import { expandUriTemplate } from "@red-cup-engineering/uri-services-section/uri-template";

/**
 * Add a curated batch of house pure functions to market-561-group's catalog:
 * real, already-shipped functions this house owns (FOUR's four-valued reading
 * algebra, Relating's SignCell/SignGraph/SignCraft coordination-free truth
 * pipeline, content addressing, JSON Schema validation, attention-allocation
 * budgeting) rather than hand-typed examples. Every offer's `output.example`
 * below is captured by actually invoking its compute binding once here, some
 * chained from an earlier pick's own live result, so the catalog never
 * carries a fabricated response. Each is `runtime: "node"` (not yet proven
 * Workers-isolate safe): served by serve-market.mjs, not the edge Worker.
 * Usage: derive-house-catalog-additions
 */

const ORIGIN = "https://market.561.group";
const CATALOG_PATH = new URL("../../../data/market-561-group/records/catalog.json", import.meta.url).pathname;

const FOUR_SECTION = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section";
const FOUR_PACKAGE = "@red-cup-engineering/computer-data-engineering-services-section";
const RELATING_SECTION = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section";
const RELATING_PACKAGE = "@red-cup-engineering/relating";
const CONTENT_SECTION = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section";
const CONTENT_PACKAGE = "@red-cup-engineering/computer-content-engineering-services-section";
const JSON_SCHEMA_SECTION = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-data-engineering-services-section/services/computer-content-engineering-services-section/services/computer-serialized-content-engineering-services-section/services/json-services-section/services/json-schema-services-section";
const JSON_SCHEMA_PACKAGE = "@red-cup-engineering/json-schema-services-section";
const METROLOGIC_SECTION = FOUR_SECTION;
const METROLOGIC_PACKAGE = "@red-cup-engineering/metrologic";

const four = (exportName, args) => ({ package: FOUR_PACKAGE, subpath: "./four", export: exportName, args });
const relating = (subpath, exportName) => ({ package: RELATING_PACKAGE, subpath, export: exportName });

/**
 * One pick: the offer's identity, price, boundary, and how to compute both
 * its live example and its served response. `sample(results)` builds the
 * request context `resolveBinding` projects arguments from (`{body}` or
 * `{params}`/`{query}`), reading any earlier pick's own captured example out
 * of `results` (keyed by operation) when one offer's input is another's
 * output rather than a second hand-typed value.
 */
const picks = [
  // — FOUR: Belnap's four-valued bilattice, named-point reading algebra (computer-data-engineering-services-section/four) —
  {
    name: "Reading Family Convert", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-convert", route: "/v1/four/reading-convert", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("readingAs", ["body.family", "body.name"]),
    sample: () => ({ body: { family: "told", name: "held" } }),
    bodySchema: { properties: { family: { enum: ["knowledge", "told", "truth", "extremal"] }, name: { type: "string" } }, required: ["family", "name"] },
    outputSchema: { type: "string" },
    title: "Reading Family Convert", description: "Name one of FOUR's four points in another reading family (knowledge, told, truth, extremal), given its name in any family.",
    tags: ["four", "belnap", "bilattice"], serviceName: "four-reading-convert",
  },
  {
    name: "Reading Knowledge Join", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-knowledge-join", route: "/v1/four/reading-knowledge-join", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("knowledgeJoinReading", ["body.left", "body.right"]),
    sample: () => ({ body: { left: "held", right: "denied" } }),
    bodySchema: { properties: { left: { type: "string" }, right: { type: "string" } }, required: ["left", "right"] },
    outputSchema: { type: "string" },
    title: "Reading Knowledge Join", description: "Join two FOUR readings under the knowledge order: what the pair together tells.",
    tags: ["four", "belnap", "knowledge-order"], serviceName: "four-knowledge-join",
  },
  {
    name: "Reading Knowledge Meet", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-knowledge-meet", route: "/v1/four/reading-knowledge-meet", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("knowledgeMeetReading", ["body.left", "body.right"]),
    sample: () => ({ body: { left: "held", right: "denied" } }),
    bodySchema: { properties: { left: { type: "string" }, right: { type: "string" } }, required: ["left", "right"] },
    outputSchema: { type: "string" },
    title: "Reading Knowledge Meet", description: "Meet two FOUR readings under the knowledge order: the consensus of the pair.",
    tags: ["four", "belnap", "knowledge-order"], serviceName: "four-knowledge-meet",
  },
  {
    name: "Reading Truth Join", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-truth-join", route: "/v1/four/reading-truth-join", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("truthJoinReading", ["body.left", "body.right"]),
    sample: () => ({ body: { left: "held", right: "denied" } }),
    bodySchema: { properties: { left: { type: "string" }, right: { type: "string" } }, required: ["left", "right"] },
    outputSchema: { type: "string" },
    title: "Reading Truth Join", description: "Join two FOUR readings under the truth order: which way the pair leans.",
    tags: ["four", "belnap", "truth-order"], serviceName: "four-truth-join",
  },
  {
    name: "Reading Negate", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-negate", route: "/v1/four/reading-negate", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("negateReading", ["body.name"]),
    sample: () => ({ body: { name: "held" } }),
    bodySchema: { properties: { name: { type: "string" } }, required: ["name"] },
    outputSchema: { type: "string" },
    title: "Reading Negate", description: "Negate one FOUR reading: exchange told-for and told-against.",
    tags: ["four", "belnap", "negation"], serviceName: "four-negate",
  },
  {
    name: "Reading Conflate", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-conflate", route: "/v1/four/reading-conflate", method: "POST", price: "$0.001", category: "reasoning",
    compute: four("conflateReading", ["body.name"]),
    sample: () => ({ body: { name: "unknown" } }),
    bodySchema: { properties: { name: { type: "string" } }, required: ["name"] },
    outputSchema: { type: "string" },
    title: "Reading Conflate", description: "Conflate one FOUR reading: exchange told-neither and told-both, fixing held and denied.",
    tags: ["four", "belnap", "conflation"], serviceName: "four-conflate",
  },
  {
    name: "Reading Census", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-census", route: "/v1/four/reading-census", method: "POST", price: "$0.002", category: "reasoning",
    compute: four("census", ["body.names"]),
    sample: () => ({ body: { names: ["held", "held", "denied", "unknown"] } }),
    bodySchema: { properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
    outputSchema: { type: "object", properties: { absurd: { type: "integer" }, potential: { type: "integer" }, active: { type: "integer" }, stable: { type: "integer" } } },
    title: "Reading Census", description: "How many of a list of FOUR readings sit at each of the four points, keyed by knowledge name.",
    tags: ["four", "belnap", "census"], serviceName: "four-census",
  },
  {
    name: "Reading Truth Meet", gateway: "four-valued-reasoning", gatewayPackageName: FOUR_PACKAGE, section: FOUR_SECTION,
    operation: "reading-truth-meet", route: "/v1/four/reading-truth-meet", method: "POST", price: "$0.002", category: "reasoning",
    compute: four("truthMeetAll", ["body.names"]),
    sample: () => ({ body: { names: ["held", "denied"] } }),
    bodySchema: { properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
    outputSchema: { type: "string" },
    title: "Reading Truth Meet", description: "The conjunction of a list of FOUR readings (Belnap truth meet): told for when every reading is, told against when any is; the empty list is true.",
    tags: ["four", "belnap", "conjunction"], serviceName: "four-truth-meet",
  },

  // — Relating: the SignCell -> SignGraph -> SignCraft coordination-free truth pipeline —
  {
    name: "SEN Utter", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-utter", route: "/v1/sen/utter", method: "POST", price: "$0.002", category: "reasoning",
    compute: relating("./operations/inducing", "utterOperation"),
    sample: () => ({ body: { token: "my-token", claim: "the claim text" } }),
    bodySchema: { properties: { token: { type: "string" }, claim: { type: "string" } }, required: ["token", "claim"] },
    outputSchema: { type: "object", properties: { token: { type: "string" }, claim: { type: "string" } } },
    title: "SEN Utter", description: "Admit a token Mark and a claim Mark as one utterance: the boundary morphism that gets data into the SignCell/SignGraph/SignCraft pipeline.",
    tags: ["sen", "signcell", "utterance"], serviceName: "sen-utter",
  },
  {
    name: "SEN Articulate", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-articulate", route: "/v1/sen/articulate", method: "POST", price: "$0.005", category: "reasoning",
    compute: relating("./operations/inducing", "articulateOperation"),
    sample: () => ({ body: { token: "my-token", claim: "the claim text" } }),
    bodySchema: { properties: { token: { type: "string" }, claim: { type: "string" } }, required: ["token", "claim"] },
    outputSchema: { type: "object" },
    title: "SEN Articulate", description: "Articulate an utterance as its reflexive SignCell: the cell told for by its own token.",
    tags: ["sen", "signcell", "articulation"], serviceName: "sen-articulate",
  },
  {
    name: "SEN Predicate", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-predicate", route: "/v1/sen/predicate", method: "POST", price: "$0.005", category: "reasoning",
    compute: relating("./operations/inducing", "predicateOperation"),
    sample: (results) => ({ body: results["sen-articulate"] }),
    bodySchema: { type: "object" },
    outputSchema: { type: "object" },
    title: "SEN Predicate", description: "Generate the SignGraph predication site a SignCell generates.",
    tags: ["sen", "signgraph", "site"], serviceName: "sen-predicate",
  },
  {
    name: "SEN Posit", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-posit", route: "/v1/sen/posit", method: "POST", price: "$0.005", category: "reasoning",
    compute: relating("./operations/inducing", "positOperation"),
    sample: (results) => ({ body: { site: results["sen-predicate"], valuation: [results["sen-articulate"]] } }),
    bodySchema: { type: "object", properties: { site: { type: "object" }, valuation: { type: "array" } }, required: ["site", "valuation"] },
    outputSchema: { type: "object" },
    title: "SEN Posit", description: "Posit a valuation (the cells told) over a SignGraph predication site, to the presheaf they make.",
    tags: ["sen", "signgraph", "presheaf"], serviceName: "sen-posit",
  },
  {
    name: "SEN Settle", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-settle", route: "/v1/sen/settle", method: "POST", price: "$0.008", category: "reasoning",
    compute: relating("./operations/inducing", "settleOperation"),
    sample: (results) => ({ body: results["sen-posit"] }),
    bodySchema: { type: "object" },
    outputSchema: { type: "object" },
    title: "SEN Settle", description: "Settle a posited SignGraph presheaf to its SignCraft least fixed point: the coordination-free settlement of what was told.",
    tags: ["sen", "signcraft", "settlement"], serviceName: "sen-settle",
  },
  {
    name: "SEN Induce Relation", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-induce", route: "/v1/sen/induce", method: "POST", price: "$0.01", category: "reasoning",
    compute: relating("./operations/inducing", "induceOperation"),
    sample: () => ({ body: { token: "alice", claim: "trusted" } }),
    bodySchema: { properties: { token: { type: "string" }, claim: { type: "string" } }, required: ["token", "claim"] },
    outputSchema: { type: "object" },
    title: "SEN Induce Relation", description: "The whole pipeline in one call: settle the relation one utterance articulates (utter, articulate, predicate, posit, and settle, composed).",
    tags: ["sen", "signcraft", "induce"], serviceName: "sen-induce",
  },
  {
    name: "SEN Relate Relations", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-relate-relations", route: "/v1/sen/relate-relations", method: "POST", price: "$0.01", category: "reasoning",
    compute: relating("./operations/inducing", "relateRelationsOperation"),
    sample: (results) => ({ body: { left: results["sen-induce"], right: results["sen-induce-second"] } }),
    bodySchema: { type: "object", properties: { left: { type: "object" }, right: { type: "object" } }, required: ["left", "right"] },
    outputSchema: { type: "object" },
    title: "SEN Relate Relations", description: "Relate two settled relations: re-settle their joined cells as one relation.",
    tags: ["sen", "signcraft", "relate"], serviceName: "sen-relate-relations",
  },
  {
    name: "SEN Coincide", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-coincide", route: "/v1/sen/coincide", method: "POST", price: "$0.002", category: "reasoning",
    compute: relating("./operations/inducing", "coincideOperation"),
    sample: () => ({ body: { left: "alice", right: "alice" } }),
    bodySchema: { properties: { left: {}, right: {} }, required: ["left", "right"] },
    outputSchema: { type: "object", properties: { kind: { type: "string" }, left: {}, right: {} } },
    title: "SEN Coincide", description: "Judge whether two Mark payloads coincide as token carriers: a witness or an obstruction.",
    tags: ["sen", "signcell", "coincidence"], serviceName: "sen-coincide",
  },
  {
    name: "SEN Canonicalize", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-canonicalize", route: "/v1/sen/canonicalize", method: "POST", price: "$0.001", category: "reasoning",
    compute: relating("./operations/realization", "canonicalizeOperation"),
    sample: () => ({ body: { b: 2, a: 1 } }),
    bodySchema: {},
    outputSchema: { type: "object" },
    title: "SEN Canonicalize", description: "Re-encode a JSON carrier in canonical form: the identity morphism on the JSON wire, witnessing representation-independence.",
    tags: ["sen", "canonical-json"], serviceName: "sen-canonicalize",
  },
  {
    name: "SEN Reading Conflation", gateway: "sen-relating", gatewayPackageName: RELATING_PACKAGE, section: RELATING_SECTION,
    operation: "sen-conflate-reading", route: "/v1/sen/conflate-reading/{name}", method: "GET", price: "$0.002", category: "reasoning",
    compute: relating("./operations/positing", "conflateReadingOperation"),
    sample: () => ({ params: { name: "unknown" } }),
    pathParamsSchema: { properties: { name: { enum: ["unknown", "held", "denied", "contested"] } }, required: ["name"] },
    outputSchema: { type: "string" },
    title: "SEN Reading Conflation", description: "SignChain's conflation of one reading, by its extremal name: exchange unknown and contested, fixing held and denied.",
    tags: ["sen", "signchain", "four"], serviceName: "sen-conflate-reading",
  },

  // — Content addressing —
  {
    name: "Content Address", gateway: "content-addressing", gatewayPackageName: CONTENT_PACKAGE, section: CONTENT_SECTION,
    operation: "content-address", route: "/v1/content-address", method: "POST", price: "$0.002", category: "data",
    compute: { package: CONTENT_PACKAGE, subpath: "./semantic-content-identity", export: "contentAddressOf", args: ["body"] },
    sample: () => ({ body: { objectKind: "example.document", value: { title: "Hello", tags: ["a", "b"] } } }),
    bodySchema: { properties: { objectKind: { type: "string" }, value: {} }, required: ["objectKind", "value"] },
    outputSchema: { type: "object", properties: { id: { type: "string" }, token: { type: "string" }, algorithm: { type: "string" }, mediaType: { type: "string" } } },
    title: "Content Address", description: "The exact, deterministic content id of one JSON value under one named object kind (SHA-256 over its canonical SEN encoding): the same value and kind always produce the same address.",
    tags: ["content-addressing", "sha-256", "sen"], serviceName: "content-address",
  },

  // — Schema validation —
  {
    name: "JSON Schema Validate", gateway: "schema-validation", gatewayPackageName: JSON_SCHEMA_PACKAGE, section: JSON_SCHEMA_SECTION,
    operation: "schema-validate", route: "/v1/schema/validate", method: "POST", price: "$0.005", category: "data",
    compute: { package: JSON_SCHEMA_PACKAGE, subpath: "./validation", export: "validateJson", args: ["body"] },
    sample: () => ({ body: { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } }, value: { name: 5 } } }),
    bodySchema: { properties: { schema: { type: "object" }, value: {}, schemas: { type: "array" } }, required: ["schema", "value"] },
    outputSchema: { type: "object", properties: { valid: { type: "boolean" }, errors: { type: "array" } } },
    title: "JSON Schema Validate", description: "Validate one JSON value against one JSON Schema document (2020-12), with an optional corpus of referenced schemas; reports every violation, not just the first.",
    tags: ["json-schema", "validation"], serviceName: "schema-validate",
  },

  // — Attention allocation: budget-constrained obstruction funding —
  {
    name: "Attention Allocation", gateway: "attention-allocation", gatewayPackageName: METROLOGIC_PACKAGE, section: METROLOGIC_SECTION,
    operation: "allocate-attention", route: "/v1/attention/allocate", method: "POST", price: "$0.02", category: "optimization",
    compute: { package: METROLOGIC_PACKAGE, subpath: "./obstruction/attention-allocation", export: "allocateAttention", args: ["body"] },
    sample: () => ({ body: { budget: 10, obstructions: [{ id: "a", cost: 4, benefit: 9 }, { id: "b", cost: 6, benefit: 10 }, { id: "c", cost: 3, benefit: 4 }] } }),
    bodySchema: {
      properties: {
        budget: { type: "integer", minimum: 0 },
        obstructions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, cost: { type: "integer", minimum: 0 }, benefit: { type: "integer", minimum: 0 } }, required: ["id", "cost", "benefit"] } },
      },
      required: ["budget", "obstructions"],
    },
    outputSchema: {
      type: "object",
      properties: {
        type: { type: "string" }, budget: { type: "integer" }, readNext: { type: "array", items: { type: "string" } },
        selected: { type: "array" }, cost: { type: "integer" }, benefit: { type: "integer" }, residual: { type: "integer" },
        exact: { type: "boolean" }, choiceBits: { type: "number" },
      },
    },
    title: "Attention Allocation", description: "The exactly-optimal (or, past the exhaustive-search bound, provably near-optimal) subset of budget-and-benefit candidates a fixed budget funds: a bounded-agent resource allocator.",
    tags: ["optimization", "resource-allocation", "obstruction"], serviceName: "attention-allocation",
  },
];

function outputOf(pick, example) {
  return { schema: pick.outputSchema, example };
}

function framingOf(pick) {
  return [{ key: "default", title: pick.title, description: pick.description, tags: pick.tags, serviceName: pick.serviceName }];
}

async function buildOffer(pick, sample) {
  const declaration = { method: pick.method, route: pick.route };
  const invoke = resolveBinding(pick.compute, declaration, {});
  const example = await invoke(sample);
  const offer = {
    name: pick.name,
    gateway: pick.gateway,
    gatewayPackageName: pick.gatewayPackageName,
    section: pick.section,
    operation: pick.operation,
    origin: ORIGIN,
    route: pick.route,
    method: pick.method,
    price: pick.price,
    category: pick.category,
    output: outputOf(pick, example),
    framings: framingOf(pick),
    ledgerAccount: incomeAccountFor(pick.gateway),
    markets: ["x402-bazaar", "402index", "house-capability-market", "house-seller-catalog"],
    compute: pick.compute,
    runtime: "node",
  };
  if (pick.method === "POST") {
    offer.bodyExample = sample.body;
    if (pick.bodySchema !== undefined && Object.keys(pick.bodySchema).length > 0) offer.bodySchema = pick.bodySchema;
  } else {
    if (sample.query !== undefined) offer.queryExample = sample.query;
    if (pick.querySchema !== undefined) offer.querySchema = pick.querySchema;
    if (pick.pathParamsSchema !== undefined) offer.pathParamsSchema = pick.pathParamsSchema;
    offer.probeUrl = expandUriTemplate({ template: ORIGIN + pick.route, variables: sample.params ?? {} }).uri;
  }
  return offer;
}

await runMain(async () => {
  const existing = JSON.parse(await readFileText(CATALOG_PATH));
  const existingOperations = new Set(existing.map((offer) => offer.operation));
  const added = [];
  const results = {};
  for (const pick of picks) {
    if (existingOperations.has(pick.operation)) continue;
    const sample = pick.sample(results);
    const offer = await buildOffer(pick, sample);
    results[pick.operation] = offer.output.example;
    if (pick.operation === "sen-induce") results["sen-induce-second"] = await (await resolveBinding(pick.compute, { method: pick.method, route: pick.route }, {}))({ body: { token: "bob", claim: "trusted" } });
    const admitted = declareOffer(offer, { admit: true }); // throws on any schema or ledger-account mismatch before it ever reaches disk
    added.push(admitted.declaration);
  }
  const merged = [...existing, ...added];
  await writeFileText(CATALOG_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  return { added: added.map((offer) => offer.operation), total: merged.length };
}, { moduleUrl: import.meta.url, formatResult: (result) => `${JSON.stringify(result)}\n` });

import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAFT_2020_12, SUPPORTED_VOCABULARY, createSchema, schemaCorpus, validateInstance,
  resolvePointer, unfoldSchema, foldSchema, foldSchemaAssertions, inspectSchema,
  mergeSchemaAssertions, parseSchemaAssertions, projectSchemaAssertions, serializeSchemaAssertions,
  schemaAssertionEavtId, schemaAssertionId,
} from "../src/index.mts";
import { census, censusClassified, classifyCensusEntry } from "../src/census.mts";

const make = (body, id = "example/schema") => createSchema({ $id: id, ...body }).schema;
test("fixed dialect, canonical identity, receipt and immutability", () => {
  const a = createSchema({ $id: "x", type: "object", properties: { b: { type: "string" }, a: { type: "number" } } });
  const b = createSchema({ properties: { a: { type: "number" }, b: { type: "string" } }, type: "object", $id: "x" });
  assert.equal(a.schema.$schema, DRAFT_2020_12); assert.equal(a.identity.canonicalBytes, b.identity.canonicalBytes); assert.equal(a.identity.sha256, b.identity.sha256); assert.match(a.identity.ni, /^ni:\/\/\/sha-256;/); assert.equal(a.identity.rmn, null); assert.equal(a.identity.schemaId, "x"); assert.equal(a.identity.eavtEntity, null); assert.equal(a.identity.filepath, null); assert.equal(a.identity.status, "sxc-ready-not-settled"); assert.throws(() => { a.schema.x = 1; }, TypeError); assert.throws(() => { a.schema.properties.a.type = "string"; }, TypeError);
  assert.throws(() => createSchema({ $id: "x", $schema: "https://json-schema.org/draft/2019-09/schema" }));
});
test("every advertised assertion keyword has a sensitivity witness", () => {
  const cases = {
    type: [{ type: "string" }, 1], enum: [{ enum: ["yes"] }, "no"], const: [{ const: "yes" }, "no"], required: [{ type: "object", required: ["x"] }, {}], properties: [{ type: "object", properties: { x: { type: "string" } } }, { x: 1 }], additionalProperties: [{ type: "object", properties: {}, additionalProperties: false }, { x: 1 }], items: [{ type: "array", items: { type: "string" } }, [1]], minItems: [{ type: "array", minItems: 2 }, [1]], maxItems: [{ type: "array", maxItems: 1 }, [1, 2]], minLength: [{ type: "string", minLength: 2 }, "x"], maxLength: [{ type: "string", maxLength: 1 }, "xx"], pattern: [{ type: "string", pattern: "^x$" }, "y"], minimum: [{ type: "number", minimum: 2 }, 1], maximum: [{ type: "number", maximum: 1 }, 2], exclusiveMinimum: [{ type: "number", exclusiveMinimum: 1 }, 1], exclusiveMaximum: [{ type: "number", exclusiveMaximum: 2 }, 2], multipleOf: [{ type: "number", multipleOf: 2 }, 3], allOf: [{ allOf: [{ type: "string" }] }, 1], anyOf: [{ anyOf: [{ const: "x" }] }, "y"], oneOf: [{ oneOf: [{ const: "x" }, { const: "y" }] }, "z"], not: [{ not: { const: "x" } }, "x"], if: [{ if: { const: "x" }, then: { type: "number" }, else: { type: "string" } }, "x"],
  };
  const nested = new Set(["properties", "items", "allOf", "if"]);
  for (const [keyword, [body, invalid]] of Object.entries(cases)) { const schema = make(body, `example/${keyword}`); const verdict = validateInstance(invalid, schema); assert.equal(verdict.ok, false, keyword); assert.equal(verdict.errors.some((error) => error.keyword === keyword || (nested.has(keyword) && error.keyword === "type")), true, keyword); }
  assert.equal(SUPPORTED_VOCABULARY.includes("$id"), true); assert.throws(() => createSchema({ $id: "x", format: "email" }), /unsupported/); assert.throws(() => createSchema({ $id: "x", madeUpKeyword: true }), /unsupported/);
});
test("bounded reference resolution rejects duplicates, external refs, fragments and cycles honestly", () => {
  const target = make({ type: "object", $defs: { name: { type: "string" } } }, "example/target"); const source = make({ $ref: "example/target#/$defs/name" }, "example/source"); const corpus = schemaCorpus([target, source]);
  assert.deepEqual(resolvePointer(target, "#/$defs/name"), { type: "string" }); assert.equal(validateInstance(4, source, corpus).ok, false); assert.throws(() => schemaCorpus([target, target]), /duplicate/); const external = make({ $ref: "https://example.invalid/schema" }, "example/external"); assert.equal(schemaCorpus([external]).resolve("https://example.invalid/schema", external), undefined); assert.equal(validateInstance("x", external).ok, false);
  const cyclic = make({ $ref: "#" }, "example/cycle"); assert.equal(validateInstance("x", cyclic).ok, false);
});
test("schema EAVT traces are permutation-stable and contradictions do not conflate identity", () => {
  const schema = make({ type: "object", properties: { x: { type: "array", items: { type: "string" } } } }, "example/eavt"); const rows = unfoldSchema(schema, "t1", "example/eavt"); const forward = foldSchemaAssertions(rows), backward = foldSchemaAssertions([...rows].reverse());
  assert.deepEqual(forward, backward); assert.equal(forward.contradictions.length, 0); const conflict = foldSchemaAssertions([{ e: "x", a: "/type", v: "string", t: "1" }, { e: "x", a: "/type", v: "number", t: "2" }]); assert.equal(conflict.schema, null); assert.equal(conflict.contradictions.length, 1);
  assert.deepEqual(foldSchema(rows), schema);
  assert.deepEqual(parseSchemaAssertions(serializeSchemaAssertions(rows)), rows);
  assert.deepEqual(mergeSchemaAssertions(rows, rows), mergeSchemaAssertions(rows));
  assert.equal(schemaAssertionEavtId(rows[0]), schemaAssertionId(rows[0]));
  assert.equal(projectSchemaAssertions(unfoldSchema({ type: "string" }, { base: "x", t: "1" }), { id: "example/projected" }).schema.$id, "example/projected");
});
test("recovered pool vocabulary evaluates instead of silently drifting", () => {
  const schema = make({
    type: "object", minProperties: 2, maxProperties: 2, propertyNames: { pattern: "^[a-z]+$" },
    properties: {
      tags: { type: "array", minItems: 1, uniqueItems: true, contains: { const: "held" } },
      when: { type: "string", format: "date-time" },
    }, required: ["tags", "when"], additionalProperties: false,
  }, "example/recovered");
  assert.equal(validateInstance({ tags: ["held"], when: "2026-07-29T12:00:00Z" }, schema).ok, true);
  const invalid = validateInstance({ tags: ["lost", "lost"], when: "not-a-date", Bad: true }, schema);
  assert.equal(invalid.ok, false);
  for (const keyword of ["pattern", "uniqueItems", "contains", "format", "additionalProperties"]) {
    assert.equal(invalid.errors.some((error) => error.keyword === keyword), true, keyword);
  }
});
test("pool inspection recovers authoring invariants without taking filesystem authority", () => {
  const invalid = { $schema: DRAFT_2020_12, $id: "example/broken", type: "object", required: ["missing"], properties: {}, additionalProperties: false, $defs: { unused: { type: "string" } } };
  const report = inspectSchema(invalid, new Set(["example/broken"]));
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((error) => error.keyword === "required"), true);
  assert.equal(report.errors.some((error) => error.keyword === "$defs"), true);
  const fragment = inspectSchema({ $schema: DRAFT_2020_12, $id: "example/source", type: "string", $ref: "example/target#/$defs/name" }, new Set(["example/source", "example/target"]));
  assert.equal(fragment.errors.some((error) => error.keyword === "$ref"), false);
  assert.throws(() => createSchema({ $id: "example/malformed", type: "object", properties: { x: 1 } }), /object or boolean schema/);
});
test("census classifies generations without promotion", () => {
  const result = census([{ path: "live/a.schema.json", content: '{"$schema":"x"}' }, { path: "legacy/a.schema.json", content: "{}" }, { path: "live/read-a-schema.js", content: "function validate(value, schema) {}" }, { path: "legacy/write-a-schema.js", content: "function schemaErrors(schema) {}" }, { path: "docs/schema.md", content: "JSON Schema notes" }]);
  assert.deepEqual(result.counts, { "schema-document": 1, "schema-implementation": 1, "legacy-schema-document": 1, "legacy-implementation": 1, other: 1 });
  assert.equal(result.roleCounts.documentation, 1);
  assert.deepEqual(censusClassified([{ path: "live/read-a-schema.js", content: "function validate(value, schema) {}" }].map(classifyCensusEntry)), census([{ path: "live/read-a-schema.js", content: "function validate(value, schema) {}" }]));
  assert.deepEqual(result.entries.filter((entry) => entry.legacyDisposition !== null).map((entry) => entry.legacyDisposition), ["retain-as-evidence", "supersede-with-explicit-migration"]);
});

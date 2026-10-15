import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { schemaFromGraph } from "@red-cup-engineering/json-schema-services-section/contracts";
import { defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { TmSchema, TySchema, tm, ty } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { stringDescriptor } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { admitOperation, COMPUTER_CODE_SPECIFICATION } from "@red-cup-engineering/computer-code-engineering-services-section/typed-operation";
import { COMPUTER_ENGINEERING_SPECIFICATION_ID, COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES } from "../src/specification.mjs";

const readSchema = (name) => JSON.parse(readFileSync(new URL(`../specifications/${name}.schema.json`, import.meta.url), "utf8"));
const operationSchema = readSchema("operation");
const senTermSchema = readSchema("sen-term");
const schemaGraph = [operationSchema, senTermSchema, ...COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES];
const contractFor = (root, schemas = schemaGraph) => schemaFromGraph({
  root: root.$id,
  schemas: schemas.map((schema) => ({ id: schema.$id, schema })),
});

function required(admission) {
  assert.equal(admission.ok, true, JSON.stringify(admission));
  return admission.value;
}

function identityDefinition() {
  // A genuine local Data declaration for the test's value carrier, not a schema
  // for Data declaration provenance or a replacement for an owner contract.
  const text = required(defineType({
    id: "urn:test:operation-specification:text",
    name: "Text",
    description: "Text carried by the specification admission test",
    parents: [],
    schema: { type: "string" },
  }));
  return {
    specification: COMPUTER_ENGINEERING_SPECIFICATION_ID,
    id: "specification-test-identity",
    domain: text,
    codomain: text,
    effects: [],
    body: {
      kind: "sen",
      term: tm.lam(tm.var(0)),
      inputDescriptor: stringDescriptor,
      outputDescriptor: stringDescriptor,
    },
  };
}

test("operation specification preserves the existing owner IDs and normalized version", () => {
  assert.equal(COMPUTER_ENGINEERING_SPECIFICATION_ID, "https://schemas.561.group/computer/computer-engineering.schema.json");
  assert.equal(COMPUTER_CODE_SPECIFICATION, COMPUTER_ENGINEERING_SPECIFICATION_ID);
  assert.equal(operationSchema.$id, "https://schemas.561.group/computer/operation.schema.json");
  assert.equal(senTermSchema.$id, "https://schemas.561.group/computer/sen-term.schema.json");
  assert.equal(operationSchema.properties.specification.const, COMPUTER_ENGINEERING_SPECIFICATION_ID);
  assert.equal(operationSchema.properties.version.const, 1);
  assert.equal(required(admitOperation(identityDefinition())).version, 1);
});

test("SEN syntax resolves the explicit source-owner schema graph without another grammar", () => {
  assert.equal(COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES.length, 2);
  assert.equal(COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES[0], TySchema);
  assert.equal(COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES[1], TmSchema);
  assert.equal(senTermSchema.$ref, TmSchema.$id);
  for (const keyword of ["type", "$defs", "oneOf", "anyOf", "properties", "items", "prefixItems"]) {
    assert.equal(Object.hasOwn(senTermSchema, keyword), false, `SEN reference must not define ${keyword}`);
  }
  const terms = contractFor(senTermSchema);
  assert.equal(terms.validate(tm.lam(tm.var(0))), true);
  assert.equal(terms.validate(tm.inl(tm.star(), ty.base())), true);
  assert.throws(() => contractFor(senTermSchema, [senTermSchema, TmSchema]), /Invalid schema graph/);
});

test("operation domain and codomain are opaque object carriers, never local provenance schemas", () => {
  assert.deepEqual(operationSchema.properties.domain, { type: "object" });
  assert.deepEqual(operationSchema.properties.codomain, { type: "object" });
  const admitted = required(admitOperation(identityDefinition()));
  const structural = contractFor(operationSchema);
  assert.equal(structural.validate({ ...admitted, domain: admitted.domain.id }), false);
  assert.equal(structural.validate({ ...admitted, codomain: admitted.codomain.id }), false);
});

test("the structural envelope receives genuine Code-admitted SEN and capability values", () => {
  const definition = identityDefinition();
  const structural = contractFor(operationSchema);
  const sen = required(admitOperation({ ...definition, description: "Specification test identity" }));
  assert.equal(structural.validate(sen), true, structural.errors(sen).join("; "));
  const capability = required(admitOperation({
    ...definition,
    effects: ["specification:test-read", "specification:test-read"],
    body: { kind: "capability-effect", capability: "specification:test-read", description: "Preserved owner body metadata" },
  }));
  assert.deepEqual(capability.effects, ["specification:test-read"]);
  assert.equal(structural.validate(capability), true, structural.errors(capability).join("; "));
});

test("a copied type object can satisfy the envelope without acquiring Data provenance", () => {
  const admitted = required(admitOperation(identityDefinition()));
  const copied = structuredClone(admitted);
  assert.equal(contractFor(operationSchema).validate(copied), true);
  const refusal = admitOperation(copied);
  assert.equal(refusal.ok, false);
  assert.equal(refusal.refusal.code, "InvalidOperation");
  assert.match(refusal.refusal.message, /established declarations/);
});

test("canonical syntax and descriptor presence do not replace Code's typed admission", () => {
  const admitted = required(admitOperation(identityDefinition()));
  const structural = contractFor(operationSchema);
  const wrongArrow = { ...admitted, body: { ...admitted.body, term: tm.star() } };
  assert.equal(structural.validate(wrongArrow), true);
  assert.equal(admitOperation(wrongArrow).ok, false);
  const unknownDescriptor = { ...admitted, body: { ...admitted.body, inputDescriptor: { kind: "unknown-test-descriptor" } } };
  assert.equal(structural.validate(unknownDescriptor), true);
  assert.equal(admitOperation(unknownDescriptor).ok, false);
  const missingDescriptor = { ...admitted, body: { kind: "sen", term: admitted.body.term, inputDescriptor: stringDescriptor } };
  assert.equal(structural.validate(missingDescriptor), false);
  assert.equal(admitOperation(missingDescriptor).ok, false);
});

test("the active SEN graph refuses each stale object constructor and the RMN body tag", () => {
  const variable = { kind: "variable", index: 0 };
  const staleTerms = [
    variable,
    { kind: "lambda", domain: {}, body: variable },
    { kind: "application", function: variable, argument: variable },
    { kind: "constant", value: "old", type: {} },
  ];
  const terms = contractFor(senTermSchema);
  const structural = contractFor(operationSchema);
  const admitted = required(admitOperation(identityDefinition()));
  for (const stale of staleTerms) {
    assert.equal(terms.validate(stale), false, stale.kind);
    assert.equal(structural.validate({ ...admitted, body: { ...admitted.body, term: stale } }), false, stale.kind);
  }
  assert.equal(structural.validate({ ...admitted, body: { kind: "rmn", term: variable } }), false);
});

test("SEN and composition carriers use the same explicit owner syntax graph", () => {
  const sen = readSchema("sen");
  const composition = readSchema("typed-functional-composition");
  const program = tm.lam(tm.var(0));
  assert.equal(contractFor(sen, [sen, ...schemaGraph]).validate({ language: "sen", term: program }), true);
  assert.equal(contractFor(composition, [composition, ...schemaGraph]).validate({ domain: "urn:test:input", codomain: "urn:test:output", term: program }), true);
});

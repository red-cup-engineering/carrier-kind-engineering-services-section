import test from "node:test";
import assert from "node:assert/strict";
import { compileJsonSchema } from "@red-cup-engineering/json-schema-engineering-services-section/validation";
import termSchema from "@red-cup-engineering/term-engineering-services-section/term.schema.json" with { type: "json" };
import { admitCarrierFrontmatter } from "@red-cup-engineering/carrier-kind-engineering-services-section";

const manuscript = { title: "Source note", description: "An attributed bibliography.", "date-created": "2026-11-16" };
const cite = { id: "source-1", title: "A source", type: "book", author: [{ family: "Example" }], issued: [{ year: 2010 }] };
const legacy = { example2010: { authors: ["Example"], year: 2010, title: "A source" } };
const admit = (kind, references) => admitCarrierFrontmatter(kind, { ...manuscript, references });

test("notes and manuscripts share authored references; glossary terms still use strict keyed records", () => {
  const termReferences = compileJsonSchema({ $ref: "glossary/terms/term#/properties/references" }, { references: [termSchema] });
  for (const kind of ["note", "research", "research-article", "research-paper"]) {
    assert.equal(admit(kind, legacy).admitted, true, kind);
    assert.equal(admit(kind, [cite]).admitted, true, kind);
  }
  assert.equal(termReferences.validate(legacy).valid, true);
  assert.equal(termReferences.validate([cite]).valid, false);
});

test("note reference bindings require an explicit local identifier and nonblank title", () => {
  for (const references of [[{ title: cite.title }], [{ id: cite.id }], [{ ...cite, id: "has space" }], [{ ...cite, title: " " }], [cite, null], "source-1", { example2010: { title: cite.title } }]) {
    const { admitted, findings } = admit("note", references);
    assert.equal(admitted, false, JSON.stringify(references));
    assert.deepEqual(findings.map(({ rule }) => rule), ["oneOf:references"]);
  }
});

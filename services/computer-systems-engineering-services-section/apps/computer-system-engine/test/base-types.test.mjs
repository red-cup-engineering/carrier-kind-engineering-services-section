import assert from "node:assert/strict";
import { test } from "node:test";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { receiptType, refusalType, ruleType } from "../src/generated/specification-declarations.mjs";
import { cellType, claimType, evidenceType, statementType } from "@red-cup-engineering/signcell/semantic-carriers";
const evidence = Object.freeze({
    kind: "evidence",
    source: "test",
    observedAt: new Date().toISOString(),
    content: {},
    provenance: ["test"],
});
test("cellType admits a well-formed cell and refuses the wrong kind", () => {
    assert.equal(admit(cellType, { kind: "cell", address: "urn:test:1", provenance: ["test"] }).ok, true);
    assert.equal(admit(cellType, { kind: "not-cell", address: "urn:test:1", provenance: ["test"] }).ok, false);
});
test("claimType admits a well-formed claim", () => {
    assert.equal(admit(claimType, { kind: "claim", subject: "a", predicate: "b", object: "c", provenance: ["test"] }).ok, true);
});
test("evidenceType admits a well-formed evidence carrier", () => {
    assert.equal(admit(evidenceType, evidence).ok, true);
});
test("receiptType admits real evidence and a real actor address, refuses a malformed address", () => {
    assert.equal(admit(receiptType, { kind: "receipt", effect: "e1", receiver: "actor:abc123", evidence }).ok, true);
    assert.equal(admit(receiptType, { kind: "receipt", effect: "e1", receiver: "not-an-actor-address", evidence }).ok, false);
});
test("refusalType admits real evidence", () => {
    assert.equal(admit(refusalType, { kind: "refusal", code: "x", message: "no", evidence }).ok, true);
});
test("ruleType admits a well-formed rule", () => {
    assert.equal(admit(ruleType, { kind: "rule", statement: "test", provenance: ["test"] }).ok, true);
});
test("statementType admits a well-formed four-place assertion", () => {
    assert.equal(admit(statementType, { subject: {}, predicate: "p", object: {}, witness: evidence }).ok, true);
});

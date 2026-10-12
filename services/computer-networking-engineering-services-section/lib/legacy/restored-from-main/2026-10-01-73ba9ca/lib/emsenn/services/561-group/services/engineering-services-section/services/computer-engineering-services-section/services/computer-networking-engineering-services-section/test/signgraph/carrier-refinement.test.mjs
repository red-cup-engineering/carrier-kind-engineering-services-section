import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { decodeCarrierRefinementReceipt, encodeCarrierRefinementReceipt, normalizeCarrierRefinementReceipt } from "../../src/signgraph/carrier-refinement.mjs";
const id = (label) => semanticId(["mark", label]);
const receipt = { kind: "CircuitCarrierRefinementReceipt", profile: "org.emsenn.infomaterial.carrier-refinement.v1", proofProfile: "golden.v7", provider: "eip155:1:0x0000000000000000000000000000000000000001", producer: "eip155:1:0x0000000000000000000000000000000000000002", component: id("component"), behavior: id("behavior"), carrier: id("carrier"), materialRoot: id("material"), observation: id("observation"), proof: id("proof"), equivalent: true, customerMaterialMutated: false };
test("v7 golden receipt carrier round trips canonically", () => { const encoded = encodeCarrierRefinementReceipt(receipt); assert.deepEqual(decodeCarrierRefinementReceipt(encoded.type, encoded.term), normalizeCarrierRefinementReceipt(receipt)); });

import assert from "node:assert/strict";
import test from "node:test";
import { defineType } from "@red-cup-engineering/computer-system-engine/type-system";
import { createSignCell, admitSignCell, referenceOf } from "../src/articulation/predicating/positing/semantic-cell.mjs";
import { createSignClaim, conflateCharges, conflateClaims } from "../src/articulation/predicating/positing/semantic-claim.mjs";
import { createSignGraph, mergeSignGraphs } from "../src/articulation/predicating/positing/semantic-graph.mjs";
const defined = defineType({ id: "test.semantic.source@1", name: "Semantic source", description: "A source used to prove carrier admission.", schema: { type: "object", required: ["text"], properties: { text: { type: "string", minLength: 1 } }, additionalProperties: false }, parents: [] });
if (!defined.ok) throw new Error(defined.refusal.message);
const cell = createSignCell(defined.value, { text: "retained evidence" });
if (!cell.ok) throw new Error(cell.refusal.message);
test("semantic cell re-admits its typed content and address", () => {
  assert.equal(cell.value.id, "ni:///sha-256;oWtv3rlseG_wCqhX4zK65U-hu-WNpdG7G0abbboV1_w");
  assert.equal(admitSignCell(defined.value, cell.value).ok, true);
  assert.equal(admitSignCell(defined.value, { ...cell.value, id: "ni:wrong" }).ok, false);
});
test("semantic claim uses the shared twist-product knowledge join", () => {
  const claim = createSignClaim({ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), charge: "potential" });
  assert.equal(claim.ok, true);
  const negative = createSignClaim({ ...claim.value, charge: "active" });
  assert.equal(negative.ok, true);
  assert.equal(conflateClaims(claim.value, negative.value).value.charge, "stable");
  assert.equal(conflateCharges("potential", "active"), "stable");
  assert.equal(createSignClaim({ ...claim.value, charge: "true" }).ok, false);
});
test("semantic graph preserves typed endpoint and witness membership through admission and merge", () => {
  const relation = { id: "supports", subjectTypes: [defined.value.id], objectTypes: [defined.value.id], witnessTypes: [defined.value.id] };
  const full = createSignGraph({ cells: [cell.value], relations: [relation], edges: [{ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), witness: referenceOf(cell.value) }] });
  assert.equal(full.ok, true); if (!full.ok) return;
  assert.equal(full.value.id, "ni:///sha-256;sQ_icxkbBiToJI5qiTE8-TCdG9UL2p2n9wVT0Hj0XfE");
  assert.equal(full.value.edges[0].id, "ni:///sha-256;dG_VsLua-oJh5wddUB8sWBvroPZGLQghjmTsxP3zqiQ");
  const empty = createSignGraph({ cells: [cell.value], relations: [relation], edges: [] });
  assert.equal(empty.ok, true); if (!empty.ok) return;
  const merged = mergeSignGraphs(empty.value, full.value);
  assert.equal(merged.ok, true); if (!merged.ok) return;
  assert.equal(merged.value.edges.length, 1);
  const wrong = createSignGraph({ cells: [cell.value], relations: [{ ...relation, witnessTypes: ["different@1"] }], edges: [{ subject: referenceOf(cell.value), predicate: "supports", object: referenceOf(cell.value), witness: referenceOf(cell.value) }] });
  assert.equal(wrong.ok, false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { enterpriseOf } from "../../src/enterprise/constitution.mjs";
import { valueAddedStatement } from "../../src/enterprise/statement.mjs";

test("an enterprise without a taking policy remains an admitted JSON value", () => {
  const enterprise = enterpriseOf({ id: "engineering", kind: "node" });
  assert.equal(Object.hasOwn(enterprise, "takes"), false);
  assert.equal(Object.hasOwn(enterprise, "key"), false);
  const explicitNull = enterpriseOf({ id: "engineering-null", kind: "node", key: null });
  assert.equal(Object.hasOwn(explicitNull, "key"), true);
  assert.equal(explicitNull.key, null);
  assert.doesNotThrow(() => identifyJsonSemanticContent({
    objectKind: "561-group.business-readout.v1",
    value: { type: "GroupBusinessReadout", enterprises: [enterprise, explicitNull] },
    witnessRoot: EMPTY_WITNESS_ROOT,
  }));
});

test("an unbounded enterprise reading omits absent period endpoints before SEN admission", () => {
  const statement = valueAddedStatement({
    enterprise: { id: "engineering", name: "Engineering", kind: "node", faces: null },
    period: { from: undefined, to: undefined },
  });
  assert.deepEqual(statement.period, {});
  assert.doesNotThrow(() => identifyJsonSemanticContent({
    objectKind: "561-group.business-readout.v1",
    value: { type: "GroupBusinessReadout", enterprises: [{ statement }] },
    witnessRoot: EMPTY_WITNESS_ROOT,
  }));
});

test("a supplied null endpoint and concrete observation bounds remain distinct", () => {
  const explicitNull = valueAddedStatement({
    enterprise: { id: "engineering", name: "Engineering", kind: "node", faces: null },
    period: { from: null, to: "2026-10-04T00:00:00.000Z" },
  });
  const bounded = valueAddedStatement({
    enterprise: { id: "engineering", name: "Engineering", kind: "node", faces: null },
    period: { from: "2026-10-03T00:00:00.000Z", to: "2026-10-04T00:00:00.000Z" },
  });
  assert.deepEqual(explicitNull.period, { from: null, to: "2026-10-04T00:00:00.000Z" });
  assert.deepEqual(bounded.period, { from: "2026-10-03T00:00:00.000Z", to: "2026-10-04T00:00:00.000Z" });
  assert.doesNotThrow(() => identifyJsonSemanticContent({
    objectKind: "561-group.business-readout.v1",
    value: { type: "GroupBusinessReadout", enterprises: [explicitNull, bounded] },
    witnessRoot: EMPTY_WITNESS_ROOT,
  }));
});

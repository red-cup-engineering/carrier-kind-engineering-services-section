import { nonportableOperations, operation, operationIrAudit } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { actions } from "@red-cup-engineering/relating/actions";
import { articulationCellCarrier, utteranceCarrier } from "@red-cup-engineering/relating/carriers";
import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";

describe("src/actions package realization", () => {
  it("exports one intentional registered action family", () => {
    assert.equal(actions.length, 25);
    const verbs = actions.map((act) => act.verb);
    assert.deepEqual([...new Set(verbs)].sort(), [...verbs].sort());
    for (const verb of ["utter", "articulate", "predicate", "posit", "settle", "induce-relation", "inspect"]) {
      assert.ok(verbs.includes(verb), `missing ${verb}`);
    }
  });

  it("projects one discovery bin per action without changing action ownership", () => {
    const induced = induceSurface(actions, { packageName: "@red-cup-engineering/relating" });
    assert.equal(induced.discovery.programs.length, actions.length);
    assert.equal(
      induced.discovery.programs.find((bin) => bin.name === "settle").domainSchema.$ref,
      "relating/settlement-admission",
    );
  });

  it("requires carrier-to-carrier morphisms to carry SEN bodies", () => {
    assert.deepEqual(nonportableOperations(actions), []);
    const audit = operationIrAudit(actions);
    assert.ok(audit.some((entry) => entry.verb === "settle" && entry.relation === "morphism" && entry.hasRunTerm));

    const illegal = operation({
      verb: "illegal-ts-morphism",
      inputFormat: "json",
      outputFormat: "json",
      domain: utteranceCarrier,
      codomain: articulationCellCarrier,
      run: (value) => value,
    });
    assert.deepEqual(nonportableOperations([illegal]).map((entry) => entry.verb), ["illegal-ts-morphism"]);
  });
});

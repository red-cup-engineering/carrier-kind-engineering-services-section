import { compose, operation, programObject } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { programObject } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dispatch } from "@red-cup-engineering/computer-system-engine/rpc/verb-dispatch";
import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { tm, ty } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { booleanDescriptor, descriptorTy, encodeDescriptor, nullDescriptor, projectField, recordDescriptor } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { checkTy } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";

function compositionFixture() {
  const source = schemaFrom({ $id: "relating/test/composition/source", type: "object" });
  const intermediate = schemaFrom({ $id: "relating/test/composition/intermediate", type: "boolean" });
  const target = schemaFrom({ $id: "relating/test/composition/target", type: "boolean" });
  const sourceDescriptor = recordDescriptor({ selected: booleanDescriptor });
  const producer = operation({
    verb: "composition-producer",
    domain: source,
    codomain: intermediate,
    inputDescriptor: sourceDescriptor,
    outputDescriptor: booleanDescriptor,
    runTerm: tm.lam(tm.app(
      tm.lam(projectField(["selected"], "selected", tm.var(0))),
      tm.var(0),
    )),
  });
  const consumer = operation({
    verb: "composition-consumer",
    domain: intermediate,
    codomain: target,
    inputDescriptor: booleanDescriptor,
    outputDescriptor: booleanDescriptor,
    runTerm: tm.lam(tm.app(tm.lam(tm.var(0)), tm.var(0))),
  });
  return { producer, consumer, sourceDescriptor };
}

describe("SEN action composition", () => {
  it("refuses an action with competing host and SEN bodies", () => {
    assert.throws(
      () => operation({
        verb: "composition-dual-body",
        run: (input) => input,
        runTerm: tm.lam(tm.var(0)),
      }),
      /run and runTerm are mutually exclusive/u,
    );
  });

  it("runs consumer after a nested-binder record projection as one typed serializable morphism", () => {
    const { producer, consumer, sourceDescriptor } = compositionFixture();
    const composed = compose(producer, consumer, "composition-composed");
    const input = { selected: true };

    assert.equal(producer.execute(input, {}), true);
    assert.equal(consumer.execute(producer.execute(input, {}), {}), true);
    assert.equal(composed.run(input, {}), true);
    assert.throws(() => consumer.execute(input, {}), /must be boolean/u);
    assert.equal(checkTy([], composed.runTerm, ty.arrow(descriptorTy(sourceDescriptor), descriptorTy(booleanDescriptor))), true);
    assert.deepEqual(JSON.parse(JSON.stringify(programObject(composed))).runTerm, composed.runTerm);

    const direct = dispatch([composed], [composed.verb], '{"selected":true}');
    const induced = induceSurface([composed], { packageName: "relating-composition-test" }).dispatch([composed.verb], '{"selected":true}');
    assert.deepEqual(induced, direct);
    assert.deepEqual(direct, { code: 0, stdout: "true\n", stderr: "" });
  });

  it("refuses a shared carrier address whose SEN intermediate types differ", () => {
    const { producer, consumer } = compositionFixture();
    const incompatible = operation({
      verb: "composition-incompatible",
      domain: consumer.domain,
      codomain: consumer.codomain,
      inputDescriptor: nullDescriptor,
      outputDescriptor: booleanDescriptor,
      runTerm: tm.lam(encodeDescriptor(booleanDescriptor, true)),
    });
    assert.throws(
      () => compose(producer, incompatible, "composition-refused"),
      /output SEN type ≠ composition-incompatible input SEN type/u,
    );
  });

  it("refuses different record codecs even when their SEN types coincide", () => {
    const intermediate = schemaFrom({ $id: "relating/test/composition/codec-intermediate", type: "object" });
    const source = schemaFrom({ $id: "relating/test/composition/codec-source", type: "boolean" });
    const target = schemaFrom({ $id: "relating/test/composition/codec-target", type: "boolean" });
    const alpha = recordDescriptor({ alpha: booleanDescriptor });
    const omega = recordDescriptor({ omega: booleanDescriptor });
    assert.deepEqual(descriptorTy(alpha), descriptorTy(omega));
    const producer = operation({
      verb: "composition-alpha",
      domain: source,
      codomain: intermediate,
      inputDescriptor: booleanDescriptor,
      outputDescriptor: alpha,
      runTerm: tm.lam(encodeDescriptor(alpha, { alpha: true })),
    });
    const consumer = operation({
      verb: "composition-omega",
      domain: intermediate,
      codomain: target,
      inputDescriptor: omega,
      outputDescriptor: booleanDescriptor,
      runTerm: tm.lam(encodeDescriptor(booleanDescriptor, true)),
    });
    assert.throws(
      () => compose(producer, consumer, "composition-codec-refused"),
      /output descriptor ≠ composition-omega input descriptor/u,
    );
  });
});

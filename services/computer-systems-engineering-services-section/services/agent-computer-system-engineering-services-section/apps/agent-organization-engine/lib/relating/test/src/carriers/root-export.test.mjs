import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { articulationCellCarrier, memeCarrier, tmCarrier, tyCarrier, utteranceCarrier } from "@red-cup-engineering/relating/carriers";
import { carrierById, registerCarrier } from "@red-cup-engineering/json-schema-services-section/contracts";
import { utterance } from "@red-cup-engineering/signcell/cell";
import { articulate } from "@red-cup-engineering/signcell/utterance";

describe("src/carriers package realization", () => {
  it("realizes pure shapes as runtime carriers with stable ids", () => {
    assert.deepEqual(
      [utteranceCarrier.id, articulationCellCarrier.id, memeCarrier.id, tyCarrier.id, tmCarrier.id],
      [
        "relating/articulating/utterance",
        "relating/articulating/articulation-cell",
        "relating/articulating/predicating/positing/meme",
        "semiotic-expression-notation/term/ty",
        "semiotic-expression-notation/term/tm",
      ],
    );
  });

  it("validates admitted package carriers without owning their material law", () => {
    const admitted = utterance("left", "right");
    assert.equal(utteranceCarrier.validate(admitted), true);
    assert.equal(utteranceCarrier.validate({ kind: "utterance.carrier" }), false);
    assert.equal(articulationCellCarrier.validate(articulate(admitted)), true);
  });

  it("keeps one immutable schema meaning for each carrier identity", () => {
    const first = schemaFrom({
      $id: "relating/test/carrier-registry/equivalent",
      type: "object",
      required: ["value"],
      properties: { value: { type: "string" } },
    });
    const repeated = schemaFrom({
      properties: { value: { type: "string" } },
      required: ["value"],
      type: "object",
      $id: "relating/test/carrier-registry/equivalent",
    });
    assert.strictEqual(repeated, first);
    assert.strictEqual(carrierById(first.id), first);
    assert.throws(
      () => schemaFrom({ $id: first.id, type: "string" }),
      /incompatible schema redefinition/u,
    );
  });

  it("snapshots and freezes carrier schemas before validation", () => {
    const schema = {
      $id: "relating/test/carrier-registry/immutable",
      type: "object",
      required: ["payload"],
      properties: { payload: { type: "object", properties: { value: { type: "string" } } } },
    };
    const carrier = schemaFrom(schema);
    schema.properties.payload.properties.value.type = "number";
    assert.equal(carrier.validate({ payload: { value: "kept" } }), true);
    assert.equal(carrier.validate({ payload: { value: 4 } }), false);
    assert.equal(Object.isFrozen(carrier.schema), true);
    assert.equal(Object.isFrozen(carrier.schema.properties), true);
    assert.equal(Object.isFrozen(carrier.schema.properties.payload), true);
  });

  it("normalizes direct registration to the admitted schema", () => {
    const schema = { $id: "relating/test/carrier-registry/direct", type: "string" };
    const registered = registerCarrier({
      kind: "relating.carrier",
      id: schema.$id,
      schema,
      validate: () => true,
      assert: (value) => value,
      errors: () => [],
    });
    schema.type = "number";
    assert.equal(registered.validate("kept"), true);
    assert.equal(registered.validate(4), false);
    assert.throws(() => registered.assert(4), /must be string/u);
  });

  it("uses shared JSON Schema const, enum, and external fragments", () => {
    const target = schemaFrom({
      $id: "relating/test/carrier-registry/shared-target",
      $defs: { label: { enum: ["green", "blue"] } },
      type: "object",
      properties: { fixed: { const: { family: "carrier" } } },
      required: ["fixed"],
    });
    const source = schemaFrom({
      $id: "relating/test/carrier-registry/shared-source",
      type: "object",
      properties: {
        fixed: { const: { family: "carrier" } },
        label: { $ref: "relating/test/carrier-registry/shared-target#/$defs/label" },
      },
      required: ["fixed", "label"],
      additionalProperties: false,
    });
    assert.equal(target.validate({ fixed: { family: "carrier" } }), true);
    assert.equal(source.validate({ fixed: { family: "carrier" }, label: "green" }), true);
    assert.equal(source.validate({ fixed: { family: "other" }, label: "green" }), false);
    assert.equal(source.validate({ fixed: { family: "carrier" }, label: "red" }), false);
  });

  it("refuses an unresolved external schema reference", () => {
    const carrier = schemaFrom({
      $id: "relating/test/carrier-registry/unresolved-reference",
      $ref: "relating/test/carrier-registry/missing#/value",
    });
    assert.equal(carrier.validate("anything"), false);
    assert.match(carrier.errors("anything").join(" "), /reference|schema/iu);
  });

  it("refuses a direct registration whose carrier and schema identities differ", () => {
    assert.throws(
      () => registerCarrier({
        kind: "relating.carrier",
        id: "relating/test/carrier-registry/claimed",
        schema: { $id: "relating/test/carrier-registry/actual", type: "string" },
        validate: () => true,
        assert: (value) => value,
        errors: () => [],
      }),
      /id and schema \$id differ/u,
    );
  });
});

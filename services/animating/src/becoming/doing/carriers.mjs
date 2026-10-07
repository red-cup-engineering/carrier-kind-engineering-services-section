/**
 * carriers — the doing-stage carrier (stage 2) and the act-factorization carrier.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { belnapSchema } from "../../carriers.mjs";
import { spineProperties } from "../spine.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 };
const facultySchema = { enum: ["communicating", "knowing", "playing"] };
const axisSchema = { enum: ["truth", "knowledge", "evidence"] };

export const doingSchema = {
  $id: "animating/becoming/doing",
  title: "Doing",
  description:
    "Stage 2 of the agency descent, generated WITHIN becoming: the AGENCY reading of relating's `predicate` at the predicating stage (transfinite-bounded regime). $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "faculty", "entities", "predicates", "cells", "valued"],
  properties: {
    kind: { const: "animating.becoming.doing" },
    ...spineProperties("predicating"),
    face: { const: "agential" },
    epistemic: { const: "judgement" },
    faculty: { const: "communicating" },
    entities: nonnegativeIntegerSchema,
    predicates: nonnegativeIntegerSchema,
    cells: nonnegativeIntegerSchema,
    valued: { const: false },
  },
};

export const doingCarrier = schemaFrom(doingSchema);

export const factorizationSchema = {
  $id: "animating/becoming/doing/factorization",
  title: "Factorization",
  description:
    "The agentive-triad ACT-FACTORIZATION of one face's act: locution, illocution, perlocution, and the face's OWN axis-typed FOUR census. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "faculty", "dual", "axis", "locution", "illocution", "perlocution", "belnap"],
  properties: {
    kind: { const: "animating.factorization" },
    faculty: facultySchema,
    dual: { const: "producing" },
    axis: axisSchema,
    locution: nonnegativeIntegerSchema,
    illocution: nonnegativeIntegerSchema,
    perlocution: nonnegativeIntegerSchema,
    belnap: belnapSchema,
  },
};

export const factorizationCarrier = schemaFrom(factorizationSchema);

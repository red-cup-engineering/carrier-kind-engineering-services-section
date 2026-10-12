import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { spineProperties } from "../../spine.mjs";
/**
 * carriers — the working-stage carrier (stage 3 of the agency descent).
 */

export const workingSchema = {
  $id: "animating/becoming/doing/working",
  title: "Working",
  description:
    "Stage 3 of the agency descent, generated WITHIN doing: the AGENCY reading of relating's `posit` at the positing stage (scott regime). $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "faculty", "cells", "valuations", "valued", "cohomology"],
  properties: {
    kind: { const: "animating.becoming.doing.working" },
    ...spineProperties("positing"),
    face: { const: "agentic" },
    epistemic: { const: "belief" },
    faculty: { const: "knowing" },
    cells: { type: "integer", minimum: 0 },
    valuations: { type: "integer", minimum: 1 },
    valued: { const: true },
    cohomology: { type: "object" },
  },
};

export const workingCarrier = schemaFrom(workingSchema);

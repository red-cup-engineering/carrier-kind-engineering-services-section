import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { spineProperties } from "./spine.mjs";
/**
 * carriers — the becoming stage carrier (stage 1 of the agency descent).
 */

export const becomingSchema = {
  $id: "animating/becoming",
  title: "Becoming",
  description:
    "Stage 1 of the agency descent: the AGENCY reading of relating's `articulate` at the articulating stage (aperiodic regime). $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "seed", "cells", "openAbove"],
  properties: {
    kind: { const: "animating.becoming" },
    ...spineProperties("articulating"),
    face: { const: "animate" },
    epistemic: { const: "question" },
    seed: { type: "array", items: { type: "string" } },
    cells: { type: "integer", minimum: 0 },
    openAbove: { const: true },
  },
};

export const becomingCarrier = schemaFrom(becomingSchema);

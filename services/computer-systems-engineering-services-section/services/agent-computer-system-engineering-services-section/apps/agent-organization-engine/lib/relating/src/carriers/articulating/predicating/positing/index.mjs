
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { kindCarrier } from "../../../kind.mjs";
import { readingSchema } from "@red-cup-engineering/computer-data-engineering-services-section/four";

export const positPresheafCarrier = kindCarrier(
  "relating/articulating/predicating/positing/presheaf",
  { const: "signgraph.presheaf" },
  "PositPresheaf",
  "A SignGraph presheaf: a site and the valuations posited over it.",
);

export const readingNameCarrier = schemaFrom({
  $id: "relating/articulating/predicating/positing/reading-name",
  ...readingSchema("extremal"),
  title: "ReadingName",
  description: "A reading: one of the four points of SignChain's evidence bilattice, by its extremal name.",
});

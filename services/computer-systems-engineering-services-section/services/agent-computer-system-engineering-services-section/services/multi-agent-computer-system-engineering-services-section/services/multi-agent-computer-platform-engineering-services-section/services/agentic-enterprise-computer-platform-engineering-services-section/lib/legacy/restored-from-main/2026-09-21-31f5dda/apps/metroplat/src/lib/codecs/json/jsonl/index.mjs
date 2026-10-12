/**
 * codecs/json/jsonl — the JSONL serialization boundary.
 *
 * The identity-rung holography projector beneath every JSONL-shaped codec
 * (EAVT rows, session catalog entries, …): it carries parsed JSONL rows
 * verbatim, the way `codecs/text`'s `stringProjector` carries a whole string
 * verbatim. `jsonl-services-section` supplies the line parse/serialize
 * primitives; this module is the one place that wraps them as a projector,
 * so every restriction of it (`eavt/row.mjs`'s `eavtProjector`,
 * `presentation/catalog.mjs`'s session projectors, …) shares one definition.
 */
import { define } from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";
import { isJsonlText, parseLines, serializeLines } from "../../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/src/index.mjs";

/** The JSONL serialization as a holography projector over rows. */
export const jsonlProjector = define({
  type: "jsonl",
  corner: "bottom",
  rung: "identity",
  recognize: (resource) => isJsonlText(resource.content),
  read: (resource) => parseLines(resource.content),
  write: (rows) => serializeLines(rows),
});

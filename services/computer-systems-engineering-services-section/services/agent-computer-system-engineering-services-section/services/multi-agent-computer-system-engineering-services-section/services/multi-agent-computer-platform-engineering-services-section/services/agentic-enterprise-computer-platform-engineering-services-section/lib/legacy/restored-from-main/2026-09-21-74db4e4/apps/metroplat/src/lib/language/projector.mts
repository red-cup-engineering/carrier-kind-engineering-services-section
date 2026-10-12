/**
 * RMN projection adapter.
 *
 * The formal core owns both RMN admission and the pure projector lattice.
 */
import { parse as parseJson, jsonProjector, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { canonicalBytes } from "../identity/index.mts";
import { isRelationalTerm } from "@red-cup-engineering/relation-model-notation/reader";
import { restrict, type Projector } from "@red-cup-engineering/computer-data-engineering-services-section/typed-resource-classification";

export const rmnProjector: Projector<JsonValue> = restrict(jsonProjector, {
  type: "rmn",
  corner: "assertion",
  rung: "scott",
  recognize: (resource) => {
    try {
      return isRelationalTerm(JSON.parse(resource.content));
    } catch {
      return false;
    }
  },
  read: (resource) => [parseJson(resource.content)],
  write: (items) => items.map((item) => canonicalBytes(item)).join("\n"),
});

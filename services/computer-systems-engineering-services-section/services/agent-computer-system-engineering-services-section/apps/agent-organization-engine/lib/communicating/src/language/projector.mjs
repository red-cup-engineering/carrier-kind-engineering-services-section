/**
 * SEN projection adapter.
 *
 * The formal core owns both SEN admission and the pure projector lattice.
 */
import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { isRelationalTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/reader";
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { jsonProjector } from "@red-cup-engineering/computer-content-engineering-services-section/json-projector";

export const senProjector = restrict(jsonProjector, {
  type: "sen",
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
  write: (items) => items.map((item) => canonicalJson(item)).join("\n"),
});

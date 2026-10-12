/**
 * SEN projection adapter.
 *
 * The formal core owns both SEN admission and the pure projector lattice.
 * The strict grade belongs to finite syntax admission, not evaluation of the
 * carried term. No semantic completion is performed by this adapter.
 */
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { isRelationalTerm, parseSen } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/reader";
import { restrict } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { jsonProjector } from "@red-cup-engineering/computer-content-engineering-services-section/json-projector";

export const senProjector = restrict(jsonProjector, {
  type: "sen",
  corner: "assertion",
  rung: "strict",
  recognize: (resource) => {
    try {
      return isRelationalTerm(JSON.parse(resource.content));
    } catch {
      return false;
    }
  },
  read: (resource) => [parseSen(resource.content)],
  // Preserve this adapter's existing multi-item, no-final-newline byte form.
  write: (items) => items.map((item) => {
    const document = canonicalJson(item);
    parseSen(document);
    return document;
  }).join("\n"),
});

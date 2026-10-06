/**
 * @packageDocumentation
 *
* schema/conformance - whether a schema contract still admits
 * the runtime material claimed to inhabit it. `./contract` already projects a
 * schema into a runtime `validate`/`errors` pair; this module folds that
 * per-value check over a bounded, provenanced sample into one per-schema
 * verdict, so "this schema no longer fits the material it carries" is a
 * evidenced classification rather than an archaeology find — the
 * `gluedClaimSessionsSchema`/`growth` incident this generalizes.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

/** One piece of runtime material claimed to inhabit a schema contract, with where it
 *  came from (a state-cut path, a claim-session row address, a live derive
 *  call) so a drifted verdict points at real evidence, not just a shape. */

export const schemaConformanceVerdictSchema = {
  $id: "metroplat/schema/kernel/conformance-verdict",
  title: "SchemaConformanceVerdict",
  description: "Per-schema readout of whether a schema contract still admits a bounded sample of runtime material: conformant (every sample validates), drifted (some sample fails and carries the failing JSON pointer plus sample provenance), or unexercised (no material found).",
  type: "object",
  required: ["kind", "schemaId", "classification", "sampled"],
  properties: {
    kind: { const: "metroplat.schema.conformanceVerdict" },
    schemaId: { type: "string", minLength: 1 },
    classification: { enum: ["conformant", "drifted", "unexercised"] },
    sampled: { type: "integer", minimum: 0 },
    failure: {
      type: "object",
      required: ["pointer", "provenance"],
      properties: {
        pointer: { type: "string", minLength: 1 },
        provenance: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const schemaConformanceVerdict = schemaFrom(schemaConformanceVerdictSchema);

/** A schema contract's own `errors()` convention prefixes every message with its
 *  JSON pointer followed by a space (`${pointer} ${message}`, the pointer
 *  always starting with `/` — see `validateAgainst` in `./contract`, the only
 *  structural validator this package runs). Reading that pointer back out is
 *  reading the sibling module's own emitted structure, not sniffing foreign
 *  text. */
function firstErrorPointer(error) {
  const space = error.indexOf(" ");
  const pointer = space === -1 ? error : error.slice(0, space);
  return pointer.startsWith("/") ? pointer : "/";
}

/**
 * Classify one schema contract against a bounded, ordered sample of runtime
 * material: no sample -> `unexercised`; every sample validates ->
 * `conformant`; the first sample (in the given order) that fails ->
 * `drifted`, carrying that sample's first JSON-pointer failure and
 * provenance. Which samples were gathered, and in what order, is entirely
 * the caller's decision — this function only folds `SchemaContract.errors` over
 * them.
 */
export function conformanceOf(schema, samples) {
  if (samples.length === 0) {
    return Object.freeze({
      kind: "metroplat.schema.conformanceVerdict",
      schemaId: schema.id,
      classification: "unexercised",
      sampled: 0,
    });
  }
  for (const sample of samples) {
    const errors = schema.errors(sample.value);
    if (errors.length > 0) {
      return Object.freeze({
        kind: "metroplat.schema.conformanceVerdict",
        schemaId: schema.id,
        classification: "drifted",
        sampled: samples.length,
        failure: Object.freeze({ pointer: firstErrorPointer(errors[0]), provenance: sample.provenance }),
      });
    }
  }
  return Object.freeze({
    kind: "metroplat.schema.conformanceVerdict",
    schemaId: schema.id,
    classification: "conformant",
    sampled: samples.length,
  });
}

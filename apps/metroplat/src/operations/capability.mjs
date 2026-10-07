/**
 * @packageDocumentation
 *
 * operations/capability — operator-run admission of MetroPlat
 * capability-assertion grants (see `http-options.mts#assertedHttpSubject` for
 * the subject class this exists for: a gateway-asserted per-request subject,
 * which the HTTP composition root never grants standing automatically).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import {
  can,
  capabilityAssertionContract,
  capabilityStandingContract,
  grantAssertion,

} from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import {
  admitCapabilityAssertions,
  readCapabilityAssertions,
} from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const CAPABILITY_ASSERTION_ADMIT_ISSUER = "infograph:capability-assertion-admit";

const capabilityAssertionAdmitInputSchema = {
  $id: "metroplat/infograph/capability-assertion-admit/input",
  title: "CapabilityAssertionAdmitInput",
  description: "One holder and the infograph grants (e.g. \"infograph#work-item\") an operator admits standing for.",
  type: "object",
  required: ["holder", "grants"],
  properties: {
    holder: { type: "string", minLength: 1 },
    grants: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    issuer: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

const capabilityAssertionAdmitInputContract = schemaFrom(capabilityAssertionAdmitInputSchema);

const capabilityAssertionAdmitOutputSchema = {
  $id: "metroplat/infograph/capability-assertion-admit/output",
  title: "CapabilityAssertionAdmission",
  description: "The capability assertions admitted for one holder, and the resulting standing per admitted grant.",
  type: "object",
  required: ["kind", "holder", "assertions", "standing"],
  properties: {
    kind: { const: "metroplat.infograph.capability-assertion-admission" },
    holder: { type: "string", minLength: 1 },
    assertions: { type: "array", items: { $ref: "metroplat/codecs/text/json/capability/memetics/assertion" } },
    standing: { type: "array", items: { $ref: "metroplat/codecs/text/json/capability/memetics/standing" } },
  },
  additionalProperties: false,
};

const capabilityAssertionAdmitOutputContract = schemaFrom(capabilityAssertionAdmitOutputSchema, [
  capabilityAssertionContract,
  capabilityStandingContract,
]);

/**
 * Admit MetroPlat capability-assertion grants for one holder and report the
 * resulting standing per grant.
 *
 * @param binding - Data-root binding the assertions journal is appended under.
 * @param input - `{ holder, grants, issuer? }`; each grant is an `infograph#<verb>` address.
 * @param at - Admission timestamp (ISO date-time); its date portion is the journal date.
 * @returns The admitted assertions and each grant's resulting standing.
 */
export function admitInfographCapabilityAssertion(
  binding,
  input,
  at,
) {
  const admitted = capabilityAssertionAdmitInputContract.assert(input, "capability assertion admission");
  const issuer = admitted.issuer ?? CAPABILITY_ASSERTION_ADMIT_ISSUER;
  const assertions = admitted.grants.map((grants) => grantAssertion(issuer, admitted.holder, grants, at));
  admitCapabilityAssertions({ dataRoot: binding.dataRoot, date: at.slice(0, 10), assertions });
  const settled = readCapabilityAssertions(binding.dataRoot);
  const standing = admitted.grants.map((grants) => can(settled, admitted.holder, grants));
  return capabilityAssertionAdmitOutputContract.assert(Object.freeze({
    kind: "metroplat.infograph.capability-assertion-admission",
    holder: admitted.holder,
    assertions,
    standing,
  }), "capability assertion admission");
}

/**
 * The capability-assertion module's operation family, bound to one data root.
 *
 * @param binding - Data-root binding the assertions journal is appended under.
 * @returns The one `capability-assertion-admit` operation.
 */
export function capabilityAssertionOperations(binding) {
  return Object.freeze([
    operation({
      verb: "capability-assertion-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit MetroPlat capability-assertion grants for one holder.",
      description: "Operator-run admission for a subject the process composition root never grants standing to automatically (e.g. a gateway-asserted HTTP subject); appends grant assertions and reports resulting standing.",
      domain: capabilityAssertionAdmitInputContract,
      codomain: capabilityAssertionAdmitOutputContract,
      relation: "boundary",
      effects: {
        class: "journal-write",
        replay: "idempotency-key",
        coordination: "coordination-free",
        deterministic: true,
        totality: "schema-bounded",
      },
      run: (input) => admitInfographCapabilityAssertion(binding, input, binding.now()),
    }),
  ]);
}

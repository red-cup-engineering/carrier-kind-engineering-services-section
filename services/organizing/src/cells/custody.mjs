/**
 * FOUR-valued custody evidence for agent effects and coordination.
 *
 * Custody is a factual/evidentiary relation, not authority. Source assertions
 * are kept separately from their derived standing so callers cannot directly
 * supply "held" as an effect-gate fact.
 */
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(label + ": expected non-empty string");
  return value;
}

export function custodyAssertion(input

 ) {
  const material = Object.freeze({
    kind: "organizing.cell.custody-assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "custody assertion issuer"),
    custodian: nonempty(input.custodian, "custody assertion custodian"),
    scope: nonempty(input.scope, "custody assertion scope"),
    at: nonempty(input.at, "custody assertion at"),
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
  return Object.freeze({
    ...material,
    id: semanticId(material),
  });
}

export function affirmsCustody(
  issuer,
  custodian,
  scope,
  at,
  evidence = [],
) {
  return custodyAssertion({ assertion: "affirm", issuer, custodian, scope, at, evidence });
}

export function deniesCustody(
  issuer,
  custodian,
  scope,
  at,
  evidence = [],
) {
  return custodyAssertion({ assertion: "deny", issuer, custodian, scope, at, evidence });
}

/**
 * Derive custody standing for exactly one custodian + scope.
 *
 * No matching assertions -> UNKNOWN.
 * Affirm only -> HELD.
 * Deny only -> DENIED.
 * Both -> CONTESTED.
 */
export function custodyStanding(
  assertions,
  custodian,
  scope,
) {
  const admittedCustodian = nonempty(custodian, "custody standing custodian");
  const admittedScope = nonempty(scope, "custody standing scope");
  const matching = assertions.filter((assertion) =>
    assertion.custodian === admittedCustodian && assertion.scope === admittedScope);

  const affirmations = matching.filter((assertion) => assertion.assertion === "affirm");
  const denials = matching.filter((assertion) => assertion.assertion === "deny");
  const value = readingOfSides("extremal", affirmations.length > 0, denials.length > 0);

  return Object.freeze({
    kind: "organizing.cell.custody-standing",
    custodian: admittedCustodian,
    scope: admittedScope,
    value,
    affirmations: Object.freeze(affirmations.map((assertion) => assertion.id)),
    denials: Object.freeze(denials.map((assertion) => assertion.id)),
    evidence: Object.freeze([
      ...matching.flatMap((assertion) => assertion.evidence),
      ...matching.map((assertion) => assertion.id),
    ]),
  });
}


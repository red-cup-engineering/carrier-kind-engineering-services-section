/**
 * Source-bound representation assertions.
 *
 * Authentication identifies a session/workload principal; it does not establish
 * who that actor may represent. Representation is separately FOUR-valued and
 * scoped so a cell cannot choose an authorized principal merely by naming it.
 */
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

function nonempty(value, label) {
  if (value.trim().length === 0) throw new TypeError(label + ": expected non-empty string");
  return value;
}

export function representationAssertion(input

 ) {
  const material = Object.freeze({
    kind: "organizing.cell.representation-assertion",
    assertion: input.assertion,
    issuer: nonempty(input.issuer, "representation assertion issuer"),
    actor: nonempty(input.actor, "representation actor"),
    authenticatedPrincipal: nonempty(
      input.authenticatedPrincipal,
      "representation authenticated principal",
    ),
    representedPrincipal: nonempty(
      input.representedPrincipal,
      "representation represented principal",
    ),
    scope: nonempty(input.scope, "representation scope"),
    at: nonempty(input.at, "representation assertion at"),
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
  return Object.freeze({
    ...material,
    id: semanticId(material),
  });
}

export function affirmsRepresentation(
  issuer,
  actor,
  authenticatedPrincipal,
  representedPrincipal,
  scope,
  at,
  evidence = [],
) {
  return representationAssertion({
    assertion: "affirm",
    issuer,
    actor,
    authenticatedPrincipal,
    representedPrincipal,
    scope,
    at,
    evidence,
  });
}

export function deniesRepresentation(
  issuer,
  actor,
  authenticatedPrincipal,
  representedPrincipal,
  scope,
  at,
  evidence = [],
) {
  return representationAssertion({
    assertion: "deny",
    issuer,
    actor,
    authenticatedPrincipal,
    representedPrincipal,
    scope,
    at,
    evidence,
  });
}

export function representationStanding(
  assertions,
  actor,
  authenticatedPrincipal,
  representedPrincipal,
  scope,
) {
  const a = nonempty(actor, "representation standing actor");
  const auth = nonempty(
    authenticatedPrincipal,
    "representation standing authenticated principal",
  );
  const represented = nonempty(
    representedPrincipal,
    "representation standing represented principal",
  );
  const s = nonempty(scope, "representation standing scope");

  const matching = assertions.filter((assertion) =>
    assertion.actor === a
    && assertion.authenticatedPrincipal === auth
    && assertion.representedPrincipal === represented
    && assertion.scope === s);
  const affirmations = matching.filter((assertion) => assertion.assertion === "affirm");
  const denials = matching.filter((assertion) => assertion.assertion === "deny");
  const value = readingOfSides("extremal", affirmations.length > 0, denials.length > 0);

  return Object.freeze({
    kind: "organizing.cell.representation-standing",
    actor: a,
    authenticatedPrincipal: auth,
    representedPrincipal: represented,
    scope: s,
    value,
    affirmations: Object.freeze(affirmations.map((assertion) => assertion.id)),
    denials: Object.freeze(denials.map((assertion) => assertion.id)),
    evidence: Object.freeze([
      ...matching.flatMap((assertion) => assertion.evidence),
      ...matching.map((assertion) => assertion.id),
    ]),
  });
}


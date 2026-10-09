/**
 * macaroons holds pure macaroon and third-party discharge reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { } from "@red-cup-engineering/json-services-section";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import {
  macaroonCaveatSchema,
  macaroonDischargeSchema,
  macaroonInvocationJudgmentSchema,
  macaroonTokenSchema,
} from "./schemas.mjs";
import { attenuatesGrant as grantWithin, capabilityViewContract } from "./index.mjs";

export { capabilityViewContract };

export const macaroonCaveatContract = schemaFrom(macaroonCaveatSchema);
export const macaroonDischargeContract = schemaFrom(macaroonDischargeSchema);
export const macaroonInvocationJudgmentContract = schemaFrom(macaroonInvocationJudgmentSchema);
export const macaroonTokenContract = schemaFrom(macaroonTokenSchema);

let MACAROON_SEQ = 0;
function freshMacaroonId(capability) {
  MACAROON_SEQ += 1;
  return `urn:macaroon:${encodeURIComponent(capability.id)}:${MACAROON_SEQ}`;
}

let MACAROON_CAVEAT_SEQ = 0;
function freshMacaroonCaveatId(tokenId, predicate) {
  MACAROON_CAVEAT_SEQ += 1;
  return `${tokenId}:caveat:${encodeURIComponent(predicate)}:${MACAROON_CAVEAT_SEQ}`;
}

function macaroonSignature(id, capability, caveats) {
  return `structural-macaroon:${canonicalJson({ id, capability, caveats })}`;
}

function finalMacaroonGrant(token) {
  const last = token.caveats[token.caveats.length - 1];
  return last?.grants ?? token.capability.grants;
}

export function macaroonFromCapabilityView(view, id) {
  const capability = capabilityViewContract.assert(view, "macaroon capability view");
  const tokenId = id ?? freshMacaroonId(capability);
  return macaroonTokenContract.assert(Object.freeze({
    kind: "macaroon.token",
    id: tokenId,
    capability,
    caveats: Object.freeze([]),
    signature: macaroonSignature(tokenId, capability, []),
  }), "macaroon token");
}

/** Build a first- or third-party caveat that narrows a token's grant. */
export function macaroonCaveat(input

) {
  const tokenId = input.tokenId ?? "urn:macaroon";
  return macaroonCaveatContract.assert(Object.freeze({
    kind: "macaroon.caveat",
    id: input.id ?? freshMacaroonCaveatId(tokenId, input.predicate),
    predicate: nonempty(input.predicate, "macaroon caveat predicate"),
    grants: nonempty(input.grants, "macaroon caveat grant"),
    ...(input.thirdPartyHolder === undefined ? {} : { thirdPartyHolder: nonempty(input.thirdPartyHolder, "third-party caveat holder") }),
  }), "macaroon caveat");
}

export function caveat(predicate, grants, options = {}) {
  return macaroonCaveat({ predicate, grants, ...options });
}

/** Build a third-party caveat requiring delegated discharge. */
export function thirdPartyMacaroonCaveat(input

) {
  return macaroonCaveat({
    predicate: input.predicate,
    grants: input.grants,
    thirdPartyHolder: input.holder,
    ...(input.id === undefined ? {} : { id: input.id }),
    ...(input.tokenId === undefined ? {} : { tokenId: input.tokenId }),
  });
}

export function thirdPartyCaveat(
  predicate,
  grants,
  holder,
  options = {},
) {
  return thirdPartyMacaroonCaveat({ predicate, grants, holder, ...options });
}

/** Append a caveat when it monotonically narrows the current macaroon grant. */
export function attenuateMacaroon(token, caveat) {
  const admitted = macaroonTokenContract.assert(token, "macaroon attenuation token");
  const c = macaroonCaveatContract.assert(caveat, "macaroon attenuation caveat");
  const currentGrant = finalMacaroonGrant(admitted);
  if (!grantWithin(currentGrant, c.grants)) throw new TypeError(`attenuateMacaroon: ${c.grants} widens ${currentGrant}`);
  const caveats = Object.freeze([...admitted.caveats, c]);
  return macaroonTokenContract.assert(Object.freeze({
    kind: "macaroon.token",
    id: admitted.id,
    capability: admitted.capability,
    caveats,
    signature: macaroonSignature(admitted.id, admitted.capability, caveats),
  }), "attenuated macaroon token");
}

export function macaroonGrantNarrows(parent, child) {
  return grantWithin(parent, child);
}

export function attenuationMonotone(token) {
  const admitted = macaroonTokenContract.assert(token, "macaroon attenuation monotone");
  return verifyMacaroon(admitted, [finalMacaroonGrant(admitted)], []);
}

/** Discharge a third-party caveat by name-passing a delegated proof holder. */
export function dischargeMacaroonCaveat(caveat, holder, proof) {
  const c = macaroonCaveatContract.assert(caveat, "macaroon discharge caveat");
  return macaroonDischargeContract.assert(Object.freeze({
    kind: "macaroon.discharge",
    caveat: c.id,
    holder: nonempty(holder, "macaroon discharge holder"),
    proof: proof ?? `structural-discharge:${canonicalJson({ caveat: c.id, holder })}`,
  }), "macaroon discharge");
}

export const discharge = dischargeMacaroonCaveat;

/** Verify caveat monotonicity, third-party discharges, and the final held move. */
export function verifyMacaroon(
  token,
  affordances,
  discharges = [],
) {
  const admitted = macaroonTokenContract.assert(token, "macaroon verification token");
  const admittedAffordances = Object.freeze(affordances.map((grant) => nonempty(grant, "macaroon affordance")));
  const admittedDischarges = Object.freeze(discharges.map((discharge) => macaroonDischargeContract.assert(discharge, "macaroon discharge")));
  const reasons = [];
  let currentGrant = admitted.capability.grants;
  for (const caveat of admitted.caveats) {
    if (!grantWithin(currentGrant, caveat.grants)) reasons.push(`caveat ${caveat.id} widens ${currentGrant}`);
    if (caveat.thirdPartyHolder !== undefined) {
      const discharge = admittedDischarges.find((candidate) => candidate.caveat === caveat.id);
      if (discharge === undefined) reasons.push(`third-party caveat ${caveat.id} is not discharged`);
      else if (discharge.holder !== caveat.thirdPartyHolder) reasons.push(`third-party caveat ${caveat.id} discharged by wrong holder`);
    }
    currentGrant = caveat.grants;
  }
  const finalGrant = currentGrant;
  if (!admittedAffordances.includes(finalGrant)) reasons.push("final macaroon grant is not held by affordances");
  const ok = reasons.length === 0;
  return macaroonInvocationJudgmentContract.assert(Object.freeze({
    kind: ok ? "macaroon.invocation:witness" : "macaroon.invocation-obstruction",
    token: admitted,
    affordances: admittedAffordances,
    discharges: admittedDischarges,
    ok,
    reasons: Object.freeze(reasons),
    finalGrant,
  }), "macaroon invocation judgment");
}

export function canInvokeMacaroon(token, affordances = [], discharges = []) {
  return verifyMacaroon(token, affordances, discharges).ok;
}

/** Alias the verification gate as the macaroon invocation cut. */
export function invokeMacaroon(
  token,
  affordances,
  discharges = [],
) {
  return verifyMacaroon(token, affordances, discharges);
}

/**
 * macaroons holds pure macaroon and third-party discharge reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import { type JsonValue } from "../../codecs/json/core.mts";
import { canonicalBytes } from "../../identity/index.mts";
import { schemaFrom } from "../../schema/contract.mts";
import type { FromSchema } from "../../schema/contract.mts";
import {
  macaroonCaveatSchema,
  macaroonDischargeSchema,
  macaroonInvocationJudgmentSchema,
  macaroonTokenSchema,
} from "../schemas/index.mts";
import { capabilityViewContract, type CapabilityView } from "../index.mts";

export { capabilityViewContract };

export const macaroonCaveatContract = schemaFrom(macaroonCaveatSchema);
export const macaroonDischargeContract = schemaFrom(macaroonDischargeSchema);
export const macaroonInvocationJudgmentContract = schemaFrom(macaroonInvocationJudgmentSchema);
export const macaroonTokenContract = schemaFrom(macaroonTokenSchema);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function resourceWithin(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

function grantWithin(parent: string, child: string): boolean {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*")) return child.startsWith(parent.slice(0, -1));
  const parentHash = parent.lastIndexOf("#");
  const childHash = child.lastIndexOf("#");
  if (parentHash > 0 && childHash > 0 && parent.slice(parentHash + 1) === child.slice(childHash + 1)) {
    return resourceWithin(parent.slice(0, parentHash), child.slice(0, childHash));
  }
  return resourceWithin(parent, child) || child.startsWith(`${parent}:`) || child.startsWith(`${parent}#`);
}

export type MacaroonCaveat = FromSchema<typeof macaroonCaveatSchema>;

export type MacaroonToken = FromSchema<typeof macaroonTokenSchema> & {
  readonly capability: CapabilityView;
  readonly caveats: readonly MacaroonCaveat[];
};

export type MacaroonDischarge = FromSchema<typeof macaroonDischargeSchema>;

export type MacaroonInvocationJudgment = FromSchema<typeof macaroonInvocationJudgmentSchema> & {
  readonly token: MacaroonToken;
  readonly discharges: readonly MacaroonDischarge[];
};

let MACAROON_SEQ = 0;
function freshMacaroonId(capability: CapabilityView): string {
  MACAROON_SEQ += 1;
  return `urn:macaroon:${encodeURIComponent(capability.id)}:${MACAROON_SEQ}`;
}

let MACAROON_CAVEAT_SEQ = 0;
function freshMacaroonCaveatId(tokenId: string, predicate: string): string {
  MACAROON_CAVEAT_SEQ += 1;
  return `${tokenId}:caveat:${encodeURIComponent(predicate)}:${MACAROON_CAVEAT_SEQ}`;
}

function macaroonSignature(id: string, capability: CapabilityView, caveats: readonly MacaroonCaveat[]): string {
  return `structural-macaroon:${canonicalBytes({ id, capability, caveats } as unknown as JsonValue)}`;
}

function finalMacaroonGrant(token: MacaroonToken): string {
  const last = token.caveats[token.caveats.length - 1];
  return last?.grants ?? token.capability.grants;
}

export function macaroonFromCapabilityView(view: CapabilityView, id?: string): MacaroonToken {
  const capability = capabilityViewContract.assert(view, "macaroon capability view") as CapabilityView;
  const tokenId = id ?? freshMacaroonId(capability);
  return macaroonTokenContract.assert(Object.freeze({
    kind: "macaroon.token" as const,
    id: tokenId,
    capability,
    caveats: Object.freeze([]),
    signature: macaroonSignature(tokenId, capability, []),
  }), "macaroon token") as MacaroonToken;
}

/** Build a first- or third-party caveat that narrows a token's grant. */
export function macaroonCaveat(input: {
  readonly predicate: string;
  readonly grants: string;
  readonly id?: string;
  readonly tokenId?: string;
  readonly thirdPartyHolder?: string;
}): MacaroonCaveat {
  const tokenId = input.tokenId ?? "urn:macaroon";
  return macaroonCaveatContract.assert(Object.freeze({
    kind: "macaroon.caveat" as const,
    id: input.id ?? freshMacaroonCaveatId(tokenId, input.predicate),
    predicate: nonempty(input.predicate, "macaroon caveat predicate"),
    grants: nonempty(input.grants, "macaroon caveat grant"),
    ...(input.thirdPartyHolder === undefined ? {} : { thirdPartyHolder: nonempty(input.thirdPartyHolder, "third-party caveat holder") }),
  }), "macaroon caveat") as MacaroonCaveat;
}

export function caveat(predicate: string, grants: string, options: { readonly id?: string; readonly tokenId?: string } = {}): MacaroonCaveat {
  return macaroonCaveat({ predicate, grants, ...options });
}

/** Build a third-party caveat requiring delegated discharge. */
export function thirdPartyMacaroonCaveat(input: {
  readonly predicate: string;
  readonly grants: string;
  readonly holder: string;
  readonly id?: string;
  readonly tokenId?: string;
}): MacaroonCaveat {
  return macaroonCaveat({
    predicate: input.predicate,
    grants: input.grants,
    thirdPartyHolder: input.holder,
    ...(input.id === undefined ? {} : { id: input.id }),
    ...(input.tokenId === undefined ? {} : { tokenId: input.tokenId }),
  });
}

export function thirdPartyCaveat(
  predicate: string,
  grants: string,
  holder: string,
  options: { readonly id?: string; readonly tokenId?: string } = {},
): MacaroonCaveat {
  return thirdPartyMacaroonCaveat({ predicate, grants, holder, ...options });
}

/** Append a caveat when it monotonically narrows the current macaroon grant. */
export function attenuateMacaroon(token: MacaroonToken, caveat: MacaroonCaveat): MacaroonToken {
  const admitted = macaroonTokenContract.assert(token, "macaroon attenuation token") as MacaroonToken;
  const c = macaroonCaveatContract.assert(caveat, "macaroon attenuation caveat") as MacaroonCaveat;
  const currentGrant = finalMacaroonGrant(admitted);
  if (!grantWithin(currentGrant, c.grants)) throw new TypeError(`attenuateMacaroon: ${c.grants} widens ${currentGrant}`);
  const caveats = Object.freeze([...admitted.caveats, c]);
  return macaroonTokenContract.assert(Object.freeze({
    kind: "macaroon.token" as const,
    id: admitted.id,
    capability: admitted.capability,
    caveats,
    signature: macaroonSignature(admitted.id, admitted.capability, caveats),
  }), "attenuated macaroon token") as MacaroonToken;
}

export function macaroonGrantNarrows(parent: string, child: string): boolean {
  return grantWithin(parent, child);
}

export function attenuationMonotone(token: MacaroonToken): MacaroonInvocationJudgment {
  const admitted = macaroonTokenContract.assert(token, "macaroon attenuation monotone") as MacaroonToken;
  return verifyMacaroon(admitted, [finalMacaroonGrant(admitted)], []);
}

/** Discharge a third-party caveat by name-passing a delegated proof holder. */
export function dischargeMacaroonCaveat(caveat: MacaroonCaveat, holder: string, proof?: string): MacaroonDischarge {
  const c = macaroonCaveatContract.assert(caveat, "macaroon discharge caveat") as MacaroonCaveat;
  return macaroonDischargeContract.assert(Object.freeze({
    kind: "macaroon.discharge" as const,
    caveat: c.id,
    holder: nonempty(holder, "macaroon discharge holder"),
    proof: proof ?? `structural-discharge:${canonicalBytes({ caveat: c.id, holder } as unknown as JsonValue)}`,
  }), "macaroon discharge") as MacaroonDischarge;
}

export const discharge = dischargeMacaroonCaveat;

/** Verify caveat monotonicity, third-party discharges, and the final held move. */
export function verifyMacaroon(
  token: MacaroonToken,
  affordances: readonly string[],
  discharges: readonly MacaroonDischarge[] = [],
): MacaroonInvocationJudgment {
  const admitted = macaroonTokenContract.assert(token, "macaroon verification token") as MacaroonToken;
  const admittedAffordances = Object.freeze(affordances.map((grant) => nonempty(grant, "macaroon affordance")));
  const admittedDischarges = Object.freeze(discharges.map((discharge) => macaroonDischargeContract.assert(discharge, "macaroon discharge") as MacaroonDischarge));
  const reasons: string[] = [];
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
    kind: ok ? "macaroon.invocation:witness" as const : "macaroon.invocation-obstruction" as const,
    token: admitted,
    affordances: admittedAffordances,
    discharges: admittedDischarges,
    ok,
    reasons: Object.freeze(reasons),
    finalGrant,
  }), "macaroon invocation judgment") as MacaroonInvocationJudgment;
}

export function canInvokeMacaroon(token: MacaroonToken, affordances: readonly string[] = [], discharges: readonly MacaroonDischarge[] = []): boolean {
  return verifyMacaroon(token, affordances, discharges).ok;
}

/** Alias the verification gate as the macaroon invocation cut. */
export function invokeMacaroon(
  token: MacaroonToken,
  affordances: readonly string[],
  discharges: readonly MacaroonDischarge[] = [],
): MacaroonInvocationJudgment {
  return verifyMacaroon(token, affordances, discharges);
}

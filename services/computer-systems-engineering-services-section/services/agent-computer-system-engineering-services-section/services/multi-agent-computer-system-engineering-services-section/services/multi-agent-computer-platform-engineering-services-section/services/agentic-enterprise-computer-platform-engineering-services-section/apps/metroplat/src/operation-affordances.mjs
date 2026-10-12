import { can, capabilityGrant, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const CATALOG = "infograph";
const PUBLIC_HOLDER = "*";
const categories = Object.freeze(["direct", "public", "office", "allocation", "delegation"]);
const held = (reading) => reading === "held" || reading === "potential";

const categoryOf = (assertion) => {
  if (assertion.issuer?.startsWith("office:")) return "office";
  if (assertion.issuer?.startsWith("allocation:")) return "allocation";
  if (assertion.issuer?.startsWith("delegation:")) return "delegation";
  if (assertion.holder === PUBLIC_HOLDER || assertion.issuer === "metroplat") return "public";
  return "direct";
};

function scopeInputs(operation, standing, subject) {
  if (operation.locus === undefined) return [undefined];
  const broadGrant = capabilityGrant(CATALOG, operation.verb);
  const hasBroadGrant = standing.some((assertion) => assertion.assertion !== "revoke"
    && (assertion.holder === subject || assertion.holder === PUBLIC_HOLDER)
    && held(can([assertion], subject, broadGrant).value));
  const scopes = new Set(hasBroadGrant ? [undefined] : []);
  for (const assertion of standing) {
    if (categoryOf(assertion) !== "delegation" || assertion.assertion === "revoke") continue;
    const escapedVerb = operation.verb.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = new RegExp(`^${CATALOG}/duty/(.+)#${escapedVerb}$`, "u").exec(assertion.grants ?? "");
    if (match) scopes.add(decodeURIComponent(match[1]));
  }
  return [...scopes].map((scope) => ({ [operation.locus]: scope }));
}

function descriptor(operation, scope) {
  const value = operationDescriptor(operation);
  return Object.freeze({
    ref: value.ref,
    verb: value.verb,
    ...(value.summary === undefined ? {} : { summary: value.summary }),
    ...(value.domain === undefined ? {} : { input: value.domain }),
    ...(value.codomain === undefined ? {} : { output: value.codomain }),
    ...(operation.locus === undefined ? {} : { locus: operation.locus }),
    ...(scope === undefined ? {} : { scope }),
  });
}

/** One current, subject-bound projection of installed descriptors and standing. */
export function projectOperationAffordances(operations, standing, subject) {
  if (typeof subject !== "string" || subject.length === 0) throw new TypeError("operation affordances require the invocation subject");
  const result = Object.fromEntries(categories.map((category) => [category, []]));
  for (const operation of operations) {
    const scopes = scopeInputs(operation, standing, subject);
    for (const input of scopes) {
      const resource = input?.[operation.locus]
        ? locusResource(CATALOG, operation.locus, input[operation.locus])
        : CATALOG;
      const grant = capabilityGrant(resource, operation.verb);
      if (!held(can(standing, subject, grant).value)) continue;
      for (const assertion of standing) {
        if (assertion.assertion === "revoke") continue;
        const holder = assertion.holder === PUBLIC_HOLDER ? subject : assertion.holder;
        if (holder !== subject || !held(can([assertion], subject, grant).value)) continue;
        if (input?.[operation.locus] !== undefined
          && held(can([assertion], subject, capabilityGrant(CATALOG, operation.verb)).value)) continue;
        const category = categoryOf(assertion);
        const item = descriptor(operation, input?.[operation.locus]);
        const key = `${item.ref}\0${item.scope ?? ""}`;
        if (!result[category].some((prior) => `${prior.ref}\0${prior.scope ?? ""}` === key)) result[category].push(item);
      }
    }
  }
  for (const category of categories) result[category].sort((a, b) => a.verb.localeCompare(b.verb) || (a.scope ?? "").localeCompare(b.scope ?? ""));
  return Object.freeze(Object.fromEntries(categories.map((category) => [category, Object.freeze(result[category])] )));
}

export const operationAffordanceCategories = categories;

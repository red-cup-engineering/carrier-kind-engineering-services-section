/**
 * The sovereign circuit interface an Agent Card declares: one extension whose
 * params name the provider's CAIP-10 account, its authority, custody and
 * territory, and one black-box leaf circuit as its public component.
 */
import { normalizeHierarchicalCircuit } from "@red-cup-engineering/signgraph/hierarchical-circuit";
import { NI_URI_PATTERN } from "@red-cup-engineering/uri-services-section/ni-uri";

export const SOVEREIGN_CIRCUIT_INTERFACE_PROFILE = "org.emsenn.sen.sovereign-circuit-interface.v1";
export const SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION = "ni:///sha-256;wzh-zYeFQCsh4zAzGS34uacNV4qJeIEmCKIUUWyRZ-M";
const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
const exactKeys = (value, keys) => value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
function ni(value, field) { if (typeof value !== "string" || !NI_URI_PATTERN.test(value)) fail("malformed-circuit", `${field} must be a SHA-256 ni URI`); return value; }
function caip10(value, field) { if (typeof value !== "string" || !CAIP10.test(value)) fail("malformed-circuit", `${field} must be a CAIP-10 account`); return value.toLowerCase(); }

/** Read an Agent Card's one sovereign circuit interface; its component must be a black-box leaf. */
export function circuitInterfaceFromAgentCard(card) {
  const matches = card?.capabilities?.extensions?.filter(({ uri }) => uri === SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION) ?? [];
  if (matches.length !== 1) fail("malformed-circuit", "Agent Card must declare exactly one sovereign circuit interface extension");
  const params = matches[0].params;
  if (!exactKeys(params, ["account", "authority", "component", "custody", "profile", "territory"]) || params.profile !== SOVEREIGN_CIRCUIT_INTERFACE_PROFILE) fail("malformed-circuit", "Agent Card sovereign circuit interface params are invalid");
  const component = normalizeHierarchicalCircuit(params.component);
  if (component.instances.length !== 0 || component.nets.length !== 0) fail("interior-disclosure", "a public circuit interface must be one black-box leaf definition");
  return Object.freeze({
    account: caip10(params.account, "circuit interface account"),
    authority: ni(params.authority, "circuit interface authority"),
    custody: ni(params.custody, "circuit interface custody"),
    territory: ni(params.territory, "circuit interface territory"),
    component,
  });
}

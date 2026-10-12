/** Record/head admission and complete settled reads for subject capability assertions. */
import {
  admitCapabilityAssertion,
  capabilityRef,

} from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { canonicalJson, isJsonRecord } from "@red-cup-engineering/json-services-section";
import { extend, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";

export const capabilityAssertionFeed = "capability-assertions";

function capabilityAssertionOf(value) {
  if (!isJsonRecord(value) || value["kind"] !== "capability.assertion") {
    throw new TypeError("capability assertion feed contains a non-assertion row");
  }
  try {
    return admitCapabilityAssertion(Object.freeze({ ...value }), "admitted capability assertion");
  } catch {
    throw new TypeError("capability assertion feed contains an invalid assertion");
  }
}

export function capabilityAssertionRows(assertions) {
  return Object.freeze(assertions.map((assertion) => toEavt({
    e: capabilityRef(assertion.holder, assertion.grants),
    a: Object.freeze({ kind: "capability.assertion" }),
    v: assertion,
    t: assertion.at,
  })));
}

/** Admit each assertion as a real record, advancing the one named capability thread.
 * The receipt names actual record addresses; it does not manufacture journal event witnesses.
 */
export function admitCapabilityAssertions(input) {
  if (input.rootName !== undefined) throw new TypeError("capability assertion admission requires the actual settlement dataRoot, not a retired journal rootName");
  const assertions = input.assertions.map(capabilityAssertionOf);
  if (assertions.length === 0) return undefined;
  const addresses = [];
  for (const assertion of assertions) {
    addresses.push(extend(input.dataRoot, capabilityAssertionFeed, capabilityAssertionFeed, {
      e: capabilityRef(assertion.holder, assertion.grants),
      a: { kind: "capability.assertion" }, v: assertion, t: assertion.at,
    }, input.causes === undefined ? {} : { causes: input.causes }));
  }
  return Object.freeze({ kind: "capability.assertion-records", type: capabilityAssertionFeed,
    thread: capabilityAssertionFeed, addresses: Object.freeze(addresses) });
}

/**
 * Read the complete named frontier for every authorization decision. No process cache can
 * replace re-reading addressed bytes: a missing denial at an unchanged head is unavailable.
 * The store walk bound applies; a truncated or missing ancestry is never an empty clean set.
 * Pre/post equality is a check of this one named head, not a global snapshot of other heads.
 */
export function readCapabilityAssertions(dataRoot, { strict = false, limit } = {}) {
  try {
    const before = readHead(dataRoot, capabilityAssertionFeed, capabilityAssertionFeed);
    const frontier = before?.frontier ?? [];
    const entries = [...walk(dataRoot, capabilityAssertionFeed, frontier, limit === undefined ? {} : { limit })];
    const assertions = [];
    for (const entry of entries.reverse()) {
      if (entry.missing || entry.truncated || entry.record === undefined)
        throw new TypeError("capability assertion ancestry is unavailable or incomplete");
      // Cross-type causes remain provenance, never a capability grant of this thread.
      if (entry.type !== capabilityAssertionFeed) continue;
      const row = entry.record;
      if (!isJsonRecord(row.a) || row.a.kind !== "capability.assertion")
        throw new TypeError("capability assertion record has an invalid predicate");
      const assertion = capabilityAssertionOf(row.v);
      if (row.e !== capabilityRef(assertion.holder, assertion.grants) || row.t !== assertion.at)
        throw new TypeError("capability assertion record does not match its subject or time");
      assertions.push(assertion);
    }
    const after = readHead(dataRoot, capabilityAssertionFeed, capabilityAssertionFeed);
    if (canonicalJson(after?.frontier ?? []) !== canonicalJson(frontier))
      throw new TypeError("capability assertion frontier changed during the read");
    return Object.freeze(assertions);
  } catch (cause) {
    if (strict) {
      const error = new TypeError("capability assertion evidence unavailable", { cause });
      error.code = "CAPABILITY_ASSERTIONS_UNAVAILABLE";
      throw error;
    }
    return Object.freeze([]);
  }
}

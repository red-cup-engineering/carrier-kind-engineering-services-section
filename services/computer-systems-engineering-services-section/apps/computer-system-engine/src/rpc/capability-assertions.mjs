/** Store admission and settled reads for subject capability assertions. */
import { admitCapabilityAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { extend, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";

/** The type of an assertion record and the name of the one thread that orders them. */
export const capabilityAssertionType = "capability-assertion";
export const capabilityAssertionThread = "capability-assertions";

/** The most assertions one authorization read follows; a longer thread is read as unavailable. */
const READ_LIMIT = 8_192;

function capabilityAssertionOf(value) {
  if (!isJsonRecord(value) || value["kind"] !== "capability.assertion") {
    throw new TypeError("capability assertion thread contains a non-assertion record");
  }
  const { causes: _causes, ...assertion } = value;
  try {
    return admitCapabilityAssertion(Object.freeze(assertion), "admitted capability assertion");
  } catch {
    throw new TypeError("capability assertion thread contains an invalid assertion");
  }
}

/**
 * Extend the assertion thread by each assertion, in order: every record follows the whole frontier
 * it saw, so a revocation follows the grants it was written after.
 */
export function admitCapabilityAssertions(input) {
  if (input.assertions.length === 0) return undefined;
  return Object.freeze(input.assertions.map((assertion) => extend(input.dataRoot, capabilityAssertionType, capabilityAssertionThread, assertion)));
}

/**
 * Every admitted capability assertion, causes first, across the assertion thread. Authorization
 * reads are deliberately uncached: another process can revoke standing between any two decisions.
 * A malformed, unavailable, or incomplete thread (a cause that has not arrived, or a thread longer
 * than the read limit) fails closed by yielding no held assertions.
 */
export function readCapabilityAssertions(dataRoot) {
  try {
    const head = readHead(dataRoot, capabilityAssertionType, capabilityAssertionThread);
    if (head === undefined) return Object.freeze([]);
    const records = [];
    for (const step of walk(dataRoot, capabilityAssertionType, head.frontier, { limit: READ_LIMIT })) {
      if (step.missing === true || step.truncated === true) return Object.freeze([]);
      records.push(capabilityAssertionOf(step.record));
    }
    return Object.freeze(records.reverse());
  } catch {
    return Object.freeze([]);
  }
}

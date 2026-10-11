/** Journal admission and settled reads for subject capability assertions. */
import {
  admitCapabilityAssertion,
  capabilityRef,

} from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
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

export function admitCapabilityAssertions(input

) {
  if (input.assertions.length === 0) return undefined;
  const result = openJournal(input.dataRoot).appendRows(capabilityAssertionFeed, capabilityAssertionRows(input.assertions), {
    at: input.date,
    subject: capabilityAssertionFeed,
    ...(input.rootName === undefined ? {} : { rootName: input.rootName }),
    caller: Object.freeze({ transport: "capability-configuration" }),
    ...(input.causes === undefined ? {} : { eventCauses: input.causes }),
  });
  return result;
}

/**
 * Every admitted capability assertion in causal order across its dedicated
 * feed. Authorization reads are deliberately uncached: another process can
 * revoke standing between any two decisions. A malformed, unavailable, or
 * incomplete feed fails closed by yielding no held assertions.
 */
export function readCapabilityAssertions(dataRoot) {
  try {
    const folded = journal.scanCausalSubject(dataRoot, capabilityAssertionFeed, "9999-12-31", [], (assertions, row) => {
      assertions.push(capabilityAssertionOf(row[2]));
      return assertions;
    });
    return folded.malformed === 0 ? Object.freeze(folded.result) : Object.freeze([]);
  } catch {
    return Object.freeze([]);
  }
}

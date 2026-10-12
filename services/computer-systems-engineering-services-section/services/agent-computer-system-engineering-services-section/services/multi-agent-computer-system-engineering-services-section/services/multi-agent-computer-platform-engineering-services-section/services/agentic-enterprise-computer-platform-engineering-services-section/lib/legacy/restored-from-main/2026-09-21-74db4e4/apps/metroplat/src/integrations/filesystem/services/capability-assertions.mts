/** Journal admission and settled reads for subject capability assertions. */
import {
  capabilityAssertionContract,
  capabilityRef,
  type CapabilityAssertion,
} from "../../../lib/capability/index.mts";
import { isJsonRecord, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { toEavt, type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { journal, openJournal, type EventWriteResult } from "../../../journal/index.mts";

export const capabilityAssertionFeed = "capability-assertions";

function capabilityAssertionOf(value: JsonValue): CapabilityAssertion {
  if (!isJsonRecord(value) || value["kind"] !== "capability.assertion") {
    throw new TypeError("capability assertion feed contains a non-assertion row");
  }
  try {
    return capabilityAssertionContract.assert(value, "admitted capability assertion") as CapabilityAssertion;
  } catch {
    throw new TypeError("capability assertion feed contains an invalid assertion");
  }
}

export function capabilityAssertionRows(assertions: readonly CapabilityAssertion[]): readonly EAVT[] {
  return Object.freeze(assertions.map((assertion) => toEavt({
    e: capabilityRef(assertion.holder, assertion.grants),
    a: Object.freeze({ kind: "capability.assertion" }),
    v: assertion as unknown as JsonValue,
    t: assertion.at,
  })));
}

export function admitCapabilityAssertions(input: {
  readonly dataRoot: string;
  readonly date: string;
  readonly assertions: readonly CapabilityAssertion[];
  readonly rootName?: string;
  readonly causes?: readonly string[];
}): EventWriteResult | undefined {
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
export function readCapabilityAssertions(dataRoot: string): readonly CapabilityAssertion[] {
  try {
    const folded = journal.scanCausalSubject(dataRoot, capabilityAssertionFeed, "9999-12-31", [] as CapabilityAssertion[], (assertions, row) => {
      assertions.push(capabilityAssertionOf(row[2]));
      return assertions;
    });
    return folded.malformed === 0 ? Object.freeze(folded.result) : Object.freeze([]);
  } catch {
    return Object.freeze([]);
  }
}

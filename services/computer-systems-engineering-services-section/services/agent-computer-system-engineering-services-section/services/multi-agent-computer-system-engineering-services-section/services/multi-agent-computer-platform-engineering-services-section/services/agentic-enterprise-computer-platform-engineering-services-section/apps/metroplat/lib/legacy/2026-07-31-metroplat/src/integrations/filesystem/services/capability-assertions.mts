/** Journal admission and settled reads for subject capability assertions. */
import {
  capabilityAssertionContract,
  capabilityRef,
  type CapabilityAssertion,
} from "../../../lib/capability/index.mts";
import { isJsonRecord, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { toEavt, type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { journal, openJournal, type EventWriteResult } from "../../../journal/index.mts";

export const capabilityAssertionFeed = "capability-assertions";

function capabilityAssertionOf(value: JsonValue): CapabilityAssertion | undefined {
  if (!isJsonRecord(value) || value["kind"] !== "capability.assertion") return undefined;
  try {
    return capabilityAssertionContract.assert(value, "admitted capability assertion") as CapabilityAssertion;
  } catch {
    return undefined;
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
  return openJournal(input.dataRoot).appendRows(capabilityAssertionFeed, capabilityAssertionRows(input.assertions), {
    at: input.date,
    subject: capabilityAssertionFeed,
    ...(input.rootName === undefined ? {} : { rootName: input.rootName }),
    caller: Object.freeze({ transport: "capability-configuration" }),
    ...(input.causes === undefined ? {} : { eventCauses: input.causes }),
  });
}

/** Read every admitted capability assertion in causal order across the settlement. */
export function readCapabilityAssertions(dataRoot: string): readonly CapabilityAssertion[] {
  const folded = journal.scanCausalTerritory(dataRoot, [] as CapabilityAssertion[], (assertions, row) => {
    const assertion = capabilityAssertionOf(row[2]);
    if (assertion !== undefined) assertions.push(assertion);
    return assertions;
  });
  return Object.freeze(folded.result);
}

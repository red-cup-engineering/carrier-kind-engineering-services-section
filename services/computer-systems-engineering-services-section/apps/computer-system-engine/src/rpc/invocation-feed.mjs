/**
 * @packageDocumentation
 *
 * running/invocation describes a scripted boundary play as EAVT witness material.
 *
 * Dispatch reports successful plays through an optional hook. Service bindings
 * decide whether that hook persists rows, streams them, or ignores them.
 * Filesystem persistence is deliberately outside this module.
 */
import { cell, } from "@red-cup-engineering/eavt-services-section/ledger/cells";

/** One scripted play. */

/** The invocation feed: one observation becomes one grain-of-change EAVT row. */
export const invocationFeed = Object.freeze({
  name: "invocations",
  functional: [],
  cellize: (invocation, at) =>
    [cell(invocation.caller, {
      verb: invocation.verb,
      args: invocation.args,
      ...(invocation.action === undefined ? {} : { action: invocation.action }),
    }, invocation.value, at)],
});

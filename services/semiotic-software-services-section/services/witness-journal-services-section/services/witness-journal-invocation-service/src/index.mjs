// witness-journal-invocation-service — one namespace's scripted-invocation witness.
//
// A scripted invocation (caller, verb, args, an optional action descriptor,
// a value, and a time) becomes exactly one witness-journal entry: E=caller,
// A={verb, args, action?}, V=value, T=at. This module owns only the
// invocation-specific cut: how one invocation becomes one entry, and which
// dated, namespace-scoped feed it lands in. It performs no witnessing or
// journal I/O itself — that is witness-journal-entry-service's and
// witness-journal-log-service's job, both depended on here, not
// reimplemented.
//
// Witnessing an invocation is deliberately best-effort: a witness failure
// must never change the action's own output, so witnessInvocation never
// throws.
//
// Note on scope: the original `services/invocation-ledger`'s `Invocation`
// type carried an `action` field typed as relating's own `MorphismCarrier`
// (an RMN-notation-adjacent type from relating's category machinery, not
// RMN notation itself). This extraction does not depend on relating or on
// the relation-model-notation section, so `action` here is untyped JSON —
// any caller that has a real morphism/action descriptor can pass its JSON
// form; this package makes no claim about its internal shape.

import { canonical } from "@red-cup-engineering/json-file-codec-service";
import { entry } from "@red-cup-engineering/witness-journal-entry-service";
import { appendEntries, readEntries } from "@red-cup-engineering/witness-journal-log-service";
import { latestPerCell } from "@red-cup-engineering/witness-journal-state-service";

/**
 * @typedef {{
 *   readonly caller: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *   readonly verb: string,
 *   readonly args: Record<string, import("@red-cup-engineering/json-file-codec-service").JsonValue>,
 *   readonly action?: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *   readonly value: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *   readonly at: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 * }} Invocation
 */

/** The UTC date (YYYY-MM-DD) named by a witness time; a safe fallback bucket
 *  otherwise, matching witness-journal-log-service's own date law. */
function dateOf(at) {
  const text = typeof at === "string" ? at : canonical(at);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "0000-00-00";
}

/** A filesystem-safe leaf slug for a namespace term (drops a leading scope `@`). */
function slug(namespace) {
  return namespace.replace(/^@/, "").replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "invocation";
}

/**
 * The dated feed name one namespace's invocations land in for one day:
 * `<date>-<slug(namespace)>-log`. Pure — no I/O, no path resolution against
 * a root; witness-journal-log-service owns turning a feed name into a path.
 *
 * @param {string} namespace
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} at
 * @returns {string}
 */
export function feedNameFor(namespace, at) {
  return `${dateOf(at)}-${slug(namespace)}-log`;
}

/**
 * Build the one witness-journal entry an invocation cellizes to: a single
 * grain-of-change EAVT row, E=caller, A={verb, args, action?}, V=value,
 * T=at. Pure.
 *
 * @param {Invocation} invocation
 * @returns {import("@red-cup-engineering/witness-journal-entry-service").WitnessJournalEntry}
 */
export function invocationEntry(invocation) {
  const predicate = {
    verb: invocation.verb,
    args: invocation.args,
    ...(invocation.action === undefined ? {} : { action: invocation.action }),
  };
  return entry(invocation.caller, predicate, invocation.value, invocation.at);
}

/**
 * Witness one invocation under a namespace's dated journal. Best-effort: a
 * witness failure (a bad root, an unwritable filesystem, a malformed
 * invocation) is swallowed and reported as zero rows appended, never
 * thrown — the caller's own action must not be affected by a witness
 * failure.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {Invocation} invocation
 * @returns {{ readonly appended: number }}
 */
export function witnessInvocation(dataRoot, namespace, invocation) {
  try {
    const feed = feedNameFor(namespace, invocation.at);
    return appendEntries(dataRoot, feed, [invocationEntry(invocation)], invocation.at);
  } catch {
    return { appended: 0 };
  }
}

/**
 * Build the dispatch hook that persists invocations under a data root —
 * the seam a scripted boundary's dispatcher plugs a witness sink into
 * without depending on this package's shape beyond one function call.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @returns {(invocation: Invocation) => void}
 */
export function filesystemInvocationWitness(dataRoot, namespace) {
  return (invocation) => {
    witnessInvocation(dataRoot, namespace, invocation);
  };
}

/**
 * Read one namespace's traced invocation journal for the day named by `at`.
 * Never throws: a missing or unreadable journal reads as empty, matching
 * witness-journal-log-service's own law for a missing journal.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} at
 * @returns {readonly { readonly entry: import("@red-cup-engineering/witness-journal-entry-service").WitnessJournalEntry, readonly trace: number }[]}
 */
export function readInvocations(dataRoot, namespace, at) {
  try {
    return readEntries(dataRoot, feedNameFor(namespace, at), at);
  } catch {
    return [];
  }
}

/**
 * Build a reader for "today's" invocation journal, evaluated at call time —
 * the live-tail reading a running process wants, without pinning `at` up
 * front.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {() => string} [now]
 * @returns {() => readonly { readonly entry: import("@red-cup-engineering/witness-journal-entry-service").WitnessJournalEntry, readonly trace: number }[]}
 */
export function filesystemInvocationLogReader(dataRoot, namespace, now = () => new Date().toISOString()) {
  return () => readInvocations(dataRoot, namespace, now());
}

/**
 * Project the current state of one namespace's invocation journal for the
 * day named by `at`: one latest-wins answer per (caller, {verb,args,
 * action?}) cell. A thin composition over witness-journal-state-service's
 * `latestPerCell` — this module still performs no folding of its own.
 *
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} at
 * @returns {ReturnType<typeof latestPerCell>}
 */
export function projectInvocations(dataRoot, namespace, at) {
  return latestPerCell(readInvocations(dataRoot, namespace, at).map((traced) => traced.entry));
}

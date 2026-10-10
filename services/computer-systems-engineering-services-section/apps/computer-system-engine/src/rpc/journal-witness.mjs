/** Journal-backed implementation of the mandatory RPC evidence port. */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";

import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { journal, openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";

import { feedResponseLogPath } from "../journal/projections.mjs";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";

/** Project the canonical RPC evidence journal as the server's resumable SSE feed. */
export function filesystemRpcFeedResponder(
  root,
  namespace,
  now,
) {
  return (lastEventId) => {
    const feed = journal.feed(root, "rpc", now(), { rootName: namespace, subject: "rpc" });
    return feedResponseLogPath(feed.artifact, lastEventId);
  };
}

const CLOSED_HEADS = 1024;

/** Admit attempts, decisions, and outcomes through the one journal API. */
export function journalRpcWitness(root, options = {}) {
  const store = openJournal(root);
  const namespace = options.namespace ?? "@red-cup-engineering/metroplat";
  const heads = new Map();
  const ownEvidence = new Map();
  // Heads of invocations an outcome closed: the caller reads the head it left to chain its next
  // step (an agent worker's stages), so the most recent stay readable without keeping every one.
  const closed = new Map();
  return Object.freeze({
    causalHead: (invocation) => heads.get(invocation) ?? closed.get(invocation) ?? Object.freeze([]),
    admit: (evidence, artifacts = []) => {
      const material = requireJsonValue(evidence, "RPC evidence");
      const id = artifactId(material);
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      const known = ownEvidence.get(invocation) ?? new Set();
      const effectCauses = evidence.kind === "metroplat.rpc.outcome"
        ? evidence.receipt.evidence.filter((id) => !known.has(id))
        : Object.freeze([]);
      const predecessors = Object.freeze([...new Set([
        ...(evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.causes : heads.get(invocation) ?? []),
        ...(options.causes?.(evidence) ?? []),
        ...effectCauses,
      ])]);
      const admission = store.appendRows("rpc", [toEavt({
        e: invocation,
        a: Object.freeze({ kind: evidence.kind }),
        v: material,
        t: evidence.at,
      })], {
        at: evidence.at,
        rootName: namespace,
        subject: "rpc",
        caller: Object.freeze({ kind: "metroplat.rpc.witness", evidence: evidence.kind }),
        eventCauses: predecessors,
        ...(artifacts.length === 0 ? {} : { eventArtifacts: artifacts }),
      });
      const eventIds = Object.freeze((admission.statements ?? []).map((statement) => statement.id));
      if (evidence.kind === "metroplat.rpc.outcome") {
        // The outcome closes the invocation: nothing reads its head again, so release it.
        const head = eventIds.length > 0 ? eventIds : heads.get(invocation);
        heads.delete(invocation);
        ownEvidence.delete(invocation);
        if (head !== undefined && head.length > 0) {
          closed.delete(invocation);
          closed.set(invocation, head);
          if (closed.size > CLOSED_HEADS) closed.delete(closed.keys().next().value);
        }
      } else if (eventIds.length > 0) {
        heads.set(invocation, eventIds);
        for (const eventId of eventIds) known.add(eventId);
        ownEvidence.set(invocation, known);
      }
      return Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id,
        evidence: evidence.kind,
        eventIds,
        material,
      });
    },
  });
}

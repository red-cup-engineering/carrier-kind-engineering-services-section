/** Journal-backed implementation of the mandatory RPC evidence port. */
import { contentAddress } from "../../../lib/identity/index.mts";
import type { ArtifactSource } from "../../../lib/identity/index.mts";
import { requireJsonValue, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { toEavt } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { journal, openJournal } from "../../../journal/index.mts";
import type { RpcEvidence, RpcEvidenceReceipt, RpcWitness } from "../../../rpc/witness.mts";
import type { FeedResponseObservation } from "../../http/artifacts-stream.mts";
import { feedResponseLogPath } from "./journal-projections.mts";

export interface JournalRpcWitnessOptions {
  readonly namespace?: string;
  readonly causes?: (evidence: RpcEvidence) => readonly string[];
}

/** Project the canonical RPC evidence journal as the server's resumable SSE feed. */
export function filesystemRpcFeedResponder(
  root: string,
  namespace: string,
  now: () => string,
): (lastEventId?: string) => FeedResponseObservation {
  return (lastEventId?: string): FeedResponseObservation => {
    const feed = journal.feed(root, "rpc", now(), { rootName: namespace, subject: "rpc" });
    return feedResponseLogPath(feed.artifact, lastEventId);
  };
}

/** Admit attempts, decisions, and outcomes through the one journal API. */
export function journalRpcWitness(root: string, options: JournalRpcWitnessOptions = {}): RpcWitness {
  const store = openJournal(root);
  const namespace = options.namespace ?? "@red-cup-engineering/metroplat";
  const heads = new Map<string, readonly string[]>();
  const ownEvidence = new Map<string, Set<string>>();
  return Object.freeze({
    causalHead: (invocation: string): readonly string[] => heads.get(invocation) ?? Object.freeze([]),
    admit: (evidence: RpcEvidence, artifacts: readonly ArtifactSource[] = []): RpcEvidenceReceipt => {
      const material = requireJsonValue(evidence, "RPC evidence");
      const id = contentAddress(material);
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      const known = ownEvidence.get(invocation) ?? new Set<string>();
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
      if (eventIds.length > 0) {
        heads.set(invocation, eventIds);
        for (const eventId of eventIds) known.add(eventId);
        ownEvidence.set(invocation, known);
      }
      return Object.freeze({
        kind: "metroplat.rpc.evidence-receipt" as const,
        id,
        evidence: evidence.kind,
        eventIds,
        material,
      });
    },
  });
}

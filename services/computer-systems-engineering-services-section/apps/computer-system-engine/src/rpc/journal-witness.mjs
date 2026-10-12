/** Store-backed implementation of the mandatory RPC evidence port. */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { append, extend, readHead, readLog } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { feedResponseCollector, feedResponseFromProjection } from "@red-cup-engineering/http-services-section/statement-log-stream";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

/** The type of one piece of RPC evidence: a record per act, a thread per invocation, a log line per act for the feed. */
export const rpcEvidenceType = "rpc-evidence";

/** Project the day's RPC log as the server's resumable SSE feed. A line is the row `[invocation, {kind}, of, at]`. */
export function filesystemRpcFeedResponder(
  root,
  namespace,
  now,
) {
  void namespace;
  return (lastEventId) => {
    const collector = feedResponseCollector(lastEventId);
    for (const { line } of readLog(root, rpcEvidenceType, now().slice(0, 10))) {
      collector.push(Object.freeze([line.invocation, Object.freeze({ kind: line.kind }), line.of, line.at]));
    }
    return feedResponseFromProjection(collector.read(), lastEventId);
  };
}

const without = (record, keys) => Object.freeze(Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key))));

/**
 * What the RPC store keeps of one piece of evidence: each fact of the act once. The attempt keeps
 * the invocation; the decision keeps its reading, reasons and evidence but not the invocation again
 * or its rules' advice prose; the outcome keeps the receipt's standing and its content address but
 * not the invocation, decision or output value it was sealed over. Those go back to the caller in
 * the receipt dispatch returns, and the record names that receipt by its `id`.
 */
export function journaledRpcEvidence(evidence) {
  if (evidence.kind === "metroplat.rpc.decision") {
    return Object.freeze({ ...evidence, decision: without(evidence.decision, ["invocation", "advice"]) });
  }
  if (evidence.kind === "metroplat.rpc.outcome") {
    return Object.freeze({ ...evidence, receipt: without(evidence.receipt, ["invocation", "decision", "value"]) });
  }
  return evidence;
}

/**
 * Admit attempts, decisions, and outcomes. An invocation is a thread named by its id: each piece of
 * evidence follows the thread's whole frontier, and the outcome closes it. One log line per act
 * names the record by address for the readers that follow the feed by time.
 */
export function journalRpcWitness(root, options = {}) {
  return Object.freeze({
    /** The frontier a caller reads to chain its next step (an agent worker's stages). */
    causalHead: (invocation) => Object.freeze([...(readHead(root, rpcEvidenceType, invocation)?.frontier ?? [])]),
    admit: (evidence) => {
      const material = requireJsonValue(journaledRpcEvidence(evidence), "RPC evidence");
      const id = artifactId(material);
      const invocation = evidence.kind === "metroplat.rpc.attempt" ? evidence.invocation.id : evidence.invocation;
      const held = readHead(root, rpcEvidenceType, invocation)?.frontier ?? [];
      const effectCauses = evidence.kind === "metroplat.rpc.outcome" ? evidence.receipt.evidence : [];
      const causes = Object.freeze([...new Set([
        ...(evidence.kind === "metroplat.rpc.attempt" ? [] : held),
        ...(options.causes?.(evidence) ?? []),
        ...effectCauses,
      ].filter((cause) => typeof cause === "string" && isNiUri(cause)))]);
      const address = extend(root, rpcEvidenceType, invocation, { at: evidence.at, evidence: material }, {
        causes,
        closed: evidence.kind === "metroplat.rpc.outcome",
      });
      append(root, rpcEvidenceType, { at: evidence.at, invocation, kind: evidence.kind, of: address });
      return Object.freeze({
        kind: "metroplat.rpc.evidence-receipt",
        id,
        evidence: evidence.kind,
        eventIds: Object.freeze([address]),
        material,
      });
    },
  });
}

/**
 * services/filesystem-store/raft-record — project a recorded Raft log into
 * a safety judgment document under `data/records`. Split out of the generic
 * `filesystem-store/index.mts` so the generic journal never has
 * to import the Raft/consensus-log domain directly — this file depends
 * INTO the journal's domain-record projection operation, not
 * the other way around.
 */
import {
  raftLogCollector,
  raftLogSafetyJudgmentContract,
  verifyRaftLogSafety,
} from "@red-cup-engineering/computer-networking-engineering-services-section/raft/consensus-log";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";

/** Project a durable `data/journals` Raft statement log into a safety judgment JSON document under `data/records`. */
export function projectLogPathRaftSafetyJudgment(
  logArtifact,
  options = {},
) {
  return journal.projectDomainRecord(
    logArtifact,
    "project-log-raft-safety-judgment",
    "raft-safety-judgment",
    "log raft safety judgment projection",
    () => raftLogCollector(),
    (collector, row) => {
      collector.push(row);
      return collector;
    },
    (collector) => {
      const raftLog = collector.read();
      const judgment = raftLogSafetyJudgmentContract.assert(
        verifyRaftLogSafety(raftLog),
        "raft safety judgment from statement log",
      );
      return {
        payload: judgment,
        boundary: Object.freeze({ cluster: raftLog.cluster, entries: raftLog.entries.length }),
      };
    },
    options,
  );
}

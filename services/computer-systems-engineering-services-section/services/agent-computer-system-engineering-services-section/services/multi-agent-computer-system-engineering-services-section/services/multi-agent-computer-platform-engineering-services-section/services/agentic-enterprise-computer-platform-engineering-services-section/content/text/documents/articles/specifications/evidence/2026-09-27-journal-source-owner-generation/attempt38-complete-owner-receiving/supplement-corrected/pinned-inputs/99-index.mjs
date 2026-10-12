/**
 * src/journal/filesystem/operations — observations and receipts for journal
 * admission and the log/state/record/content projection chain. The journal is
 * the sole durable event store; these APIs do not define a second store.
 *
 * This is a different module from
 * `integrations/filesystem/addressing/data-artifact-address`: that one is pure
 * path-derivation math, not a contract/lens/exposure boundary.
 */

import { dataArtifactAddress, dataArtifactDescriptor } from "@red-cup-engineering/eavt-services-section/data-artifact-address";
import {
  feedStateProjectionContract,
  jupyterNotebookProjectionContract,
  jupyterRecordProjectionContract,
  logAccountabilityReportProjectionContract,
  logCredentialProjectionContract,
  logRaftSafetyJudgmentProjectionContract,
  logX402ReceiptProjectionContract,
  mementoStateProjectionContract,
  mementoTimeMapProjectionContract,
  recordCommitResultContract,
  recordProjectionContract,
  contentProjectionContract,
  statementWriteResultContract,
  statementLogReadContract,
  journalObservationContract,

} from "./schema.mjs";

/** Filesystem-journal move exposed at the `data/` boundary. */

/** Options for exposing a filesystem-journal move as contract material. */

/** Options for projecting a durable statement log into a credential artifact. */

/** Options for projecting a durable statement log into a Memento TimeMap artifact. */

/** Options for path-first statement writes under a data root. */

export function journalAppendAddress(
  root,
  action,
  at,
  options = {},
) {
  return dataArtifactAddress({
    root,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    tier: "log",
    encoding: options.encoding ?? "jsonl",
    at,
    action,
    subject: options.subject ?? action,
  });
}

export function journalLogArtifact(logPath) {
  return dataArtifactDescriptor("log", logPath, "jsonl");
}

export function journalStateArtifact(statePath) {
  return dataArtifactDescriptor("state", statePath, "json");
}

export function journalRecordArtifact(recordPath, encoding = "jsonl") {
  return dataArtifactDescriptor("record", recordPath, encoding);
}

export function journalContentArtifact(
  contentPath,
  encoding = "json",
) {
  return dataArtifactDescriptor("content", contentPath, encoding);
}

export function observeJournalOperation(feed, operation) {
  return journalObservationContract.assert(Object.freeze({
    kind: "metroplat.witness-store-observation",
    operation,
    feed,
  }), "journal observation");
}

export function journalObservation(value, context = "journal receipt") {
  switch (value.operation) {
    case "write-statement-rows":
      return statementWriteResultContract.assert(Object.freeze(value), context);
    case "read-statement-rows":
      return statementLogReadContract.assert(Object.freeze(value), context);
    case "project-feed-state":
      return feedStateProjectionContract.assert(Object.freeze(value), context);
    case "project-memento-state":
      return mementoStateProjectionContract.assert(Object.freeze(value), context);
    case "project-log-memento-timemap":
      return mementoTimeMapProjectionContract.assert(Object.freeze(value), context);
    case "project-log-credential":
      return logCredentialProjectionContract.assert(Object.freeze(value), context);
    case "project-log-x402-receipt":
      return logX402ReceiptProjectionContract.assert(Object.freeze(value), context);
    case "project-log-accountability-report":
      return logAccountabilityReportProjectionContract.assert(Object.freeze(value), context);
    case "project-log-raft-safety-judgment":
      return logRaftSafetyJudgmentProjectionContract.assert(Object.freeze(value), context);
    case "project-content-jupyter-record":
      return jupyterRecordProjectionContract.assert(Object.freeze(value), context);
    case "project-record-jupyter-notebook":
      return jupyterNotebookProjectionContract.assert(Object.freeze(value), context);
    case "commit-record":
      return recordCommitResultContract.assert(Object.freeze(value), context);
    case "project-log-record":
      return recordProjectionContract.assert(Object.freeze(value), context);
    case "project-record-content":
      return contentProjectionContract.assert(Object.freeze(value), context);
  }
}

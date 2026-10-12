/**
 * src/journal/reading - schema-checked journal reading coherence.
 *
 * The law is pure and lives in `core/persistence/reading-coherence`. This
 * module is the lensed package projection: reading descriptors are checked,
 * coherence reports are asserted, and runtime reading registries are exposed
 * without owning the law.
 */
import {
  cohere as cohereLaw,
  cohereLog as cohereLogLaw,
  readingAsLogReading,
  type CoherenceReport,
  type LogCoherenceReport,
  type LogReading,
  type LogReadingDescriptor,
  type StatementLog,
  type Reading,
  type ReadingDescriptor,
} from "./coherence.mts";
import type { StatementRow } from "../../lib/records/persistence.mts";
import {
  coherenceReportContract,
  coherenceReportSchema,
  logCoherenceReportContract,
  logCoherenceReportSchema,
  logReadingDescriptorContract,
  logReadingDescriptorSchema,
  readingDescriptorContract,
  readingDescriptorSchema,
} from "./schema.mts";

export {
  coherenceReportContract,
  coherenceReportSchema,
  logCoherenceReportContract,
  logCoherenceReportSchema,
  logReadingDescriptorContract,
  logReadingDescriptorSchema,
  readingDescriptorContract,
  readingDescriptorSchema,
  readingAsLogReading,
};

export type {
  CoherenceReport,
  LogCoherenceReport,
  LogReading,
  LogReadingDescriptor,
  StatementRow,
  StatementLog,
  Reading,
  ReadingDescriptor,
};

export function cohere<LeftWire, RightWire>(
  left: Reading<LeftWire>,
  right: Reading<RightWire>,
  statement: StatementRow,
): CoherenceReport {
  readingDescriptorContract.assert({ id: left.id }, "left reading");
  readingDescriptorContract.assert({ id: right.id }, "right reading");
  return coherenceReportContract.assert(cohereLaw(left, right, statement), "coherence report") as CoherenceReport;
}

export function cohereLog<LeftWire, RightWire>(
  left: LogReading<LeftWire>,
  right: LogReading<RightWire>,
  statementLog: StatementLog,
): LogCoherenceReport {
  logReadingDescriptorContract.assert({ id: left.id }, "left log reading");
  logReadingDescriptorContract.assert({ id: right.id }, "right log reading");
  return logCoherenceReportContract.assert(cohereLogLaw(left, right, statementLog), "log coherence report") as LogCoherenceReport;
}

export function assertCoherent<LeftWire, RightWire>(
  left: Reading<LeftWire>,
  right: Reading<RightWire>,
  statement: StatementRow,
): CoherenceReport {
  const report = cohere(left, right, statement);
  if (!report.ok) throw new Error(`readings do not cohere: ${left.id} <-> ${right.id}`);
  return report;
}

export function assertLogCoherent<LeftWire, RightWire>(
  left: LogReading<LeftWire>,
  right: LogReading<RightWire>,
  statementLog: StatementLog,
): LogCoherenceReport {
  const report = cohereLog(left, right, statementLog);
  if (!report.ok) throw new Error(`log readings do not cohere: ${left.id} <-> ${right.id}`);
  return report;
}
export * from "./rpc-sequence.mts";

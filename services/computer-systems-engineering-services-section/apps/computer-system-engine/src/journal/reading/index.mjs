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

} from "./coherence.mjs";

import {
  coherenceReportContract,
  coherenceReportSchema,
  logCoherenceReportContract,
  logCoherenceReportSchema,
  logReadingDescriptorContract,
  logReadingDescriptorSchema,
  readingDescriptorContract,
  readingDescriptorSchema,
} from "./schema.mjs";

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

export function cohere(
  left,
  right,
  statement,
) {
  readingDescriptorContract.assert({ id: left.id }, "left reading");
  readingDescriptorContract.assert({ id: right.id }, "right reading");
  return coherenceReportContract.assert(cohereLaw(left, right, statement), "coherence report");
}

export function cohereLog(
  left,
  right,
  statementLog,
) {
  logReadingDescriptorContract.assert({ id: left.id }, "left log reading");
  logReadingDescriptorContract.assert({ id: right.id }, "right log reading");
  return logCoherenceReportContract.assert(cohereLogLaw(left, right, statementLog), "log coherence report");
}

export function assertCoherent(
  left,
  right,
  statement,
) {
  const report = cohere(left, right, statement);
  if (!report.ok) throw new Error(`readings do not cohere: ${left.id} <-> ${right.id}`);
  return report;
}

export function assertLogCoherent(
  left,
  right,
  statementLog,
) {
  const report = cohereLog(left, right, statementLog);
  if (!report.ok) throw new Error(`log readings do not cohere: ${left.id} <-> ${right.id}`);
  return report;
}
export * from "./rpc-sequence.mjs";

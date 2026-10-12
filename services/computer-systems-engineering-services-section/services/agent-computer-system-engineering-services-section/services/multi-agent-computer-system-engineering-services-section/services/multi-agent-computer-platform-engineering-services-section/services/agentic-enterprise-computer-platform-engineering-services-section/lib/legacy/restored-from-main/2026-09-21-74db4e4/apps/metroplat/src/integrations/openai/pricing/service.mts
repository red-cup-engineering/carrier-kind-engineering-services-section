import { operation, type Operation } from "../../../rpc/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { FilesystemBinding } from "../../filesystem/services/read-write.mts";
import { journal } from "../../../journal/index.mts";
import { inferenceCostObservationCollector } from "./inference-cost-observations.mts";

function operationDate(binding: FilesystemBinding, input: unknown): string {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input as Readonly<Record<string, JsonValue>>)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

export function readInferenceCostReadout(
  binding: FilesystemBinding,
  date: string,
): JsonValue | undefined {
  const logPath = journal.feed(binding.dataRoot, "openai-chat-completions", date, { subject: "openai-chat-completions" });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const collector = inferenceCostObservationCollector();
  let rows = 0;
  try {
    const folded = journal.scan(logPath, undefined, (_accum, row) => {
      collector.push(row);
      return undefined;
    });
    rows = folded.rows;
  } catch {
    return undefined;
  }
  if (rows === 0) return undefined;
  return Object.freeze({
    ...collector.read(),
    kind: "metroplat.holography.inference-cost-settlement",
    date,
  }) as unknown as JsonValue;
}

export function openAIPricingOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "inference-cost",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Settle recorded OpenAI chat-completion inference cost.",
      description: "Domain: { date? }. Folds the openai-chat-completions statement feed into worker, model, total, and conservation cost readouts.",
      run: (input: unknown): unknown => readInferenceCostReadout(binding, operationDate(binding, input)) ?? null,
    }),
  ]);
}

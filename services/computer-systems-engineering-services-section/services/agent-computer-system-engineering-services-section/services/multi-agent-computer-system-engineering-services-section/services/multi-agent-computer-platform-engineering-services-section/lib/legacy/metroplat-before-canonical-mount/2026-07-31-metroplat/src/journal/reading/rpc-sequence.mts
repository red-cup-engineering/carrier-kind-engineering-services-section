/** Reduce canonical RPC evidence rows to the admitted steps used by recurrence analysis. */
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import type { EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import type { AdmittedStep } from "../../lib/math/number/sequence-recurrence.mts";

function record(value: JsonValue | undefined): Readonly<Record<string, JsonValue>> | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Readonly<Record<string, JsonValue>>;
}

function inputShape(value: JsonValue | undefined): readonly string[] {
  const input = record(value);
  return Object.freeze(input === undefined ? [] : Object.keys(input).sort());
}

interface MutableAdmittedStep {
  actor: string;
  verb: string;
  argShape: readonly string[];
  validated: boolean;
}

export interface RpcAdmittedStepCollector {
  push(row: EAVT): void;
  read(): readonly AdmittedStep[];
}

/** Pair each admitted attempt with its outcome. Attempts without a successful
 * outcome remain invalid evidence rather than being silently discarded. */
export function rpcAdmittedStepCollector(): RpcAdmittedStepCollector {
  const steps: MutableAdmittedStep[] = [];
  const pending = new Map<string, number[]>();
  const push = (row: EAVT): void => {
    const attribute = record(row[1]);
    const evidence = record(row[2]);
    const kind = attribute?.["kind"];
    if (kind === "metroplat.rpc.attempt") {
      const invocation = record(evidence?.["invocation"]);
      const id = invocation?.["id"];
      const actor = invocation?.["subject"];
      const verb = invocation?.["verb"];
      if (typeof id !== "string" || typeof actor !== "string" || typeof verb !== "string") return;
      const index = steps.push({
        actor,
        verb,
        argShape: inputShape(invocation?.["input"]),
        validated: false,
      }) - 1;
      const occurrences = pending.get(id);
      if (occurrences === undefined) pending.set(id, [index]);
      else occurrences.push(index);
      return;
    }
    if (kind !== "metroplat.rpc.outcome") return;
    const id = evidence?.["invocation"];
    const receipt = record(evidence?.["receipt"]);
    if (typeof id !== "string" || typeof receipt?.["ok"] !== "boolean") return;
    const occurrences = pending.get(id);
    if (occurrences === undefined) return;
    const index = occurrences.pop();
    if (index === undefined) return;
    steps[index]!.validated = receipt["ok"];
    if (occurrences.length === 0) pending.delete(id);
  };
  return Object.freeze({
    push,
    read: () => Object.freeze(steps.map((step) => Object.freeze({ ...step }))),
  });
}

export function rpcAdmittedStepsOfRows(rows: Iterable<EAVT>): readonly AdmittedStep[] {
  const collector = rpcAdmittedStepCollector();
  for (const row of rows) collector.push(row);
  return collector.read();
}

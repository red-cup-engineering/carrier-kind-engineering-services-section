import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { artifactType } from "../carriers.mjs";
import { softwareWorkIdentity, witnessSoftwareWork } from "../../software-change.mjs";
import { concludeSoftwareWork, proposeSoftwareWork } from "../work-journal.mjs";
import { runMission as defaultRunMission } from "./mission-runtime.mjs";
import { SOFTWARE_MISSION_ACTOR } from "./mission-identity.mjs";

export const MISSION_EXECUTION_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const DEFAULT_MISSION_EXECUTION_DATA_ROOT = fileURLToPath(new URL("../../data", import.meta.url));


async function appendRouteObservation(record, { journalPath, work, intent, mission }) {
  const history = await concludeSoftwareWork(journalPath, work, "observed", record);
  const effect = createTypedMark(artifactType, {
    digest: semanticId(record),
    kind: "software-mission-execution-effect",
  });
  if (!effect.ok) throw new TypeError(effect.refusal.message);
  const evidence = witnessSoftwareWork({
    intent,
    inputs: [{ path: mission.territory, kind: "software-mission-request", digest: semanticId(mission) }],
    outputs: [{ path: journalPath, kind: "software-mission-execution-effect", digest: semanticId(record) }],
    observed: true,
  });
  return Object.freeze({ reference: null, documentNi: effect.value.id, history, evidence });
}

/**
 * Deterministically project one mission execution result into the effect that
 * control-plane consumers may observe.  Provider selection and inference stay
 * inside `runMission`; this boundary only classifies their received result.
 */
export function routeMissionEffect(mission, execution, { finishedAt } = {}) {
  if (!mission || typeof mission.id !== "string" || mission.id.length === 0) {
    throw new TypeError("mission routing requires one identified mission");
  }
  if (!execution || typeof execution !== "object" || !execution.outcome || typeof execution.outcome !== "object") {
    throw new TypeError("mission routing requires an execution outcome");
  }
  if (typeof finishedAt !== "string" || finishedAt.length === 0) {
    throw new TypeError("mission routing requires one observed finish time");
  }
  const finalVerified = execution.outcome.verified === true;
  const finalAnswered = execution.outcome.answered === true;
  const continuation = execution.processNode?.fixedPoint
    ? { state: "obstructed-fixed-point", obstruction: execution.processNode.fixedPoint }
    : finalVerified
      ? { state: "awaiting-customer-induction" }
      : finalAnswered
        ? { state: "answered" }
        : { state: "durable-demand-open", nextAct: "return-to-capability-market" };
  return Object.freeze({
    type: "SoftwareMissionExecutionEffect",
    id: mission.id,
    routePolicy: "enterprise-memory-pulse-only",
    taskClass: mission.taskClass || null,
    finishedAt,
    finalVerified,
    finalAnswered,
    phaseCount: 1,
    inferenceAttempts: Number.isSafeInteger(execution.metrics?.inferenceAttempts) ? execution.metrics.inferenceAttempts : 0,
    usefulCompletions: Number.isSafeInteger(execution.metrics?.usefulCompletions) ? execution.metrics.usefulCompletions : 0,
    directInteractiveModelCalls: Number.isSafeInteger(execution.metrics?.directInteractiveModelCalls) ? execution.metrics.directInteractiveModelCalls : 0,
    nextActCarrier: "software-trajectory-memory-service",
    continuation: Object.freeze(continuation),
  });
}

export async function runMissionPipeline(mission, {
  runMission = defaultRunMission,
  recordRouteObservation = appendRouteObservation,
  signal,
  customerActor,
  dataRoot = process.env.AOE_SOFTWARE_MISSION_DATA_ROOT ?? DEFAULT_MISSION_EXECUTION_DATA_ROOT,
} = {}) {
  if (mission.maxTokens != null) throw new Error("mission maxTokens is retired; provider capacity and market consideration determine admissible output");
  if (typeof mission?.id !== "string" || mission.id.length === 0 || typeof mission.territory !== "string") {
    throw new TypeError("software mission requires an identified mission and territory");
  }
  const durable = recordRouteObservation === appendRouteObservation;
  const attempt = durable ? randomUUID() : null;
  const intent = durable ? {
    operation: "software-mission-execution", actor: SOFTWARE_MISSION_ACTOR,
    request: { mission: mission.id, attempt },
  } : null;
  const work = durable ? softwareWorkIdentity(intent) : null;
  const journalPath = durable ? join(dataRoot, "software-mission-work", `${attempt}.jsonl`) : null;
  if (durable) {
    await mkdir(join(dataRoot, "software-mission-work"), { recursive: true });
    await proposeSoftwareWork(journalPath, work, { mission: mission.id, territory: mission.territory, attempt });
  }
  let current;
  try {
    current = await runMission(mission, { signal, customerActor, dataRoot });
  } catch (error) {
    if (durable) await concludeSoftwareWork(journalPath, work, "observed", {
      state: "failed", error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  const phases = [{ kind: "enterprise-knowledge-pulse", result: current }];
  const observation = routeMissionEffect(mission, current, { finishedAt: new Date().toISOString() });
  const routeRecord = await recordRouteObservation(observation, { dataRoot, journalPath, work, intent, mission });
  return { ...current, phases, route: {
    ...observation, networkReference: routeRecord.reference, semanticId: routeRecord.documentNi,
    ...(routeRecord.evidence === undefined ? {} : { evidence: routeRecord.evidence }),
  } };
}

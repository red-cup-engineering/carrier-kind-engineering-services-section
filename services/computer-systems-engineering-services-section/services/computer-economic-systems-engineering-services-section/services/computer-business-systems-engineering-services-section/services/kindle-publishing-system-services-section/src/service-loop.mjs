/** Kindle's production line is an AOE service line whose subject is a book and whose ledger is title cost. */
import { defineServiceLine, projectServiceLineKnowledge, runServiceLineTurn, serviceLineEvents, serviceLineStatus } from "@red-cup-engineering/organizing/work/service-line";
import { kindleControl, recordTitleCost, titleCostRecords } from "./publication-control.mjs";

export const PIPELINE_STAGES = Object.freeze(["market", "plan", "draft", "format", "validate", "publish", "feedback"]);

export const kindleLine = defineServiceLine({
  service: kindleControl.service, subjectField: "book", stages: PIPELINE_STAGES,
  eventTypeName: "KindlePipelineEvent", eventTypeId: "org.561-group.kindle.pipeline-event.v1", eventTitle: "Kindle pipeline event",
  defaultRun: "autonomous-kindle-line",
  afterTurn({ dataRoot, content, result, elapsedMs, humanBoundary, at }) {
    if (content.book && (content.stage !== "market" || titleCostRecords(dataRoot, content.book).length)) recordTitleCost(dataRoot, { book: content.book, commissionedAt: at, updatedAt: at, throughStage: content.stage, delta: { ...(result.cost ?? {}), wallClockProductionMs: elapsedMs, exceptionRecoveryMs: content.status === "blocked" ? elapsedMs : Number(result.cost?.exceptionRecoveryMs ?? 0) }, humanBoundary });
  },
  statusExtras(dataRoot) {
    const latestCosts = new Map(); for (const cost of titleCostRecords(dataRoot)) latestCosts.set(cost.book, cost);
    return { titleCosts: [...latestCosts.values()] };
  },
});

export const pipelineEventType = kindleLine.eventType;
export const pipelineEvents = (dataRoot, run) => serviceLineEvents(kindleLine, dataRoot, run);
export const projectPipelineKnowledge = (events) => projectServiceLineKnowledge(kindleLine, events);

/** One bounded MAPE-K turn. The AOE clock repeats this operation; this module is not a scheduler. */
export function runKindlePipelineTurn({ book = null, ...turn }) { return runServiceLineTurn(kindleLine, { ...turn, subject: book }); }
export function kindlePipelineStatus(dataRoot, run = kindleLine.defaultRun) { return serviceLineStatus(kindleLine, dataRoot, run); }

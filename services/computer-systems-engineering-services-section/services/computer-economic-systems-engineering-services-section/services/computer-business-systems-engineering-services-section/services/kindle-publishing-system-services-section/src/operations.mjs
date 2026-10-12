import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { kindlePipelineHandlers } from "./runtime.mjs";
import { kindlePipelineStatus, runKindlePipelineTurn } from "./service-loop.mjs";

const empty = (id, title) => schemaFrom({ $id: id, title, type: "object", additionalProperties: false });

/** MetroPlat operation family: FeltOS callers and the AOE clock use the same governed surface. */
export function kindlePublishingOperations(binding) {
  return Object.freeze([
    operation({ verb: "kindle-pipeline-cycle", summary: "Run one bounded MAPE-K turn of the autonomous Kindle line.", domain: empty("kindle/pipeline/cycle", "KindlePipelineCycle"), writes: ["kindle-pipeline"], effects: { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" }, run: async () => runKindlePipelineTurn({ dataRoot: binding.dataRoot, now: binding.now, handlers: await kindlePipelineHandlers() }) }),
    operation({ verb: "kindle-pipeline-status", summary: "Report every Kindle stage's last run, backlog, and blockers.", domain: empty("kindle/pipeline/status", "KindlePipelineStatusRequest"), reads: ["kindle-pipeline"], run: () => kindlePipelineStatus(binding.dataRoot) }),
  ]);
}

import { harness, induceHarnessTopology } from "@red-cup-engineering/organizing-with-llm-agents/harness";
import { classifyRun, emptyRun, settleRun } from "@red-cup-engineering/organizing-with-llm-agents/running";

export function operationsManifoldAgentHarness() {
  const carrier = harness({
    id: "operations-manifold",
    agent: "operations-manifold",
    channels: ["http", "openapi", "mcp", "webux", "stdio-eavt", "package-scripts"],
  });
  return Object.freeze({
    carrier,
    topology: induceHarnessTopology(carrier),
  });
}

export function operationsManifoldAgentRun() {
  const run = settleRun(
    emptyRun("operations-manifold.agent.discovery"),
    "final-answer",
    "Inspect existing carriers, choose an upstream capability, and mount its transport projection.",
  );
  return Object.freeze({
    run,
    classification: classifyRun(run),
  });
}

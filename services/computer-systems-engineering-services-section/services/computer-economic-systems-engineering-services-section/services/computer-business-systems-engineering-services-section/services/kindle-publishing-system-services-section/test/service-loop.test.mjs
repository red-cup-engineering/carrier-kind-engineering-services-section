import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kindlePipelineStatus, pipelineEvents, projectPipelineKnowledge, runKindlePipelineTurn } from "../src/service-loop.mjs";

test("one AOE turn records MAPE-K evidence and status exposes backlog and blockers", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "kindle-loop-"));
  const first = await runKindlePipelineTurn({ dataRoot, now: () => "2026-09-29T00:00:00Z", handlers: { market: async () => ({ status: "complete", snapshots: ["ni:///sha-256;x"] }) } });
  assert.equal(first.event.content.stage, "market"); assert.match(first.event.id, /^ni:\/\/\/sha-256;/u); assert.equal(projectPipelineKnowledge(pipelineEvents(dataRoot)).signChain.tellings, 1);
  const second = await runKindlePipelineTurn({ dataRoot, now: () => "2026-09-29T00:01:00Z", handlers: {} });
  assert.equal(second.event.content.status, "blocked"); assert.equal(kindlePipelineStatus(dataRoot).blockers.at(-1).code, "missing-stage-handler");
  assert.equal(second.event.content.execute.autonomyIncident.failureClass, "CONFIGURATION_FAILURE");
  assert.equal(second.event.content.execute.repairRequest.status, "open");
});

test("a completed feedback stage opens the next autonomous cycle", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "kindle-loop-cycles-"));
  const handlers = Object.fromEntries(["market", "plan", "draft", "format", "validate", "publish", "feedback"].map((stage) => [stage, async ({ cycle }) => ({ status: "complete", cycle })]));
  for (let turn = 0; turn < 7; turn += 1) await runKindlePipelineTurn({ dataRoot, handlers });
  const next = await runKindlePipelineTurn({ dataRoot, handlers });
  assert.equal(next.event.content.cycle, 2);
  assert.equal(next.event.content.stage, "market");
  assert.equal(next.status.backlog, 1);
  assert.equal(next.status.titleCosts.length, 0);
});

test("status exposes a title cost record frozen when planning commissions the title", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "kindle-loop-cost-"));
  await runKindlePipelineTurn({ dataRoot, handlers: { market: async () => ({ status: "complete" }) } });
  const planned = await runKindlePipelineTurn({ dataRoot, handlers: { plan: async () => ({ status: "complete", book: "ice-out", cost: { inferenceDollars: 5, aggregateAgentComputeMs: 90 } }) } });
  assert.equal(planned.status.titleCosts[0].book, "ice-out");
  assert.equal(planned.status.titleCosts[0].costs.inferenceDollars, 5);
  assert.equal(planned.status.titleCosts[0].costs.aggregateAgentComputeMs, 90);
});

test("an untyped human request is refused and routed to autonomous repair", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "kindle-loop-untyped-human-"));
  const result = await runKindlePipelineTurn({ dataRoot, handlers: { market: async () => ({ status: "needs-human", code: "ask-the-founder" }) } });
  assert.equal(result.event.content.status, "blocked");
  assert.equal(result.event.content.execute.code, "untyped-human-boundary");
  assert.equal(result.event.content.execute.autonomyIncident.authority, "machine-remediable-defect");
});

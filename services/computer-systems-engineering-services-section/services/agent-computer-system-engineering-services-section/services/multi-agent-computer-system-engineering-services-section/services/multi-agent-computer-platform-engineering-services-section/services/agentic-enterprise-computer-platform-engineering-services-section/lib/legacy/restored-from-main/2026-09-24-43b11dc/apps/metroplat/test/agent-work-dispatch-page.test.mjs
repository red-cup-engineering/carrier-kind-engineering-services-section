import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  agentWorkDispatchReadoutOfWork,
  pageAgentWorkDispatchReadout,
  AGENT_WORK_DISPATCH_DEFAULT_LIMIT,
  AGENT_WORK_DISPATCH_MAX_LIMIT,
  AGENT_WORK_DISPATCH_REASONS_LIMIT,
} from "@red-cup-engineering/organizing/work/dispatch";
import { agentWorkDispatchOutputContract } from "@red-cup-engineering/organizing/work/schema";
import { readAgentWorkDispatchReadout, workCoordinationOperations } from "../src/work/service.mjs";
import { admitStructuredWorkIntent } from "../src/work/structured-intent.mjs";
import { admitAgencyWorkAllocation } from "../src/work/agency-work-allocation.mjs";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
import { defaultFilesystemBinding } from "../src/integrations/filesystem/services/read-write.mjs";
import { authorizationFromStanding, dispatch } from "../src/rpc/dispatch.mjs";
import { createOperationCatalog } from "../src/rpc/operation.mjs";
import { invocation } from "../src/rpc/invocation.mjs";

const at = () => "2026-09-04T12:00:00.000Z";

function authority(input) {
  return {
    office: { id: input.office.id, bearsDuty: [input.duty], deonticProfile: { "leading-company-strategy-and-priorities": "duty" } },
    duty: { id: input.duty, work: "leading-company-strategy-and-priorities", claim: "founder:561-group", skills: ["lead-the-company"], delegation: true },
    work: { id: "leading-company-strategy-and-priorities", needs: ["lead-the-company"], receiverCondition: "founder-accepted-strategy" },
    skill: { id: "lead-the-company", closureKind: "inquiry", requiresCapabilities: [], method: "cybernetic-medicine" },
    officeService: { id: input.officeService.id, requiredCapabilities: input.officeService.requiredCapabilities },
  };
}

/** A synthetic duty; `blockerCount` blockers pad `reasons` past the 8-entry cap.
 * Carries a full allocation marker (`allocation`/`work`/`skill`/`closureKind`/
 * `requiresCapabilities`/`method`/`receiverCondition`) so a `blockerCount: 0`
 * duty reaches the "ready" dispatch state under the canonical
 * office-service-allocation gate (`stateOfDuty`, `src/work/dispatch.mts`). */
function dutyOf(index, { blockerCount = 0 } = {}) {
  return {
    scope: `task:item-${String(index).padStart(4, "0")}`,
    passive: "agent:mesh",
    standing: "potential",
    via: "agent",
    status: "open",
    structural: {
      state: blockerCount > 0 ? "blocked" : "ready",
      blockers: Array.from({ length: blockerCount }, (_, b) => `blocker-${b}`),
    },
    coordination: { state: "clear" },
    conflicts: [],
    allocation: "fixture-allocation",
    work: "fixture-work",
    skill: "fixture-skill",
    closureKind: "inquiry",
    requiresCapabilities: [],
    method: "fixture-method",
    receiverCondition: "fixture-receiver-condition",
  };
}

function readoutOf(dutyCount, options = {}) {
  const scopes = Array.from({ length: dutyCount }, (_, i) => dutyOf(i, options));
  return agentWorkDispatchReadoutOfWork({
    kind: "metroplat.agent-work.readout",
    subject: "agent:mesh",
    date: "2026-09-04",
    feed: "daily-claim-sessions",
    work: { observations: 0, diamonds: 0, open: dutyCount, discharged: 0, obstructed: 0, scopes: [], parents: [], roadmap: { nodes: [], milestones: [] } },
    agents: [{
      agent: "agent:mesh",
      duties: dutyCount,
      open: dutyCount,
      discharged: 0,
      obstructed: 0,
      offices: [],
      scopes,
    }],
    evidence: [],
  });
}

test("pageAgentWorkDispatchReadout caps each item's reasons and reports reasonsTruncated", () => {
  const readout = readoutOf(3, { blockerCount: 10 });
  const page = pageAgentWorkDispatchReadout(readout, {});
  assert.equal(page.queue.length, 3);
  for (const item of page.queue) {
    assert.ok(item.reasons.length <= AGENT_WORK_DISPATCH_REASONS_LIMIT);
    assert.equal(item.reasonsTruncated, 8, "4 fixed reasons + level + coordination + 10 blockers = 16, capped to 8");
  }
  // an item with few reasons is returned as-is, with no reasonsTruncated field
  const small = readoutOf(1);
  const smallPage = pageAgentWorkDispatchReadout(small, {});
  assert.equal(Object.hasOwn(smallPage.queue[0], "reasonsTruncated"), false);
});

test("dispatch retains an admitted deterministic binding verbatim", () => {
  const binding = Object.freeze({ operation: "node-version", request: Object.freeze({ type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: Object.freeze(["--version"]), directory: "/tmp", environment: null, input: null }), acceptance: Object.freeze({ kind: "command-exit-status", status: 0 }) });
  const duty = { ...dutyOf(1), deterministicExecution: binding };
  const result = agentWorkDispatchReadoutOfWork({
    kind: "metroplat.agent-work.readout", subject: "agent:mesh", date: "2026-09-04", feed: "daily-claim-sessions",
    work: { observations: 0, diamonds: 0, open: 1, discharged: 0, obstructed: 0, scopes: [], parents: [], roadmap: { nodes: [], milestones: [] } },
    agents: [{ agent: "agent:mesh", duties: 1, open: 1, discharged: 0, obstructed: 0, offices: [], scopes: [duty] }], evidence: [],
  });
  assert.deepEqual(result.frontier[0].deterministicExecution, binding);
});

test("pageAgentWorkDispatchReadout pages the top-level queue with limit/cursor/nextCursor", () => {
  const readout = readoutOf(120);
  const scopesInOrder = readout.queue.map((item) => item.scope);

  const first = pageAgentWorkDispatchReadout(readout, { limit: 50 });
  assert.equal(first.queue.length, 50);
  assert.equal(first.nextCursor, "50");

  const second = pageAgentWorkDispatchReadout(readout, { limit: 50, cursor: first.nextCursor });
  assert.equal(second.queue.length, 50);
  assert.equal(second.nextCursor, "100");

  const third = pageAgentWorkDispatchReadout(readout, { limit: 50, cursor: second.nextCursor });
  assert.equal(third.queue.length, 20);
  assert.equal(third.nextCursor, undefined);

  assert.deepEqual(
    [...first.queue, ...second.queue, ...third.queue].map((item) => item.scope),
    scopesInOrder,
    "the page boundaries neither drop nor duplicate items",
  );
});

test("pageAgentWorkDispatchReadout keeps ready/blocked/done computed over the whole, unpaged queue", () => {
  const readout = readoutOf(120);
  const page = pageAgentWorkDispatchReadout(readout, { limit: 1 });
  assert.equal(page.queue.length, 1);
  assert.equal(page.ready, 120);
  assert.equal(page.blocked, 0);
  assert.equal(page.done, 0);
  assert.equal(page.agents[0].ready, 120);
});

test("pageAgentWorkDispatchReadout caps each agent's own queue at limit, independent of the top-level cursor", () => {
  const readout = readoutOf(120);
  const page = pageAgentWorkDispatchReadout(readout, { limit: 50 });
  assert.equal(page.agents.length, 1);
  assert.equal(page.agents[0].queue.length, 50);
  assert.equal(page.agents[0].queueTruncated, 70);
});

test("pageAgentWorkDispatchReadout caps a large ready frontier too, top-level and per-agent -- the production crash (agents[1].frontier[285].status) was a large ready set, not a large queue", () => {
  // every duty here is `state: "ready"` (blockerCount 0), so the whole
  // 200-item queue is also the whole frontier: exactly the shape that
  // crashed production before this fix (a queue fix alone did not cover it).
  const readout = readoutOf(200);
  assert.equal(readout.frontier.length, 200);
  assert.equal(readout.agents[0].frontier.length, 200);

  const page = pageAgentWorkDispatchReadout(readout, { limit: 50 });
  assert.equal(page.frontier.length, 50);
  assert.equal(page.frontierTruncated, 150);
  assert.equal(page.agents[0].frontier.length, 50);
  assert.equal(page.agents[0].frontierTruncated, 150);
  // the offers derived from that frontier are capped the same way: every ready
  // item here shares lane 0, so there is one concurrent-offer group, and its
  // own item list is capped to `limit` just like `frontier` and `queue` are.
  assert.equal(readout.agents[0].offers.length, 1);
  assert.equal(readout.agents[0].offers[0].length, 200);
  assert.equal(page.agents[0].offers.length, 1);
  assert.equal(page.agents[0].offers[0].length, 50);

  // ready is still the true, unpaged count -- only the arrays shrank
  assert.equal(page.ready, 200);
});

test("pageAgentWorkDispatchReadout defaults limit to 50, clamps to [1, 500], and tolerates a malformed cursor", () => {
  const small = readoutOf(10);
  assert.equal(pageAgentWorkDispatchReadout(small, {}).queue.length, 10);
  assert.equal(pageAgentWorkDispatchReadout(small, {}).nextCursor, undefined);

  const big = readoutOf(600);
  assert.equal(pageAgentWorkDispatchReadout(big, { limit: 10_000 }).queue.length, AGENT_WORK_DISPATCH_MAX_LIMIT);
  assert.equal(pageAgentWorkDispatchReadout(big, { limit: 0 }).queue.length, 1);
  assert.equal(pageAgentWorkDispatchReadout(big, { limit: 3.5 }).queue.length, AGENT_WORK_DISPATCH_DEFAULT_LIMIT);

  const withBadCursor = pageAgentWorkDispatchReadout(small, { cursor: "not-a-number" });
  assert.deepEqual(withBadCursor.queue.map((item) => item.scope), small.queue.map((item) => item.scope));
});

test("the agent-work-dispatch RPC verb is registered with domain/codomain contracts and its output validates", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-agent-work-dispatch-page-"));
  try {
    const DATE = "2026-09-04";
    const ACTOR = "actor:agent-work-dispatch-page-test";
    const binding = defaultFilesystemBinding(root, { now: () => `${DATE}T12:00:00.000Z` });

    const plan = "plan:agent-work-dispatch-page-test";
    const levels = [
      ["endeavor:agent-work-dispatch-page-test", undefined],
      ["campaign:agent-work-dispatch-page-test", "endeavor:agent-work-dispatch-page-test"],
      ["project:agent-work-dispatch-page-test", "campaign:agent-work-dispatch-page-test"],
      [plan, "project:agent-work-dispatch-page-test"],
      ["task:leaf-a", plan],
      ["task:leaf-b", plan],
      ["task:leaf-c", plan],
    ];
    admitStructuredWorkIntent(binding, {
      kind: "metroplat.work.structured-intent",
      id: "agent-work-dispatch-page-test",
      producer: { id: "test", revision: "1" },
      sources: [{ id: "prompt", kind: "natural-language-prompt" }],
      items: levels.map(([cell, parent], index) => ({
        cell,
        ...(parent === undefined ? {} : { parent }),
        ...(cell.startsWith("task:") ? { work: "leading-company-strategy-and-priorities", skill: "lead-the-company" } : {}),
        text: cell,
        evidence: [],
        provenance: [{ source: "prompt", start: index, end: index + 1, unit: "unicode-code-point" }],
      })),
    }, { at: DATE, subject: "agent-work-dispatch-page-test" });
    for (const scope of ["task:leaf-a", "task:leaf-b", "task:leaf-c"]) {
      admitAgencyWorkAllocation(binding, {
        kind: "metroplat.work.agency-work-allocation",
        id: `agent-work-dispatch-page-${scope}`,
        subject: "agent-work-dispatch-page-test",
        office: { id: "office:executive-officer-to-the-leader" },
        duty: "emsenn/duty/leading-company-strategy-and-priorities",
        character: { model: "test-model", id: ACTOR, capabilities: [] },
        officeService: { id: "emsenn/duty/leading-company-strategy-and-priorities", requiredCapabilities: [] },
        allocation: { scope },
      }, { at: DATE, resolveAuthority: authority, resolveModelCharacter: modelCharacterResolverFromProviderAdmissions([{ model: "test-model", capabilities: [] }]) });
    }

    const operations = workCoordinationOperations(binding);
    const dispatchOp = operations.find((op) => op.verb === "agent-work-dispatch");
    assert.ok(dispatchOp, "agent-work-dispatch is registered");
    assert.equal(dispatchOp.domain?.id, "metroplat/work/agent-work-dispatch-input");
    assert.equal(dispatchOp.codomain?.id, "metroplat/work/agent-work-dispatch-output");

    const catalog = createOperationCatalog(operations);
    const witness = {
      causalHead() { return []; },
      admit() { return { kind: "metroplat.rpc.evidence-receipt", id: "e", evidence: "e", eventIds: [] }; },
    };
    const runtime = { catalog, witness, authorize: authorizationFromStanding(new Map([[dispatchOp.ref, "held"]])), now: at };

    const paged = await dispatch(runtime, invocation({
      request: "request:1",
      subject: "subject:test",
      operation: dispatchOp.ref,
      verb: dispatchOp.verb,
      resource: "test",
      input: { date: DATE, id: ACTOR, limit: 1 },
      caller: { transport: "test" },
      observedAt: at(),
    }));
    assert.equal(paged.ok, true, JSON.stringify(paged.reasons));
    agentWorkDispatchOutputContract.assert(paged.value, "agent-work-dispatch output");
    assert.equal(paged.value.kind, "metroplat.agent-work.dispatch-settlement");
    assert.equal(paged.value.queue.length, 1);
    assert.equal(paged.value.nextCursor, "1");
    assert.equal(paged.value.ready, 3);

    // the internal, unpaged reader (agents/service.mts's context-image consumers)
    // is unaffected: it still returns every item, with no paging fields at all.
    const unpaged = readAgentWorkDispatchReadout(binding, DATE, ACTOR);
    assert.equal(unpaged.queue.length, 3);
    assert.equal(Object.hasOwn(unpaged, "nextCursor"), false);

    const secondPage = await dispatch(runtime, invocation({
      request: "request:2",
      subject: "subject:test",
      operation: dispatchOp.ref,
      verb: dispatchOp.verb,
      resource: "test",
      input: { date: DATE, id: ACTOR, limit: 1, cursor: paged.value.nextCursor },
      caller: { transport: "test" },
      observedAt: at(),
    }));
    assert.equal(secondPage.ok, true, JSON.stringify(secondPage.reasons));
    assert.equal(secondPage.value.queue.length, 1);
    assert.notEqual(secondPage.value.queue[0].scope, paged.value.queue[0].scope);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

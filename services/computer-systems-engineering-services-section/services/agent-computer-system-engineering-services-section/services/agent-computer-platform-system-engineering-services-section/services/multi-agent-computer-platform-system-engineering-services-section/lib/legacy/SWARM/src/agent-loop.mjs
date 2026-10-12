// agent-loop.mjs — the agentic loop runner: the bounded iteration swarm wholly lacks today.
//
// message() (src/index.mjs:170-172) does ONE infer and writes memory; there is no loop, no
// tool-calling round-trip, no executed actuator. This module is that loop: prompt -> model
// (inferWithTools) -> parse tool_calls -> GOVERNED execute (runGovernedTool) -> append assistant
// + tool turns -> repeat, until a stop condition or a step cap. Each step is recorded as one
// append-only EAVT cell (writeTrace under loops/<runId>/steps/<step>); the runner additionally
// lays one ledger cell per tool-call (inside runGovernedTool). Reading loops/<runId>/steps/*
// replays the loop; reading ledger/tool-runs/* replays every actuation with its gate witnesses.
//
// Held-⊤ discipline rides through every decision: a contested tool (run.value === "stable") is
// NEVER actioned. It is surfaced back to the transcript as { contested } and the loop BREAKS —
// held ⊤ is not collapsed to a yes or a no, it is the loop's terminal state, mirroring
// dispatchGate. A "active" refusal or "absurd" unsettled result IS fed back so the model sees it
// and may re-plan; the loop continues.

import {
  inferWithTools,
  parseToolCalls,
  toolResultMessage,
  toolSchemasFor,
} from "./tool-call.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";


// resolveRunGovernedTool — the runner's governed-execute is runGovernedTool from the sibling
// governed-tool-runner.mjs (admission + recognition/Gov regime + held-⊤ safety, then actuate).
// It is resolved lazily so this module loads even before that sibling lands: an injected
// options.runGovernedTool (a TEST SEAM, mirroring scriptedToolProvider's fetch seam) takes
// precedence, then the real sibling, then a fail-closed stub that holds nothing and refuses with
// "active". This keeps the named-import contract while never forcing module load to a throw.
async function resolveRunGovernedTool(options) {
  if (typeof options?.runGovernedTool === "function") return options.runGovernedTool;
  try {
    const mod = await import("./governed-tool-runner.mjs");
    if (typeof mod.runGovernedTool === "function") return mod.runGovernedTool;
  } catch {
    /* sibling not yet landed — fall through to fail-closed stub */
  }
  return (root, agent, call, _options) => ({
    tool: call?.name ?? "",
    value: "active",
    gate: "no-runner",
    outcome: "refused",
    traceLog: "",
    reason: "governed-tool-runner unavailable",
    result: { value: null },
  });
}

// runAgentLoop(input) — input = { agent, prompt, tools=[], root, ...options }. options carries
// { fetch, env, now, maxSteps, maxTokens, maxProviderCalls, maxUnsettled, context,
// toolAuthorization, safetyTerms, regime, recognition }, all threaded UNCHANGED through to
// inferWithTools and runGovernedTool. `now` is computed once so the runId and every step t-token
// are deterministic under a fixed options.now (tests pin it).
export async function runAgentLoop(input) {
  const { agent, prompt, root, ...options } = input;
  const now = options.now ?? new Date().toISOString();
  const runGovernedTool = await resolveRunGovernedTool(options);

  const runId = stableId([agent.name, prompt, now], "loop");
  const state = {
    runId,
    messages: [
      ...(agent.system ? [{ role: "system", content: agent.system }] : []),
      ...(options.context ? [{ role: "system", content: options.context }] : []),
      { role: "user", content: prompt },
    ],
    toolSchemas: await toolSchemasFor(input.tools ?? []),
    step: 0,
    steps: [],
    toolRuns: [],
    finalAnswer: null,
    stop: null,
    cost: { providerCalls: 0, promptTokens: 0, completionTokens: 0 },
  };

  // writeStepCell — one append-only EAVT cell per step. Called BEFORE incrementing state.step or
  // on a break, so loops/<runId>/steps/<step> is the faithful replay of that turn. Each written
  // stepDoc is also pushed to state.steps so the LoopResult carries the in-memory replay too.
  const writeStepCell = (utterance, calls, runs) => {
    const stepDoc = {
      kind: "swarm.loop.step",
      runId,
      step: state.step,
      created: now,
      agent: agent.name,
      provider: agent.provider,
      model: agent.model,
      finishReason: utterance[0].finishReason,
      assistantContent: utterance[1].const,
      toolCalls: calls.map((c) => ({ id: c.id, name: c.name, arguments: c.arguments })),
      toolRuns: runs.map((r) => ({
        tool: r.tool,
        value: r.value,
        gate: r.gate,
        outcome: r.outcome,
        traceLog: r.traceLog,
      })),
      usage: utterance[0].usage,
      cumulativeProviderCalls: state.cost.providerCalls,
      stop: state.stop ?? "",
      evidence:
        "agentic loop step: one model turn + its governed tool runs, recorded as an append-only EAVT cell",
    };
    writeTrace(root, "loops/" + runId + "/steps/" + state.step, stepDoc, {
      t: runId + "-step-" + state.step,
    });
    state.steps.push(stepDoc);
  };

  while (true) {
    // 1. One model turn, tools advertised. Accumulate cost off the usage block.
    const utterance = await inferWithTools(agent, state.messages, {
      ...options,
      tools: state.toolSchemas,
    });
    state.cost.providerCalls += 1;
    const u = utterance[0].usage ?? {};
    state.cost.promptTokens += Number(u.prompt_tokens) || 0;
    state.cost.completionTokens += Number(u.completion_tokens) || 0;

    // 2. Append the assistant turn VERBATIM (content and/or tool_calls) — the OpenAI transcript
    // contract requires the assistant tool_calls turn to precede its tool result turns.
    state.messages.push(utterance[1].message);

    // 3-4.
    const calls = parseToolCalls(utterance);
    const runs = [];

    // 5. No tool calls -> the model answered. Settle final answer and stop.
    if (calls.length === 0) {
      state.finalAnswer = utterance[1].const;
      state.stop = "final-answer";
      writeStepCell(utterance, calls, runs);
      break;
    }

    // 6. Govern-and-execute each call. Held ⊤ breaks the loop (surfaced, never actioned).
    let contestedBreak = false;
    for (const call of calls) {
      const run = await runGovernedTool(root, agent, call, options);
      state.toolRuns.push(run);
      runs.push(run);

      if (run.value === "stable") {
        // Held ⊤ is not actionable — surface it and stop the loop (mirrors dispatchGate).
        state.stop = "contested-tool";
        state.messages.push(
          toolResultMessage(call.id, call.name, { contested: run.reason }),
        );
        contestedBreak = true;
        break;
      }

      // "potential" -> the actuated value; "absurd" -> unsettled; else -> refused. A refusal or
      // unsettled result is fed back so the model SEES it and may re-plan; the loop continues.
      state.messages.push(
        toolResultMessage(
          call.id,
          call.name,
          run.value === "potential"
            ? run.result.value
            : run.value === "absurd"
              ? { unsettled: run.reason }
              : { refused: run.reason },
        ),
      );
    }

    // 7. Record the step BEFORE the increment.
    writeStepCell(utterance, calls, runs);

    if (contestedBreak) break;

    // 8.
    state.step += 1;

    // 9. Stop checks after the step.
    if (state.stop) break;
    if (state.step >= (options.maxSteps ?? 8)) {
      state.stop = "max-steps";
      break;
    }
    if (
      options.maxTokens &&
      state.cost.promptTokens + state.cost.completionTokens >= options.maxTokens
    ) {
      state.stop = "cost-bound";
      break;
    }
    if (options.maxProviderCalls && state.cost.providerCalls >= options.maxProviderCalls) {
      state.stop = "cost-bound";
      break;
    }
    if (
      state.toolRuns.filter((r) => r.value === "absurd").length >=
      (options.maxUnsettled ?? (options.maxSteps ?? 8))
    ) {
      state.stop = "max-unsettled";
      break;
    }
  }

  return {
    runId,
    finalAnswer: state.finalAnswer,
    stop: state.stop,
    steps: state.steps,
    toolRuns: state.toolRuns,
    messages: state.messages,
    cost: state.cost,
    contested: state.toolRuns.filter((r) => r.value === "stable"),
    agent,
  };
}

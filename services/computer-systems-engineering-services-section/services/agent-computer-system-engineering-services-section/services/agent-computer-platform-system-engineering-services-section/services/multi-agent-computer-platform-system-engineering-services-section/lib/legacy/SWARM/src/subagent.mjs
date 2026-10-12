// subagent.mjs — live agent→agent: a parent loop spawns a bounded, isolated CHILD agent in its own
// runId namespace and folds back ONLY the result. This is the load-bearing multiagent primitive: every
// other orchestration shape (supervisor, graph, handoff) composes from this + extend(chain, morphism).
//
// THE SPINE GATES THIS, end to end. A spawn IS an extension of the delegation chain (delegation.mjs:93):
//   childChain = extend(parentChain, delegationMorphism({ from: parent, to: child, scope }))
// Two quantities ride that extension in OPPOSITE directions, and their contrast is the theorem
// (delegation.mjs:119, accountabilityInvariantUnderExtension):
//   • AUTHORITY-to-act moves to the child (authorityHolder becomes the child).
//   • ACCOUNTABILITY (answerability) does NOT move — it stays H⁰-invariant at the captain. The captain
//     answers for every outcome the child produces. Spawning never relocates accountability.
// The child's scope is the MEET (meetScope, delegation.mjs:49) of the parent chain's scope and the
// requested scope — it can only ever SHRINK. That meet IS subagent least-privilege: the child may
// dispatch strictly less than its parent. dispatchAdmissible(childChain, action) === "potential" is asserted
// BEFORE the child runs (delegation.mjs:153) — an out-of-scope or revoked-upstream spawn is structurally
// invalid and is surfaced, never executed.
//
// agent.spawn is ITSELF a governed tool: it is admitted through the same tool-policy admission + Gov
// regime + held-⊤ safety gate (runGovernedTool's gate stack) before any child loop turns. who-supervises
// routes through recognition (deriveLeader), never an installed office.
//
// BOUNDS DERIVE — no magic literal is introduced here. The child's step/provider/cost caps are the
// PARENT's remaining budget (parent cap minus parent spend), or an explicitly-governed caller option.
// The recursion bound is the chain's scope-meet itself: a chain whose scope has narrowed to ∅ admits no
// further action (dispatchAdmissible → "active"), so the meet — not a magic depth-8 — is what halts descent.



import { runAgentLoop } from "./agent-loop.mjs";
import { loadAgent } from "./agents.mjs";
import {
  extend,
  delegationMorphism,
  delegationChain,
  dispatchAdmissible,
  chainScope,
  meetScope,
  authorityHolder,
  accountabilityHolder,
  accountabilityInvariantUnderExtension,
} from "./delegation.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";

// agentSpawnSchema — the OpenAI function-schema a PARENT loop advertises so the model can request a
// spawn from inside its tool loop. The parent's runGovernedTool sees `agent.spawn` as a governed tool;
// its execution is spawnSubagent (a sub-agent, not a disk actuator). Kept here (not in actuators.mjs) so
// no existing file is edited; the parent registers it through the neededExistingEdits this wave returns.
export const agentSpawnSchema = {
  name: "agent.spawn",
  description:
    "Spawn a bounded, isolated child agent in its own runId namespace, delegating a NARROWED scope. " +
    "Authority moves to the child; accountability stays with the captain. Returns only the child's result.",
  parameters: {
    type: "object",
    properties: {
      child: { type: "string", description: "name of the agent to spawn (loadAgent)" },
      prompt: { type: "string", description: "the task handed to the child" },
      tools: { type: "array", items: { type: "string" }, description: "tool names the child may use" },
      scope: {
        oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
        description: "the scope the child is delegated; meet-narrowed against the parent chain",
      },
    },
    required: ["child", "prompt"],
  },
};

// parentChainOf — recover the parent's live delegation chain from the call options. The agent loop threads
// options unchanged; the chain rides as options.delegationChain (the theorem-carrying authority) or under
// options.toolAuthorization.delegationChain (where runGovernedTool reads it for admission). Absent a
// chain, the parent agent stands as its OWN captain at top scope — a least commitment, not an installed
// office: the very first spawn from a bare parent narrows from "*" downward.
function parentChainOf(parentAgent, options = {}) {
  const supplied = options.delegationChain ?? options.toolAuthorization?.delegationChain;
  if (supplied) return supplied;
  return delegationChain(parentAgent.name, []);
}

// deriveChildBudget — the child's caps DERIVE from the parent's REMAINING budget; no new literal. Each
// bound is (parent cap − parent spend so far), floored at 0, OR an explicitly-governed caller override
// (options.childBudget.{maxSteps,maxProviderCalls,maxTokens}). When the parent declared no cap for a
// dimension, the child inherits no cap for it either (the loop's own documented default applies) — we do
// NOT invent one. spend is read off the parent loop's running cost, passed as options.parentSpend.
function deriveChildBudget(options = {}) {
  const cap = options.parentBudget ?? {};
  const spend = options.parentSpend ?? {};
  const override = options.childBudget ?? {};
  const remaining = (capValue, spent) =>
    Number.isFinite(capValue) ? Math.max(0, capValue - (Number(spent) || 0)) : undefined;
  const budget = {};
  const maxSteps = override.maxSteps ?? remaining(cap.maxSteps, spend.steps);
  const maxProviderCalls = override.maxProviderCalls ?? remaining(cap.maxProviderCalls, spend.providerCalls);
  const maxTokens =
    override.maxTokens ??
    remaining(cap.maxTokens, (Number(spend.promptTokens) || 0) + (Number(spend.completionTokens) || 0));
  if (maxSteps !== undefined) budget.maxSteps = maxSteps;
  if (maxProviderCalls !== undefined) budget.maxProviderCalls = maxProviderCalls;
  if (maxTokens !== undefined) budget.maxTokens = maxTokens;
  return budget;
}

// spawnSubagent(root, parentAgent, request, options) — the primitive. request = { child, prompt, tools,
// scope }. Returns { value, finalAnswer, runId, contested, cost, childChain, witness } — value is the
// FOUR verdict of the spawn AS A GOVERNED ACTION (T admitted-and-ran, F structurally-invalid, ⊤ held).
//
// Order is the spine's fixed order:
//   1. EXTEND the chain — authority to child, accountability H⁰-invariant at the captain (the witness).
//   2. ASSERT dispatchAdmissible(childChain, "tool.agent.spawn") — out-of-scope/revoked is "active"/⊥,
//      surfaced and NOT run. A held ⊤ upstream stays held.
//   3. RUN the child loop in its OWN runId namespace, with the narrowed chain threaded as the child's
//      toolAuthorization so the child's EVERY tool passes its own runGovernedTool gate under meetScope
//      (least privilege), and with the DERIVED child budget.
//   4. WRITE one append-only EAVT cell recording the spawn, its witness, and the fold-back. FOLD BACK
//      only { finalAnswer, runId, contested, cost } — the child's transcript stays in its namespace.
export async function spawnSubagent(root, parentAgent, request = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const { child, prompt, tools = [], scope = "*" } = request;

  const parentChain = parentChainOf(parentAgent, options);
  const parentName = authorityHolder(parentChain); // the delegator is the parent chain's terminal authority

  // 1. EXTEND: the spawn IS extending the chain. The morphism's scope is meet-narrowed against the parent
  //    chain's own scope-bound so the child can only ever dispatch LESS — least privilege by construction.
  const narrowedScope = meetScope(chainScope(parentChain), scope);
  const morphism = delegationMorphism({ from: parentName, to: child, scope: narrowedScope });
  const childChain = extend(parentChain, morphism);

  // the H⁰ witness: accountability did NOT move (still the captain); authority DID move (to the child).
  const witness = accountabilityInvariantUnderExtension(parentChain, morphism);

  // a write helper — one auditable EAVT cell per spawn, on EVERY outcome (admitted or refused or held).
  const writeSpawnCell = (value, childResult, reason) => {
    const id = stableId([parentAgent.name, child, prompt, now], "spawn");
    const term = `agents/spawns/${id}`;
    const doc = {
      kind: "swarm.agent.spawn",
      id,
      created: now,
      parent: parentAgent.name,
      delegator: parentName,
      child,
      childRunId: childResult?.runId ?? "",
      value,
      reason,
      scope: narrowedScope,
      authorityBefore: witness.authorityBefore,
      authorityAfter: witness.authorityAfter,        // moved to the child
      accountabilityHolder: accountabilityHolder(childChain), // H⁰-invariant: the captain
      accountabilityInvariant: witness.invariant,
      contested: (childResult?.contested ?? []).length,
      cost: childResult?.cost ?? {},
      evidence:
        "agent spawn: chain extended (authority→child, accountability H⁰-invariant at the captain); " +
        "the child's scope is the meet (least privilege) and its every tool passes its own governed gate",
    };
    const written = writeTrace(root, term, doc, { t: id });
    return { term: written.term, traceLog: written.log };
  };

  // 2. ASSERT admissibility of the spawn AS A GOVERNED ACTION through the child chain. The action checked
  //    is "tool.agent.spawn" (the spawn's own capability) — a spawn that lies outside the narrowed scope,
  //    or rides a chain revoked upstream, is structurally invalid and is NOT run.
  const admission = dispatchAdmissible(childChain, "tool.agent.spawn");
  if (admission.value !== "potential") {
    // F (revoked/out-of-scope) and ⊥ (no action / scope unsettled) are both NON-admit; surfaced, not run.
    const cell = writeSpawnCell(admission.value, null, admission.reason);
    return Object.freeze({
      value: admission.value,
      finalAnswer: null,
      runId: null,
      contested: [],
      cost: { providerCalls: 0, promptTokens: 0, completionTokens: 0 },
      childChain,
      witness,
      admission,
      reason: admission.reason,
      ...cell,
    });
  }

  // 3. RUN the child in its OWN runId namespace. The narrowed chain is threaded as the child's
  //    toolAuthorization, so the child's runGovernedTool admits each child tool ONLY under meetScope —
  //    subagent least privilege. The child budget DERIVES from the parent's remaining budget.
  const childAgent = options.loadAgent
    ? options.loadAgent(child)
    : loadAgent(child, { root, ...options });
  const childBudget = deriveChildBudget(options);

  const childResult = await runAgentLoop({
    agent: childAgent,
    prompt,
    tools,
    root,
    ...options,
    ...childBudget,                              // DERIVED caps — never a fresh literal
    delegationChain: childChain,                 // theorem-carrying authority, threaded down
    toolAuthorization: {
      ...(options.toolAuthorization ?? {}),
      delegationChain: childChain,               // where runGovernedTool reads the chain for admission
    },
  });

  // 4. FOLD BACK only the result. A contested child (held ⊤ in any of its tool runs, or no settled final
  //    answer with a held tool) surfaces as ⊤ to the parent — the held contradiction is NOT collapsed.
  const childContested = childResult.contested ?? [];
  const value = childContested.length ? "stable" : "potential";
  const reason = childContested.length
    ? `child ${child} surfaced ${childContested.length} held-⊤ tool run(s); the contradiction is held, not collapsed.`
    : `child ${child} completed under ${accountabilityHolder(childChain)}'s standing accountability.`;
  const cell = writeSpawnCell(value, childResult, reason);

  return Object.freeze({
    value,
    finalAnswer: childResult.finalAnswer,
    runId: childResult.runId,
    contested: childContested,
    cost: childResult.cost,
    childChain,
    witness,
    admission,
    reason,
    stop: childResult.stop,
    ...cell,
  });
}

// runHandoff(root, fromAgent, toAgent, request, options) — a HANDOFF is a sibling of spawn: it swaps the
// ACTIVE agent continuing the SAME state.messages under the NEW agent's narrowed chain, rather than
// forking an isolated child. Authority moves to the receiving agent; accountability stays H⁰-invariant at
// the captain. The handoff is admitted through the same chain gate, then the existing transcript
// (options.messages) is carried forward unchanged into the new agent's loop.
//
// Where spawn folds back ONLY a child result, handoff continues the conversation: the new agent inherits
// the transcript so far and keeps going. Every supervisor / graph pattern composes from {spawn, handoff}.
export async function runHandoff(root, fromAgent, toAgent, request = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const { scope = "*", tools = [], prompt = "" } = request;

  const fromChain = parentChainOf(fromAgent, options);
  const fromName = authorityHolder(fromChain);
  const narrowedScope = meetScope(chainScope(fromChain), scope);
  const morphism = delegationMorphism({ from: fromName, to: toAgent, scope: narrowedScope });
  const handoffChain = extend(fromChain, morphism);
  const witness = accountabilityInvariantUnderExtension(fromChain, morphism);

  const admission = dispatchAdmissible(handoffChain, "tool.agent.handoff");

  const writeHandoffCell = (value, runId, reason) => {
    const id = stableId([fromAgent.name, toAgent, prompt, now], "handoff");
    const term = `agents/handoffs/${id}`;
    const doc = {
      kind: "swarm.agent.handoff",
      id,
      created: now,
      from: fromAgent.name,
      to: toAgent,
      runId: runId ?? "",
      value,
      reason,
      scope: narrowedScope,
      authorityBefore: witness.authorityBefore,
      authorityAfter: witness.authorityAfter,            // moved to the receiving agent
      accountabilityHolder: accountabilityHolder(handoffChain), // H⁰-invariant: the captain
      accountabilityInvariant: witness.invariant,
      evidence:
        "agent handoff: the active agent is swapped to continue the SAME transcript under the new " +
        "agent's narrowed chain; authority→receiver, accountability H⁰-invariant at the captain",
    };
    const written = writeTrace(root, term, doc, { t: id });
    return { term: written.term, traceLog: written.log };
  };

  if (admission.value !== "potential") {
    const cell = writeHandoffCell(admission.value, null, admission.reason);
    return Object.freeze({
      value: admission.value,
      finalAnswer: null,
      runId: null,
      contested: [],
      cost: { providerCalls: 0, promptTokens: 0, completionTokens: 0 },
      handoffChain,
      witness,
      admission,
      reason: admission.reason,
      ...cell,
    });
  }

  // continue the SAME transcript under the receiving agent. The prior messages (options.messages) are
  // carried forward as the receiving loop's CONTEXT system-turn — the one channel runAgentLoop honors
  // today (agent-loop.mjs:67). (The deeper threading — runAgentLoop seeding state.messages directly from
  // options.messages — is named in this wave's neededExistingEdits; until it lands, context carries the
  // transcript verbatim so nothing is lost.) The receiving agent's narrowed chain governs its every tool.
  const priorMessages = options.messages ?? [];
  const carriedContext = priorMessages.length
    ? "prior transcript handed off:\n" +
      priorMessages.map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")
    : options.context;
  const childAgent = options.loadAgent
    ? options.loadAgent(toAgent)
    : loadAgent(toAgent, { root, ...options });
  const childBudget = deriveChildBudget(options);

  const result = await runAgentLoop({
    agent: childAgent,
    prompt: prompt || (priorMessages.at(-1)?.content ?? ""),
    tools,
    root,
    ...options,
    ...childBudget,
    context: carriedContext,
    delegationChain: handoffChain,
    toolAuthorization: {
      ...(options.toolAuthorization ?? {}),
      delegationChain: handoffChain,
    },
  });

  const contested = result.contested ?? [];
  const value = contested.length ? "stable" : "potential";
  const reason = contested.length
    ? `receiving agent ${toAgent} surfaced ${contested.length} held-⊤ tool run(s); held, not collapsed.`
    : `handoff to ${toAgent} continued the transcript under ${accountabilityHolder(handoffChain)}'s accountability.`;
  const cell = writeHandoffCell(value, result.runId, reason);

  return Object.freeze({
    value,
    finalAnswer: result.finalAnswer,
    runId: result.runId,
    contested,
    cost: result.cost,
    // the carried-forward transcript: the prior turns the handoff continued, then the receiving loop's.
    messages: [...priorMessages, ...result.messages],
    priorMessages,
    handoffChain,
    witness,
    admission,
    reason,
    stop: result.stop,
    ...cell,
  });
}

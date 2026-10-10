/**
 * agent-computation — computing as Eff = Kl(!) over enriched agents.
 *
 * Every computing operation takes a full @red-cup-engineering/animating agent, not bare data.
 * compute(agent) → FOUR, as a metrologic reading value.
 * The corpus's "computation = settling" is literal: an agent IS a settled computation.
 */
import { compute, compose, relay, bang, transport, admitAgent } from "../src/computing.mjs";
import { agent } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";
import { readingOfSides, knowledgeJoinAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";

// ── enriched agents: goal-bearing individuals ─────────────────────────────────────
const trueAgent = agent("the-sky|is-blue", {
  identity: "observer",
  goal: { predicate: "is-blue", reading: "potential" },
});
const falseAgent = agent("the-sky|is-blue", {
  identity: "observer",
  goal: { predicate: "is-green", reading: "potential" },
});

// ── compute: settle an agent's truth as FOUR ─────────────────────────────────────
const cTrue  = compute(trueAgent);
const cFalse = compute(falseAgent);
console.log("true agent:", cTrue.standing);
console.log("false agent:", cFalse.standing);
console.log("agent embedded:", cTrue.agent.kind);  // "animating.agent"

// ── FOUR: the 2×2 truth × falsity grid, as metrologic's reading names ─────────────
const held = readingOfSides("knowledge", true, false), denied = readingOfSides("knowledge", false, true);
const unknown = readingOfSides("knowledge", false, false), contested = readingOfSides("knowledge", true, true);
console.log("readings:", { held, denied, unknown, contested });

// ── the ≤_k join (knowing's ≤_k over FOUR) ───────────────────────────────────────
console.log("⊥ ⊔_k t = t:", knowledgeJoinAll([unknown, held]) === held);
console.log("t ⊔_k f = ⊤:", knowledgeJoinAll([held, denied]) === contested);
console.log("t ⊔_k t = t:", knowledgeJoinAll([held, held]) === held);

// ── compose: Kleisli relay of two agents ─────────────────────────────────────────
const composed = compose(trueAgent, falseAgent);
console.log("composed kind:", composed.kind);     // "animating.agent"
console.log("composed identity:", composed.identity); // "observer∘observer"

// ── relay: multi-agent settling (the off-diagonal lift) ──────────────────────────
const r = relay(trueAgent, [trueAgent, falseAgent]);
console.log("relay members:", r.members);             // 3
console.log("lead standing:", r.standing);
console.log("aggregate:", r.aggregate);

// ── faculty edges: bang (!) and transport ────────────────────────────────────────
const banged    = bang(trueAgent);
console.log("banged connective:", banged.connective); // "ofCourse" (playing !A)

const admission = transport(trueAgent);
console.log("transport action:", admission.action);   // "communicating.admit"

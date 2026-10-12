// governed-tool-runner.mjs — the SPINE gate. The single chokepoint through which every actuator runs.
//
// An actuator (actuators.mjs) touches disk for real; it owns ONLY the one structural refusal that is a
// fact about the path (sandbox escape). It decides NO governance. THIS module is where the swarm-y
// governance becomes load-bearing: nothing in ACTUATORS executes except through runGovernedTool, and
// runGovernedTool composes the three existing gates in a FIXED order before a single byte is written —
//
//   1. tool-policy admission (tool-policy.mjs: toolAdmissionFor) — is this tool known, and is its
//      leader-authorization / delegation-chain scope satisfied? admission.admitted is BINARY; the
//      four-valued nuance (⊥ unsettled vs f refused) is recovered off admission.reason.
//   2. the Gov regime (governance.mjs: governAction) — defaults to kyriarchical (admit iff can()),
//      recognition is opt-in. Returns a real FOUR member: T affirmed, F denied, ⊥ undecided-quorum,
//      ⊤ contested-recognition-split (held ⊤, never collapsed).
//   3. held-⊤ safety (safety-cohomology.mjs: dispatchGate) — refuses dispatch while a DESIGNATED
//      safety sector is non-zero (a contradicted safety cell settled to ⊤ — a non-zero H¹ obstruction).
//
// The first non-pass short-circuits, but EVERY witness reached is recorded on the one auditable EAVT
// row this writes per call (via writeTrace) — on every outcome, never silent. The verdict is FOUR-valued
// (admit/refuse/unsettled/contested) so the agent loop can branch on the held ⊤ instead of collapsing it.



import { toolAdmissionFor } from "./tool-policy.mjs";
import { governAction } from "./governance.mjs";
import { dispatchGate } from "./safety-cohomology.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";
import { runActuator } from "./actuators.mjs";

// the FOUR value -> the ledger-facing outcome word. T is the only ok; ⊤ is contested (held, not
// failed); ⊥ is unsettled; f is refused. (The ledger consumer collapses non-ok to "failed", which is
// acceptable downstream — here we keep the four words faithful so the loop reads the held ⊤.)
function outcomeOf(value) {
  if (value === "potential") return "ok";
  if (value === "stable") return "contested";
  if (value === "absurd") return "unsettled";
  return "refused";
}

export async function runGovernedTool(root, agent, call, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const tool = call.name;

  // witnesses are filled as each gate is reached; the WRITE folds whatever was reached into the row.
  let admission = null;
  let decision = null;
  let safety = null;
  let result = null;
  let ran = false;
  let value;
  let gate;
  let reason;

  // WRITE — author the single auditable EAVT row, on EVERY outcome. The same content is written whether
  // the run admitted, refused, held ⊥, or surfaced ⊤; the difference is in the witnessed fields.
  const write = () => {
    const id = stableId([agent.name, call.name, call.arguments, now], "toolrun");
    const term = `ledger/tool-runs/${id}`;
    const outcome = outcomeOf(value);
    const doc = {
      kind: "swarm.tool_run",
      id,
      created: now,
      agent: agent.name,
      tool: call.name,
      arguments: call.arguments,
      value,
      ran,
      gate,
      outcome,
      admissionReason: admission?.reason ?? "",
      admitted: admission?.admitted ?? false,
      governanceValue: decision?.value ?? "",
      governanceRegime: decision?.regime ?? "",
      governanceLog: decision?.log ?? "",
      safetyValue: safety?.value ?? "",
      safetyStanding: safety?.standing ?? [],
      resultDigest: result?.value?.digest ?? "",
      reason,
      evidence:
        "governed tool run: every actuator passes tool-policy admission, the Gov regime, and the held-⊤ safety gate before touching disk",
    };
    const written = writeTrace(root, term, doc, { t: id });
    return {
      value,
      ran,
      result,
      gate,
      reason,
      admission,
      decision,
      safety,
      call,
      tool,
      outcome,
      term: written.term,
      traceLog: written.log,
    };
  };

  // 0. MALFORMED ARGUMENTS — a tool-policy fact about the call itself; no gate is consulted, no actuator
  //    runs. The model handed us arguments that do not parse, so there is nothing to admit.
  if (call.argumentsMalformed) {
    value = "active";
    gate = "tool-policy";
    reason = "malformed-tool-arguments";
    return write();
  }

  // 1. TOOL-POLICY ADMISSION. files.list admits UNDER the files.read policy (a documented alias — both
  //    are workspace-readonly reads; tool-policy.mjs is left untouched).
  const policyName = call.name === "files.list" ? "files.read" : call.name;
  const ctx = options.toolAuthorization ?? {};
  admission = toolAdmissionFor(policyName, ctx);
  if (admission.admitted === false) {
    // admission.admitted is BINARY; recover the four-valued nuance off the reason. An unsettled
    // delegation-chain scope is ⊥ (not-yet-settled, not a denial); everything else is f (structural).
    value = /unsettled/.test(admission.reason) ? "absurd" : "active";
    gate = "tool-policy";
    reason = admission.reason;
    return write();
  }

  // 2. GOVERNANCE REGIME. governAction defaults to kyriarchical (admit iff can()); recognition is opt-in
  //    via options.regime===RECOGNITION_REGIME or options.recognition. It writes its OWN governance
  //    decision doc regardless of outcome — a second, independent witness.
  decision = governAction(root, agent, "tool." + call.name, { kind: "tool", title: call.name }, options);
  if (decision.value === "active") {
    value = "active";
    gate = "governance";
    reason = "governance-denied";
    return write();
  }
  if (decision.value === "absurd") {
    value = "absurd";
    gate = "governance";
    reason = "governance-undecided-quorum";
    return write();
  }
  if (decision.value === "stable") {
    // a recognition split named more than one leader — the contradiction is HELD, not collapsed.
    value = "stable";
    gate = "governance";
    reason = "governance-contested-recognition-split";
    return write();
  }
  // decision.value === "potential" -> continue.

  // 3. HELD-⊤ SAFETY. Only when designated safety terms are supplied (parity with dispatch.mjs). A
  //    contradicted safety cell settles to ⊤ — a non-zero H¹ obstruction — and dispatch is REFUSED
  //    with the ⊤ surfaced, never collapsed to a silent denial.
  if (options.safetyTerms?.length) {
    safety = dispatchGate(root, options.safetyTerms, options);
    if (safety.admitted === false) {
      value = "stable";
      gate = "safety";
      reason = safety.reason;
      return write();
    }
  }

  // 4. EXECUTE. Only now does an actuator touch disk. Its own structural refusal (sandbox escape, enoent)
  //    surfaces as f — a fact about the path, not a governance verdict.
  result = await runActuator(root, call.name, call.arguments, { extraActuators: options.extraActuators });
  ran = true;
  if (result.ok === true) {
    value = "potential";
    gate = "actuator";
    reason = "ok";
  } else {
    value = "active";
    gate = "actuator";
    reason = result.error;
  }
  return write();
}

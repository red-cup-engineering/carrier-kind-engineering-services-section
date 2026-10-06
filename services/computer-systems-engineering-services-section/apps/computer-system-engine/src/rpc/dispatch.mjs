/** The sole governed execution path for canonical RPC invocations. */

import { executionReceipt } from "./receipt.mjs";

import { isOperationHandlerResult } from "./execution-context.mjs";

import { isReading, readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { can, capabilityGrant, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";

/** Whether a settled standing is held: told for and not against, in whatever family it is named. */
const isHeld = (name) => isReading(name) && readingAs("knowledge", name) === "potential";

/** The resource an invocation acts on: the sub-resource its operation's locus names in the input
 *  (`infograph/duty/<scope>`), else the program itself. */
export function invocationResource(invocation, operation) {
  const value = operation.locus === undefined ? undefined : invocation.input?.[operation.locus];
  return typeof value === "string" && value !== "" ? locusResource(invocation.resource, operation.locus, value) : invocation.resource;
}

/** Build the engine-facing policy adapter from settled operation readings. */
export function authorizationFromStanding(
  standing,
  source = "operation-standing",
) {
  return (invocation, operation, decidedAt) => {
    const reading = standing.get(operation.ref) ?? "unknown";
    const ok = isHeld(reading);
    return Object.freeze({
      kind: ok ? "metroplat.rpc.authorization:witness" : "metroplat.rpc.authorization:obstruction",
      ok,
      invocation: invocation.id,
      operation: operation.ref,
      subject: invocation.subject,
      reading,
      evidence: Object.freeze([`${source}:${operation.ref}:${reading}`]),
      reasons: Object.freeze(ok ? [] : [`operation standing is ${reading}; held standing is required`]),
      decidedAt,
    });
  };
}

/** Conjoin operation availability with the subject's settled capability claim.
 * Both must be held; the base decision remains authoritative when the operation
 * itself is unavailable. */
export function authorizationFromCapabilityAssertions(
  base,
  assertions,
  source = "subject-standing",
) {
  return (invocation, operation, decidedAt) => {
    const available = base(invocation, operation, decidedAt);
    const finish = (settledAvailable) => {
      if (!settledAvailable.ok) return settledAvailable;
      const current = typeof assertions === "function" ? assertions(invocation.subject, invocation, operation) : assertions;
      const decide = (settledAssertions) => {
        const standing = can(settledAssertions, invocation.subject, capabilityGrant(invocationResource(invocation, operation), operation.verb));
        const ok = isHeld(standing.value);
        // The grants that admitted it name the mask it was played as (an office's, an allocation's, a liberty).
        const admittedBy = ok ? (standing.issuers ?? []).map((issuer) => `admitted-by:${issuer}`) : [];
        return Object.freeze({ kind: ok ? "metroplat.rpc.authorization:witness" : "metroplat.rpc.authorization:obstruction", ok, invocation: invocation.id, operation: operation.ref, subject: invocation.subject, reading: standing.value, evidence: Object.freeze([...settledAvailable.evidence, `${source}:${standing.holder}:${standing.grants}:${standing.value}`, ...admittedBy]), reasons: Object.freeze(ok ? [] : [`subject standing is ${standing.value}; held standing is required`]), decidedAt });
      };
      return current !== null && typeof current === "object" && typeof current.then === "function" ? Promise.resolve(current).then(decide) : decide(current);
    };
    return available !== null && typeof available === "object" && typeof available.then === "function" ? Promise.resolve(available).then(finish) : finish(available);
  };
}

/** Conjoin a base authorization with a judgment of the intended action against the house's
 * rules. `judge({ actor, verb, input })` answers `{ decision, reading, reasons, advice }`; the
 * invocation proceeds only when the base holds and the judgment is not a refusal. The engine
 * holds no rules: the host that composes the catalog supplies the judge. */
export function authorizationUnderRules(base, judge, source = "rules") {
  return (invocation, operation, decidedAt) => {
    const decided = base(invocation, operation, decidedAt);
    const finish = (settledDecision) => {
      if (!settledDecision.ok) return settledDecision;
      const judgment = judge({ actor: invocation.subject, verb: operation.verb, input: invocation.input });
      const judgeDecision = (settledJudgment) => {
        const ok = settledJudgment.decision !== "refuse";
        return Object.freeze({ ...settledDecision, kind: ok ? "metroplat.rpc.authorization:witness" : "metroplat.rpc.authorization:obstruction", ok, reading: ok ? settledDecision.reading : "denied", evidence: Object.freeze([...settledDecision.evidence, `${source}:${operation.verb}:${settledJudgment.reading}`]), reasons: Object.freeze(ok ? [] : settledJudgment.reasons.map((reason) => `rule: ${reason}`)), ...(settledJudgment.advice?.length ? { advice: Object.freeze([...settledJudgment.advice]) } : {}) });
      };
      return judgment !== null && typeof judgment === "object" && typeof judgment.then === "function" ? Promise.resolve(judgment).then(judgeDecision) : judgeDecision(judgment);
    };
    return decided !== null && typeof decided === "object" && typeof decided.then === "function" ? Promise.resolve(decided).then(finish) : finish(decided);
  };
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function evidenceIds(receipts) {
  return Object.freeze(receipts.flatMap((receipt) => receipt.eventIds.length === 0 ? [receipt.id] : receipt.eventIds));
}

function obstruction(
  invocation,
  operation,
  phase,
  startedAt,
  completedAt,
  reasons,
  evidence,
  decision,
) {
  return executionReceipt({
    ok: false,
    invocation,
    operation,
    ...(decision === undefined ? {} : { decision }),
    phase,
    reasons,
    evidence: evidenceIds(evidence),
    startedAt,
    completedAt,
  });
}

/** A derivation's output is a function of its operation, input and journal head, so the
 *  journal keeps nothing per call (specification 2026-10-06-metered-derivable-journal, Law 1). */
const isDerivation = (operation) => operation.effects.class === "pure" || operation.effects.class === "host-read";

/**
 * Authorize and run one invocation, witnessing it only when it acts.
 *
 * A derivation that is authorized, coordination-free and returns no evidence or artifacts
 * leaves no journal rows. Anything else (an act, a refusal, a failure, a handler that wrote)
 * takes the witnessed path.
 */
export async function dispatch(runtime, invocation) {
  const operation = runtime.catalog.byReference.get(invocation.operation);
  if (operation === undefined || operation.verb !== invocation.verb || !isDerivation(operation)
    || operation.effects.coordination === "coordination-required") return witnessedDispatch(runtime, invocation);
  const startedAt = runtime.now();
  // An unwitnessed derivation becomes witnessed the moment it refuses, fails or writes: its
  // one authorization and one execution are then recorded as the act they turned out to be.
  const witnessAct = (decision, receipt, artifacts = []) => {
    try {
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.attempt", invocation, at: startedAt }));
      if (decision !== undefined) runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.decision", invocation: invocation.id, decision, at: decision.decidedAt }));
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }), artifacts);
      return receipt;
    } catch (error) {
      return obstruction(invocation, operation.ref, "witnessing", startedAt, runtime.now(), [`${receipt.phase} was not witnessed: ${message(error)}`], [], decision);
    }
  };
  let decision;
  try {
    decision = await runtime.authorize(invocation, operation, runtime.now());
  } catch (error) {
    return witnessAct(undefined, obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), [message(error)], []));
  }
  const invalidDecision = [
    ...(decision.invocation === invocation.id ? [] : ["authorization decision names a different invocation"]),
    ...(decision.operation === operation.ref ? [] : ["authorization decision names a different operation"]),
    ...(decision.subject === invocation.subject ? [] : ["authorization decision names a different subject"]),
    ...(decision.ok === (decision.reading === "held") ? [] : ["authorization ok must coincide with held standing"]),
  ];
  if (invalidDecision.length > 0) return witnessAct(undefined, obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), invalidDecision, [], decision));
  if (!decision.ok) return witnessAct(decision, obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), decision.reasons, [], decision));
  let handled;
  try {
    handled = await operation.execute(invocation.input, invocation.arguments, Object.freeze({
      kind: "metroplat.rpc.execution-context",
      invocation,
      decision,
      operation,
      startedAt,
      evidence: Object.freeze([]),
    }));
  } catch (error) {
    return witnessAct(decision, obstruction(invocation, operation.ref, "execution", startedAt, runtime.now(), [message(error)], [], decision));
  }
  const result = isOperationHandlerResult(handled) ? handled : undefined;
  const receipt = executionReceipt({
    ok: true,
    invocation,
    operation: operation.ref,
    decision,
    phase: "output",
    value: result === undefined ? handled : result.value,
    evidence: Object.freeze([...(result?.evidence ?? [])]),
    startedAt,
    completedAt: runtime.now(),
  });
  if ((result?.evidence.length ?? 0) === 0 && (result?.artifacts.length ?? 0) === 0) return receipt;
  // It declared itself a derivation but wrote: witness it as the act it was.
  return witnessAct(decision, receipt, result.artifacts);
}

/**
 * Witness, authorize, execute, and witness one invocation.
 *
 * Attempt and decision admission are fail-closed: the handler is unreachable
 * unless both are durable. Outcome admission happens after execution; failure
 * there returns a witnessing obstruction and leaves the admitted intent visible.
 */
async function witnessedDispatch(runtime, invocation) {
  const startedAt = runtime.now();
  const evidence = [];
  try {
    evidence.push(runtime.witness.admit(Object.freeze({
      kind: "metroplat.rpc.attempt",
      invocation,
      at: startedAt,
    })));
  } catch (error) {
    return obstruction(invocation, invocation.operation, "admission", startedAt, runtime.now(), [message(error)], evidence);
  }

  const operation = runtime.catalog.byReference.get(invocation.operation);
  if (operation === undefined || operation.verb !== invocation.verb) {
    const receipt = obstruction(
      invocation,
      invocation.operation,
      "resolution",
      startedAt,
      runtime.now(),
      [operation === undefined ? `unknown operation reference ${invocation.operation}` : "operation verb does not match its content reference"],
      evidence,
    );
    try {
      evidence.push(runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt })));
    } catch {
      // The attempt is already durable; the returned obstruction remains honest about resolution.
    }
    return receipt;
  }

  let decision;
  try {
    decision = await runtime.authorize(invocation, operation, runtime.now());
  } catch (error) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), [message(error)], evidence);
  }
  const invalidDecision = [
    ...(decision.invocation === invocation.id ? [] : ["authorization decision names a different invocation"]),
    ...(decision.operation === operation.ref ? [] : ["authorization decision names a different operation"]),
    ...(decision.subject === invocation.subject ? [] : ["authorization decision names a different subject"]),
    ...(decision.ok === (decision.reading === "held") ? [] : ["authorization ok must coincide with held standing"]),
  ];
  if (invalidDecision.length > 0) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), invalidDecision, evidence);
  }
  try {
    evidence.push(runtime.witness.admit(Object.freeze({
      kind: "metroplat.rpc.decision",
      invocation: invocation.id,
      decision,
      at: decision.decidedAt,
    })));
  } catch (error) {
    return obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), [`authorization decision was not witnessed: ${message(error)}`], evidence, decision);
  }

  if (!decision.ok) {
    const receipt = obstruction(invocation, operation.ref, "authorization", startedAt, runtime.now(), decision.reasons, evidence, decision);
    try {
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }));
    } catch {
      // Attempt and refusal decision remain durable even if the summary outcome cannot be appended.
    }
    return receipt;
  }

  if (operation.effects.coordination === "coordination-required") {
    if (runtime.coordinate === undefined) {
      const receipt = obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), ["operation requires coordination but no coordinator is installed"], evidence, decision);
      try {
        runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }));
      } catch {
        // Attempt and authorization remain durable.
      }
      return receipt;
    }
    let coordination;
    try {
      coordination = runtime.coordinate(invocation, operation, runtime.now());
    } catch (error) {
      return obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), [message(error)], evidence, decision);
    }
    try {
      evidence.push(runtime.witness.admit(Object.freeze({
        kind: "metroplat.rpc.coordination",
        invocation: invocation.id,
        decision: coordination,
        at: coordination.decidedAt,
      })));
    } catch (error) {
      return obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), [`coordination decision was not witnessed: ${message(error)}`], evidence, decision);
    }
    if (!coordination.ok) {
      const receipt = obstruction(invocation, operation.ref, "coordination", startedAt, runtime.now(), coordination.reasons, evidence, decision);
      try {
        runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }));
      } catch {
        // Attempt, authorization, and coordination obstruction remain durable.
      }
      return receipt;
    }
  }

  let value;
  let handlerEvidence = Object.freeze([]);
  let handlerArtifacts = Object.freeze([]);
  try {
    const arguments_ = operation.effects.replay === "idempotency-key"
      ? { ...invocation.arguments, "idempotency-key": invocation.id }
      : invocation.arguments;
    const handled = await operation.execute(invocation.input, arguments_, Object.freeze({
      kind: "metroplat.rpc.execution-context",
      invocation,
      decision,
      operation,
      startedAt,
      evidence: runtime.witness.causalHead(invocation.id),
    }));
    if (isOperationHandlerResult(handled)) {
      value = handled.value;
      handlerEvidence = handled.evidence;
      handlerArtifacts = handled.artifacts;
    } else {
      value = handled;
    }
  } catch (error) {
    const receipt = obstruction(invocation, operation.ref, "execution", startedAt, runtime.now(), [message(error)], evidence, decision);
    try {
      runtime.witness.admit(Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }));
    } catch {
      // The durable intent and decision still expose the interrupted execution.
    }
    return receipt;
  }

  const receipt = executionReceipt({
    ok: true,
    invocation,
    operation: operation.ref,
    decision,
    phase: "output",
    value,
    evidence: Object.freeze([...new Set([...evidenceIds(evidence), ...handlerEvidence])]),
    startedAt,
    completedAt: runtime.now(),
  });
  try {
    runtime.witness.admit(
      Object.freeze({ kind: "metroplat.rpc.outcome", invocation: invocation.id, receipt, at: receipt.completedAt }),
      handlerArtifacts,
    );
  } catch (error) {
    return obstruction(invocation, operation.ref, "witnessing", startedAt, runtime.now(), [`execution completed but outcome witnessing failed: ${message(error)}`], evidence, decision);
  }
  return receipt;
}

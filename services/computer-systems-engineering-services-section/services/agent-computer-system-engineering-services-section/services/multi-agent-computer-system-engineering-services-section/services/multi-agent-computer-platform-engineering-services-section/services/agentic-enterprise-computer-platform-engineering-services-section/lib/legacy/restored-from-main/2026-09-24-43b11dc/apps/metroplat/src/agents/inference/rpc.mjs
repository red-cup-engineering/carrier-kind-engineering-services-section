/** Govern an external inference adapter through the sole witnessed RPC path. */
import { isJsonRecord } from "@red-cup-engineering/json-services-section";

import { encounterMove } from "../../encounter/model.mjs";
import { createOperationCatalog, operation } from "../../rpc/operation.mjs";
import { dispatch } from "../../rpc/dispatch.mjs";
import { invocation } from "../../rpc/invocation.mjs";
import { operationHandlerResult } from "../../rpc/execution-context.mjs";
import { inferenceObstruction } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-model";
import { encounterRunFromInferenceCall, encounterTerminalFromInferenceOutcome, inferenceOutcomeFromEncounterTerminal } from "./encounter.mjs";

function requireCall(value) {
  if (!isJsonRecord(value) || value.kind !== "metroplat.inference.call" || typeof value.id !== "string") {
    throw new TypeError("inference RPC operation requires canonical InferenceCall material");
  }
  return value;
}

export function inferenceProviderOperation(
  provider,
  providerSource,
  encounters,
  control,
) {
  let declared;
  declared = operation({
    verb: `inference-provider:${provider}`,
    inputFormat: "json",
    outputFormat: "json",
    relation: "protocol",
    effects: Object.freeze({
      class: "external",
      replay: "idempotency-key",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "partial",
    }),
    summary: `Call the ${provider} inference provider through the witnessed compatibility membrane.`,
    run: async (input, arguments_, context) => {
      if (context === undefined) throw new TypeError("inference provider operation requires governed RPC execution context");
      const call = requireCall(input);
      const retryOf = typeof arguments_["encounter-retry-of"] === "string" ? arguments_["encounter-retry-of"] : undefined;
      const run = encounterRunFromInferenceCall(call, context, retryOf);
      encounters.admit(run, Object.freeze({
        kind: "metroplat.encounter.opened",
        run,
        at: context.startedAt,
      }));
      const executionSignal = control.begin(run);
      let outcome;
      try {
        for await (const event of providerSource(call,
          typeof arguments_["idempotency-key"] === "string"
            ? { idempotencyKey: arguments_["idempotency-key"], signal: executionSignal }
            : { signal: executionSignal })) {
          if (event.kind === "metroplat.inference.source-terminal") {
            outcome = event.outcome;
            break;
          }
          const contribution = encounterMove({
            run: run.id,
            type: event.move.type,
            channel: event.move.channel,
            sequence: event.move.sequence,
            body: event.move.body,
            observedAt: event.move.observedAt,
          });
          encounters.admit(run, Object.freeze({
            kind: "metroplat.encounter.contribution",
            run: run.id,
            contribution,
            at: contribution.observedAt,
          }));
        }
      } catch (error) {
        outcome = inferenceObstruction({
          call: call.id,
          condition: "unreachable",
          reasons: Object.freeze([error instanceof Error ? error.message : String(error)]),
          retryable: true,
          observedAt: context.startedAt,
          causes: encounters.causalHead(run),
        });
      }
      if (outcome === undefined) {
        outcome = inferenceObstruction({
          call: call.id,
          condition: "truncated-stream",
          reasons: Object.freeze(["inference source ended without terminal evidence"]),
          retryable: true,
          observedAt: context.startedAt,
          causes: encounters.causalHead(run),
        });
      }
      try {
        const terminal = encounterTerminalFromInferenceOutcome(run, outcome, control.cancellationCauses(run.id));
        encounters.admit(run, Object.freeze({
          kind: "metroplat.encounter.contribution",
          run: run.id,
          contribution: terminal,
          at: terminal.observedAt,
        }));
        return operationHandlerResult(outcome, encounters.causalHead(run));
      } finally {
        control.end(run.id);
      }
    },
  });
  return declared;
}

function outcomeOf(value) {
  if (!isJsonRecord(value)) return undefined;
  return value.kind === "metroplat.inference.result" || value.kind === "metroplat.inference.obstruction"
    ? value
    : undefined;
}

function inferenceRequest(binding, call, options) {
  return invocation({
    request: options.request ?? call.request,
    subject: call.subject,
    operation: binding.operation.ref,
    verb: binding.operation.verb,
    resource: `inference:${binding.operation.ref}`,
    input: call,
    inputIdentity: Object.freeze({ kind: "metroplat.inference.call-reference", id: call.id }),
    ...(options.retryOf === undefined ? {} : { arguments: Object.freeze({ "encounter-retry-of": options.retryOf }) }),
    caller: call.caller ?? Object.freeze({ transport: "inference" }),
    observedAt: call.observedAt,
    causes: call.causes,
  });
}

function outcomeFromReceipt(call, receipt) {
  const outcome = outcomeOf(receipt.value);
  if (receipt.ok && outcome !== undefined) return outcome;
  return inferenceObstruction({
    call: call.id,
    condition: "rejected",
    reasons: receipt.reasons.length === 0 ? Object.freeze([`inference RPC ended at ${receipt.phase}`]) : receipt.reasons,
    retryable: receipt.phase === "execution" || receipt.phase === "witnessing",
    observedAt: receipt.completedAt,
    causes: Object.freeze([receipt.id]),
  });
}

function sessionAdmissions(
  binding,
  run,
  settled,
  options,
) {
  return Object.freeze({
    async *[Symbol.asyncIterator]() {
      const seen = new Set();
      const controller = new AbortController();
      const signal = options.subscriptionSignal === undefined
        ? controller.signal
        : AbortSignal.any([controller.signal, options.subscriptionSignal]);
      const iterator = binding.encounters.follow(run, {
        ...(options.after === undefined ? {} : { after: options.after }),
        signal,
      })[Symbol.asyncIterator]();
      let finished = false;
      void settled.finally(() => { finished = true; controller.abort(); });
      try {
        for (;;) {
          const next = await iterator.next();
          if (next.done) break;
          for (const event of next.value.eventIds) seen.add(event);
          yield next.value;
        }
      } finally {
        controller.abort();
        await iterator.return?.();
      }
      if (options.subscriptionSignal?.aborted === true) return;
      // Dispatch may settle between durable admission and the follower's next
      // poll. Reconcile once from authority so the terminal event is not lost.
      if (finished) {
        for (const admission of binding.encounters.read(run)) {
          if (admission.eventIds.every((event) => seen.has(event))) continue;
          if (options.after !== undefined && admission.eventIds.every((event) => options.after.includes(event))) continue;
          yield admission;
        }
      }
    },
  });
}

/** Start the one witnessed execution and expose its durable encounter section. */
export function witnessedInferenceEncounterPort(binding) {
  const catalog = createOperationCatalog([binding.operation]);
  const active = new Map();
  return (call, options = {}) => {
    const request = inferenceRequest(binding, call, options);
    const run = encounterRunFromInferenceCall(call, Object.freeze({
      kind: "metroplat.rpc.execution-context",
      invocation: request,
      operation: binding.operation,
      startedAt: call.observedAt,
      evidence: Object.freeze([]),
    }), options.retryOf);
    const existingTerminal = binding.encounters.read(run).flatMap((admission) => {
      const material = admission.material;
      if (material.kind !== "metroplat.encounter.contribution"
        || typeof material.contribution !== "object"
        || material.contribution === null
        || (material.contribution).kind !== "metroplat.encounter.terminal") return [];
      return [{ admission, terminal: material.contribution }];
    }).at(-1);
    let settled = existingTerminal === undefined ? active.get(run.id) : undefined;
    if (existingTerminal !== undefined) {
      const outcome = inferenceOutcomeFromEncounterTerminal(existingTerminal.terminal);
      settled = Promise.resolve(Object.freeze({ ...outcome, causes: existingTerminal.admission.eventIds }));
    }
    if (settled === undefined) {
      const receipt = dispatch({
        catalog,
        witness: binding.witness,
        authorize: binding.authorize,
        now: binding.now,
      }, request);
      settled = receipt.then((resolved) => {
        const outcome = outcomeFromReceipt(call, resolved);
        return Object.freeze({ ...outcome, causes: binding.witness.causalHead(request.id) });
      });
      active.set(run.id, settled);
      void settled.finally(() => active.delete(run.id));
    }
    return Object.freeze({
      encounter: run.encounter,
      run,
      admissions: sessionAdmissions(binding, run, settled, options),
      settled,
    });
  };
}

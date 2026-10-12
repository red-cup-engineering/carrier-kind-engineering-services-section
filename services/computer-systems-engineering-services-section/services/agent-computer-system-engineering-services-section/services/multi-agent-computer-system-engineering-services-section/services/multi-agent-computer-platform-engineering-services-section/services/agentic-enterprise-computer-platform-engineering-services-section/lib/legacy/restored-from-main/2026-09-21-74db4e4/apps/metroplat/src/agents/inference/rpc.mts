/** Govern an external inference adapter through the sole witnessed RPC path. */
import { isJsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { EncounterAdmission, EncounterExecutionControl, EncounterSession, EncounterStore, EncounterTerminal } from "../../encounter/index.mts";
import { encounterMove } from "../../encounter/index.mts";
import {
  createOperationCatalog,
  dispatch,
  invocation,
  operation,
  type Operation,
  type RpcAuthorize,
  type RpcWitness,
  operationHandlerResult,
} from "../../rpc/index.mts";
import { inferenceObstruction, type InferenceCall, type InferenceOutcome } from "./model.mts";
import { encounterRunFromInferenceCall, encounterTerminalFromInferenceOutcome, inferenceOutcomeFromEncounterTerminal } from "./encounter.mts";
import type { InferenceSource } from "./source.mts";

function requireCall(value: unknown): InferenceCall {
  if (!isJsonRecord(value) || value.kind !== "metroplat.inference.call" || typeof value.id !== "string") {
    throw new TypeError("inference RPC operation requires canonical InferenceCall material");
  }
  return value as unknown as InferenceCall;
}

export function inferenceProviderOperation(
  provider: string,
  providerSource: InferenceSource,
  encounters: EncounterStore,
  control: EncounterExecutionControl,
): Operation {
  let declared: Operation;
  declared = operation({
    verb: `inference-provider:${provider}`,
    inputFormat: "json",
    outputFormat: "json",
    relation: "protocol",
    effects: Object.freeze({
      class: "external" as const,
      replay: "idempotency-key" as const,
      coordination: "coordination-free" as const,
      deterministic: "unmeasured" as const,
      totality: "partial" as const,
    }),
    summary: `Call the ${provider} inference provider through the witnessed compatibility membrane.`,
    run: async (input, arguments_, context) => {
      if (context === undefined) throw new TypeError("inference provider operation requires governed RPC execution context");
      const call = requireCall(input);
      const retryOf = typeof arguments_["encounter-retry-of"] === "string" ? arguments_["encounter-retry-of"] : undefined;
      const run = encounterRunFromInferenceCall(call, context, retryOf);
      encounters.admit(run, Object.freeze({
        kind: "metroplat.encounter.opened" as const,
        run,
        at: context.startedAt,
      }));
      const executionSignal = control.begin(run);
      let outcome: InferenceOutcome | undefined;
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
            kind: "metroplat.encounter.contribution" as const,
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
          kind: "metroplat.encounter.contribution" as const,
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

export interface WitnessedInferenceBinding {
  readonly operation: Operation;
  readonly encounters: EncounterStore;
  readonly witness: RpcWitness;
  readonly authorize: RpcAuthorize;
  readonly now: () => string;
}

export interface InferenceEncounterOptions {
  /** Durable journal frontier already observed by this subscriber. */
  readonly after?: readonly string[];
  /** Stops only this section reading; it never cancels provider execution. */
  readonly subscriptionSignal?: AbortSignal;
  /** New RPC request key for a deliberate execution attempt of the same semantic call. */
  readonly request?: string;
  readonly retryOf?: string;
}

export type InferenceEncounterSession = EncounterSession<InferenceOutcome>;
export type InferenceEncounterPort = (
  call: InferenceCall,
  options?: InferenceEncounterOptions,
) => InferenceEncounterSession;

function outcomeOf(value: JsonValue | undefined): InferenceOutcome | undefined {
  if (!isJsonRecord(value)) return undefined;
  return value.kind === "metroplat.inference.result" || value.kind === "metroplat.inference.obstruction"
    ? value as unknown as InferenceOutcome
    : undefined;
}

function inferenceRequest(binding: WitnessedInferenceBinding, call: InferenceCall, options: InferenceEncounterOptions) {
  return invocation({
    request: options.request ?? call.request,
    subject: call.subject,
    operation: binding.operation.ref,
    verb: binding.operation.verb,
    resource: `inference:${binding.operation.ref}`,
    input: call as unknown as JsonValue,
    inputIdentity: Object.freeze({ kind: "metroplat.inference.call-reference", id: call.id }),
    ...(options.retryOf === undefined ? {} : { arguments: Object.freeze({ "encounter-retry-of": options.retryOf }) }),
    caller: call.caller ?? Object.freeze({ transport: "inference" }),
    observedAt: call.observedAt,
    causes: call.causes,
  });
}

function outcomeFromReceipt(call: InferenceCall, receipt: Awaited<ReturnType<typeof dispatch>>): InferenceOutcome {
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
  binding: WitnessedInferenceBinding,
  run: ReturnType<typeof encounterRunFromInferenceCall>,
  settled: Promise<InferenceOutcome>,
  options: InferenceEncounterOptions,
): AsyncIterable<EncounterAdmission> {
  return Object.freeze({
    async *[Symbol.asyncIterator](): AsyncGenerator<EncounterAdmission> {
      const seen = new Set<string>();
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
          if (options.after !== undefined && admission.eventIds.every((event) => options.after!.includes(event))) continue;
          yield admission;
        }
      }
    },
  });
}

/** Start the one witnessed execution and expose its durable encounter section. */
export function witnessedInferenceEncounterPort(binding: WitnessedInferenceBinding): InferenceEncounterPort {
  const catalog = createOperationCatalog([binding.operation]);
  const active = new Map<string, Promise<InferenceOutcome>>();
  return (call, options = {}) => {
    const request = inferenceRequest(binding, call, options);
    const run = encounterRunFromInferenceCall(call, Object.freeze({
      kind: "metroplat.rpc.execution-context" as const,
      invocation: request,
      operation: binding.operation,
      startedAt: call.observedAt,
      evidence: Object.freeze([]),
    }), options.retryOf);
    const existingTerminal = binding.encounters.read(run).flatMap((admission) => {
      const material = admission.material as unknown as { readonly kind?: unknown; readonly contribution?: unknown };
      if (material.kind !== "metroplat.encounter.contribution"
        || typeof material.contribution !== "object"
        || material.contribution === null
        || (material.contribution as { readonly kind?: unknown }).kind !== "metroplat.encounter.terminal") return [];
      return [{ admission, terminal: material.contribution }];
    }).at(-1);
    let settled = existingTerminal === undefined ? active.get(run.id) : undefined;
    if (existingTerminal !== undefined) {
      const outcome = inferenceOutcomeFromEncounterTerminal(existingTerminal.terminal as EncounterTerminal);
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

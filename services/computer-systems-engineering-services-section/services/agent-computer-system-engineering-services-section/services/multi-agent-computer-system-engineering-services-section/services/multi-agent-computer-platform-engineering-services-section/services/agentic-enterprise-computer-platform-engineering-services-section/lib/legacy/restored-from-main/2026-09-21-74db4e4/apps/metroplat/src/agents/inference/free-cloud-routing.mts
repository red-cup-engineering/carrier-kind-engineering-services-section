import { assertNonemptyString as nonempty } from "../../lib/strings.mts";
/** Zero-cash, exact-model routing over already-configured inference sources. */
import { requireJsonValue, type JsonRecord } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { canonicalBytes, sha256Hex } from "../../lib/identity/index.mts";
import {
  inferenceObstruction,
  type InferenceCall,
  type InferenceFailureCondition,
  type InferenceObstruction,
} from "./model.mts";
import {
  inferenceSourceMove,
  inferenceSourceTerminal,
  inferenceStreamMove,
  type InferenceSource,
  type InferenceSourceEvent,
  type InferenceSourceOptions,
} from "./source.mts";

export interface FreeCloudAdmission {
  readonly kind: "metroplat.inference.free-cloud-admitted";
  /** Must be true at the provider billing boundary, not merely estimated. */
  readonly zeroCash: true;
  /** Provider-declared capacity remaining for this policy interval. */
  readonly quotaRemaining?: number;
  /** Durable provider-hiring timestamp; absent providers are least recently hired. */
  readonly lastHiredAt?: string;
  /** Non-secret preflight receipt material admitted into the encounter. */
  readonly evidence: JsonRecord;
}

export interface FreeCloudRefusal {
  readonly kind: "metroplat.inference.free-cloud-refused";
  readonly reason: string;
  readonly condition?: InferenceFailureCondition;
  readonly retryable?: boolean;
  readonly evidence?: JsonRecord;
}

export type FreeCloudAdmissionOutcome = FreeCloudAdmission | FreeCloudRefusal;

export interface FreeCloudRoute {
  /** Stable provider-profile identity; never a credential or endpoint secret. */
  readonly id: string;
  /** Exact provider-native model. Cross-model substitution requires a new call. */
  readonly model: string;
  readonly source: InferenceSource;
  readonly admit: (
    call: InferenceCall,
    options?: InferenceSourceOptions,
  ) => FreeCloudAdmissionOutcome | Promise<FreeCloudAdmissionOutcome>;
}

export interface FreeCloudRoutingPolicy {
  readonly routes: readonly FreeCloudRoute[];
}

interface AdmittedRoute {
  readonly route: FreeCloudRoute;
  readonly admission: FreeCloudAdmission;
}

const FALLBACK_CONDITIONS = new Set<InferenceFailureCondition>([
  "rate-limited",
  "unreachable",
  "truncated-stream",
]);


function validatePolicy(policy: FreeCloudRoutingPolicy): readonly FreeCloudRoute[] {
  const ids = new Set<string>();
  return Object.freeze(policy.routes.map((route) => {
    nonempty(route.id, "free-cloud route id");
    nonempty(route.model, `free-cloud route ${route.id} model`);
    if (ids.has(route.id)) throw new TypeError(`duplicate free-cloud route id: ${route.id}`);
    ids.add(route.id);
    return route;
  }));
}

function validateAdmission(route: FreeCloudRoute, admission: FreeCloudAdmission): FreeCloudAdmission {
  if (admission.zeroCash !== true) throw new TypeError(`free-cloud route ${route.id} did not prove zero cash`);
  if (admission.quotaRemaining !== undefined && (!Number.isSafeInteger(admission.quotaRemaining) || admission.quotaRemaining < 0)) {
    throw new TypeError(`free-cloud route ${route.id} returned invalid quota remaining`);
  }
  if (admission.lastHiredAt !== undefined) {
    nonempty(admission.lastHiredAt, `free-cloud route ${route.id} lastHiredAt`);
    if (!Number.isFinite(Date.parse(admission.lastHiredAt))) {
      throw new TypeError(`free-cloud route ${route.id} returned invalid last-hired timestamp`);
    }
  }
  requireJsonValue(admission.evidence, `free-cloud route ${route.id} admission evidence`);
  return admission;
}

function evidenceDigest(evidence: JsonRecord): string {
  return sha256Hex(canonicalBytes(evidence));
}

function leastRecentlyHired(left: AdmittedRoute, right: AdmittedRoute): number {
  const leftAt = left.admission.lastHiredAt;
  const rightAt = right.admission.lastHiredAt;
  if (leftAt === undefined && rightAt !== undefined) return -1;
  if (leftAt !== undefined && rightAt === undefined) return 1;
  if (leftAt !== undefined && rightAt !== undefined && leftAt !== rightAt) return leftAt.localeCompare(rightAt);
  return left.route.id.localeCompare(right.route.id);
}

function obstruction(
  call: InferenceCall,
  condition: InferenceFailureCondition,
  reasons: readonly string[],
  retryable: boolean,
): InferenceObstruction {
  return inferenceObstruction({
    call: call.id,
    condition,
    reasons,
    retryable,
    observedAt: call.observedAt,
    causes: Object.freeze([call.id]),
  });
}

function routingMove(
  type: "inference.route-selected" | "inference.route-obstructed",
  sequence: number,
  observedAt: string,
  body: JsonRecord,
): InferenceSourceEvent {
  return inferenceSourceMove(inferenceStreamMove({
    type,
    channel: "routing",
    sequence,
    body,
    observedAt,
  }));
}

function forwardMove(event: Extract<InferenceSourceEvent, { kind: "metroplat.inference.source-move" }>, sequence: number): InferenceSourceEvent {
  return inferenceSourceMove(inferenceStreamMove({
    type: event.move.type,
    channel: event.move.channel,
    sequence,
    body: event.move.body,
    observedAt: event.move.observedAt,
  }));
}

function isSemanticContribution(type: string): boolean {
  return type !== "inference.response-start";
}

function isAborted(options: InferenceSourceOptions | undefined): boolean {
  return options?.signal?.aborted === true;
}

/**
 * Compose free provider profiles behind the ordinary witnessed inference ABI.
 *
 * Admission is evaluated before provider selection. Eligible profiles are
 * ordered by the adopted least-recently-hired policy, with the stable route id
 * as the deterministic tie-break. Automatic fallback is confined to the same
 * exact model and stops once a provider has emitted semantic output, avoiding
 * concatenation of two different completions on the northbound stream.
 */
export function freeCloudRoutingSource(policy: FreeCloudRoutingPolicy): InferenceSource {
  const routes = validatePolicy(policy);
  return (call, options) => Object.freeze({
    async *[Symbol.asyncIterator](): AsyncGenerator<InferenceSourceEvent> {
      const matching = routes.filter((route) => route.model === call.model);
      if (matching.length === 0) {
        yield inferenceSourceTerminal(obstruction(call, "configuration", [`no free-cloud route offers exact model ${call.model}`], false));
        return;
      }

      const admitted: AdmittedRoute[] = [];
      const refusals: string[] = [];
      let admissionRetryable = false;
      for (const route of matching) {
        if (isAborted(options)) {
          yield inferenceSourceTerminal(obstruction(call, "cancelled", ["free-cloud routing cancelled before provider selection"], false));
          return;
        }
        let decision: FreeCloudAdmissionOutcome;
        try {
          decision = await route.admit(call, options);
        } catch {
          refusals.push(`${route.id}: admission check failed`);
          admissionRetryable = true;
          continue;
        }
        if (decision.kind === "metroplat.inference.free-cloud-refused") {
          try {
            nonempty(decision.reason, `free-cloud route ${route.id} refusal reason`);
            if (decision.evidence !== undefined) requireJsonValue(decision.evidence, `free-cloud route ${route.id} refusal evidence`);
          } catch {
            refusals.push(`${route.id}: invalid admission refusal`);
            continue;
          }
          refusals.push(`${route.id}: admission refused`);
          admissionRetryable ||= decision.retryable === true;
          continue;
        }
        let admission: FreeCloudAdmission;
        try {
          admission = validateAdmission(route, decision);
        } catch {
          refusals.push(`${route.id}: invalid free-cloud admission`);
          continue;
        }
        if (admission.quotaRemaining === 0) {
          refusals.push(`${route.id}: provider-declared quota is exhausted`);
          admissionRetryable = true;
          continue;
        }
        admitted.push(Object.freeze({ route, admission }));
      }

      admitted.sort(leastRecentlyHired);
      if (admitted.length === 0) {
        yield inferenceSourceTerminal(obstruction(
          call,
          "rejected",
          refusals.length === 0 ? ["no free-cloud route was admitted"] : refusals,
          admissionRetryable,
        ));
        return;
      }

      let sequence = 0;
      const attempted: string[] = [];
      for (const { route, admission } of admitted) {
        if (isAborted(options)) {
          yield inferenceSourceTerminal(obstruction(call, "cancelled", ["free-cloud routing cancelled before provider attempt"], false));
          return;
        }
        attempted.push(route.id);
        yield routingMove("inference.route-selected", sequence++, call.observedAt, Object.freeze({
          route: route.id,
          model: route.model,
          zeroCash: true,
          admissionEvidenceDigest: evidenceDigest(admission.evidence),
          ...(admission.quotaRemaining === undefined ? {} : { quotaRemaining: admission.quotaRemaining }),
          ...(admission.lastHiredAt === undefined ? {} : { lastHiredAt: admission.lastHiredAt }),
        }));

        let terminal: InferenceObstruction | undefined;
        let semanticContribution = false;
        try {
          for await (const event of route.source(call, options)) {
            if (event.kind === "metroplat.inference.source-move") {
              semanticContribution ||= isSemanticContribution(event.move.type);
              yield forwardMove(event, sequence++);
              continue;
            }
            if (event.outcome.kind === "metroplat.inference.result") {
              if (event.outcome.call !== call.id || event.outcome.model !== route.model) {
                terminal = obstruction(call, "malformed", [
                  `${route.id}: provider terminal did not preserve exact call and model identity`,
                ], false);
                break;
              }
              yield event;
              return;
            }
            terminal = event.outcome;
            break;
          }
        } catch {
          terminal = obstruction(call, isAborted(options) ? "cancelled" : "unreachable", [
            `${route.id}: provider source failed`,
          ], !isAborted(options));
        }
        terminal ??= obstruction(call, "truncated-stream", [`${route.id}: source ended without terminal evidence`], true);

        const mayFallback = !isAborted(options)
          && !semanticContribution
          && terminal.retryable
          && FALLBACK_CONDITIONS.has(terminal.condition);
        if (!mayFallback) {
          yield inferenceSourceTerminal(inferenceObstruction({
            call: call.id,
            condition: terminal.condition,
            reasons: Object.freeze([`${route.id}: provider route obstructed`]),
            retryable: terminal.retryable,
            observedAt: terminal.observedAt,
            causes: Object.freeze([call.id, terminal.id]),
          }));
          return;
        }
        yield routingMove("inference.route-obstructed", sequence++, terminal.observedAt, Object.freeze({
          route: route.id,
          model: route.model,
          condition: terminal.condition,
          retryable: true,
        }));
      }

      yield inferenceSourceTerminal(obstruction(
        call,
        "unreachable",
        [`free-cloud routes exhausted for ${call.model}: ${attempted.join(", ")}`],
        true,
      ));
    },
  });
}

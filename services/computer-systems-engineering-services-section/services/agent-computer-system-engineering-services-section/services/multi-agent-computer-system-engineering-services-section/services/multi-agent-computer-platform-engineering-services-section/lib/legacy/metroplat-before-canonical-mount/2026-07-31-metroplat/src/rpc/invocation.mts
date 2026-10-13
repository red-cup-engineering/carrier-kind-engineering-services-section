/** Canonical, protocol-neutral RPC invocation material. */
import { contentAddress } from "../lib/identity/index.mts";
import { requireJsonValue, type JsonRecord, type JsonValue } from "../lib/codecs/json/core.mts";

export interface InvocationDraft {
  /** Stable request/idempotency key supplied or derived by the boundary adapter. */
  readonly request: string;
  /** Resolved subject asking for execution. Boundary metadata is not identity. */
  readonly subject: string;
  /** Content-addressed operation declaration. */
  readonly operation: string;
  /** Human-facing alias retained for routing and diagnostics. */
  readonly verb: string;
  /** Resource against which standing is judged. */
  readonly resource: string;
  readonly input: JsonValue;
  /** Optional semantic identity projection when the carried input includes observation metadata. */
  readonly inputIdentity?: JsonValue;
  readonly arguments?: JsonRecord;
  readonly caller: JsonValue;
  readonly observedAt: string;
  readonly causes?: readonly string[];
}

export interface RpcInvocation extends Omit<InvocationDraft, "inputIdentity"> {
  readonly kind: "metroplat.rpc.invocation";
  readonly id: string;
  readonly arguments: JsonRecord;
  readonly causes: readonly string[];
}

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

/** Construct and content-address one semantic invocation after wire decoding. */
export function invocation(draft: InvocationDraft): RpcInvocation {
  const material = Object.freeze({
    kind: "metroplat.rpc.invocation" as const,
    request: nonempty(draft.request, "invocation request"),
    subject: nonempty(draft.subject, "invocation subject"),
    operation: nonempty(draft.operation, "invocation operation"),
    verb: nonempty(draft.verb, "invocation verb"),
    resource: nonempty(draft.resource, "invocation resource"),
    input: requireJsonValue(draft.input, "invocation input"),
    arguments: Object.freeze({ ...(draft.arguments ?? {}) }),
    caller: requireJsonValue(draft.caller, "invocation caller"),
    observedAt: nonempty(draft.observedAt, "invocation observedAt"),
    causes: Object.freeze([...(draft.causes ?? [])]),
  });
  const identity = Object.freeze({
    kind: "metroplat.rpc.invocation-identity" as const,
    request: material.request,
    subject: material.subject,
    operation: material.operation,
    verb: material.verb,
    resource: material.resource,
    input: draft.inputIdentity === undefined
      ? material.input
      : requireJsonValue(draft.inputIdentity, "invocation input identity"),
    arguments: material.arguments,
  });
  return Object.freeze({
    ...material,
    id: contentAddress(identity as unknown as JsonValue),
  });
}

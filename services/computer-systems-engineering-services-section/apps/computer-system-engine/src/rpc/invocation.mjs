import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
/** Canonical, protocol-neutral RPC invocation material. */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

/** Construct and content-address one semantic invocation after wire decoding. */
export function invocation(draft) {
  const material = Object.freeze({
    kind: "metroplat.rpc.invocation",
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
    kind: "metroplat.rpc.invocation-identity",
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
    id: artifactId(identity),
  });
}

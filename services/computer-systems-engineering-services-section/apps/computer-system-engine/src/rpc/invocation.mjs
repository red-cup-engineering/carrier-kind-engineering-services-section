import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
/** Canonical, protocol-neutral RPC invocation material. */
import { artifactId } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { isNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

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

/** A rejected body's reference, never a rewritten invocation under its former identity.
 * Unaccepted input, arguments, caller material and transport request strings are omitted.
 * The original content address is retained only as a reference. An address is not encryption
 * and does not make guessable private material safe; this is bounded raw-payload minimization. */
export function rejectedInvocationReference(candidate, operation) {
  const material = Object.freeze({
    kind: "metroplat.rpc.rejected-invocation-reference",
    invocation: candidate.id,
    subject: candidate.subject,
    verb: operation?.verb ?? "unresolved-operation",
    ...(operation === undefined ? {} : { operation: operation.ref, ...(operation.domain === undefined ? {} : { domain: operation.domain.id }) }),
    // Preserve canonical causal references without retaining arbitrary cause strings.
    causes: Object.freeze((candidate.causes ?? []).filter(isNiUri)),
  });
  return Object.freeze({ ...material, id: artifactId(material) });
}

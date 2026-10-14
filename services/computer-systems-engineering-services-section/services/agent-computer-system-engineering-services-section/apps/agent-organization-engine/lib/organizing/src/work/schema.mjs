import { skillResultCarrier } from "@red-cup-engineering/animating/becoming/doing/working/governing/carriers";
import { skillError } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { skillResultRouting } from "../work.mjs";
import { gitSourceClosureSchema, gitSourceResultSchema } from "@red-cup-engineering/git-services-section/git-command-codec";

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { validateJsonSchemaDocument } from "@red-cup-engineering/json-schema-services-section/validation";
import { canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE, parseJsonValue, requireJsonValue, isJsonRecord, jsonValuesOfText } from "@red-cup-engineering/json-services-section";
import { canonicalCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { JURAL_KINDS } from "@red-cup-engineering/socializing/jural";
import { admitJavascriptNodeCommandExecutionRequest } from "@red-cup-engineering/javascript-node-services-section/admit-javascript-node-command-execution-request";

/** An office-work result retains its native invocation outcome and its declared
 * codomain projection. Independent acceptance remains a separate judgment. */
const codomainAssaySchema = {
  type: "object", required: ["source", "returns"], additionalProperties: false,
  properties: { source: { type: "string", minLength: 1 }, returns: { type: "object" } },
};

export const agencyWorkResultSchema = {
  $id: "metroplat/work/agency-work-result",
  oneOf: [
    { type: "object", required: ["kind", "value", "skillOutcome"], properties: {
      kind: { const: "skill-result" }, value: {},
      skillOutcome: { $ref: "animating/becoming/doing/working/governing/skill-result" },
      codomainAssay: codomainAssaySchema,
    }, additionalProperties: false },
    { type: "object", required: ["kind", "error", "skillOutcome"], properties: {
      kind: { const: "skill-error" }, error: { type: "string", minLength: 1 },
      skillOutcome: { $ref: "animating/becoming/doing/working/governing/skill-result" },
      codomainAssay: codomainAssaySchema,
    }, additionalProperties: false },
  ],
};
export const agencyWorkResultContract = schemaFrom(agencyWorkResultSchema, [skillResultCarrier]);

/** Admit the native subobject using its owning carrier and execution contract. */
function nativeSkillOutcome(value) {
  // This work rail persists JSON values even though SCA itself also names bigint/bytes.
  // Validate with the actual JSON codec before SCA canonicalization can omit a field.
  const snapshot = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  requireJsonValue(snapshot, "native skill outcome");
  if (semanticId(canonicalCarrier(value)) !== semanticId(canonicalCarrier(snapshot))) {
    throw new TypeError("native skill outcome is not stable through the work result JSON codec");
  }
  const native = skillResultCarrier.assert(canonicalCarrier(snapshot), "native skill outcome");
  if (semanticId(native) !== semanticId(parseJsonValue(canonicalJson(native)))) {
    throw new TypeError("native skill outcome is not stable through the work result JSON codec");
  }
  if (native.ok) {
    if (!Object.hasOwn(native, "output") || native.error !== undefined
      || !["potential", "active"].includes(native.reading)) {
      throw new TypeError("native skill success requires output and a classical reading without an error");
    }
  } else if (native.error === undefined || native.output !== undefined
    || native.reading !== skillError(native.error.errorClass, native.error.message, native.error.context).reading) {
    throw new TypeError("native skill error requires its structured error and matching error reading without output");
  }
  return native;
}

/** Validate before persistence. A native error can never masquerade as outer success. */
export function admitAgencyWorkResult(value) {
  const snapshot = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  const result = agencyWorkResultContract.assert(snapshot, "agency work result");
  const native = nativeSkillOutcome(result.skillOutcome);
  const actual = result.kind === "skill-result" ? { kind: result.kind, value: result.value }
    : { kind: result.kind, error: result.error };
  let expected = native.ok ? { kind: "skill-result", value: native.output }
    : { kind: "skill-error", error: native.error.message };
  if (result.codomainAssay !== undefined) {
    if (!native.ok || result.codomainAssay.source !== semanticId(native)) {
      throw new TypeError("result codomain assay does not name its native success source");
    }
    const declaredCodomain = admitNativeResultCodomain(result.codomainAssay.returns);
    expected = typedValueResultOf(declaredCodomain, native.output);
    // JSON embedded in native text can decode new non-NFC strings even when
    // both the text and declared schema are transport-stable. The product
    // admitted by that literal schema must not change during persistence.
    if (canonicalJson(expected) !== canonicalJson(canonicalCarrier(expected))) {
      throw new TypeError("native codomain projection is not stable through the work result SCA transport");
    }
  }
  if (semanticId(actual) !== semanticId(expected)) {
    throw new TypeError("office result does not match its native outcome projection or codomain assay");
  }
  return canonicalCarrier({ ...result, skillOutcome: native });
}

/** Project the exact native SkillResult into the office-work contract. */
export function workResultFromSkillResult(value) {
  const native = nativeSkillOutcome(value);
  return admitAgencyWorkResult(Object.freeze(native.ok
    ? { kind: "skill-result", value: native.output, skillOutcome: native }
    : { kind: "skill-error", error: native.error.message, skillOutcome: native }));
}

/** Producer-native context for execution and receiving; never an acceptance decision. */
export function workResultSkillContext(value) {
  const result = admitAgencyWorkResult(value);
  const native = result.skillOutcome;
  return Object.freeze({ reading: native.reading, routing: skillResultRouting(native),
    ...(native.ok ? {} : { errorClass: native.error.errorClass }) });
}

const workScopePattern = "^(endeavor|campaign|project|plan|task|work-item):[^\\s:][^\\s]*$";

/** Exact source value carried by execution/result receipts; it is never a custody grant. */
export const workSourceClosureContract = schemaFrom(gitSourceClosureSchema);

export const workSourceResultContract = schemaFrom(gitSourceResultSchema);

/** Host-observed task coordinates in existing harness testimony, never a source grant. */
export const workSourceTaskSchema = {
  $id: "metroplat/work/source-task", type: "object", additionalProperties: false,
  required: ["kind", "id", "role", "task", "workspace", "branch", "sourceBinding", "scope", "subject", "office", "effects", "copies"],
  properties: {
    kind: { const: "metroplat.work.source-task" }, id: { type: "string", minLength: 1 },
    role: { enum: ["production", "receiving"] }, effects: { enum: ["read-only", "repository-write"] }, task: { type: "string", minLength: 1, maxLength: 128 },
    workspace: { type: "string", minLength: 1, maxLength: 4096 }, branch: { type: "string", minLength: 1, maxLength: 1024 },
    sourceBinding: { type: "string", minLength: 1 }, sourceResult: { type: "string", minLength: 1 },
    allocation: { type: "string", minLength: 1 }, proposal: { type: "string", minLength: 1 },
    scope: { type: "string", minLength: 1 }, subject: { type: "string", minLength: 1 }, office: { type: "string", minLength: 1 },
    copies: { type: "array", minItems: 1, maxItems: 128, items: { type: "object", additionalProperties: false, required: ["path", "device", "inode"], properties: {
      path: { type: "string", maxLength: 1024 }, device: { type: "string", minLength: 1 }, inode: { type: "string", minLength: 1 },
    } } },
  },
  oneOf: [
    { properties: { role: { const: "production" } }, required: ["allocation"], not: { anyOf: [{ required: ["proposal"] }, { required: ["sourceResult"] }] } },
    { properties: { role: { const: "receiving" } }, required: ["proposal", "sourceResult"], not: { required: ["allocation"] } },
  ],
};
export const workSourceTaskContract = schemaFrom(workSourceTaskSchema);

/** Provider-neutral intent at the existing work-obligation boundary. Producer
 * identity and cited source spans are assay evidence, not part of the work
 * ontology. */
export const structuredWorkIntentSchema = {
  $id: "metroplat/work/structured-work-intent",
  type: "object",
  required: ["kind", "id", "producer", "sources", "items"],
  properties: {
    kind: { const: "metroplat.work.structured-intent" },
    id: { type: "string", minLength: 1 },
    need: {
      type: "string", minLength: 1, maxLength: 400,
      description: "The end the outline serves: a state of the world that holds once its items are done (a goal, never the activity). Its items are the plan that operationalizes it; an intent opened on a board is a request for this need.",
    },
    producer: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", minLength: 1 },
        revision: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
    sources: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "kind"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { type: "string", minLength: 1 },
          locator: { type: "string", minLength: 1 },
          commitment: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["cell", "text", "evidence", "provenance"],
        properties: {
          cell: { type: "string", pattern: workScopePattern },
          item: { type: "string", pattern: workScopePattern },
          parent: { type: "string", pattern: workScopePattern },
          parentWitness: {
            type: "object",
            required: ["subject", "witness"],
            properties: {
              subject: { type: "string", minLength: 1 },
              witness: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
          },
          dependencies: { type: "array", items: { type: "string", pattern: workScopePattern }, uniqueItems: true },
          conflicts: { type: "array", items: { type: "string", pattern: workScopePattern }, uniqueItems: true },
          text: { type: "string", minLength: 1 },
          /** Canonical work and skill are required when an office duty allocates this item. */
          work: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
          skill: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
          sourceRepository: { type: "string", minLength: 1, description: "The configured Git source owner URL for this bounded source obligation. The host resolves it against its actual root origin or configured initialized gitlinks; it grants no arbitrary filesystem path." },
          requiredCarrier: {
            type: "object",
            required: ["model", "reasoningEffort"],
            properties: {
              model: { type: "string", minLength: 1 },
              reasoningEffort: { type: "string", minLength: 1 },
            },
            additionalProperties: false,
            description: "An obligation-scoped model and reasoning effort requirement. It selects any currently admitted qualified session matching the pair; it never pins a session.",
          },
          deterministicExecution: {
            description: "An admitted exact operation binding. Its request is validated by the public JavascriptNodeCommandExecutionRequest@1 admission contract and its acceptance is validated by the shared agent-work executor.",
            type: "object",
            required: ["operation", "request", "acceptance"],
            properties: {
              operation: { type: "string", minLength: 1 },
              request: { type: "object", description: "JavascriptNodeCommandExecutionRequest@1 supplied to the public command executor; this schema preserves the binding and does not reimplement its admission." },
              acceptance: {
                type: "object",
                required: ["kind"],
                properties: {
                  kind: { enum: ["command-exit-status", "exact-stdout"] },
                  status: { type: "integer" },
                  stdout: { type: "string" },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
          returns: {
            type: "object",
            description: "The codomain of this item's result: an anonymous JSON Schema its value must satisfy (it may $ref a declared schema). The order states what is made and the codomain what the made thing is; a result that satisfies none of it is no product of the order, and is admitted as its producer's error, so the work stays open and the miss is counted (validateResultCodomain, typedResultOf).",
          },
          order: {
            type: "string",
            pattern: "^ni:///sha-256;[A-Za-z0-9_-]+$",
            description: "The content address of the order this item makes: for an item of a work-arena request, the request's operative order (organizing enterprise/work-arena orderOf). A miss is the order's once carriers of different models miss it alike, so whoever prices carriers reads misses by order (orderOfItem), never by an order it digests itself.",
          },
          evidence: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
          provenance: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["source"],
              properties: {
                source: { type: "string", minLength: 1 },
                start: { type: "integer", minimum: 0 },
                end: { type: "integer", minimum: 0 },
                unit: { enum: ["unicode-code-point", "utf8-byte", "line"] },
                evidence: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const structuredWorkIntentContract = schemaFrom(structuredWorkIntentSchema);

/** Transport selector for a held-work admission. Authorization coordinates are untrusted; the
 * installed host resolves them against the authenticated invocation and current office records. */
export const structuredWorkIntentRequestContract = schemaFrom({
  $id: "metroplat/work/structured-work-intent-request",
  oneOf: [
    structuredWorkIntentSchema,
    {
      type: "object",
      required: ["kind", "intent", "authorization"],
      properties: {
        kind: { const: "metroplat.work.structured-intent-admission-request" },
        intent: structuredWorkIntentSchema,
        authorization: {
          type: "object", required: ["office", "session"],
          properties: { office: { type: "string", minLength: 1 }, session: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  ],
});

export const structuredWorkIntentAdmissionSchema = {
  $id: "metroplat/work/structured-work-intent-admission",
  type: "object",
  required: ["kind", "intent", "subject", "items", "obligations", "appended", "status"],
  properties: {
    kind: { const: "metroplat.work.structured-intent-admission" },
    intent: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    items: { type: "integer", minimum: 0 },
    obligations: { type: "array", items: { type: "object", required: ["scope", "witness"], properties: { scope: { type: "string", pattern: workScopePattern }, witness: { type: "string", minLength: 1 } }, additionalProperties: false } },
    appended: { type: "integer", minimum: 0 },
    status: { enum: ["admitted", "already-admitted", "opened"], description: "opened: the intent was opened on the settlement's work board as the request it amounts to, for a micro-enterprise to promise; no work is held yet." },
    thread: { type: "string", minLength: 1, description: "The work-board thread an opened intent waits under." },
    peerHandoff: { enum: ["queued", "failed"], description: "Peer queue outcome, separate from local journal admission. Absence means no handoff was configured for this intent." },
  },
  additionalProperties: false,
};

export const structuredWorkIntentAdmissionContract = schemaFrom(structuredWorkIntentAdmissionSchema);

export const workDischargeSchema = {
  $id: "metroplat/work/work-discharge",
  type: "object",
  required: ["kind", "id", "intent", "allocation", "subject", "producer", "scope", "text", "result", "resultReceipt", "receiver", "evidence"],
  properties: {
    kind: { const: "metroplat.work.discharge" },
    id: { type: "string", minLength: 1 },
    intent: { type: "string", minLength: 1 },
    allocation: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    producer: {
      type: "object",
      required: ["id", "revision"],
      properties: {
        id: { type: "string", minLength: 1 },
        revision: { type: "string", minLength: 1 },
      },
      additionalProperties: false,
    },
    scope: { type: "string", pattern: workScopePattern },
    text: { type: "string", minLength: 1 },
    result: agencyWorkResultSchema,
    decision: { enum: ["accepted", "rejected"], description: "Independent receipt; rejection preserves the open obligation." },
    resultReceipt: { type: "string", minLength: 1 },
    receiver: { type: "object", required: ["id", "evidence"], properties: { id: { type: "string", minLength: 1 }, office: { type: "string", minLength: 1 }, session: { type: "string", minLength: 1 }, evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, uniqueItems: true } }, additionalProperties: false },
    evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, uniqueItems: true },
  },
  additionalProperties: false,
};

export const workDischargeContract = schemaFrom(workDischargeSchema, [skillResultCarrier]);

// The receiver judges a witnessed proposal; it does not reproduce the producer's
// immutable tuple. That tuple remains the server's resolved ledger material.
export const workDischargeInputSchema = {
  $id: "metroplat/work/work-discharge-input",
  type: "object",
  required: ["kind", "id", "subject", "resultReceipt", "decision", "text", "receiver", "evidence"],
  properties: Object.fromEntries(["kind", "id", "subject", "resultReceipt", "decision", "text", "receiver", "evidence"]
    .map(key => [key, workDischargeSchema.properties[key]])),
  additionalProperties: false,
};
export const workDischargeInputContract = schemaFrom(workDischargeInputSchema);

export const workDischargeAdmissionSchema = {
  $id: "metroplat/work/work-discharge-admission",
  type: "object",
  required: ["kind", "discharge", "intent", "subject", "scope", "appended", "status"],
  properties: {
    kind: { const: "metroplat.work.discharge-admission" },
    discharge: { type: "string", minLength: 1 },
    intent: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    scope: { type: "string", pattern: workScopePattern },
    appended: { type: "integer", minimum: 0 },
    status: { enum: ["admitted", "already-admitted"] },
  },
  additionalProperties: false,
};

export const workDischargeAdmissionContract = schemaFrom(workDischargeAdmissionSchema);

export const enterpriseRecordReadings = Object.freeze(["bottom", "t", "f", "top"]);

export const agencyWorkAllocationSchema = {
  $id: "metroplat/work/agency-work-allocation",
  type: "object",
  required: ["kind", "id", "subject", "office", "duty", "character", "officeService", "allocation"],
  properties: {
    kind: { const: "metroplat.work.agency-work-allocation" },
    id: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    office: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string", minLength: 1 } },
      additionalProperties: false,
    },
    duty: { type: "string", pattern: "^emsenn/duty/[a-z0-9]+(?:-[a-z0-9]+)*$" },
    character: {
      type: "object",
      required: ["model", "id", "capabilities"],
      properties: {
        model: { type: "string", minLength: 1 },
        id: { type: "string", minLength: 1 },
        reasoningEffort: { type: "string", minLength: 1 },
        capabilities: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
      },
      additionalProperties: false,
    },
    officeService: {
      type: "object",
      required: ["id", "requiredCapabilities"],
      properties: {
        id: { type: "string", minLength: 1 },
        requiredCapabilities: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true },
      },
      additionalProperties: false,
    },
    allocation: {
      type: "object",
      required: ["scope"],
      properties: {
        scope: { type: "string", pattern: workScopePattern },
        reasoningEffort: { type: "string", minLength: 1 },
        requiredCarrier: {
          type: "object", required: ["model", "reasoningEffort"],
          properties: { model: { type: "string", minLength: 1 }, reasoningEffort: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
        /** A holder-authorized, scope-bounded provider delegation. It is admitted
         * into the same allocation journal, never read from process environment. */
        delegation: {
          type: "object", required: ["provider", "operations", "effects", "authority"],
          properties: { provider: { type: "string", minLength: 1 }, operations: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, uniqueItems: true }, effects: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, uniqueItems: true }, authority: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const agencyWorkAllocationContract = schemaFrom(agencyWorkAllocationSchema);

export const agencyWorkAllocationAdmissionSchema = {
  $id: "metroplat/work/agency-work-allocation-admission",
  type: "object",
  required: ["kind", "allocation", "subject", "office", "character", "officeService", "scope", "appended", "status"],
  properties: {
    kind: { const: "metroplat.work.agency-work-allocation-admission" },
    allocation: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    office: { type: "string", minLength: 1 },
    character: { type: "string", minLength: 1 },
    officeService: { type: "string", minLength: 1 },
    scope: { type: "string", pattern: workScopePattern },
    appended: { type: "integer", minimum: 0 },
    status: { enum: ["admitted", "already-admitted"] },
  },
  additionalProperties: false,
};

export const agencyWorkAllocationAdmissionContract = schemaFrom(agencyWorkAllocationAdmissionSchema);

export const agencyWorkExecutionSchema = {
  $id: "metroplat/work/agency-work-execution",
  type: "object",
  required: ["kind", "id", "actor", "scope"],
  properties: {
    kind: { const: "metroplat.work.agency-work-execution" },
    id: { type: "string", minLength: 1 },
    actor: { type: "string", minLength: 1 },
    scope: { type: "string", pattern: workScopePattern },
  },
  additionalProperties: false,
};

export const agencyWorkExecutionContract = schemaFrom(agencyWorkExecutionSchema);
export const agencyWorkExecutionProposalSchema = {
  $id: "metroplat/work/agency-work-execution-proposal", type: "object",
  required: ["kind", "execution", "intent", "scope", "producer", "result", "receipt", "evidence"],
  properties: {
    kind: { const: "metroplat.work.agency-work-execution-proposal" }, execution: { type: "string", minLength: 1 }, intent: { type: "string", minLength: 1 }, scope: { type: "string", pattern: workScopePattern },
    producer: { type: "object", required: ["id", "revision"], properties: { id: { type: "string", minLength: 1 }, revision: { type: "string", minLength: 1 } }, additionalProperties: false },
    result: agencyWorkResultSchema,
    receipt: { type: "string", minLength: 1 }, evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, uniqueItems: true },
  }, additionalProperties: false,
};

export const agencyWorkExecutionProposalContract = schemaFrom(agencyWorkExecutionProposalSchema, [skillResultCarrier]);

/** A connected provider's result for one duty delegated to it. The producer is the
 * authenticated caller, never a field of this payload. */
/** One resource a piece of work consumed (organizing/enterprise/resources): a quantity in its own unit, never a price. */
export const workResourceSchema = {
  type: "object", required: ["resource", "unit", "amount"], additionalProperties: false,
  properties: {
    resource: { type: "string", minLength: 1 },
    unit: { type: "string", minLength: 1 },
    amount: { type: "string", pattern: "^(?:0|[1-9][0-9]*)$" },
    carrier: { type: "string", minLength: 1, description: "What consumed it: a model, for tokens." },
  },
};

export const agencyWorkProposalSchema = {
  $id: "metroplat/work/agency-work-proposal", type: "object",
  required: ["scope", "result"],
  properties: {
    scope: { type: "string", pattern: workScopePattern },
    session: { type: "string", minLength: 1, description: "Exact admitted Codex session for direct office work." },
    result: agencyWorkExecutionProposalSchema.properties.result,
    revision: { type: "string", minLength: 1, description: "What produced the result (a model or tool version), recorded as evidence." },
    evidence: { type: "array", items: { type: "string", minLength: 1 }, uniqueItems: true, description: "References the receiver can check: commits, URLs, record ids." },
    resources: { type: "array", items: workResourceSchema, description: "What the work consumed (tokens through a carrier, requests, seconds), as witnessed quantities apart from any price." },
  }, additionalProperties: false,
};

export const agencyWorkProposalContract = schemaFrom(agencyWorkProposalSchema, [skillResultCarrier]);

export const agencyWorkDelegatedInputContract = schemaFrom({
  $id: "metroplat/work/agency-work-delegated-input", type: "object", additionalProperties: false,
  properties: { scope: { type: "string", pattern: workScopePattern } },
});

/** The current callable operation Resource projection. Custody is observed here;
 * availability and effect authority are rechecked when the operation is invoked. */
export const delegatedOperationResourceSchema = {
  type: "object", required: ["ref", "installed", "available"], additionalProperties: false,
  properties: {
    ref: { type: "string", minLength: 1 }, verb: { type: "string", minLength: 1 },
    installed: { type: "boolean" }, available: { type: "boolean" },
    summary: { type: "string" }, input: {}, output: {},
    enterprise: { type: "string", minLength: 1 }, commandPrefix: { type: "string", minLength: 1 },
    inputDefaults: { type: "object" },
    inputReferences: { type: "array", items: { type: "object" } }, outputReferences: { type: "array", items: { type: "object" } },
    locus: { type: "string", minLength: 1 }, scope: { type: "string", minLength: 1 },
    repository: { type: "string", minLength: 1 }, sourceRepository: { type: "string", minLength: 1 },
    workspace: { type: "string", minLength: 1 }, sourceRefusal: { type: "string", minLength: 1 },
  },
};
export const delegatedOperationResourceContract = schemaFrom(delegatedOperationResourceSchema);

/** The ready duties delegated to the calling provider, each as the one packet it works from. */
export const agencyWorkDelegatedSchema = {
  $id: "metroplat/work/agency-work-delegated", type: "object",
  required: ["kind", "at", "providers", "duties"],
  properties: {
    kind: { const: "metroplat.work.agency-work-delegated" },
    at: { type: "string", minLength: 1 },
    providers: { type: "array", items: { type: "string", minLength: 1 } },
    duties: { type: "array", items: {
      type: "object",
      required: ["scope", "holder", "provider", "intent", "subject", "work", "skill", "method", "receiverCondition", "operations", "effects"],
      properties: {
        scope: { type: "string" }, holder: { type: "string" }, provider: { type: "string" },
        enterprise: { type: "string", minLength: 1 }, commandPrefix: { type: "string", minLength: 1 },
        office: { type: "string", minLength: 1 }, allocation: { type: "string", minLength: 1 },
        state: { enum: ["ready", "in-flight"] },
        allocatedModel: { type: "string", minLength: 1 },
        allocatedReasoningEffort: { type: "string", minLength: 1 },
        action: { type: "object", required: ["id", "graph", "operation", "sourceAction", "requiredResources"], additionalProperties: false,
          properties: {
            id: { type: "string", minLength: 1 }, graph: { type: "string", minLength: 1 },
            operation: { type: "string", minLength: 1 }, title: { type: "string" },
            sourceAction: { type: "string", minLength: 1 },
            requiredResources: { type: "array", items: {
              type: "object", required: ["id", "witness"], additionalProperties: false,
              properties: { id: { type: "string", minLength: 1 }, witness: { type: "string", minLength: 1 }, locator: { type: "string" } },
            } },
          },
        },
        resources: { type: "array", items: delegatedOperationResourceSchema },
        execution: { type: "object", required: ["state", "receipt"], properties: {
          state: { const: "started" }, receipt: { type: "string", minLength: 1 },
          sourceRepository: { type: "string", minLength: 1 },
          sourceBinding: gitSourceClosureSchema,
          sourceResult: gitSourceResultSchema,
          session: { type: "string", minLength: 1 }, model: { type: "string", minLength: 1 },
        }, additionalProperties: false },
        intent: { type: "string" }, subject: { type: "string" }, work: { type: "string" }, skill: { type: "string" },
        closureKind: { type: "string" }, method: { type: "string" }, receiverCondition: { type: "string" },
        requiresCapabilities: { type: "array", items: { type: "string" } },
        operations: { type: "array", items: { type: "string" } }, effects: { type: "array", items: { type: "string" } },
      },
    } },
  }, additionalProperties: false,
};

// The lazy declaration boundary has no ambient registry: carry its recursive
// source-value dependencies explicitly with the owning work contract.
export const agencyWorkDelegatedContract = schemaFrom(agencyWorkDelegatedSchema, [workSourceClosureContract, workSourceResultContract]);

export const juralRelationSchema = {
  type: "object",
  required: ["kind", "active", "passive", "scope", "standing"],
  properties: {
    kind: { enum: JURAL_KINDS },
    active: { type: "string", minLength: 1 },
    passive: { type: "string", minLength: 1 },
    scope: { type: "string", minLength: 1 },
    standing: { enum: ["potential", "active", "stable", "absurd"] },
  },
  additionalProperties: false,
};

/** Schema for the Hodge/cohomology-backed, FOUR-valued governance reading. */
export const governanceSchema = {
  type: "object",
  required: [
    "kind", "observers", "relations", "correlatives", "powers", "dominion",
    "concentration", "accountabilityGap", "directedCycle", "contested",
  ],
  properties: {
    kind: { const: "governance.jural-reading" },
    observers: { type: "number" },
    relations: { type: "array", items: juralRelationSchema },
    correlatives: { type: "array", items: juralRelationSchema },
    powers: { type: "number" },
    dominion: { type: "number" },
    concentration: { type: "number" },
    accountabilityGap: { type: "number" },
    directedCycle: { type: "boolean" },
    contested: { type: "number" },
  },
  additionalProperties: false,
};

const chronicleWorkItem = {
  $id: "metroplat/executing/chronicle-work-item",
  type: "object",
  required: ["kind", "role", "source", "text", "evidence"],
  properties: {
    kind: { const: "metroplat.chronicle-work-item" },
    role: { enum: ["goal", "obligation"] },
    sessionId: { type: "string" },
    source: { type: "string" },
    text: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};

export const chronicleWorkItemContract = schemaFrom(chronicleWorkItem);
export const chronicleWorkReadContract = schemaFrom({
  $id: "metroplat/executing/chronicle-work-read",
  type: "object",
  required: ["kind", "source", "goals", "obligations", "items", "evidence"],
  properties: {
    kind: { const: "metroplat.chronicle-work-read" },
    sessionId: { type: "string" },
    source: { type: "string" },
    protocol: { type: "string" },
    surface: { type: "string" },
    goals: { type: "integer", minimum: 0 },
    obligations: { type: "integer", minimum: 0 },
    items: { type: "array", items: chronicleWorkItem },
    evidence: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
});

/**
 * Input for the `agent-work-dispatch` verb: an optional page (`limit`/`cursor`)
 * over an otherwise ordinary work-coordination read. `limit`'s upper bound
 * (500) is enforced in code, not here — the house schema validator carries no
 * `maximum` keyword.
 */
export const agentWorkDispatchInputSchema = {
  $id: "metroplat/work/agent-work-dispatch-input",
  type: "object",
  properties: {
    date: { type: "string", minLength: 1 },
    id: { type: "string", minLength: 1 },
    limit: { type: "integer", minimum: 1 },
    cursor: { type: "string", minLength: 1 },
    view: { enum: ["execution", "receiving"] },
    scope: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const agentWorkDispatchInputContract = schemaFrom(agentWorkDispatchInputSchema);

/**
 * Output for `agent-work-dispatch`: a paged `AgentWorkDispatchReadout`
 * with each full work record carried once in queue. Other queue/frontier/offer
 * views contain page-local indices; counts still cover the whole territory.
 */
export const agentWorkDispatchOutputSchema = {
  $id: "metroplat/work/agent-work-dispatch-output",
  // "null" carries the same "no journal feed for this date yet" reading the other
  // work-coordination reads use (their generic `operationOf` factory's `read(...) ?? null`).
  type: ["object", "null"],
  required: ["kind", "subject", "date", "ready", "inFlight", "blocked", "done", "queueViews", "agents", "unallocatedCount", "unallocated", "frontier", "queue", "evidence"],
  properties: {
    kind: { const: "metroplat.agent-work.dispatch-settlement" },
    subject: { type: "string", minLength: 1 },
    date: { type: "string", minLength: 1 },
    feed: { type: "string", minLength: 1 },
    policy: { const: "declared-duty-with-structural-and-coordination-readiness" },
    coordination: { enum: ["clear", "contested", "coordination-required"] },
    coordinationCost: { type: "number", minimum: 0 },
    ready: { type: "integer", minimum: 0 },
    inFlight: { type: "integer", minimum: 0 },
    blocked: { type: "integer", minimum: 0 },
    done: { type: "integer", minimum: 0 },
    queueViews: { const: "indices" },
    view: { enum: ["execution", "receiving"] },
    queueCount: { type: "integer", minimum: 0 },
    scope: { type: "string", minLength: 1 },
    agents: { type: "array", items: {
      type: "object",
      required: ["agent", "ready", "inFlight", "blocked", "done", "queue", "frontier", "offers", "evidence"],
      properties: {
        agent: { type: "string", minLength: 1 },
        ready: { type: "integer", minimum: 0 }, inFlight: { type: "integer", minimum: 0 },
        blocked: { type: "integer", minimum: 0 }, done: { type: "integer", minimum: 0 },
        queue: { type: "array", items: { type: "integer", minimum: 0 } },
        frontier: { type: "array", items: { type: "integer", minimum: 0 } },
        offers: { type: "array", items: { type: "array", items: { type: "integer", minimum: 0 } } },
        evidence: { type: "array", items: { type: "string" } },
        queueTruncated: { type: "integer", minimum: 1 },
        frontierTruncated: { type: "integer", minimum: 1 },
        offersTruncated: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    } },
    unallocatedCount: { type: "integer", minimum: 0 },
    unallocated: { type: "array" },
    unallocatedTruncated: { type: "integer", minimum: 1 },
    frontier: { type: "array", items: { type: "integer", minimum: 0 } },
    frontierTruncated: { type: "integer", minimum: 1 },
    queue: { type: "array" },
    nextCursor: { type: "string", minLength: 1 },
    evidence: { type: "array", items: { type: "string" } },
    sourceRows: { type: "integer", minimum: 0 },
    malformed: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
};

export const agentWorkDispatchOutputContract = schemaFrom(agentWorkDispatchOutputSchema);

/** An app worker is an execution observation of one admitted allocation. */
export const agencyWorkAssignmentInputContract = schemaFrom({
  $id: "metroplat/work/agency-work-assignment-input",
  type: "object", required: ["scope", "allocation", "workerThread", "state", "session"], additionalProperties: false,
  properties: {
    scope: { type: "string", minLength: 1 }, allocation: { type: "string", minLength: 1 },
    workerThread: { type: "string", minLength: 1 }, state: { enum: ["started", "released"] },
    session: { type: "string", minLength: 1 },
    office: { type: "string", minLength: 1 },
  },
});
export const agencyWorkAssignmentAdmissionContract = schemaFrom({
  $id: "metroplat/work/agency-work-assignment-admission",
  type: "object", required: ["scope", "allocation", "workerThread", "state", "status"], additionalProperties: false,
  properties: {
    scope: { type: "string", minLength: 1 }, allocation: { type: "string", minLength: 1 },
    workerThread: { type: "string", minLength: 1 }, state: { enum: ["started", "released"] },
    status: { enum: ["admitted", "already-admitted"] },
  },
});

/** Validates an admitted command binding before an effect can occur. */
export function validateDeterministicExecution(value) {
  if (typeof value?.operation !== "string" || value.operation.length === 0) throw new TypeError("deterministic execution requires an operation");
  admitJavascriptNodeCommandExecutionRequest(value.request);
  const gate = value.acceptance;
  const keys = gate && typeof gate === "object" ? Object.keys(gate).sort().join(",") : "";
  if (gate?.kind === "command-exit-status" && Number.isInteger(gate.status) && keys === "kind,status") return Object.freeze(value);
  if (gate?.kind === "exact-stdout" && typeof gate.stdout === "string" && keys === "kind,stdout") return Object.freeze(value);
  throw new TypeError("deterministic execution requires a supported exact acceptance gate");
}

export function evaluateDeterministicAcceptance(acceptance, receipt) {
  if (acceptance?.kind === "command-exit-status" && Number.isInteger(acceptance.status)) {
    return receipt?.result?.status === acceptance.status
      ? Object.freeze({ accepted: true })
      : Object.freeze({ accepted: false, reason: "command-exit-status-mismatch" });
  }
  if (acceptance?.kind === "exact-stdout" && typeof acceptance.stdout === "string") {
    return receipt?.result?.status === 0 && receipt?.result?.stdout === acceptance.stdout
      ? Object.freeze({ accepted: true })
      : Object.freeze({ accepted: false, reason: "exact-stdout-mismatch" });
  }
  return Object.freeze({ accepted: false, reason: "unsupported-acceptance-gate" });
}

/** How much of an untyped result its error quotes, so the order's completer reads what was made. */
const RETURNED_EXCERPT = 280;

/**
 * The order an item makes, by content address: the `order` it carries (a work-arena request's
 * operative order), else the address of what it states, its text and codomain. One digest of an
 * order for the whole house: an inference lot serving no work item is read as { text, returns }.
 */
export const orderOfItem = (item) => item.order ?? semanticId({ text: item.text, ...(item.returns === undefined ? {} : { returns: item.returns }) });

/**
 * Admit an item's result codomain (`returns`): an anonymous JSON Schema document, checked here so a
 * malformed one refuses the intent rather than every result. An `$id` would register the codomain
 * house-wide, where two intents could collide; a codomain names a declared schema by `$ref`.
 */
export function validateResultCodomain(value) {
  if (!isJsonRecord(value)) throw new TypeError("result codomain must be a JSON Schema object");
  if (Object.hasOwn(value, "$id")) throw new TypeError("result codomain is anonymous: $ref a declared schema instead of naming one with $id");
  const admitted = validateJsonSchemaDocument(value);
  if (!admitted.valid) throw new TypeError(`result codomain is not a JSON Schema: ${admitted.issues.slice(0, 3).map((issue) => `${issue.path || "/"} ${issue.message}`).join("; ")}`);
  return Object.freeze(value);
}

/** A native assay persists its declared schema inside an SCA-canonical result.
 * JSON Schema interprets literal text, not NFC equivalence. Refuse a schema
 * that this transport would rewrite rather than silently change its contract.
 * This conservative whole-schema limit includes annotation text; it does not
 * attempt to decide which normalization changes preserve schema semantics.
 */
function admitNativeResultCodomain(value) {
  const snapshot = canonicalizeJson(value, JSON_RESOURCE_ENVELOPE).value;
  if (canonicalJson(snapshot) !== canonicalJson(canonicalCarrier(snapshot))) {
    throw new TypeError("native result codomain is not stable through the work result SCA transport");
  }
  validateResultCodomain(snapshot);
  return snapshot;
}

/**
 * A work result typed by the codomain its item declares (`returns`). A skill result whose value,
 * an already `returned` value, or a JSON value its textual output carries (`jsonValuesOfText`)
 * satisfies the codomain keeps its carriage and names that value `returned`; a value that is
 * itself the typed product is `{returned}`. A skill result carrying no such value is no product of
 * the order: it is its producer's error, naming what the codomain refused and quoting what was
 * returned. A skill error, or an item declaring no codomain, is the result as it was.
 */
export function typedResultOf(returns, result) {
  result = admitAgencyWorkResult(result);
  if (returns === undefined || result.kind !== "skill-result") return result;
  const native = result.skillOutcome;
  const declaredCodomain = admitNativeResultCodomain(returns);
  validateResultCodomain(declaredCodomain);
  const projected = typedValueResultOf(declaredCodomain, native.output);
  return admitAgencyWorkResult({ ...projected, skillOutcome: native,
    codomainAssay: { source: semanticId(native), returns: declaredCodomain } });
}

/** The existing declared-codomain projection, independently replayable from its native source. */
function typedValueResultOf(returns, value) {
  const codomain = schemaFrom(returns);
  const text = typeof value === "string" ? value : typeof value?.output === "string" ? value.output : undefined;
  const carried = text === undefined ? [] : jsonValuesOfText(text);
  const candidates = [...(isJsonRecord(value) && Object.hasOwn(value, "returned") ? [value.returned] : []), value, ...carried]
    .filter((candidate) => candidate !== undefined);
  const returned = candidates.find((candidate) => codomain.validate(candidate));
  if (returned === value) return Object.freeze({ kind: "skill-result", value: Object.freeze({ returned }) });
  if (returned !== undefined) return Object.freeze({ kind: "skill-result", value: Object.freeze({ ...(isJsonRecord(value) ? value : { output: value }), returned }) });
  const nearest = carried[0] ?? (text === undefined ? value : undefined);
  const refused = nearest === undefined ? [text === undefined ? "no value" : "its text carries no JSON value"] : codomain.errors(nearest).slice(0, 3);
  const quoted = text ?? (value === undefined ? "" : JSON.stringify(value));
  return Object.freeze({
    kind: "skill-error",
    error: `the result is not of the codomain its order declares (${refused.join("; ")})`
      + (quoted === "" ? "" : `; it returned: ${quoted.length > RETURNED_EXCERPT ? `${quoted.slice(0, RETURNED_EXCERPT)}…` : quoted}`),
  });
}

/**
 * capability/captp/schema - JSON Schema declarations for CapTP protocol
 * material.
 */
const jsonValueSchema = {};

export const captpSturdyRefSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/sturdy-ref",
  title: "CapTpSturdyRef",
  description: "A CapTP/OCapN sturdy reference: an unforgeable remote object-capability reference naming the playable locus and holder.",
  type: "object",
  required: ["kind", "id", "locus", "holder"],
  properties: {
    kind: { const: "captp.sturdy-ref" },
    id: { type: "string", minLength: 1 },
    locus: { type: "string", minLength: 1 },
    holder: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const captpDeliverySchema = {
  $id: "metroplat/codecs/text/json/capability/captp/delivery",
  title: "CapTpDelivery",
  description: "A CapTP delivery: method and arguments sent to a sturdy reference or unresolved promise, yielding an answer promise.",
  type: "object",
  required: ["kind", "target", "method", "args", "answer"],
  properties: {
    kind: { const: "captp.delivery" },
    target: { type: "string", minLength: 1 },
    method: { type: "string", minLength: 1 },
    args: { type: "array", items: jsonValueSchema },
    answer: { type: "string", minLength: 1 },
    pipelinedOn: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const captpPipelineJudgmentSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/pipeline-judgment",
  title: "CapTpPipelineJudgment",
  description: "Witness or obstruction for CapTP promise pipelining compared with the sequential post-resolution cut.",
  type: "object",
  required: ["kind", "prior", "follow", "sequential", "ok", "reasons", "savedRoundTrips"],
  properties: {
    kind: { enum: ["captp.pipeline:witness", "captp.pipeline-obstruction"] },
    prior: captpDeliverySchema,
    follow: captpDeliverySchema,
    sequential: captpDeliverySchema,
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
    savedRoundTrips: { type: "number" },
  },
  additionalProperties: false,
};

export const captpBlockedDeliverySchema = {
  type: "object",
  required: ["delivery", "reason"],
  properties: {
    delivery: captpDeliverySchema,
    reason: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const captpCompressionSchema = {
  type: "object",
  required: ["sequentialRoundTrips", "pipelinedRoundTrips", "savedRoundTrips"],
  properties: {
    sequentialRoundTrips: { type: "number" },
    pipelinedRoundTrips: { type: "number" },
    savedRoundTrips: { type: "number" },
  },
  additionalProperties: false,
};

export const captpAuthorityGraphSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/authority-graph",
  title: "CapTpAuthorityGraph",
  description: "A CapTP authority graph recovered from older animating: held sturdy references, admitted deliveries, reachable promises, blocked deliveries, one-turn promise-pipeline compression, and whether the causal graph properly polarizes.",
  type: "object",
  required: ["kind", "refs", "deliveries", "reachablePromises", "blocked", "compression", "polarized"],
  properties: {
    kind: { const: "captp.authority-graph" },
    refs: { type: "array", items: captpSturdyRefSchema },
    deliveries: { type: "array", items: captpDeliverySchema },
    reachablePromises: { type: "array", items: { type: "string", minLength: 1 } },
    blocked: { type: "array", items: captpBlockedDeliverySchema },
    compression: captpCompressionSchema,
    polarized: { type: "boolean" },
  },
  additionalProperties: false,
};

export const captpTurnEventSchema = {
  type: "object",
  required: ["delivery", "turn", "sequentialTurn", "savedTurns", "status"],
  properties: {
    delivery: captpDeliverySchema,
    turn: { type: "number" },
    sequentialTurn: { type: "number" },
    savedTurns: { type: "number" },
    status: { enum: ["admitted", "composed", "blocked"] },
    reason: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const captpTurnTraceSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/turn-trace",
  title: "CapTpTurnTrace",
  description: "A ba-local CapTP turn trace: deliveries sent in one pipelined turn while preserving the sequential turns they saved.",
  type: "object",
  required: ["kind", "session", "vat", "ba", "events", "compression"],
  properties: {
    kind: { const: "captp.turn-trace" },
    session: { type: "string", minLength: 1 },
    vat: { type: "string", minLength: 1 },
    ba: { type: "string", minLength: 1 },
    events: { type: "array", items: captpTurnEventSchema },
    compression: captpCompressionSchema,
  },
  additionalProperties: false,
};

export const captpVectorClockSchema = {
  type: "object",
  additionalProperties: { type: "number" },
};

export const captpStatementRowSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/witness-row",
  title: "CapTpStatementRow",
  description: "An MetroPlat statement row projected from CapTP protocol material. The $id and kind retain frozen legacy wire names.",
  type: "object",
  required: ["kind", "subject", "predicate", "object", "at"],
  properties: {
    kind: { const: "captp.witness-row" },
    subject: { type: "string", minLength: 1 },
    predicate: { type: "string", minLength: 1 },
    object: jsonValueSchema,
    at: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const captpCausalEventSchema = {
  type: "object",
  required: ["id", "session", "vat", "ba", "turn", "clock", "delivery", "status"],
  properties: {
    id: { type: "string", minLength: 1 },
    session: { type: "string", minLength: 1 },
    vat: { type: "string", minLength: 1 },
    ba: { type: "string", minLength: 1 },
    turn: { type: "number" },
    clock: captpVectorClockSchema,
    delivery: captpDeliverySchema,
    status: { enum: ["admitted", "composed", "blocked"] },
  },
  additionalProperties: false,
};

export const captpCausalFrontierSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/causal-frontier",
  title: "CapTpCausalFrontier",
  description: "A vector-clock frontier reading of one or more CapTP turn traces.",
  type: "object",
  required: ["kind", "session", "events", "frontier"],
  properties: {
    kind: { const: "captp.causal-frontier" },
    session: { type: "string", minLength: 1 },
    events: { type: "array", items: captpCausalEventSchema },
    frontier: captpVectorClockSchema,
  },
  additionalProperties: false,
};

export const captpCausalCutSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/causal-cut",
  title: "CapTpCausalCut",
  description: "A selected CapTP causal cut with violations exposed instead of hidden.",
  type: "object",
  required: ["kind", "session", "status", "clock", "selected", "violations"],
  properties: {
    kind: { const: "captp.causal-cut" },
    session: { type: "string", minLength: 1 },
    status: { enum: ["consistent", "inconsistent"] },
    clock: captpVectorClockSchema,
    selected: { type: "array", items: { type: "string", minLength: 1 } },
    violations: {
      type: "array",
      items: {
        type: "object",
        required: ["event", "dependsOn", "reason"],
        properties: {
          event: { type: "string", minLength: 1 },
          dependsOn: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const captpVatTableSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/vat-table",
  title: "CapTpVatTable",
  description: "A CapTP vat presence table read as imports, exports, and promises with explicit liveness state.",
  type: "object",
  required: ["kind", "session", "presences"],
  properties: {
    kind: { const: "captp.vat-table" },
    session: { type: "string", minLength: 1 },
    presences: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "presenceKind", "status"],
        properties: {
          id: { type: "string", minLength: 1 },
          presenceKind: { enum: ["import", "export", "promise"] },
          status: { enum: ["live", "blocked", "settled", "broken", "dropped"] },
          ref: captpSturdyRefSchema,
          promise: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const captpHandoffTableSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/handoff-table",
  title: "CapTpHandoffTable",
  description: "A CapTP handoff table reading gift offers, deposits, claims, and withdrawals as explicit capability transfer state.",
  type: "object",
  required: ["kind", "session", "gifts"],
  properties: {
    kind: { const: "captp.handoff-table" },
    session: { type: "string", minLength: 1 },
    gifts: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "from", "to", "ref", "status"],
        properties: {
          id: { type: "string", minLength: 1 },
          from: { type: "string", minLength: 1 },
          to: { type: "string", minLength: 1 },
          ref: captpSturdyRefSchema,
          status: { enum: ["offered", "deposited", "claimed", "withdrawn"] },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const captpDescriptorSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/descriptor",
  title: "CapTpDescriptor",
  description: "A CapTP descriptor contract for imports, exports, answers, signatures, and handoff references.",
  type: "object",
  required: ["kind", "descriptorKind", "id"],
  properties: {
    kind: { const: "captp.descriptor" },
    descriptorKind: { enum: ["import-object", "import-promise", "export", "answer", "signature", "handoff-give", "handoff-receive"] },
    id: { type: "string", minLength: 1 },
    session: { type: "string", minLength: 1 },
    position: { type: "number" },
    value: jsonValueSchema,
  },
  additionalProperties: false,
};

export const captpSessionTranscriptSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/session-transcript",
  title: "CapTpSessionTranscript",
  description: "A CapTP session transcript reading operations as a finite protocol ledger with blocked operations visible.",
  type: "object",
  required: ["kind", "session", "status", "operations", "blocked", "counters"],
  properties: {
    kind: { const: "captp.session-transcript" },
    session: { type: "string", minLength: 1 },
    status: { enum: ["live", "aborted"] },
    operations: { type: "array", items: jsonValueSchema },
    blocked: {
      type: "array",
      items: {
        type: "object",
        required: ["operation", "reason"],
        properties: {
          operation: jsonValueSchema,
          reason: { type: "string", minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    counters: captpVectorClockSchema,
  },
  additionalProperties: false,
};

export const captpTransportProjectionSchema = {
  $id: "metroplat/codecs/text/json/capability/captp/transport-projection",
  title: "CapTpTransportProjection",
  description: "A finite reading of the transport substrate beneath a CapTP session: libp2p peers as loci, streams as name-passing sub-arenas, and pubsub as broadcast statement material.",
  type: "object",
  required: ["kind", "transport", "session", "swarm", "roster", "streams", "pubsub", "status", "violations"],
  properties: {
    kind: { const: "captp.transport-projection" },
    transport: { enum: ["libp2p"] },
    session: { type: "string", minLength: 1 },
    swarm: { type: "string", minLength: 1 },
    roster: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1 },
    streams: {
      type: "array",
      items: {
        type: "object",
        required: ["streamId", "protocol", "source", "target", "delivery"],
        properties: {
          streamId: { type: "string", minLength: 1 },
          protocol: { type: "string", minLength: 1 },
          source: { type: "string", minLength: 1 },
          target: { type: "string", minLength: 1 },
          delivery: captpDeliverySchema,
        },
        additionalProperties: false,
      },
    },
    pubsub: {
      type: "array",
      items: {
        type: "object",
        required: ["topic", "messageId", "from"],
        properties: {
          topic: { type: "string", minLength: 1 },
          messageId: { type: "string", minLength: 1 },
          from: { type: "string", minLength: 1 },
          delivery: captpDeliverySchema,
        },
        additionalProperties: false,
      },
    },
    status: { enum: ["admitted", "obstructed"] },
    violations: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

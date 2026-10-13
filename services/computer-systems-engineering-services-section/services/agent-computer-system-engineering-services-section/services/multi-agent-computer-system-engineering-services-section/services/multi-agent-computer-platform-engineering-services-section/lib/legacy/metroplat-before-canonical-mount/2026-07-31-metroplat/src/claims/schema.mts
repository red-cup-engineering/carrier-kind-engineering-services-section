/** Pure boundary contracts for standing-side claim-session readings. */
import { schemaFrom } from "../lib/schema/contract.mts";
import { chargeValueNames } from "../lib/values/index.mts";
import { agentReadinessReportSchema } from "../presentation/readiness.mts";

const charge = { enum: chargeValueNames } as const;
const unknownValueSchema = {} as const;

const closureRegimeSchema = {
  type: "object",
  required: ["kind"],
  properties: {
    kind: {
      enum: [
        "ordinal.closure.regime.finite",
        "ordinal.closure.regime.scott",
        "ordinal.closure.regime.transfinite",
        "ordinal.closure.regime.aperiodic",
      ],
    },
  },
  additionalProperties: false,
} as const;

export const claimSchema = {
  type: "object",
  required: ["cell", "charge"],
    properties: { cell: { type: "string", minLength: 1 }, charge },
  additionalProperties: false,
} as const;

export const claimSessionObservationSchema = {
  $id: "metroplat/executing/claim-session-observation",
  title: "ClaimSessionObservation",
  description: "One accepted claim-session boundary event, carrying the monotone session state and settled judgement at that step.",
  type: "object",
  required: ["sessionId", "transport", "claim", "session", "judgement", "at"],
  properties: {
    sessionId: { type: "string", minLength: 1 },
    transport: { enum: ["claim-session", "websocket-session"] },
    claim: claimSchema,
    session: {
      type: "object",
      required: ["claims", "closed"],
      properties: { claims: { type: "array", items: claimSchema }, closed: { type: "boolean" } },
      additionalProperties: false,
    },
    judgement: unknownValueSchema,
    at: unknownValueSchema,
    boundary: unknownValueSchema,
    caller: unknownValueSchema,
  },
  additionalProperties: false,
} as const;

export const claimSessionObservationContract = schemaFrom(claimSessionObservationSchema);

export const claimSessionObservationBundleSchema = {
  $id: "metroplat/executing/claim-session-observation-bundle",
  title: "ClaimSessionObservationBundle",
  description: "A finite projection of admitted work material into ordinary claim-session observations.",
  type: "object",
  required: ["kind", "source", "observations", "evidence"],
  properties: {
    kind: { const: "metroplat.claim-session.observation-bundle" },
    sessionId: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    observations: { type: "array", items: claimSessionObservationSchema },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const claimSessionObservationBundleContract = schemaFrom(claimSessionObservationBundleSchema);

/** The shared settlement produced by gluing claim-session bundles. */
export const gluedClaimSessionsSchema = {
  $id: "metroplat/executing/glued-claim-sessions",
  title: "GluedClaimSessions",
  description: "The shared settlement of multiple claim-session bundles: the knowledge-order fold over shared cells, plus the federated cover-nerve H¹ certificate — sessions are the cover's sources, and a nonzero class marks a genuine cross-session coordination obstruction.",
  type: "object",
  required: ["kind", "sources", "claims", "judgement", "conflicts", "regime", "growth", "coordination", "adjudication"],
  properties: {
    kind: { const: "metroplat.running.glued-claim-sessions" },
    sources: { type: "array", items: { type: "string", minLength: 1 } },
    claims: { type: "integer", minimum: 0 },
    judgement: unknownValueSchema,
    conflicts: { type: "array", items: { type: "string", minLength: 1 } },
    regime: { enum: ["scott", "transfinite"] },
    growth: {
      type: "object",
      required: ["regime", "coordinationFree"],
      properties: {
        regime: closureRegimeSchema,
        coordinationFree: { type: "boolean" },
      },
      additionalProperties: false,
    },
    coordination: {
      type: "object",
      required: ["kind", "rank", "vanishing", "obstructions"],
      properties: {
        kind: { const: "predication.cohomology.coordinationReadout" },
        rank: { type: "integer", minimum: 0 },
        vanishing: { enum: ["witness", "obstruction"] },
        obstructions: {
          type: "array",
          items: {
            type: "object",
            required: ["cell", "rank"],
            properties: {
              cell: { type: "string", minLength: 1 },
              rank: { type: "integer", minimum: 1 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    adjudication: {
      type: "object",
      required: ["kind", "cells", "omitted", "classification"],
      properties: {
        kind: { const: "relational.contextuality.adjudicationReadout" },
        cells: { type: "array", items: { type: "string", minLength: 1 } },
        omitted: { type: "array", items: { type: "string", minLength: 1 } },
        classification: { enum: ["flat", "noncontextual", "logically-contextual", "strongly-contextual"] },
        resolution: { type: "object" },
        obstruction: {
          type: "object",
          required: ["sources", "context"],
          properties: {
            sources: { type: "array", items: { type: "string", minLength: 1 } },
            context: { type: "array", items: { type: "string", minLength: 1 } },
            localSection: { type: "object" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const gluedClaimSessionsContract = schemaFrom(gluedClaimSessionsSchema);

const claimSessionContinuationItemSchema = {
  type: "object",
  required: ["cell", "charge", "role", "text"],
  properties: {
    cell: { type: "string", minLength: 1 },
    charge,
    role: { enum: ["goal", "obligation", "claim"] },
    text: { type: "string" },
    source: { type: "string" },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

/** A prompt/resource-grade sufficient statistic over a claim session. */
export const claimSessionContinuationSchema = {
  $id: "metroplat/executing/claim-session-continuation",
  title: "ClaimSessionContinuation",
  description: "A prompt/resource-grade sufficient statistic over a finite claim-session observation bundle for continuation and handoff.",
  type: "object",
  required: ["kind", "source", "observations", "goals", "obligations", "claims", "regime", "conflicts", "items", "evidence", "text"],
  properties: {
    kind: { const: "metroplat.claim-session.continuation" },
    sessionId: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    observations: { type: "integer", minimum: 0 },
    goals: { type: "integer", minimum: 0 },
    obligations: { type: "integer", minimum: 0 },
    claims: { type: "integer", minimum: 0 },
    regime: { enum: ["scott", "transfinite"] },
    conflicts: { type: "array", items: { type: "string", minLength: 1 } },
    items: { type: "array", items: claimSessionContinuationItemSchema },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
    text: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const claimSessionContinuationContract = schemaFrom(claimSessionContinuationSchema);

const agentStatusReadinessSchema = {
  type: "object",
  required: ["provided", "ready", "mcp", "lsp", "agentWork", "publication"],
  properties: {
    provided: { type: "boolean" },
    ready: { type: "boolean" },
    mcp: { type: "boolean" },
    lsp: { type: "boolean" },
    agentWork: { type: "boolean" },
    publication: { type: "boolean" },
    tools: { type: "integer", minimum: 0 },
    resources: { type: "integer", minimum: 0 },
    prompts: { type: "integer", minimum: 0 },
    lspDocuments: { type: "integer", minimum: 0 },
    publicationTargets: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
} as const;

export const agentStatusReadRequestSchema = {
  $id: "metroplat/executing/agent-status-settlement-request",
  title: "AgentStatusReadRequest",
  description: "Request material for projecting a compact handoff/status cut from continuation and optional readiness material.",
  type: "object",
  required: ["continuation"],
  properties: {
    kind: { const: "metroplat.agent-status-settlement.request" },
    source: { type: "string", minLength: 1 },
    continuation: claimSessionContinuationSchema,
    readiness: agentReadinessReportSchema,
  },
  additionalProperties: false,
} as const;

export const agentStatusReadoutSchema = {
  $id: "metroplat/executing/agent-status-settlement",
  title: "AgentStatusReadout",
  description: "A compact handoff/status sufficient statistic over claim-session continuation and boundary readiness material.",
  type: "object",
  required: ["kind", "source", "ready", "statusline", "continuation", "readiness", "items", "conflicts", "evidence", "missing", "text"],
  properties: {
    kind: { const: "metroplat.agent-status-settlement" },
    source: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    ready: { type: "boolean" },
    statusline: { type: "string", minLength: 1 },
    continuation: {
      type: "object",
      required: ["source", "observations", "goals", "obligations", "claims", "regime"],
      properties: {
        source: { type: "string", minLength: 1 },
        observations: { type: "integer", minimum: 0 },
        goals: { type: "integer", minimum: 0 },
        obligations: { type: "integer", minimum: 0 },
        claims: { type: "integer", minimum: 0 },
        regime: { enum: ["scott", "transfinite"] },
      },
      additionalProperties: false,
    },
    readiness: agentStatusReadinessSchema,
    items: { type: "array", items: claimSessionContinuationItemSchema },
    conflicts: { type: "array", items: { type: "string", minLength: 1 } },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
    text: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const agentStatusReadRequestContract = schemaFrom(agentStatusReadRequestSchema);
export const agentStatusReadoutContract = schemaFrom(agentStatusReadoutSchema);

const parityReconciliationContextSchema = {
  type: "object",
  required: ["id", "left", "right", "target"],
  properties: {
    id: { type: "string", minLength: 1 },
    left: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
    target: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

/** The exact finite domain accepted by the parity reconciliation quoter. */
export const parityReconciliationRequestContract = schemaFrom({
  $id: "metroplat/executing/parity-reconciliation-request",
  title: "ParityReconciliationRequest",
  description: "A finite Boolean parity model with pair contexts. This boundary does not implicitly translate arbitrary FOUR-valued claim covers.",
  type: "object",
  required: ["kind", "measurements", "contexts"],
  properties: {
    kind: { const: "relational.quantum.parity-reconciliation-request" },
    measurements: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    contexts: { type: "array", minItems: 1, items: parityReconciliationContextSchema },
    menuOffset: { type: "integer", minimum: 0 },
    menuLimit: { type: "integer", minimum: 1, maximum: 64 },
  },
  additionalProperties: false,
} as const);

const gaugeMoveSchema = {
  type: "object",
  required: ["flippedMeasurements", "reference"],
  properties: {
    flippedMeasurements: { type: "array", items: { type: "string" } },
    reference: { type: "object", additionalProperties: { type: "boolean" } },
  },
  additionalProperties: false,
} as const;

const reconciliationSettlementSchema = {
  type: "object",
  required: ["kind", "gaugeMove", "representative", "frustratedContexts", "idempotentSettlement", "losslessSettlement"],
  properties: {
    kind: { const: "relational.quantum.parity-reconciliation-offer" },
    rank: { type: "integer", minimum: 1 },
    gaugeMove: gaugeMoveSchema,
    representative: { type: "object", additionalProperties: { type: "boolean" } },
    frustratedContexts: { type: "array", items: { type: "string" } },
    idempotentSettlement: {
      type: "object",
      required: ["price", "payingMeasurements", "freeMeasurements"],
      properties: {
        price: { type: "integer", minimum: 0 },
        payingMeasurements: { type: "array", items: { type: "string" } },
        freeMeasurements: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    losslessSettlement: {
      type: "object",
      required: ["energy", "accountedIncidences"],
      properties: {
        energy: { type: "integer", minimum: 0 },
        accountedIncidences: {
          type: "array",
          items: {
            type: "object",
            required: ["context", "measurement"],
            properties: { context: { type: "string" }, measurement: { type: "string" } },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const reconciliationOfferSchema = {
  ...reconciliationSettlementSchema,
  required: ["kind", "rank", "gaugeMove", "representative", "frustratedContexts", "idempotentSettlement", "losslessSettlement"],
} as const;

const reconciliationProofBasisSchema = {
  type: "array",
  items: { type: "string", minLength: 1 },
  minItems: 4,
} as const;

const parityReconciliationWitnessSchema = {
  type: "object",
  required: ["kind", "scope", "measurements", "contexts", "topology", "coset", "minima", "menu", "menuPage", "proofBasis"],
  properties: {
    kind: { const: "relational.quantum.parity-reconciliation-quote:witness" },
    scope: { const: "finite-boolean-pair-context" },
    measurements: { type: "array", items: { type: "string" } },
    contexts: { type: "array", items: parityReconciliationContextSchema },
    topology: {
      type: "object",
      required: ["vertices", "edges", "components", "h1Rank"],
      properties: {
        vertices: { type: "integer", minimum: 1 },
        edges: { type: "integer", minimum: 1 },
        components: { type: "integer", minimum: 1 },
        h1Rank: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    coset: {
      type: "object",
      required: ["target", "coboundaryBasis", "dimension", "cardinality", "evaluatedRepresentatives", "components"],
      properties: {
        target: { type: "object", additionalProperties: { type: "boolean" } },
        coboundaryBasis: {
          type: "array",
          items: {
            type: "object",
            required: ["measurement", "toggles"],
            properties: {
              measurement: { type: "string" },
              toggles: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
        },
        dimension: { type: "integer", minimum: 0 },
        cardinality: { type: "string", pattern: "^[1-9][0-9]*$" },
        evaluatedRepresentatives: { type: "integer", minimum: 1 },
        components: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["measurements", "contexts", "dimension", "cardinality", "evaluatedRepresentatives"],
            properties: {
              measurements: { type: "array", minItems: 1, items: { type: "string" } },
              contexts: { type: "array", items: { type: "string" } },
              dimension: { type: "integer", minimum: 0 },
              cardinality: { type: "string", pattern: "^[1-9][0-9]*$" },
              evaluatedRepresentatives: { type: "integer", minimum: 1 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    minima: {
      type: "object",
      required: ["idempotentPrice", "groundStateEnergy", "erasedMultiplicity", "cheapestIdempotent", "cheapestLossless"],
      properties: {
        idempotentPrice: { type: "integer", minimum: 0 },
        groundStateEnergy: { type: "integer", minimum: 0 },
        erasedMultiplicity: { type: "integer", minimum: 0 },
        cheapestIdempotent: reconciliationSettlementSchema,
        cheapestLossless: reconciliationSettlementSchema,
      },
      additionalProperties: false,
    },
    menu: { type: "array", items: reconciliationOfferSchema },
    menuPage: {
      type: "object",
      required: ["offset", "limit", "returned", "total"],
      properties: {
        offset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1, maximum: 64 },
        returned: { type: "integer", minimum: 0, maximum: 64 },
        total: { type: "string", pattern: "^[1-9][0-9]*$" },
        nextOffset: { type: "integer", minimum: 1 },
      },
      additionalProperties: false,
    },
    proofBasis: reconciliationProofBasisSchema,
  },
  additionalProperties: false,
} as const;

const parityReconciliationObstructionSchema = {
  type: "object",
  required: ["kind", "scope", "obstructions", "proofBasis"],
  properties: {
    kind: { const: "relational.quantum.parity-reconciliation-quote:obstruction" },
    scope: { const: "finite-boolean-pair-context" },
    obstructions: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
    proofBasis: reconciliationProofBasisSchema,
  },
  additionalProperties: false,
} as const;

export const parityReconciliationReadoutContract = schemaFrom({
  $id: "metroplat/executing/parity-reconciliation-readout",
  title: "ParityReconciliationReadout",
  description: "A content-addressed witness-or-obstruction quotation over a finite Boolean parity cochain coset.",
  type: "object",
  required: ["kind", "id", "judgment"],
  properties: {
    kind: { const: "metroplat.claim-session.reconciliation-quote" },
    id: { type: "string", minLength: 1 },
    judgment: { oneOf: [parityReconciliationWitnessSchema, parityReconciliationObstructionSchema] },
  },
  additionalProperties: false,
} as const);

const suitSection = {
  type: "object",
  required: ["cell", "kind", "charge", "linked", "text", "evidence"],
  properties: {
    cell: { type: "string" },
    kind: { enum: ["continuation-item", "settlement-excerpt", "feed-row", "content-document"] },
    charge,
    linked: { type: "boolean" },
    magnitude: { type: "number" },
    text: { type: "string" },
    source: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
} as const;

const suitOmission = {
  type: "object",
  required: ["reason", "count", "cells"],
  properties: {
    reason: { enum: ["budget"] },
    count: { type: "integer", minimum: 1 },
    cells: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
} as const;

export const suitContract = schemaFrom({
  $id: "metroplat/executing/suit",
  type: "object",
  required: ["kind", "query", "budget", "tokenEstimate", "sections", "omitted"],
  properties: {
    kind: { const: "metroplat.executing.suit" },
    query: { type: "object", required: ["cell", "text"], properties: { cell: { type: "string" }, text: { type: "string" } }, additionalProperties: false },
    budget: { type: "integer", minimum: 1 },
    tokenEstimate: { type: "integer", minimum: 0 },
    sections: { type: "array", items: suitSection },
    omitted: { type: "array", items: suitOmission },
  },
  additionalProperties: false,
} as const);

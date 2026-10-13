/** Boundary type and contract for readiness derived from an induced program surface. */
import { schemaFrom } from "../lib/schema/contract.mts";

export interface AgentReadinessSurface {
  readonly surface: string;
  readonly ready: boolean;
  readonly count: number;
  readonly contracts: readonly string[];
  readonly evidencePolicies: readonly string[];
  readonly evidence: readonly string[];
  readonly missing: readonly string[];
}

export interface AgentReadinessReport {
  readonly kind: "metroplat.agent-readiness";
  readonly package: string;
  readonly source: "induced-program-surface";
  readonly ready: boolean;
  readonly surfaces: readonly AgentReadinessSurface[];
  readonly mcp: { readonly tools: number; readonly resources: number; readonly prompts: number; readonly ready: boolean };
  readonly lsp: { readonly action: boolean; readonly documentIndexResource: string; readonly documents: number; readonly resources: number; readonly prompts: number; readonly ready: boolean };
  readonly agentWork: { readonly holographicRead: boolean; readonly holographicWrite: boolean; readonly agentStatusCutPrompt: boolean; readonly ready: boolean };
  readonly rmn: { readonly portableOperations: number; readonly freeTsOperations: number; readonly debts: number; readonly auditResource: string; readonly debtResource: string; readonly ready: boolean };
  readonly publication: { readonly provided: boolean; readonly packageName?: string; readonly targets: number; readonly missing: readonly string[]; readonly nonExecutableBins: readonly string[]; readonly ready: boolean };
  readonly evidence: readonly string[];
  readonly missing: readonly string[];
}

const agentReadinessSurfaceSchema = {
  type: "object",
  required: ["surface", "ready", "count", "contracts", "evidencePolicies", "evidence", "missing"],
  properties: {
    surface: { type: "string", minLength: 1 }, ready: { type: "boolean" }, count: { type: "integer", minimum: 0 },
    contracts: { type: "array", items: { type: "string", minLength: 1 } },
    evidencePolicies: { type: "array", items: { type: "string", minLength: 1 } },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const agentReadinessReportSchema = {
  $id: "metroplat/executing/agent-readiness",
  title: "AgentReadinessReport",
  description: "A finite readiness observation over the induced program surface: MCP, LSP, agent-work, RMN portability, and package publication faces read from the same descriptor substrate.",
  type: "object",
  required: ["kind", "package", "source", "ready", "surfaces", "mcp", "lsp", "agentWork", "rmn", "publication", "evidence", "missing"],
  properties: {
    kind: { const: "metroplat.agent-readiness" }, package: { type: "string", minLength: 1 }, source: { const: "induced-program-surface" }, ready: { type: "boolean" },
    surfaces: { type: "array", minItems: 1, items: agentReadinessSurfaceSchema },
    mcp: { type: "object", required: ["tools", "resources", "prompts", "ready"], properties: { tools: { type: "integer", minimum: 0 }, resources: { type: "integer", minimum: 0 }, prompts: { type: "integer", minimum: 0 }, ready: { type: "boolean" } }, additionalProperties: false },
    lsp: { type: "object", required: ["action", "documentIndexResource", "documents", "resources", "prompts", "ready"], properties: { action: { type: "boolean" }, documentIndexResource: { type: "string", minLength: 1 }, documents: { type: "integer", minimum: 0 }, resources: { type: "integer", minimum: 0 }, prompts: { type: "integer", minimum: 0 }, ready: { type: "boolean" } }, additionalProperties: false },
    agentWork: { type: "object", required: ["holographicRead", "holographicWrite", "agentStatusCutPrompt", "ready"], properties: { holographicRead: { type: "boolean" }, holographicWrite: { type: "boolean" }, agentStatusCutPrompt: { type: "boolean" }, ready: { type: "boolean" } }, additionalProperties: false },
    rmn: { type: "object", required: ["portableOperations", "freeTsOperations", "debts", "auditResource", "debtResource", "ready"], properties: { portableOperations: { type: "integer", minimum: 0 }, freeTsOperations: { type: "integer", minimum: 0 }, debts: { type: "integer", minimum: 0 }, auditResource: { type: "string", minLength: 1 }, debtResource: { type: "string", minLength: 1 }, ready: { type: "boolean" } }, additionalProperties: false },
    publication: { type: "object", required: ["provided", "targets", "missing", "nonExecutableBins", "ready"], properties: { provided: { type: "boolean" }, packageName: { type: "string", minLength: 1 }, targets: { type: "integer", minimum: 0 }, missing: { type: "array", items: { type: "string", minLength: 1 } }, nonExecutableBins: { type: "array", items: { type: "string", minLength: 1 } }, ready: { type: "boolean" } }, additionalProperties: false },
    evidence: { type: "array", items: { type: "string", minLength: 1 } }, missing: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const agentReadinessReportContract = schemaFrom(agentReadinessReportSchema);

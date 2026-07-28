export interface CapCellSpecification {
  profile: "org.red-cup-engineering.capcell.v1";
  identity: { actor: string; account: string };
  package?: { name: string; version: string };
  capability: {
    operation: string;
    law: string;
    kernel: string;
    inputSchema: string;
    outputSchema: string;
    refusalSchema: string;
  };
  materials?: Array<{
    package: string;
    semanticId: string;
    authority: "none";
  }>;
}

export interface ProviderCellBinding {
  cell: string;
  account: string;
  operation: string;
  law: string;
  offer: string;
  agentCard: string;
  contract: string;
}

export interface CapCellEvidence {
  body?: Record<string, unknown>;
  providers?: Record<string, ProviderCellBinding>;
}

export declare const CAPCELL_PROFILE: "org.red-cup-engineering.capcell.v1";
export declare const REQUIRED_BODY_FACETS: readonly string[];
export declare const REQUIRED_PROVIDER_CAPABILITIES: readonly string[];
export declare class CapCellIndependentConformanceRequiredError extends Error {
  code: "CAPCELL_INDEPENDENT_CONFORMANCE_REQUIRED";
}
export declare function normalizeCapCellSpecification(source: unknown): CapCellSpecification;
export declare function fabricateLocalCapCell(
  source: unknown,
  evidence?: CapCellEvidence,
): unknown;
export declare function assertCapCellComplete(bundle: unknown): unknown;
export declare function writeLocalCapCellBundle(
  source: unknown,
  outputDirectory: string,
  evidence?: CapCellEvidence,
): Promise<unknown>;

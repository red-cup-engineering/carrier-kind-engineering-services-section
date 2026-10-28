export type MarkdownGeneration = "current" | "legacy" | "reference" | "triage";
export interface MarkdownVaultPolicy {
  readonly schemaVersion: 1;
  readonly supplier?: string;
  readonly extensions: readonly string[];
  readonly excludedDirectoryNames: readonly string[];
  readonly vaults: readonly {
    readonly id: string;
    readonly region: string;
    readonly description?: string;
    readonly fallback?: boolean;
  }[];
}
export interface BareCedarFogMarkdownVaultObservation {
  readonly type: "BareCedarFogMarkdownVaultObservation";
  readonly root: string;
  readonly totals: {
    readonly documents: number;
    readonly generations: Readonly<Record<MarkdownGeneration, number>>;
    readonly extensions: Readonly<Record<string, number>>;
  };
  readonly vaults: readonly {
    readonly id: string;
    readonly region: string;
    readonly documents: number;
    readonly generations: Readonly<Record<MarkdownGeneration, number>>;
    readonly samples: readonly string[];
    readonly paths?: readonly string[];
  }[];
  readonly diagnostics: { readonly allDocumentsAssigned: boolean; readonly fallbackDocuments: number };
}
export interface BareCedarFogMarkdownVaultSearchResult {
  readonly type: "BareCedarFogMarkdownVaultSearchResult";
  readonly query: string;
  readonly matches: readonly {
    readonly vaultId: string;
    readonly generation: MarkdownGeneration;
    readonly path: string;
    readonly line: number;
    readonly column: number;
    readonly text: string;
  }[];
  readonly matchedDocuments: number;
  readonly truncated: boolean;
  readonly options: {
    readonly vaultIds: readonly string[];
    readonly generation: "all" | MarkdownGeneration;
    readonly caseSensitive: boolean;
    readonly regularExpression: boolean;
    readonly limit: number;
    readonly narrowedPaths: number | null;
  };
}
export declare function observeBareCedarFogMarkdownVaults(options: {
  readonly root: string;
  readonly policy?: MarkdownVaultPolicy;
  readonly policyPath?: string;
  readonly sampleLimit?: number;
  readonly includePaths?: boolean;
  readonly command?: string;
}): Promise<BareCedarFogMarkdownVaultObservation>;
export declare function searchBareCedarFogMarkdownVaults(options: {
  readonly root: string;
  readonly query: string;
  readonly policy?: MarkdownVaultPolicy;
  readonly policyPath?: string;
  readonly vaultIds?: readonly string[];
  readonly paths?: readonly string[];
  readonly generation?: "all" | MarkdownGeneration;
  readonly caseSensitive?: boolean;
  readonly regularExpression?: boolean;
  readonly limit?: number;
  readonly command?: string;
}): Promise<BareCedarFogMarkdownVaultSearchResult>;

export interface SemanticEdgeVocabulary {
  readonly profile: "org.rsc-quiescent.bare-cedar-fog.semantic-edge-vocabulary.v1";
  readonly maturity?: string;
  readonly concepts: readonly {
    readonly id: string;
    readonly aliases: readonly string[];
    readonly pathTerms: readonly string[];
    readonly sources?: readonly string[];
    readonly relations: readonly { readonly predicate: string; readonly target: string }[];
  }[];
}
export interface BareCedarFogMarkdownLanguageLightcone {
  readonly type: "BareCedarFogMarkdownLanguageLightcone";
  readonly root: string;
  readonly candidates: readonly {
    readonly path: string;
    readonly vaultId: string;
    readonly generation: MarkdownGeneration;
    readonly score: number;
    readonly evidence: { readonly proofPath: readonly unknown[]; readonly carrierReading: boolean };
  }[];
  readonly diagnostics: {
    readonly markdownAddressesObserved: number;
    readonly proofPathCandidates: number;
    readonly carrierCandidates: number;
    readonly availableCandidates: number;
    readonly truncated: boolean;
    readonly persistedNoteIndex: false;
  };
}
export declare const SEMANTIC_EDGE_VOCABULARY_PROFILE: SemanticEdgeVocabulary["profile"];
export declare const DEFAULT_SEMANTIC_EDGE_VOCABULARY_PATH: string;
export declare function normalizeSemanticKeyword(value: string): string;
export declare function admitSemanticEdgeVocabulary(value: unknown): SemanticEdgeVocabulary;
export declare function readSemanticEdgeVocabulary(path?: string): Promise<SemanticEdgeVocabulary>;
export declare function expandSemanticLightcone(options: { readonly vocabulary: SemanticEdgeVocabulary; readonly keywords: readonly string[]; readonly depth?: number }): unknown;
export declare function readProofPath(path: string): unknown;
export declare function projectBareCedarFogMarkdownLanguageLightcone(options: {
  readonly root: string;
  readonly keywords: readonly string[];
  readonly depth?: number;
  readonly limit?: number;
  readonly maximumCarrierReadings?: number;
  readonly includeCarrierReadings?: boolean;
  readonly vocabulary?: SemanticEdgeVocabulary;
  readonly vocabularyPath?: string;
  readonly policy?: MarkdownVaultPolicy;
  readonly command?: string;
}): Promise<BareCedarFogMarkdownLanguageLightcone>;
export interface BareCedarFogMarkdownCarrierHeading {
  readonly title: string;
  readonly level: number;
  readonly line: number;
}
export interface BareCedarFogMarkdownCarrierRead {
  readonly kind: "red-cup-engineering.markdown-vault.read-carrier";
  readonly path: string;
  readonly frontmatterFormat: "yaml" | "toml" | null;
  readonly frontmatter: Readonly<Record<string, unknown>> | null;
  readonly outline: readonly BareCedarFogMarkdownCarrierHeading[];
  readonly section: string | null;
  readonly body: string;
  readonly truncated: boolean;
}
export interface BareCedarFogMarkdownCarrierRefusal {
  readonly kind: "red-cup-engineering.markdown-vault.read-carrier.refusal";
  readonly reason: "not-a-markdown-path" | "outside-repository-root" | "not-found" | "unreadable" | "section-not-found";
  readonly path?: string;
  readonly detail?: string;
  readonly section?: string;
  readonly availableHeadings?: readonly string[];
}
export declare function readBareCedarFogMarkdownCarrier(options: {
  readonly root: string;
  readonly path: string;
  readonly section?: string;
  readonly headingDepth?: number;
  readonly maxCharacters?: number;
}): Promise<BareCedarFogMarkdownCarrierRead | BareCedarFogMarkdownCarrierRefusal>;

export declare function searchBareCedarFogMarkdownLanguageLightcone(options: {
  readonly root: string;
  readonly query: string;
  readonly keywords: readonly string[];
  readonly depth?: number;
  readonly candidateLimit?: number;
  readonly maximumCarrierReadings?: number;
  readonly includeCarrierReadings?: boolean;
  readonly vocabulary?: SemanticEdgeVocabulary;
  readonly vocabularyPath?: string;
  readonly policy?: MarkdownVaultPolicy;
  readonly vaultIds?: readonly string[];
  readonly generation?: "all" | MarkdownGeneration;
  readonly caseSensitive?: boolean;
  readonly regularExpression?: boolean;
  readonly limit?: number;
  readonly command?: string;
}): Promise<{
  readonly type: "BareCedarFogMarkdownLanguageLightconeSearchResult";
  readonly projection: BareCedarFogMarkdownLanguageLightcone;
  readonly search: BareCedarFogMarkdownVaultSearchResult;
  readonly receipt: { readonly persistedNoteIndex: false; readonly candidateDocuments: number; readonly searchedDocuments: number };
}>;

import type { MarkdownVaultPolicy, MarkdownGeneration, BareCedarFogMarkdownVaultSearchResult } from "../../../types/index.d.mts";

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

export interface LanguageLightconeCandidate {
  readonly path: string;
  readonly vaultId: string;
  readonly generation: MarkdownGeneration;
  readonly score: number;
  readonly evidence: {
    readonly proofPath: readonly {
      readonly concept: string;
      readonly distance: number;
      readonly alias: string;
      readonly queryAgreement: boolean;
      readonly ordinal: number;
      readonly segment: string;
      readonly address: string;
    }[];
    readonly literalKeywordPath: readonly {
      readonly keyword: string;
      readonly queryAgreement: true;
      readonly ordinal: number;
      readonly segment: string;
      readonly address: string;
    }[];
    readonly carrierReading: boolean;
  };
}

export interface BareCedarFogMarkdownLanguageLightcone {
  readonly type: "BareCedarFogMarkdownLanguageLightcone";
  readonly root: string;
  readonly candidates: readonly LanguageLightconeCandidate[];
  readonly diagnostics: {
    readonly markdownAddressesObserved: number;
    readonly markdownAddressesSelected: number;
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
export declare function expandSemanticLightcone(options: { vocabulary: SemanticEdgeVocabulary; keywords: readonly string[]; depth?: number }): unknown;
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
  readonly vaultIds?: readonly string[];
  readonly generation?: "all" | MarkdownGeneration;
  readonly command?: string;
}): Promise<BareCedarFogMarkdownLanguageLightcone>;
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

export interface SemanticLinefeedNormalization {
  readonly text: string;
  readonly changed: boolean;
  readonly normalForm: "semantic-linefeeds";
}

export declare function normalizeSemanticLinefeeds(text: string): string;
export declare function semanticLinefeedNormalization(text: string): SemanticLinefeedNormalization;

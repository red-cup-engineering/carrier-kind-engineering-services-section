export interface PredicationCell {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly polarity?: "for" | "against" | "positive" | "negative";
  readonly evidence?: unknown;
}

export interface Diagnostic {
  readonly code?: string;
  readonly path?: string;
  readonly message: string;
  readonly [key: string]: unknown;
}

export interface ResourceGraph {
  readonly resource: string;
  readonly focus: string;
  readonly observedAt: string;
  readonly cells: readonly PredicationCell[];
  readonly diagnostics?: readonly Diagnostic[];
}

export interface ProviderOutcome {
  readonly resources: readonly ResourceGraph[];
  readonly diagnostics?: readonly Diagnostic[];
}

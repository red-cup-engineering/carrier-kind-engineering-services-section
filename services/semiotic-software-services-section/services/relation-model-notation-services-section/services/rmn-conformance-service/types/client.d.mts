export type RmnTerm = readonly unknown[];

export interface ConformanceResult {
  readonly requestNi: string;
  readonly term: string;
  readonly normalFormId: string;
  readonly canonicalBytesBase64: string;
  readonly normalFormBytesBase64: string;
  readonly normalForm: any;
  readonly expectedType: any;
  readonly effectCell?: any;
  readonly operation?: string;
  readonly exchange: any;
}

export function conformTerm(options: { agentUrl: string; term: any; expectedType: any; signal?: AbortSignal; send?: Function }): Promise<ConformanceResult>;
export function conformCanonicalBytes(options: { agentUrl: string; bytes: Uint8Array; expectedType: any; expectedNi?: string; signal?: AbortSignal; send?: Function }): Promise<ConformanceResult>;

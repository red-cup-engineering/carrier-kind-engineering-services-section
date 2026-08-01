export type InferenceWorkLotRequest = Readonly<{
  objective: string;
  context: string;
  desiredUse?: string;
  workType?: "chat" | "classification" | "extraction" | "summarization" | "inquiry" | "software-engineering" | "code-review";
  requiredCapabilities?: readonly string[];
  difficulty: number;
  maxTokens: number;
  outputSchema: Readonly<Record<string, unknown>>;
  excludeProviders?: readonly string[];
  customer?: string;
  workLotId?: string;
  mode?: "dry-run" | "live";
  considerationPolicy?: Readonly<Record<string, unknown>>;
}>;

export type InferenceWorkLotExchange = Readonly<{
  result: Readonly<Record<string, unknown>>;
  resultNi: string;
  provider: Readonly<{ account: string; [key: string]: unknown }>;
  exchange: Readonly<{ inputNi: string; outputNi: string; [key: string]: unknown }>;
}>;

export declare function requestInferenceWorkLot(input: Readonly<{
  agentUrl: string;
  request: InferenceWorkLotRequest;
  signal?: AbortSignal;
  send?: (...args: readonly unknown[]) => Promise<unknown>;
}>): Promise<InferenceWorkLotExchange>;

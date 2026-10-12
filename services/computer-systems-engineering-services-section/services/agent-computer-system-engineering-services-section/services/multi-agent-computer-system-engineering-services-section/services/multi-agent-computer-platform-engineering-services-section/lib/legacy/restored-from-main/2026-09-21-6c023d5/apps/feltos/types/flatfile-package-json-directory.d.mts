import type { ProviderOutcome } from "./flatfile-provider.d.mts";

export interface Provider<Context = Record<string, unknown>> {
  readonly id: string;
  observe(context: Context): ProviderOutcome | Promise<ProviderOutcome>;
}

export function packageJsonDirectoryProvider(options: {
  id: string;
  root: string;
  excludes?: readonly string[];
}): Provider<{ observedAt?: string }>;

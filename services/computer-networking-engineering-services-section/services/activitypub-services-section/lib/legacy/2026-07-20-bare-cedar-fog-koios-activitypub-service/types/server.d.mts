import type { Server } from "node:http";
import type { MessageQueue } from "@fedify/fedify";
import type { Activity } from "@fedify/vocab";
import type { ActivityPubArrival, ActivityPubProvider } from "./provider.d.mts";

export interface ServeActivityPubProviderOptions {
  readonly origin?: string;
  readonly identifier?: string;
  readonly actorName?: string;
  readonly summary?: string;
  readonly keyPath?: string;
  readonly statePath?: string;
  readonly port?: number;
  readonly hostname?: string;
  /** Test-only Fedify private-address lookup allowance. Never enable in production. */
  readonly allowPrivateAddress?: boolean;
  /** Override the durable delivery queue; null is admitted only for bounded tests. */
  readonly queue?: MessageQueue | null;
  readonly onActivity?: (arrival: ActivityPubArrival) => void | Promise<void>;
  readonly listOutbox?: (input: Readonly<{ identifier: string; cursor?: string }>) =>
    Readonly<{ items: readonly Activity[]; nextCursor?: string }> |
    Promise<Readonly<{ items: readonly Activity[]; nextCursor?: string }>>;
}

export function serveActivityPubProvider(options?: ServeActivityPubProviderOptions): Promise<Readonly<{
  provider: ActivityPubProvider;
  server: Server;
  close: () => Promise<void>;
}>>;

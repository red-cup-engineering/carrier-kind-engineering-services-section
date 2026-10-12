import type { Federation, KvStore, MessageQueue } from "@fedify/fedify";
import type { Activity } from "@fedify/vocab";

export const ACTIVITYPUB_MEDIA_TYPE: "application/activity+json";
export const ACTIVITYSTREAMS_CONTEXT: "https://www.w3.org/ns/activitystreams";

export type ImportedActorKeyPair = Readonly<{ publicKey: CryptoKey; privateKey: CryptoKey }>;
export type ActorKeyMaterial = Readonly<{ publicKey: JsonWebKey; privateKey: JsonWebKey }>;

export function importActorKeyPairs(material: readonly ActorKeyMaterial[]): Promise<readonly ImportedActorKeyPair[]>;

export interface ActivityPubArrival {
  readonly recipient: string | null;
  readonly activity: Activity;
  readonly jsonLd: unknown;
}

export interface ActivityPubProviderOptions {
  readonly origin?: string;
  readonly identifier: string;
  readonly actorName: string;
  readonly summary: string;
  readonly keyPairs: readonly ImportedActorKeyPair[];
  readonly kv?: KvStore;
  readonly queue?: MessageQueue;
  readonly allowPrivateAddress?: boolean;
  readonly onActivity: (arrival: ActivityPubArrival) => void | Promise<void>;
  readonly authorizeInbox: (input: Readonly<{ identifier: string; request: Request }>) => boolean | Promise<boolean>;
  /** Optional customer-owned bounded history index. Custody is never scanned as an inbox history source. */
  readonly inboxIndex?: Readonly<{
    list: (input: Readonly<{ identifier: string; cursor?: string; limit: number }>) =>
      Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }> |
      Promise<Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }>>;
  }>;
  readonly listOutbox: (input: Readonly<{ identifier: string; cursor?: string }>) =>
    Readonly<{ items: readonly Activity[]; nextCursor?: string }> |
    Promise<Readonly<{ items: readonly Activity[]; nextCursor?: string }>>;
  /** Durable follower storage, keyed by (identifier, actorId). Configuring it turns on the followers collection and its auto-Accept/Undo handling. */
  readonly followers?: Readonly<{
    add: (input: Readonly<{ identifier: string; actorId: string; inboxId: string; sharedInboxId: string | null }>) => void | Promise<void>;
    remove: (input: Readonly<{ identifier: string; actorId: string }>) => void | Promise<void>;
    count: (input: Readonly<{ identifier: string }>) => number | Promise<number>;
    list: (input: Readonly<{ identifier: string; cursor?: string; limit: number }>) =>
      Readonly<{ items: readonly Readonly<{ actorId: string; inboxId: string; sharedInboxId: string | null }>[]; nextCursor?: string }> |
      Promise<Readonly<{ items: readonly Readonly<{ actorId: string; inboxId: string; sharedInboxId: string | null }>[]; nextCursor?: string }>>;
  }>;
  /** Persists one already-authored Create to the customer's durable outbox. Required to enable `publish()`/`POST /actors/{identifier}/outbox`. Must keep `listOutbox` current -- they are read from the same store. */
  readonly appendToOutbox?: (activityJsonLd: unknown) => Readonly<{ appended: boolean }> | Promise<Readonly<{ appended: boolean }>>;
  readonly localPosts?: number;
  readonly localComments?: number;
}

export interface ActivityPubPublishReceipt {
  readonly id: string | null;
  readonly appended: boolean;
  readonly broadcast: boolean;
  readonly broadcastError?: string;
}

export interface ActivityPubProvider {
  readonly origin?: string;
  readonly identifier: string;
  /** Optional protocol routes actually registered by this provider instance. */
  readonly routeCapabilities: Readonly<{ followers: boolean }>;
  readonly federation: Federation<void>;
  readonly fetch: (request: Request) => Promise<Response>;
  /** Present only when `appendToOutbox` was supplied: appends `activityInput` (a Create) to the outbox and, when a `followers` adapter is configured, broadcasts it to every recorded follower's inbox. The live `POST /actors/{identifier}/outbox` route calls this exact function. */
  readonly publish?: (activityInput: unknown) => Promise<ActivityPubPublishReceipt>;
}

export function createActivityPubProvider(options: ActivityPubProviderOptions): ActivityPubProvider;
export function deliverActivity(provider: ActivityPubProvider, input: Readonly<{
  activity: unknown;
  recipient: string;
  inbox: string;
}>): Promise<Readonly<{
  type: "Accept";
  actor: string;
  object: Readonly<{ type: "ActivityPubDeliveryReceipt"; activity: string | null; recipient: string; inbox: string; delivered: true }>;
}>>;

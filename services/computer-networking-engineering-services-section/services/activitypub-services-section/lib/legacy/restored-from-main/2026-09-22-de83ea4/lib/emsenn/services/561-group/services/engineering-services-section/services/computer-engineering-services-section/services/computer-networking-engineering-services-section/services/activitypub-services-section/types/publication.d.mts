import type { ActivityPubProvider, ActivityPubProviderOptions } from "./provider.d.mts";
import type { Activity } from "@fedify/vocab";

export const ACTIVITYSTREAMS_PUBLIC: "https://www.w3.org/ns/activitystreams#Public";

export interface ActivityPubPublication {
  readonly url: string;
  readonly title: string;
  readonly content: string;
  readonly activityId?: string;
  readonly summary?: string;
  readonly published?: string;
  readonly updated?: string;
  readonly tags?: readonly string[];
}

export function projectPublicationActivity(publication: ActivityPubPublication, actor: Readonly<{ origin: string; identifier: string }>): Readonly<Record<string, unknown>>;

export interface PublicationOutbox {
  readonly listOutbox: (input?: Readonly<{ cursor?: string | null }>) => Promise<Readonly<{ items: readonly Activity[] }>>;
}

export function createPublicationOutbox(options: Readonly<{
  origin: string;
  identifier: string;
  listPublications: () => readonly ActivityPubPublication[] | Promise<readonly ActivityPubPublication[]>;
}>): PublicationOutbox;

export interface PublicationInbox {
  readonly onActivity: ActivityPubProviderOptions["onActivity"];
  readonly authorizeInbox?: ActivityPubProviderOptions["authorizeInbox"];
  readonly inboxIndex?: ActivityPubProviderOptions["inboxIndex"];
  readonly followers?: ActivityPubProviderOptions["followers"];
}

export interface PublicationActivityPubProvider extends ActivityPubProvider {
  readonly outbox: PublicationOutbox;
}

export function createPublicationActivityPubProvider(options: Omit<ActivityPubProviderOptions, "onActivity" | "authorizeInbox" | "listOutbox" | "inboxIndex" | "followers" | "appendToOutbox"> & Readonly<{
  listPublications: () => readonly ActivityPubPublication[] | Promise<readonly ActivityPubPublication[]>;
  inbox?: PublicationInbox;
}>): PublicationActivityPubProvider;

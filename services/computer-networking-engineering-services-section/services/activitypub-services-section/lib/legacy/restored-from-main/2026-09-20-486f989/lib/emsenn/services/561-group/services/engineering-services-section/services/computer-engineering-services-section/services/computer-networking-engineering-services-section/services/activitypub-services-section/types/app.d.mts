import type { App } from "@red-cup-engineering/http-server-application-contract-service";
import type { ActivityPubProvider } from "./provider.d.mts";

export type ActivityPubRouteManifestEntry = Readonly<
  | { id: string; route: string; kind: "exact" }
  | { id: string; route: string; kind: "segment"; prefix: string }
>;
export type ActivityPubRouteInput = string | URL | Request;

export type ActivityPubRouteOwner = string | (Pick<ActivityPubProvider, "identifier"> & Partial<Pick<ActivityPubProvider, "routeCapabilities">>);

export function activityPubRouteManifest(providerOrIdentifier: ActivityPubRouteOwner): readonly ActivityPubRouteManifestEntry[];
export function matchesActivityPubRequest(input: ActivityPubRouteInput, providerOrIdentifier: ActivityPubRouteOwner): boolean;
export function activityPubApplication(provider: Pick<ActivityPubProvider, "identifier" | "fetch"> & Partial<Pick<ActivityPubProvider, "routeCapabilities">>): App;

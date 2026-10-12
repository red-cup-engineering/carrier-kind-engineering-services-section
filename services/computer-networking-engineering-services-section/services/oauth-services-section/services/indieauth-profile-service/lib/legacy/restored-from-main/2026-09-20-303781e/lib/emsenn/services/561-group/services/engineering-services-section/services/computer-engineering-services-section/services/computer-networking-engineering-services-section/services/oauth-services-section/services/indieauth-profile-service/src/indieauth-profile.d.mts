export type FetchResponse = Readonly<{
  status: number;
  url?: string;
  headers?: Pick<Headers, "get"> | Readonly<Record<string, string | readonly string[] | undefined>>;
  text(): Promise<string>;
}>;

export type IndieAuthFetch = (url: string, init: RequestInit) => Promise<FetchResponse>;
export type FetchPurpose = "profile discovery" | "IndieAuth server metadata discovery" | "client_id metadata discovery" | "rel=me discovery";
export type AdmitFetch = (url: string, context: Readonly<{ purpose: FetchPurpose }>) => boolean | Promise<boolean>;

export type DiscoveryOptions = Readonly<{
  fetchImpl: IndieAuthFetch;
  admitFetch?: AdmitFetch;
  allowInsecureHttp?: boolean;
  maxProfileBytes?: number;
  maxMetadataBytes?: number;
}>;

export type UrlValidation = Readonly<{
  valid: boolean;
  url: string | null;
  reason: string | null;
  loopback?: boolean;
}>;

export type IndieAuthProfileDiscovery = Readonly<{
  inputProfileUrl: string;
  profileUrl: string;
  metadataEndpoint: string | null;
  issuer: string | null;
  authorizationEndpoint: string;
  tokenEndpoint: string | null;
  metadata: Readonly<Record<string, unknown>> | null;
  source: "indieauth-metadata" | "legacy-rel";
}>;

export type ClientMetadata = Readonly<Record<string, unknown> & {
  client_id: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  redirect_uris?: readonly string[];
}>;

export type IndieAuthClient = Readonly<{
  clientId: string;
  clientName: string | null;
  clientUri: string | null;
  logoUri: string | null;
  redirectUris: readonly string[];
  oauthClient: Readonly<{ client_id: string; redirect_uris: readonly string[] }>;
  metadata: Readonly<Record<string, unknown>> | null;
  source: "client-id-metadata" | "legacy-rel" | "custody";
}>;

export type ClientResolutionOptions = DiscoveryOptions & Readonly<{
  maxClientBytes?: number;
  custody?: Readonly<{ get(clientId: string): ClientMetadata | null | undefined | Promise<ClientMetadata | null | undefined> }>;
}>;

export declare function canonicalizeProfileInput(input: string, options?: Readonly<{ defaultScheme?: "http" | "https" }>): string | null;
export declare function validateProfileUrl(input: string): UrlValidation;
export declare function validateClientId(input: string): UrlValidation;
export declare function discoverIndieAuthProfile(input: string, options: DiscoveryOptions): Promise<IndieAuthProfileDiscovery>;
export declare function resolveIndieAuthClient(input: string, options: ClientResolutionOptions): Promise<IndieAuthClient>;
export declare function validateIndieAuthRedirectUri(client: Pick<IndieAuthClient, "redirectUris">, input: string): string;

export type RelMeDiscovery = Readonly<{ profileUrl: string; links: readonly string[] }>;
export declare function discoverRelMe(input: string, options: DiscoveryOptions): Promise<RelMeDiscovery>;
export declare function verifyReciprocalRelMe(left: string, right: string, options: DiscoveryOptions): Promise<Readonly<{
  verified: boolean;
  left: RelMeDiscovery | null;
  right: RelMeDiscovery | null;
  reason: string | null;
}>>;

export declare function validateReturnedProfile(returnedMe: string, originalDiscovery: IndieAuthProfileDiscovery, options: DiscoveryOptions): Promise<Readonly<{
  valid: boolean;
  profileUrl: string | null;
  reason: string | null;
  discovery: IndieAuthProfileDiscovery | null;
}>>;

export declare function indieAuthAuthorizationServerMetadata(options: Readonly<{
  issuer: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  scopes?: readonly string[];
}>): Readonly<Record<string, unknown>>;

export declare function indieAuthProfileLinkHeader(options: Readonly<{
  metadataEndpoint: string;
  relMe?: readonly string[];
}>): string;

export type IndieAuthGrantRecord = Readonly<{
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
  expires_at: number;
  me: string;
  scope: string;
  issuer: string;
}>;

export type IndieAuthAuthorizationDecision = Readonly<{
  approved: boolean;
  scopes?: readonly string[];
  error?: string;
  description?: string;
}>;

export type IndieAuthAppOptions = Readonly<{
  profileUrl: string;
  issuer?: string;
  scopes?: readonly string[];
  paths?: Readonly<{ authorization?: string; token?: string; metadata?: string }>;
  fetchImpl: IndieAuthFetch;
  admitFetch?: AdmitFetch;
  maxClientBytes?: number;
  clientCustody?: Readonly<{ get(clientId: string): ClientMetadata | null | undefined | Promise<ClientMetadata | null | undefined> }>;
  authorization: Readonly<{
    authorize(input: Readonly<{
      profileUrl: string;
      client: IndieAuthClient;
      requestedScopes: readonly string[];
      context: import("@red-cup-engineering/http-server-application-contract-service").Context;
    }>): IndieAuthAuthorizationDecision | Promise<IndieAuthAuthorizationDecision>;
  }>;
  codes: Readonly<{
    issue(record: IndieAuthGrantRecord): string | Promise<string>;
    get(code: string): IndieAuthGrantRecord | null | undefined | Promise<IndieAuthGrantRecord | null | undefined>;
    consume(code: string, expected: IndieAuthGrantRecord): boolean | Promise<boolean>;
  }>;
  tokens: Readonly<{
    put(token: string, record: Readonly<{ client_id: string; me: string; scope: string; expires_at: number }>): void | Promise<void>;
  }>;
}>;

/** Compose current-App metadata, authorization, profile exchange, and token resources. */
export declare function indieAuthApp(options: IndieAuthAppOptions): import("@red-cup-engineering/http-server-application-contract-service").App;

export declare const GOOGLE_ISSUERS: readonly ["https://accounts.google.com", "accounts.google.com"];
export declare const GOOGLE_JWKS_URL: "https://www.googleapis.com/oauth2/v3/certs";
export type GoogleIdentity = { issuer: string; subject: string; email: string; emailVerified: true; claims: Record<string, unknown>; idToken: string };
export declare function createGoogleIdTokenVerifier(options?: { jwksUrl?: string; fetchImpl?: typeof fetch; cooldownDuration?: number }): (idToken: string, googleClientId: string) => Promise<Record<string, unknown>>;
export declare function exchangeGoogleCallback(googleCode: string, config: { googleClientId: string; googleClientSecret: string; publicBaseUrl: string; redirectPath?: string; codeVerifier?: string; expectedNonce?: string; verifyIdToken?: (idToken: string, googleClientId: string) => Promise<Record<string, unknown>>; fetchImpl?: typeof fetch; now?: () => number }): Promise<GoogleIdentity>;

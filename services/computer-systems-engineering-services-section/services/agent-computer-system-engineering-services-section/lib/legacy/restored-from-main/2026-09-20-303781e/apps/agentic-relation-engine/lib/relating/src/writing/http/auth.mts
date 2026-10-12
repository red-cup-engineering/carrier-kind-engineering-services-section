import { quoteHeaderValue } from "./header-value.mjs";
import { bearerChallenge } from "@red-cup-engineering/code-http-bearer-authentication-service";
export { bearerChallenge };

/**
 * Optional parameters for a `WWW-Authenticate: Bearer ...` challenge.
 *
 * The keys mirror the bearer challenge attributes used at HTTP boundaries.
 * They are rendered as quoted header parameters; this helper does not validate
 * token lifetimes, scopes, signatures, or resource ownership.
 */
export type BearerChallengeOptions = Readonly<{
  realm?: string;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
  resourceMetadata?: string;
}>;

function first(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

/**
 * Read a bearer token from an Authorization field value.
 *
 * Repeated field values use the first line, matching the package's HTTP
 * representation rule for singleton fields. A missing field, a non-bearer
 * scheme, or an empty token returns `undefined` instead of throwing.
 */
export function bearerToken(authorization: string | readonly string[] | undefined): string | undefined {
  const raw = first(authorization);
  const match = /^Bearer\s+(.+)$/i.exec(raw ?? "");
  return match?.[1]?.trim() || undefined;
}



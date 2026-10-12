
/**
 * admission/indieauth — reading already-fetched IndieAuth wire documents,
 * and admitting a live request's bearer token, as verdicts.
 *
 * `verifyRelMeBodies` takes already-fetched profile/client HTML — no
 * `fetch` in its signature — and admits a mutual `rel=me` verdict.
 * `authorizeBearerToken` is the one seat every IndieAuth-gated endpoint
 * (Micropub, Microsub, IndieAuth's own `/authorize`) reuses to read an
 * `Authorization` header into a scope-checked claims set or a rejection,
 * rather than each endpoint re-deriving its own bearer/scope check.
 *
 * @packageDocumentation
 */
import { bearerToken } from "../../http/codec/index.mts";
import {
  relMeLinks,
  tokenHasScope,
  verifyIndieAuthToken,
  type IndieAuthTokenClaims,
} from "./codec.mts";

export interface RelMeVerdict {
  readonly verified: boolean;
  readonly me: string;
  readonly clientId: string;
  readonly reason?: string;
}

export interface VerifyRelMeInput {
  readonly me: string;
  readonly clientId: string;
  readonly profileHtml: string;
  readonly profileLinkHeader?: string | null;
  readonly clientHtml: string;
  readonly clientLinkHeader?: string | null;
}

/** Admit a mutual `rel=me` verdict from already-fetched profile/client documents. */
export function verifyRelMeBodies(input: VerifyRelMeInput): RelMeVerdict {
  const profileLinks = relMeLinks(input.profileHtml, input.me, input.profileLinkHeader);
  const clientLinks = relMeLinks(input.clientHtml, input.clientId, input.clientLinkHeader);
  const verified = profileLinks.includes(input.clientId) && clientLinks.includes(input.me);
  return {
    verified,
    me: input.me,
    clientId: input.clientId,
    ...(verified ? {} : { reason: "profile and client_id must link to each other with rel=me" }),
  };
}

export interface BearerAuthorization {
  readonly ok: boolean;
  readonly status: number;
  readonly claims?: IndieAuthTokenClaims;
  readonly reason?: string;
}

/** Read an `Authorization` header into scope-checked IndieAuth claims, or a rejection with its HTTP status. */
export function authorizeBearerToken(
  authorizationHeader: string | readonly string[] | undefined,
  secret: string,
  opts: { readonly requiredScope?: string; readonly now?: number } = {},
): BearerAuthorization {
  const token = bearerToken(authorizationHeader);
  if (token === undefined) return { ok: false, status: 401, reason: "missing bearer token" };
  const verification = verifyIndieAuthToken(token, secret, opts.now === undefined ? {} : { now: opts.now });
  if (!verification.valid) return { ok: false, status: 401, reason: verification.reason ?? "invalid token" };
  if (opts.requiredScope !== undefined && !tokenHasScope(verification.claims, opts.requiredScope)) {
    return { ok: false, status: 403, reason: `token missing required scope: ${opts.requiredScope}` };
  }
  return { ok: true, status: 200, claims: verification.claims! };
}

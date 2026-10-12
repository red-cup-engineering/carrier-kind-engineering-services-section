
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
import { bearerToken } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/bearer-authentication";
import {
  relMeLinks,
  tokenHasScope,
  verifyIndieAuthToken,

} from "./codec.mjs";

/** Admit a mutual `rel=me` verdict from already-fetched profile/client documents. */
export function verifyRelMeBodies(input) {
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

/** Read an `Authorization` header into scope-checked IndieAuth claims, or a rejection with its HTTP
 *  status. `opts.now` (epoch ms) is the instant the caller has already read at the kernel edge. */
export function authorizeBearerToken(
  authorizationHeader,
  secret,
  opts,
) {
  const token = bearerToken(authorizationHeader);
  if (token === undefined) return { ok: false, status: 401, reason: "missing bearer token" };
  const verification = verifyIndieAuthToken(token, secret, { now: opts.now });
  if (!verification.valid) return { ok: false, status: 401, reason: verification.reason ?? "invalid token" };
  if (opts.requiredScope !== undefined && !tokenHasScope(verification.claims, opts.requiredScope)) {
    return { ok: false, status: 403, reason: `token missing required scope: ${opts.requiredScope}` };
  }
  return { ok: true, status: 200, claims: verification.claims };
}

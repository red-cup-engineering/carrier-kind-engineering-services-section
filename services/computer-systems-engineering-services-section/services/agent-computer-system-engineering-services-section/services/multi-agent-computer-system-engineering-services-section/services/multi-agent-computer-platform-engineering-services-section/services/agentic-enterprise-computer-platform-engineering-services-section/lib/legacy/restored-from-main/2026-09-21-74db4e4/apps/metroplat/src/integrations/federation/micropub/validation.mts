
/**
 * admission/micropub — admitting a live request's bearer token against a
 * Micropub action's required scope.
 *
 * Micropub authorization is not a second token system: it is IndieAuth's
 * `authorizeBearerToken` (`admission/indieauth`) plus a lookup of which
 * scopes the requested action accepts (`REQUIRED_SCOPE`, any-of rather than
 * a single required scope, since e.g. `create` accepts either `create` or
 * `post`).
 *
 * @packageDocumentation
 */
import { authorizeBearerToken, type BearerAuthorization } from "../indieauth/validation.mts";
import { tokenHasScope } from "../indieauth/codec.mts";
import { REQUIRED_SCOPE, type MicropubAction } from "./codec.mts";

/** Authorize a bearer token for a Micropub `action`, rejecting a token missing every acceptable scope. */
export function authorizeMicropubAction(
  authorizationHeader: string | readonly string[] | undefined,
  secret: string,
  action: MicropubAction,
  opts: { readonly now?: number } = {},
): BearerAuthorization {
  const authorized = authorizeBearerToken(authorizationHeader, secret, opts.now === undefined ? {} : { now: opts.now });
  if (!authorized.ok) return authorized;
  const acceptable = REQUIRED_SCOPE[action];
  if (!acceptable.some((scope) => tokenHasScope(authorized.claims, scope))) {
    return { ok: false, status: 403, reason: `action "${action}" requires scope ${acceptable.join(" or ")}` };
  }
  return authorized;
}

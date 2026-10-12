
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
import { authorizeBearerToken } from "../indieauth/validation.mjs";
import { tokenHasScope } from "../indieauth/codec.mjs";
import { REQUIRED_SCOPE } from "./codec.mjs";

/** Authorize a bearer token for a Micropub `action`, rejecting a token missing every acceptable
 *  scope. `opts.now` (epoch ms) is the instant the caller has already read at the kernel edge. */
export function authorizeMicropubAction(
  authorizationHeader,
  secret,
  action,
  opts,
) {
  const authorized = authorizeBearerToken(authorizationHeader, secret, { now: opts.now });
  if (!authorized.ok) return authorized;
  const acceptable = REQUIRED_SCOPE[action];
  if (!acceptable.some((scope) => tokenHasScope(authorized.claims, scope))) {
    return { ok: false, status: 403, reason: `action "${action}" requires scope ${acceptable.join(" or ")}` };
  }
  return authorized;
}

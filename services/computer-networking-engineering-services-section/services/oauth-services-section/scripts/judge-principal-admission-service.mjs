// resolveAdmissionPolicy — config -> policy die (email -> boolean).
// judgePrincipalAdmission — identity claims + policy die -> admitted | refused.
//
// resolveAdmissionPolicy is moved verbatim from the ternary chain in the
// OAuthServer constructor in organizing-with-the-web/src/oauth-google/oauth.mts
// that computed `this.admit` — the allowedEmail check the task calls out,
// extracted as its own policy die rather than left inline.
//
// judgePrincipalAdmission is moved from the two admission guards inside
// OAuthServer.completeAuthorization() (`if (!identity.emailVerified) throw ...`
// and `if (!this.admit(identity.email)) throw ...`), reshaped from throwing into
// a pure admitted/refused result — the OAuthError conversion (both refusals map
// to the same "access_denied" code in the original) is left to the caller, since
// throwing is a control-flow choice the composition layer makes, not a fact
// about admission itself.

// parseAllowedEmails / the allowedEmails branch of resolveAdmissionPolicy are
// NEW (not moved): added so a deployment can carry a real, fail-closed
// allowlist in a single env var (comma-separated) or an array, instead of the
// single-address allowedEmail or a hand-written admitEmail predicate.

/**
 * Normalize an allowedEmails config value (array or comma-separated string)
 * into a deduped, lowercased, trimmed list. An absent value yields [].
 *
 * @param {readonly string[] | string | undefined} value
 * @returns {string[]}
 */
export function parseAllowedEmails(value) {
  if (value === undefined) return [];
  const raw = typeof value === "string" ? value.split(",") : value;
  const seen = new Set();
  for (const entry of raw) {
    const normalized = entry.trim().toLowerCase();
    if (normalized === "") continue;
    seen.add(normalized);
  }
  return [...seen];
}

/**
 * @param {{ admitEmail?: (email: string) => boolean, allowedEmail?: string, allowedEmails?: readonly string[] | string }} config
 * @returns {(email: string) => boolean}
 */
export function resolveAdmissionPolicy(config) {
  if (config.admitEmail) return config.admitEmail;

  if (config.allowedEmails !== undefined) {
    // A strict, fail-closed allowlist: an empty list (whether from `[]`, `""`,
    // or a string of nothing but commas/whitespace) admits NOBODY. Unlike the
    // legacy no-config default below, this branch exists specifically so
    // callers can gate private data without accidentally opening it to
    // everyone the moment the allowlist is misconfigured or empty.
    const allowed = new Set(parseAllowedEmails(config.allowedEmails));
    return (email) => allowed.has(email.toLowerCase());
  }

  const allowedEmail = config.allowedEmail;
  if (allowedEmail !== undefined) {
    return (email) => email.toLowerCase() === allowedEmail.toLowerCase();
  }

  // Legacy default: admits everyone. This is intentionally left open — a
  // legacy consumer relies on the no-config case being an open multi-user
  // policy. Callers gating private data MUST pass `allowedEmails` (or
  // `allowedEmail`/`admitEmail`) rather than relying on this default.
  return () => true;
}

/**
 * @param {{ email: string, emailVerified: boolean }} identity
 * @param {(email: string) => boolean} admit
 * @returns {{ admitted: true, email: string } | { admitted: false, reason: string }}
 */
export function judgePrincipalAdmission(identity, admit) {
  if (!identity.emailVerified) return { admitted: false, reason: "email not verified" };
  if (!admit(identity.email)) return { admitted: false, reason: "account not authorized" };
  return { admitted: true, email: identity.email };
}

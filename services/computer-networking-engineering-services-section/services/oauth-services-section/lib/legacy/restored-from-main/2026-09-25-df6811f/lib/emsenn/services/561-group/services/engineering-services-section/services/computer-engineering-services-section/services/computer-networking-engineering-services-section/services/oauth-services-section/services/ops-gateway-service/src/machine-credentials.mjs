import { randomBytes } from "node:crypto";

import { OAuthError } from "@red-cup-engineering/oauth-services-section";

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/**
 * The opaque bearer tokens minted by the client_credentials grant, held
 * separately from OAuthServer's own Google-identity token store (a machine
 * actor carries an `actor` claim, never an email). The gateway's bearer guard
 * validates both stores.
 *
 * @param {{ now?: () => number, ttlMs?: number }} [options]
 */
export function createMachineTokenStore({ now = Date.now, ttlMs = 3_600_000 } = {}) {
  const tokens = new Map();
  return Object.freeze({
    /**
     * @param {string} clientId
     * @param {string} actor
     * @returns {{ token: string, expiresInSeconds: number }}
     */
    issue(clientId, actor) {
      const token = randomToken(32);
      tokens.set(token, { client_id: clientId, actor, expires_at: now() + ttlMs });
      return { token, expiresInSeconds: Math.floor(ttlMs / 1000) };
    },
    /**
     * @param {string} token
     * @returns {{ client_id: string, actor: string } | null}
     */
    validate(token) {
      const record = tokens.get(token);
      if (!record || record.expires_at < now()) return null;
      return { client_id: record.client_id, actor: record.actor };
    },
    /** @param {string} clientId */
    revokeAllForClient(clientId) {
      for (const [token, record] of tokens) if (record.client_id === clientId) tokens.delete(token);
    },
  });
}

/**
 * The client_credentials grant (RFC 6749 §4.4) for a CONFIDENTIAL client
 * authenticated with client_secret_post: verify the secret against the
 * principal registry and, if admitted, mint an opaque bearer token carrying
 * the client's `actor` claim. Refuses unknown clients, revoked clients, and
 * bad secrets identically (`invalid_client`) so neither leaks which failed.
 *
 * @param {{
 *   registry: ReturnType<typeof import("./principal-registry.mjs").createPrincipalRegistry>,
 *   machineTokens: ReturnType<typeof createMachineTokenStore>,
 *   clientId: string,
 *   clientSecret: string,
 * }} params
 * @returns {{ access_token: string, token_type: "Bearer", expires_in: number }}
 * @throws {OAuthError}
 */
export function issueClientCredentialsToken({ registry, machineTokens, clientId, clientSecret }) {
  if (!clientId || !clientSecret) throw new OAuthError("invalid_request", "client_id and client_secret are required");
  const client = registry.findClient(clientId);
  if (!client || client.revoked || !registry.verifyClientSecret(clientId, clientSecret)) {
    throw new OAuthError("invalid_client", "unknown, revoked, or unauthenticated client");
  }
  const { token, expiresInSeconds } = machineTokens.issue(clientId, client.actor);
  return { access_token: token, token_type: "Bearer", expires_in: expiresInSeconds };
}

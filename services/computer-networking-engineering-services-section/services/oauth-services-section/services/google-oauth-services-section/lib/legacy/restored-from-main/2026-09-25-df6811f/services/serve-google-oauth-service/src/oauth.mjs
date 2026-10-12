// OAuthServer — a small OAuth 2.0 authorization server with Google as the
// upstream identity provider and single-allowed-email confinement.
//
// Originally lifted verbatim from sites/research.561.group/src/oauth.ts. It has
// since been exploded into @red-cup-engineering/oauth-services-section: every
// transformation this class used to perform inline now lives in its own atomic
// service, as a pure function (state in, state out). This class is a thin
// composition over those services — it owns the parts that genuinely are
// stateful (the in-memory Maps and their file persistence) and delegates every
// actual transformation to the service that now owns it. The public surface
// (every exported type and every method's name/parameters/return type) is
// unchanged from before the explosion, so nothing that imports OAuthServer or
// oauthApp needs to change.
//
// The transport (the `/oauth/*` routes) lives in ./oauth-app.mjs.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { registerOAuthClient } from "@red-cup-engineering/oauth-services-section/register-oauth-client-service";
import { mintAuthorizationRequest } from "@red-cup-engineering/oauth-services-section/mint-authorization-request-service";
import { relayToGoogleConsent } from "@red-cup-engineering/google-oauth-services-section/relay-to-google-consent-service";
import { exchangeGoogleCallback } from "@red-cup-engineering/google-oauth-services-section/exchange-google-callback-service";
import { judgePrincipalAdmission, resolveAdmissionPolicy } from "@red-cup-engineering/oauth-services-section/judge-principal-admission-service";
import { mintBearerTokenRecord, redeemAuthorizationCode } from "@red-cup-engineering/oauth-services-section/redeem-authorization-code-service";
import { validateBearerToken } from "@red-cup-engineering/oauth-services-section/validate-bearer-token-service";
import { oauthAuthorizationServerMetadata } from "@red-cup-engineering/oauth-services-section/serve-oauth-metadata-service";
export { OAuthError };
// Only completeAuthorization() still needs a raw random token directly (to
// mint this server's own authorization code once Google's identity has been
// judged admitted) — everything else that used to call this inline helper has
// moved into the service that owns that transformation (see
// register-oauth-client-service, mint-authorization-request-service,
// redeem-authorization-code-service).
function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}
export class OAuthServer {
    config;
    clients = new Map();
    pending = new Map();
    codes = new Map();
    tokens = new Map();
    refreshes = new Map();
    clientsFile;
    tokensFile;
    /** Resolved admission predicate over the verified email (see OAuthConfig). */
    admit;
    constructor(config) {
        this.config = config;
        this.clientsFile = path.join(config.stateDir, "clients.json");
        this.tokensFile = path.join(config.stateDir, "tokens.json");
        this.admit = resolveAdmissionPolicy(config);
        void this.loadClients();
        void this.loadTokens();
    }
    async loadClients() {
        try {
            const raw = await fs.readFile(this.clientsFile, "utf-8");
            for (const c of JSON.parse(raw))
                this.clients.set(c.client_id, c);
        }
        catch { }
    }
    saveClients() {
        void fs.mkdir(path.dirname(this.clientsFile), { recursive: true })
            .then(() => fs.writeFile(this.clientsFile, JSON.stringify([...this.clients.values()], null, 2)));
    }
    async loadTokens() {
        try {
            const raw = await fs.readFile(this.tokensFile, "utf-8");
            const now = Date.now();
            const data = JSON.parse(raw);
            for (const [k, v] of data.tokens)
                if (v.expires_at > now)
                    this.tokens.set(k, v);
            for (const [k, v] of data.refreshes)
                if (v.expires_at > now)
                    this.refreshes.set(k, v);
        }
        catch { }
    }
    saveTokens() {
        const data = {
            tokens: [...this.tokens.entries()],
            refreshes: [...this.refreshes.entries()],
        };
        void fs.mkdir(path.dirname(this.tokensFile), { recursive: true })
            .then(() => fs.writeFile(this.tokensFile, JSON.stringify(data)));
    }
    metadata() {
        return oauthAuthorizationServerMetadata(this.config.publicBaseUrl);
    }
    registerClient(body) {
        const record = registerOAuthClient(body);
        const { client_id_issued_at, client_secret_expires_at, ...client } = record;
        this.clients.set(client.client_id, client);
        this.saveClients();
        return record;
    }
    startAuthorization(params) {
        const client = this.clients.get(params.client_id);
        const { state, record } = mintAuthorizationRequest({
            client,
            redirectUri: params.redirect_uri,
            codeChallenge: params.code_challenge,
            codeChallengeMethod: params.code_challenge_method,
            state: params.state,
        });
        this.pending.set(state, record);
        return relayToGoogleConsent({
            state,
            googleClientId: this.config.googleClientId,
            publicBaseUrl: this.config.publicBaseUrl,
        });
    }
    async completeAuthorization(googleState, googleCode) {
        const pending = this.pending.get(googleState);
        if (!pending || pending.expires_at < Date.now()) {
            throw new OAuthError("invalid_request", "invalid or expired state");
        }
        this.pending.delete(googleState);
        const identity = await exchangeGoogleCallback(googleCode, {
            googleClientId: this.config.googleClientId,
            googleClientSecret: this.config.googleClientSecret,
            publicBaseUrl: this.config.publicBaseUrl,
        });
        const judgment = judgePrincipalAdmission(identity, this.admit);
        if (!judgment.admitted)
            throw new OAuthError("access_denied", judgment.reason);
        const email = judgment.email;
        const code = randomToken(24);
        this.codes.set(code, {
            client_id: pending.client_id,
            redirect_uri: pending.redirect_uri,
            code_challenge: pending.code_challenge,
            email,
            issuer: identity.issuer,
            subject: identity.subject,
            expires_at: Date.now() + 300_000,
        });
        const redirect = new URL(pending.redirect_uri);
        redirect.searchParams.set("code", code);
        if (pending.state)
            redirect.searchParams.set("state", pending.state);
        return redirect.toString();
    }
    exchangeCode(params) {
        const record = this.codes.get(params.code);
        const minted = redeemAuthorizationCode({
            record,
            clientId: params.client_id,
            codeVerifier: params.code_verifier,
            redirectUri: params.redirect_uri,
        });
        this.codes.delete(params.code);
        this.tokens.set(minted.accessToken, minted.tokenRecord);
        this.refreshes.set(minted.refreshToken, minted.refreshRecord);
        this.saveTokens();
        return minted.response;
    }
    rotateRefreshToken(params) {
        const record = this.refreshes.get(params.refresh_token);
        if (!record || record.expires_at < Date.now()) {
            throw new OAuthError("invalid_grant", "refresh token invalid or expired");
        }
        if (record.client_id !== params.client_id)
            throw new OAuthError("invalid_grant", "client_id mismatch");
        this.refreshes.delete(params.refresh_token);
        const minted = mintBearerTokenRecord(record.client_id, record);
        this.tokens.set(minted.accessToken, minted.tokenRecord);
        this.refreshes.set(minted.refreshToken, minted.refreshRecord);
        this.saveTokens();
        return minted.response;
    }
    validateToken(token) {
        return validateBearerToken(token, this.tokens);
    }
    revoke(token) {
        this.tokens.delete(token);
        this.refreshes.delete(token);
        this.saveTokens();
    }
}

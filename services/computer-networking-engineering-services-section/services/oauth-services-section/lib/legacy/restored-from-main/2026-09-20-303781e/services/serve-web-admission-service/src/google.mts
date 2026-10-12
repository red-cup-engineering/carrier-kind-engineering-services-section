// Google as an OpenID Connect identity provider, with admission decided here.
//
// Google will authenticate anyone on earth with a Google account, so
// authentication is not admission. The allowlist is the admission policy, it is
// a deployment value, and an unset or empty allowlist admits nobody. Admission
// is re-judged on every request rather than trusted from the cookie, so
// removing an address locks that reader out immediately.

import { OAuthError } from '@red-cup-engineering/oauth-services-section';
import { exchangeGoogleCallback } from '@red-cup-engineering/exchange-google-callback-service';
import { judgePrincipalAdmission, resolveAdmissionPolicy } from '@red-cup-engineering/judge-principal-admission-service';
import { relayToGoogleConsent } from '@red-cup-engineering/relay-to-google-consent-service';
import {
  type Clock,
  clearedCookie,
  createSessionCookie,
  createTransactionCookie,
  publicBaseUrl,
  randomToken,
  readSession,
  readTransaction,
  safeReturnTo,
  sha256Base64Url,
  sha256Hex,
} from './session.mjs';

export const GOOGLE_LOGIN_PATH = '/oauth/login';
export const GOOGLE_CALLBACK_PATH = '/oauth/callback';
export const GOOGLE_LOGOUT_PATH = '/oauth/logout';

/** What a deployment supplies. Secrets arrive as values; nothing here reads an environment. */
export type GoogleAdmissionSettings = Readonly<{
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  /** Comma-separated addresses, as an allowlist secret is typically held. Empty admits nobody. */
  allowedEmails: string;
  publicBaseUrl?: string;
  sessionCookie?: string;
  transactionCookie?: string;
  sessionTtlSeconds?: number;
}>;

export type GoogleIdentityLike = Readonly<{ subject: string; email: string; emailVerified: boolean }>;

export type GoogleCalls = Readonly<{
  exchange(code: string, config: {
    googleClientId: string; googleClientSecret: string; publicBaseUrl: string; redirectPath: string; codeVerifier: string; expectedNonce: string;
  }): Promise<GoogleIdentityLike>;
}>;

export const defaultGoogleCalls: GoogleCalls = Object.freeze({
  exchange: (code, config) => exchangeGoogleCallback(code, config),
});

export type GoogleSession = Readonly<{ provider: 'google'; subject: string; subjectHash: string; email: string; label: string }>;

export type AuthResult =
  | Readonly<{ status: 302; redirect: string; cookies: readonly string[] }>
  | Readonly<{ status: number; error: string; cookies?: readonly string[]; missing?: readonly string[]; malformed?: readonly string[]; reason?: string; email?: string; retryAfter?: number }>;

type Resolved = Readonly<{
  configured: boolean;
  missing: readonly string[];
  admits: boolean;
  admit: (email: string) => boolean;
  sessionCookie: string;
  transactionCookie: string;
  sessionTtlSeconds: number;
  settings: GoogleAdmissionSettings;
}>;

/** Read the settings, refusing rather than guessing: a deployment missing its secrets admits nobody. */
export function resolveGoogleSettings(settings: GoogleAdmissionSettings): Resolved {
  const missing: string[] = [];
  for (const name of ['clientId', 'clientSecret', 'sessionSecret'] as const) {
    if (typeof settings[name] !== 'string' || settings[name].length === 0) missing.push(name);
  }
  const allowed = typeof settings.allowedEmails === 'string' ? settings.allowedEmails : '';
  return Object.freeze({
    configured: missing.length === 0,
    missing: Object.freeze(missing),
    admits: allowed.trim().length > 0,
    admit: resolveAdmissionPolicy({ allowedEmails: allowed }),
    sessionCookie: settings.sessionCookie ?? 'web_session',
    transactionCookie: settings.transactionCookie ?? 'web_oauth',
    sessionTtlSeconds: settings.sessionTtlSeconds ?? 1_209_600,
    settings,
  });
}

/** A stable pseudonym for a provider subject; never the subject itself. */
export function subjectHashOf(subject: string): string {
  return sha256Hex(subject);
}

export function beginGoogleLogin(settings: GoogleAdmissionSettings, url: URL, now: Clock = Date.now): AuthResult {
  const resolved = resolveGoogleSettings(settings);
  if (!resolved.configured) return { status: 503, error: 'login-unconfigured', missing: resolved.missing };
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken(48);
  const returnTo = safeReturnTo(url.searchParams.get('return_to'));
  const redirect = relayToGoogleConsent({
    state,
    nonce,
    googleClientId: settings.clientId,
    publicBaseUrl: publicBaseUrl(settings.publicBaseUrl, url),
    redirectPath: GOOGLE_CALLBACK_PATH,
    scopes: ['openid', 'email', 'profile'],
    codeChallenge: sha256Base64Url(codeVerifier),
    prompt: 'select_account',
  });
  return {
    status: 302,
    redirect,
    cookies: [createTransactionCookie({ name: resolved.transactionCookie, state, nonce, codeVerifier, returnTo, secret: settings.sessionSecret, now })],
  };
}

export async function completeGoogleLogin(
  settings: GoogleAdmissionSettings, request: Request, url: URL, now: Clock = Date.now, calls: GoogleCalls = defaultGoogleCalls,
): Promise<AuthResult> {
  const resolved = resolveGoogleSettings(settings);
  if (!resolved.configured) return { status: 503, error: 'login-unconfigured', missing: resolved.missing };
  // Refuse before contacting Google: with no allowlist there is no one to admit.
  if (!resolved.admits) return { status: 503, error: 'no-allowlist-configured' };

  const transaction = readTransaction(request, resolved.transactionCookie, settings.sessionSecret, now);
  if (transaction === null) return { status: 400, error: 'login-expired' };
  const offeredState = url.searchParams.get('state');
  if (typeof offeredState !== 'string' || offeredState !== transaction.state) return { status: 400, error: 'state-mismatch' };
  const code = url.searchParams.get('code');
  if (typeof code !== 'string' || code.length === 0) return { status: 400, error: url.searchParams.get('error') ?? 'no-authorization-code' };

  let identity: GoogleIdentityLike;
  try {
    identity = await calls.exchange(code, {
      googleClientId: settings.clientId,
      googleClientSecret: settings.clientSecret,
      // Byte-identical to the value sent at login: Google compares the two, and
      // so does the authorization-code binding.
      publicBaseUrl: publicBaseUrl(settings.publicBaseUrl, url),
      redirectPath: GOOGLE_CALLBACK_PATH,
      codeVerifier: transaction.codeVerifier,
      expectedNonce: transaction.nonce,
    });
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'server_error';
    console.warn('Google callback refused', code);
    return { status: 502, error: 'google-exchange-failed' };
  }

  const admission = judgePrincipalAdmission({ email: identity.email, emailVerified: identity.emailVerified }, resolved.admit);
  if (!admission.admitted) return { status: 403, error: 'not-authorized', reason: admission.reason, email: identity.email };
  if (typeof identity.subject !== 'string' || identity.subject.length === 0) return { status: 502, error: 'google-subject-missing' };

  return {
    status: 302,
    redirect: safeReturnTo(transaction.returnTo),
    cookies: [
      createSessionCookie({
        name: resolved.sessionCookie, subject: identity.subject, subjectHash: subjectHashOf(identity.subject), email: identity.email,
        secret: settings.sessionSecret, now, ttlSeconds: resolved.sessionTtlSeconds,
      }),
      clearedCookie(resolved.transactionCookie),
    ],
  };
}

export function googleLogout(settings: GoogleAdmissionSettings): AuthResult {
  const resolved = resolveGoogleSettings(settings);
  return { status: 302, redirect: '/', cookies: [clearedCookie(resolved.sessionCookie), clearedCookie(resolved.transactionCookie)] };
}

/** The identity for one request, or null. Admission is re-judged on every request. */
export function identifyGoogle(settings: GoogleAdmissionSettings, request: Request, now: Clock = Date.now): GoogleSession | null {
  const resolved = resolveGoogleSettings(settings);
  if (!resolved.configured || !resolved.admits) return null;
  const session = readSession(request, resolved.sessionCookie, settings.sessionSecret, now);
  if (session === null) return null;
  const admission = judgePrincipalAdmission({ email: session.email, emailVerified: true }, resolved.admit);
  return admission.admitted
    ? Object.freeze({ provider: 'google', subject: session.subject, subjectHash: session.subjectHash, email: session.email, label: session.email })
    : null;
}

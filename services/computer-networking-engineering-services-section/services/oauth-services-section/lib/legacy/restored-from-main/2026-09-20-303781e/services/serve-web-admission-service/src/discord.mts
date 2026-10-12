// Discord user OAuth with live guild-role admission.
//
// The browser receives only a random opaque session bearer. Discord access and
// refresh tokens stay in the database encrypted with the session secret, and
// every protected request re-observes the reader's current membership record.
// A role snapshot is never durable authorization: leaving the guild, losing the
// role, remaining pending, revoking the grant, or an unavailable Discord fails
// closed rather than falling back to a cached role.

import {
  DiscordUserAuthorizationError,
  discordMemberHasRole,
  discordUserAuthorizationUrl,
  exchangeDiscordAuthorizationCode,
  getCurrentDiscordGuildMember,
  getCurrentDiscordUser,
  refreshDiscordAuthorization,
  revokeDiscordAuthorization,
} from '@red-cup-engineering/discord-rest-transport-service/user-oauth';
import type { AuthResult } from './google.mjs';
import {
  type Clock,
  clearedCookie,
  cookieValue,
  opaqueCookie,
  publicBaseUrl,
  randomToken,
  safeReturnTo,
  sealConfidential,
  sha256Base64Url,
  sha256Hex,
  unsealConfidential,
} from './session.mjs';

export const DISCORD_LOGIN_PATH = '/oauth/discord/login';
export const DISCORD_CALLBACK_PATH = '/oauth/discord/callback';
const TRANSACTION_TTL_SECONDS = 600;
const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const REFRESH_SKEW_SECONDS = 60;
export const SNOWFLAKE = /^\d{17,20}$/u;

/** The D1 database handle contract, as `@red-cup-engineering/cloudflare-d1-service` states it. */
export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null | undefined>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; meta?: Record<string, unknown> }>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number } }>;
};
export type D1Database = { prepare(sql: string): D1Statement };

export type DiscordAdmissionSettings = Readonly<{
  clientId: string;
  clientSecret: string;
  guildId: string;
  roleId: string;
  sessionSecret: string;
  publicBaseUrl?: string;
  sessionCookie?: string;
  transactionCookie?: string;
}>;

export type DiscordAuthorizationLike = Readonly<{ accessToken: string; refreshToken: string; expiresIn: number }>;
export type DiscordMemberLike = Readonly<{ roles: readonly string[]; pending: boolean }>;

export type DiscordCalls = Readonly<{
  exchange(code: string, input: { clientId: string; clientSecret: string; redirectUri: string; codeVerifier: string }): Promise<DiscordAuthorizationLike>;
  refresh(refreshToken: string, input: { clientId: string; clientSecret: string }): Promise<DiscordAuthorizationLike>;
  revoke(token: string, input: { clientId: string; clientSecret: string; tokenTypeHint?: 'access_token' | 'refresh_token' }): Promise<void>;
  currentUser(accessToken: string): Promise<{ id: string; username: string; globalName?: string }>;
  currentMember(accessToken: string, guildId: string): Promise<DiscordMemberLike | null>;
}>;

export const defaultDiscordCalls: DiscordCalls = Object.freeze({
  exchange: (code, input) => exchangeDiscordAuthorizationCode(code, input),
  refresh: (token, input) => refreshDiscordAuthorization(token, input),
  revoke: (token, input) => revokeDiscordAuthorization(token, input),
  currentUser: (accessToken) => getCurrentDiscordUser(accessToken),
  currentMember: (accessToken, guildId) => getCurrentDiscordGuildMember(accessToken, guildId),
});

export type DiscordSession = Readonly<{ provider: 'discord'; subject: string; subjectHash: string; label: string }>;
export type Unavailable = Readonly<{ unavailable: true; retryAfter: number }>;

type Resolved = Readonly<{
  configured: boolean;
  missing: readonly string[];
  malformed: readonly string[];
  sessionCookie: string;
  transactionCookie: string;
}>;

export function resolveDiscordSettings(settings: DiscordAdmissionSettings): Resolved {
  const missing: string[] = [];
  for (const name of ['clientId', 'clientSecret', 'guildId', 'roleId', 'sessionSecret'] as const) {
    if (typeof settings[name] !== 'string' || settings[name].trim().length === 0) missing.push(name);
  }
  const malformed: string[] = [];
  for (const name of ['clientId', 'guildId', 'roleId'] as const) {
    if (!missing.includes(name) && !SNOWFLAKE.test(settings[name])) malformed.push(name);
  }
  return Object.freeze({
    configured: missing.length === 0 && malformed.length === 0,
    missing: Object.freeze(missing),
    malformed: Object.freeze(malformed),
    sessionCookie: settings.sessionCookie ?? 'web_discord_session',
    transactionCookie: settings.transactionCookie ?? 'web_discord_oauth',
  });
}

export function discordSubjectHash(userId: string): string {
  return sha256Hex(`discord:${userId}`);
}

const redirectUri = (settings: DiscordAdmissionSettings, url: URL) => `${publicBaseUrl(settings.publicBaseUrl, url)}${DISCORD_CALLBACK_PATH}`;
const nowSeconds = (now: Clock) => Math.floor(now() / 1000);

type SessionRow = {
  session_hash: string; subject_hash: string; discord_user_id: string; display_name: string;
  authorization_ciphertext: string; authorization_version: number; token_expires_at: number; session_expires_at: number; retry_after: number;
};

type StoredAuthorization = Readonly<{ accessToken: string; refreshToken: string }>;

function storedAuthorization(value: unknown): StoredAuthorization | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { accessToken, refreshToken } = value as Record<string, unknown>;
  return typeof accessToken === 'string' && typeof refreshToken === 'string' ? Object.freeze({ accessToken, refreshToken }) : null;
}

async function findSession(db: D1Database, sessionHash: string): Promise<SessionRow | null> {
  const row = await db.prepare(`
    SELECT session_hash, subject_hash, discord_user_id, display_name,
           authorization_ciphertext, authorization_version, token_expires_at,
           session_expires_at, retry_after
      FROM discord_oauth_sessions
     WHERE session_hash = ?
  `).bind(sessionHash).first<SessionRow>();
  return row ?? null;
}

async function updateAuthorization(db: D1Database, sessionHash: string, ciphertext: string, tokenExpiresAt: number, updatedAt: number, expectedVersion: number): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE discord_oauth_sessions
       SET authorization_ciphertext = ?, token_expires_at = ?, updated_at = ?,
           authorization_version = authorization_version + 1, retry_after = 0
     WHERE session_hash = ? AND authorization_version = ?
  `).bind(ciphertext, tokenExpiresAt, updatedAt, sessionHash, expectedVersion).run();
  return Number(result?.meta?.changes ?? 0) > 0;
}

async function updateRetryAfter(db: D1Database, sessionHash: string, retryAfter: number): Promise<void> {
  await db.prepare('UPDATE discord_oauth_sessions SET retry_after = ? WHERE session_hash = ?').bind(retryAfter, sessionHash).run();
}

async function deleteSession(db: D1Database, sessionHash: string): Promise<void> {
  await db.prepare('DELETE FROM discord_oauth_sessions WHERE session_hash = ?').bind(sessionHash).run();
}

async function revokeQuietly(authorization: StoredAuthorization | null, settings: DiscordAdmissionSettings, calls: DiscordCalls): Promise<void> {
  if (authorization === null) return;
  try {
    await calls.revoke(authorization.refreshToken, { clientId: settings.clientId, clientSecret: settings.clientSecret, tokenTypeHint: 'refresh_token' });
  } catch { /* Refusal and cleanup never become authorization on revocation failure. */ }
}

/** Scheduled bounded retention: revoke and remove expired OAuth sessions. */
export async function purgeExpiredDiscordSessions(
  settings: DiscordAdmissionSettings, db: D1Database | null, now: Clock = Date.now, calls: DiscordCalls = defaultDiscordCalls, limit = 25,
): Promise<{ purged: number }> {
  if (!resolveDiscordSettings(settings).configured || db === null) return { purged: 0 };
  const result = await db.prepare(`
    SELECT session_hash, authorization_ciphertext
      FROM discord_oauth_sessions
     WHERE session_expires_at < ?
     ORDER BY session_expires_at
     LIMIT ?
  `).bind(nowSeconds(now), Math.max(1, Math.min(500, limit))).all<{ session_hash: string; authorization_ciphertext: string }>();
  let purged = 0;
  for (const row of result.results ?? []) {
    await revokeQuietly(storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret)), settings, calls);
    await deleteSession(db, row.session_hash);
    purged += 1;
  }
  return { purged };
}

export function beginDiscordLogin(settings: DiscordAdmissionSettings, url: URL, now: Clock = Date.now): AuthResult {
  const resolved = resolveDiscordSettings(settings);
  if (!resolved.configured) return { status: 503, error: 'discord-login-unconfigured', missing: resolved.missing, malformed: resolved.malformed };
  const state = randomToken();
  const codeVerifier = randomToken(48);
  const returnTo = safeReturnTo(url.searchParams.get('return_to'));
  const issuedAt = nowSeconds(now);
  return {
    status: 302,
    redirect: discordUserAuthorizationUrl({
      clientId: settings.clientId, redirectUri: redirectUri(settings, url), state, codeChallenge: sha256Base64Url(codeVerifier), prompt: 'consent',
    }),
    cookies: [opaqueCookie(
      resolved.transactionCookie,
      sealConfidential({ state, codeVerifier, returnTo, issuedAt, expiresAt: issuedAt + TRANSACTION_TTL_SECONDS }, settings.sessionSecret),
      TRANSACTION_TTL_SECONDS,
    )],
  };
}

function readDiscordTransaction(request: Request, cookie: string, secret: string, now: Clock): Readonly<{ state: string; codeVerifier: string; returnTo: string }> | null {
  const value = unsealConfidential(cookieValue(request, cookie), secret);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.expiresAt !== 'number' || nowSeconds(now) > record.expiresAt) return null;
  if (typeof record.state !== 'string' || typeof record.codeVerifier !== 'string') return null;
  return Object.freeze({ state: record.state, codeVerifier: record.codeVerifier, returnTo: safeReturnTo(record.returnTo) });
}

export async function completeDiscordLogin(
  settings: DiscordAdmissionSettings, db: D1Database | null, request: Request, url: URL, now: Clock = Date.now, calls: DiscordCalls = defaultDiscordCalls,
): Promise<AuthResult> {
  const resolved = resolveDiscordSettings(settings);
  if (!resolved.configured) return { status: 503, error: 'discord-login-unconfigured', missing: resolved.missing, malformed: resolved.malformed };
  if (db === null) return { status: 503, error: 'discord-session-store-unconfigured' };
  const transaction = readDiscordTransaction(request, resolved.transactionCookie, settings.sessionSecret, now);
  if (transaction === null) return { status: 400, error: 'discord-login-expired' };
  if (url.searchParams.get('state') !== transaction.state) return { status: 400, error: 'discord-state-mismatch' };
  const code = url.searchParams.get('code');
  if (typeof code !== 'string' || code.length === 0) return { status: 400, error: url.searchParams.get('error') ?? 'no-discord-authorization-code' };

  let authorization: DiscordAuthorizationLike | null = null;
  let user: { id: string; username: string; globalName?: string };
  let member: DiscordMemberLike | null;
  try {
    authorization = await calls.exchange(code, { clientId: settings.clientId, clientSecret: settings.clientSecret, redirectUri: redirectUri(settings, url), codeVerifier: transaction.codeVerifier });
    [user, member] = await Promise.all([calls.currentUser(authorization.accessToken), calls.currentMember(authorization.accessToken, settings.guildId)]);
  } catch (error) {
    console.warn('Discord callback refused', error instanceof DiscordUserAuthorizationError ? error.code : 'server_error');
    await revokeQuietly(authorization, settings, calls);
    if (error instanceof DiscordUserAuthorizationError && [429, 500, 502, 503, 504].includes(error.status ?? 0)) {
      return { status: 503, error: 'discord-authorization-unavailable', retryAfter: Math.max(1, Math.ceil(error.retryAfter ?? 1)) };
    }
    return { status: 502, error: 'discord-exchange-failed' };
  }

  if (member === null || !discordMemberHasRole(member, settings.roleId)) {
    await revokeQuietly(authorization, settings, calls);
    return { status: 403, error: 'discord-role-required' };
  }

  const issuedAt = nowSeconds(now);
  const sessionToken = randomToken(32);
  const sessionHash = sha256Hex(sessionToken);
  const sessionExpiresAt = issuedAt + SESSION_TTL_SECONDS;
  try {
    await db.prepare(`
      INSERT INTO discord_oauth_sessions (
        session_hash, subject_hash, discord_user_id, display_name,
        authorization_ciphertext, token_expires_at, session_expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionHash, discordSubjectHash(user.id), user.id, user.globalName ?? user.username,
      sealConfidential({ accessToken: authorization.accessToken, refreshToken: authorization.refreshToken }, settings.sessionSecret),
      issuedAt + Math.floor(authorization.expiresIn), sessionExpiresAt, issuedAt, issuedAt,
    ).run();
  } catch (error) {
    console.error('Discord session could not be stored', error instanceof Error ? error.message : 'unknown error');
    await revokeQuietly(authorization, settings, calls);
    return { status: 503, error: 'discord-session-store-unavailable', retryAfter: 1 };
  }
  return {
    status: 302,
    redirect: transaction.returnTo,
    cookies: [opaqueCookie(resolved.sessionCookie, sessionToken, SESSION_TTL_SECONDS), clearedCookie(resolved.transactionCookie)],
  };
}

type Refreshed = StoredAuthorization & Readonly<{ tokenExpiresAt: number; row: SessionRow }>;

async function refreshStoredAuthorization(
  row: SessionRow, settings: DiscordAdmissionSettings, db: D1Database, sessionHash: string, now: Clock, calls: DiscordCalls, current: StoredAuthorization,
): Promise<Refreshed | null> {
  const expectedVersion = Number.isInteger(row.authorization_version) ? row.authorization_version : 0;
  const winnerOrNull = async (): Promise<Refreshed | null> => {
    const winner = await findSession(db, sessionHash);
    if (winner !== null && winner.authorization_version !== expectedVersion) {
      const authorization = storedAuthorization(unsealConfidential(winner.authorization_ciphertext, settings.sessionSecret));
      if (authorization !== null) return { ...authorization, tokenExpiresAt: winner.token_expires_at, row: winner };
    }
    return null;
  };
  let refreshed: DiscordAuthorizationLike;
  try {
    refreshed = await calls.refresh(current.refreshToken, { clientId: settings.clientId, clientSecret: settings.clientSecret });
  } catch (error) {
    // Discord rotates refresh tokens. A concurrent request may already have won
    // this refresh; use its committed authorization instead of deleting the
    // session merely because this request lost the race.
    const winner = await winnerOrNull();
    if (winner !== null) return winner;
    throw error;
  }
  const updatedAt = nowSeconds(now);
  const ciphertext = sealConfidential({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken }, settings.sessionSecret);
  const tokenExpiresAt = updatedAt + Math.floor(refreshed.expiresIn);
  if (!(await updateAuthorization(db, sessionHash, ciphertext, tokenExpiresAt, updatedAt, expectedVersion))) {
    const winner = await winnerOrNull();
    if (winner !== null) return winner;
    throw new Error('Discord authorization refresh lost without a committed winner');
  }
  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiresAt,
    row: { ...row, authorization_ciphertext: ciphertext, authorization_version: expectedVersion + 1, token_expires_at: tokenExpiresAt, retry_after: 0 },
  };
}

export async function identifyDiscord(
  settings: DiscordAdmissionSettings, db: D1Database | null, request: Request, now: Clock = Date.now, calls: DiscordCalls = defaultDiscordCalls,
): Promise<DiscordSession | Unavailable | null> {
  const resolved = resolveDiscordSettings(settings);
  if (!resolved.configured || db === null) return null;
  const sessionToken = cookieValue(request, resolved.sessionCookie);
  if (sessionToken === null) return null;
  const sessionHash = sha256Hex(sessionToken);
  let row = await findSession(db, sessionHash);
  if (row === null) return null;
  const current = nowSeconds(now);
  if (typeof row.session_expires_at !== 'number' || row.session_expires_at < current) {
    await revokeQuietly(storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret)), settings, calls);
    await deleteSession(db, sessionHash);
    return null;
  }
  if (typeof row.retry_after === 'number' && row.retry_after > current) {
    return { unavailable: true, retryAfter: Math.max(1, row.retry_after - current) };
  }
  let sealed = storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret));
  if (sealed === null) {
    await deleteSession(db, sessionHash);
    return null;
  }

  try {
    if (typeof row.token_expires_at !== 'number' || row.token_expires_at <= current + REFRESH_SKEW_SECONDS) {
      const refreshed = await refreshStoredAuthorization(row, settings, db, sessionHash, now, calls, sealed);
      if (refreshed === null) throw new Error('stored Discord authorization is unreadable');
      sealed = refreshed;
      row = refreshed.row;
    }
    let member: DiscordMemberLike | null;
    try {
      member = await calls.currentMember(sealed.accessToken, settings.guildId);
    } catch (error) {
      if (!(error instanceof DiscordUserAuthorizationError) || error.status !== 401) throw error;
      const refreshed = await refreshStoredAuthorization(row, settings, db, sessionHash, now, calls, sealed);
      if (refreshed === null) throw error;
      sealed = refreshed;
      row = refreshed.row;
      member = await calls.currentMember(sealed.accessToken, settings.guildId);
    }
    if (member === null || !discordMemberHasRole(member, settings.roleId)) {
      await revokeQuietly(sealed, settings, calls);
      await deleteSession(db, sessionHash);
      return null;
    }
    if (row.retry_after !== 0) await updateRetryAfter(db, sessionHash, 0);
  } catch (error) {
    // Transient Discord failures deny this request without converting a valid
    // session into a stale authorization snapshot. Token failures are removed.
    if (error instanceof DiscordUserAuthorizationError && error.status === 429) {
      const seconds = Math.max(1, Math.ceil(error.retryAfter ?? 1));
      await updateRetryAfter(db, sessionHash, current + seconds);
      return { unavailable: true, retryAfter: seconds };
    }
    if (error instanceof DiscordUserAuthorizationError && [500, 502, 503, 504].includes(error.status ?? 0)) {
      return { unavailable: true, retryAfter: 1 };
    }
    await deleteSession(db, sessionHash);
    return null;
  }

  return Object.freeze({ provider: 'discord', subject: `discord:${row.discord_user_id}`, subjectHash: row.subject_hash, label: row.display_name });
}

export async function logoutDiscord(
  settings: DiscordAdmissionSettings, db: D1Database | null, request: Request, calls: DiscordCalls = defaultDiscordCalls,
): Promise<AuthResult> {
  const resolved = resolveDiscordSettings(settings);
  const sessionToken = cookieValue(request, resolved.sessionCookie);
  if (resolved.configured && db !== null && sessionToken !== null) {
    const sessionHash = sha256Hex(sessionToken);
    const row = await findSession(db, sessionHash);
    if (row !== null) {
      const sealed = storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret));
      await deleteSession(db, sessionHash);
      await revokeQuietly(sealed, settings, calls);
    }
  }
  return { status: 302, redirect: '/', cookies: [clearedCookie(resolved.sessionCookie), clearedCookie(resolved.transactionCookie)] };
}

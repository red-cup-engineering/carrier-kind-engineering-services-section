// Sessions and in-flight login transactions as cookies.
//
// A session cookie is a signed, unencrypted bearer of facts the server needs
// back on a later request: who the reader is. A transaction cookie names which
// login is in flight. Neither holds anything that would harm the reader if
// read, only things that would harm them if forged, so the house signed-cookie
// value is the right size of tool. A confidential cookie, by contrast, carries
// a secret (a PKCE verifier, a token) and is sealed with AES-GCM.
//
// This lifts the shape two Workers had duplicated (EVE Assist, L-Space) into
// the one owner. It runs on node:crypto; a Workers runtime needs the same
// operations over Web Crypto, which is a port of this module, not a fork of it.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { parseCookieHeader, serializeSetCookie } from '@red-cup-engineering/code-http-cookie-service';
import { signCookieValue, unsignCookieValue } from '@red-cup-engineering/sign-http-cookie-value-service';

export const DEFAULT_SESSION_TTL_SECONDS = 1_209_600; // 14 days, the house precedent.
export const DEFAULT_TRANSACTION_TTL_SECONDS = 600; // A consent round trip, not a session.

export type Clock = () => number;

const COOKIE_ATTRIBUTES = Object.freeze({ httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' });

function required(value: unknown, label: string): asserts value {
  if (value === undefined || value === null || value === '') throw new TypeError(`session: ${label} is required`);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function base64UrlDecode(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

/** Random, URL-safe token bytes. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

/** One Set-Cookie value with the house attributes: HttpOnly, Secure, SameSite=Lax, Path=/. */
export function opaqueCookie(name: string, value: string, ttlSeconds: number): string {
  required(name, 'cookie name');
  required(value, 'cookie value');
  return serializeSetCookie(name, value, { ...COOKIE_ATTRIBUTES, maxAge: Math.floor(ttlSeconds) });
}

/** The Set-Cookie value that clears cookie `name`. */
export function clearedCookie(name: string): string {
  return serializeSetCookie(name, '', { ...COOKIE_ATTRIBUTES, maxAge: 0, expires: new Date(0) });
}

/** The raw value of cookie `name` on the request, or null. */
export function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (header === null || header === '') return null;
  const value = parseCookieHeader(header)[name];
  return typeof value === 'string' ? value : null;
}

type Sealed = Readonly<{ expiresAt: number }> & Record<string, unknown>;

function signedPayload(value: Record<string, unknown>, secret: string, salt: string): string {
  required(secret, 'secret');
  return signCookieValue(base64UrlEncode(new TextEncoder().encode(JSON.stringify(value))), secret, salt);
}

/** Recover a signed value, or null. Never throws on attacker input. */
function unsignedPayload(raw: string | null, secret: string, salt: string, now: Clock): Sealed | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let payload: string | null;
  try { payload = unsignCookieValue(raw, secret, salt); } catch { return null; }
  if (payload === null) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))); } catch { return null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const expiresAt = (parsed as Record<string, unknown>).expiresAt;
  if (typeof expiresAt !== 'number') return null;
  if (Math.floor(now() / 1000) > expiresAt) return null;
  return parsed as Sealed;
}

function encryptionKey(secret: string): Buffer {
  return createHash('sha256').update(`web-admission confidential cookie\0${secret}`).digest();
}

/** Encrypt a secret-bearing value. AES-256-GCM supplies confidentiality and integrity. */
export function sealConfidential(value: unknown, secret: string): string {
  required(secret, 'secret');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${Buffer.concat([ciphertext, tag]).toString('base64url')}`;
}

/** Recover an encrypted value, or null. Never throws on attacker input. */
export function unsealConfidential(raw: unknown, secret: string): unknown {
  if (typeof raw !== 'string' || !raw.startsWith('v1.')) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[1]!, 'base64url');
    const body = Buffer.from(parts[2]!, 'base64url');
    if (body.length < 16) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    decipher.setAuthTag(body.subarray(body.length - 16));
    const plaintext = Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}

export type Session = Readonly<{ subject: string; subjectHash: string; email: string }>;

export type SessionCookieOptions = Readonly<{
  name: string;
  subject: string;
  subjectHash: string;
  email: string;
  secret: string;
  now: Clock;
  ttlSeconds?: number;
}>;

/** A session cookie: who the reader is, signed, with an expiry. */
export function createSessionCookie(options: SessionCookieOptions): string {
  const { name, subject, subjectHash, email, secret, now, ttlSeconds = DEFAULT_SESSION_TTL_SECONDS } = options;
  required(name, 'name'); required(subject, 'subject'); required(subjectHash, 'subjectHash'); required(email, 'email'); required(secret, 'secret');
  if (typeof now !== 'function') throw new TypeError('session: now must be a function');
  const issuedAt = Math.floor(now() / 1000);
  const value = signedPayload({ subject, subjectHash, email, issuedAt, expiresAt: issuedAt + Math.floor(ttlSeconds) }, secret, name);
  return opaqueCookie(name, value, ttlSeconds);
}

/** Recover the session named by cookie `name`, or null. */
export function readSession(request: Request, name: string, secret: string, now: Clock): Session | null {
  const parsed = unsignedPayload(cookieValue(request, name), secret, name, now);
  if (parsed === null) return null;
  const { subject, subjectHash, email } = parsed;
  if (typeof subject !== 'string' || typeof subjectHash !== 'string' || typeof email !== 'string') return null;
  return Object.freeze({ subject, subjectHash, email });
}

export type Transaction = Readonly<{ state: string; nonce: string; codeVerifier: string; returnTo: string }>;

export type TransactionCookieOptions = Readonly<{
  name: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  secret: string;
  now: Clock;
  ttlSeconds?: number;
}>;

/**
 * The in-flight login. State, nonce, and the PKCE verifier live in a sealed
 * cookie rather than server storage: they only ever need to come back to the
 * same browser. The verifier is a secret, so the whole transaction is sealed.
 */
export function createTransactionCookie(options: TransactionCookieOptions): string {
  const { name, state, nonce, codeVerifier, returnTo, secret, now, ttlSeconds = DEFAULT_TRANSACTION_TTL_SECONDS } = options;
  required(name, 'name'); required(state, 'state'); required(nonce, 'nonce'); required(codeVerifier, 'codeVerifier'); required(secret, 'secret');
  const issuedAt = Math.floor(now() / 1000);
  const value = sealConfidential({ state, nonce, codeVerifier, returnTo, issuedAt, expiresAt: issuedAt + Math.floor(ttlSeconds) }, secret);
  return opaqueCookie(name, value, ttlSeconds);
}

export function readTransaction(request: Request, name: string, secret: string, now: Clock): Transaction | null {
  const value = unsealConfidential(cookieValue(request, name), secret);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.expiresAt !== 'number' || Math.floor(now() / 1000) > record.expiresAt) return null;
  if (typeof record.state !== 'string' || typeof record.nonce !== 'string' || typeof record.codeVerifier !== 'string') return null;
  return Object.freeze({
    state: record.state,
    nonce: record.nonce,
    codeVerifier: record.codeVerifier,
    returnTo: safeReturnTo(record.returnTo),
  });
}

/**
 * Where to send the reader after login. Only a same-site absolute path is
 * allowed: `//evil.example` and `https://evil.example` are both valid values
 * for a Location header, and neither is a place this site may send anyone.
 */
export function safeReturnTo(offered: unknown): string {
  if (typeof offered !== 'string' || offered.length === 0) return '/';
  if (!offered.startsWith('/') || offered.startsWith('//') || offered.includes('\\')) return '/';
  return offered;
}

/**
 * The origin an identity provider will be told to redirect back to. Pinned by
 * configuration, because a redirect URI must match its registration byte for
 * byte and a request's own origin is not a reliable source of it behind a
 * proxy; the request origin remains the fallback so local development works.
 */
export function publicBaseUrl(configured: string | undefined, url: URL): string {
  const trimmed = typeof configured === 'string' ? configured.trim() : '';
  return trimmed === '' ? url.origin : trimmed.replace(/\/$/u, '');
}

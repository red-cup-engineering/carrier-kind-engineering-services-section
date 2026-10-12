// The admission application: one HTTP application, mounted in a website's
// runtime, that owns who may read what.
//
// Its middleware is the gate. For every request it identifies the principal
// through whichever providers the deployment configured, witnesses the
// admitted principal on the request trace as claims (the same shape the edge's
// auth writes), and refuses anything outside the anonymous surface with 401
// when nobody is admitted. Its resources are the logins, callbacks, logouts,
// the command login, and the identity the browser asks for. Rendering never
// grants authority: the admitted application is selected here, from a verified
// principal, and reported; a browser cannot choose it.

import type { WebContext, WebMiddleware, WebResource } from '@red-cup-engineering/http-server-application-contract-service';
import { toWebRequest } from '@red-cup-engineering/web-server-services-section/web-bridge';
import { type D1Database, DISCORD_CALLBACK_PATH, DISCORD_LOGIN_PATH, type DiscordAdmissionSettings, type DiscordCalls, type DiscordSession, type Unavailable, beginDiscordLogin, completeDiscordLogin, defaultDiscordCalls, identifyDiscord, logoutDiscord } from './discord.mjs';
import { type BotCalls, type DiscordCommandSettings, acceptDiscordGatewayCommand, acceptDiscordInteraction, createDiscordCommandChallenge, defaultBotCalls, identifyDiscordCommandSession, pollDiscordCommandChallenge } from './discord-command.mjs';
import { type AuthResult, GOOGLE_CALLBACK_PATH, GOOGLE_LOGIN_PATH, GOOGLE_LOGOUT_PATH, type GoogleAdmissionSettings, type GoogleCalls, type GoogleSession, beginGoogleLogin, completeGoogleLogin, defaultGoogleCalls, googleLogout, identifyGoogle } from './google.mjs';
import type { Clock } from './session.mjs';

export const DISCORD_COMMAND_CHALLENGE_PATH = '/api/v1/discord/command-challenge';
export const DISCORD_INTERACTION_PATH = '/api/v1/discord/interactions';
export const DISCORD_GATEWAY_COMMAND_PATH = '/api/v1/discord/gateway-command';
export const IDENTITY_PATH = '/api/v1/me';
export const APPLICATION_PATH = '/api/v1/application';

/** The claims the gate witnesses on the request trace, as `auth.claims.<name>`. */
export const CLAIMS_ATTRIBUTE = 'auth.claims';
export const CLAIM_SUBJECT = `${CLAIMS_ATTRIBUTE}.subject`;
export const CLAIM_PROVIDER = `${CLAIMS_ATTRIBUTE}.provider`;
export const CLAIM_LABEL = `${CLAIMS_ATTRIBUTE}.label`;
export const CLAIM_EMAIL = `${CLAIMS_ATTRIBUTE}.email`;
export const CLAIM_AUTHOR = `${CLAIMS_ATTRIBUTE}.author`;

export type Principal = Readonly<{
  provider: 'google' | 'discord';
  subjectHash: string;
  label: string;
  email?: string;
  /** True for the one verified principal a deployment names as its author. */
  author: boolean;
}>;

export type PublicRoute = (pathname: string, method: string) => boolean;

export type WebAdmissionOptions = Readonly<{
  providers: Readonly<{
    google?: GoogleAdmissionSettings;
    discord?: DiscordAdmissionSettings;
    discordCommand?: DiscordCommandSettings;
  }>;
  /** The database Discord admission keeps its sessions in; absent means no Discord provider admits anyone. */
  database?: D1Database | null;
  /**
   * The anonymous surface: what a request may reach with nobody admitted. The
   * default names the VaultMaze surface. A public route is reachable with GET
   * and HEAD only; anonymous writes are refused everywhere.
   */
  publicRoute?: PublicRoute;
  /** Routes only the author may reach, such as a workbench's write routes. */
  authorRoute?: (pathname: string, method: string) => boolean;
  /** The one address that is this deployment's author. Only a verified Google principal can carry it. */
  authorEmail?: string;
  /** Which composed application a principal is admitted to, reported at /api/v1/application. */
  applications?: Readonly<{ default: string; authority: string }>;
  realm?: string;
  now?: Clock;
  calls?: Readonly<{ google?: GoogleCalls; discord?: DiscordCalls; bot?: BotCalls }>;
}>;

export type WebAdmissionApplication = Readonly<{
  middlewares: readonly WebMiddleware[];
  resources: readonly WebResource[];
  /** The principal for a request, or null; what the gate decides, for callers outside the pipeline. */
  identify(request: Request): Promise<Principal | Unavailable | null>;
  /** The pseudonymous subject an admitted request carries on its trace, or null. */
  subjectOf(context: WebContext): string | null;
  isPublic: PublicRoute;
}>;

const JSON_TYPE = 'application/json; charset=utf-8';

/**
 * The request as a Fetch Request, from either context the house serves: the
 * web context, which carries one, or the native Node context, whose incoming
 * message the shared bridge forms one from. Formed once per context.
 */
type AnyContext = { request?: Request; req?: import('node:http').IncomingMessage; url: URL; signal?: AbortSignal; locals: Record<string, unknown>; trace: { id: string } };
const REQUESTS = new WeakMap<object, Request>();
export function requestOf(context: AnyContext): Request {
  const known = REQUESTS.get(context);
  if (known) return known;
  const formed = context.request instanceof Request
    ? context.request
    : toWebRequest(context.req as import('node:http').IncomingMessage, { url: context.url, ...(context.signal ? { signal: context.signal } : {}) });
  REQUESTS.set(context, formed);
  return formed;
}
const CONTENT_ADDRESS = /^[a-f0-9]{64}$/u;
const BROWSER_MODULE = /^\/js\/[a-z0-9-]+(?:\.[a-z0-9]+)?\.mjs$/u;
const FINGERPRINTED = (name: string, extension: string) => new RegExp(`^/${name}(?:\\.[a-z0-9]+)?\\.${extension}$`, 'u');
const APP_MODULE = FINGERPRINTED('app', 'js');
const APP_STYLES = /^\/(?:vaultmaze|styles)(?:\.[a-z0-9]+)?\.css$/u;
const PUBLIC_ROOM = /^\/vault\/public\/rooms\/([a-f0-9]{64})\.json$/u;

const PUBLIC_EXACT = new Set([
  '/', '/index.html', '/healthz', '/livez', '/readyz', '/robots.txt', '/favicon.ico', '/404.html', '/sitemap.xml',
  '/vault/public/surface.json', '/vault/public/index.json', '/vault/public/feed.xml', '/vault/public/feed.atom', '/vault/public/feed.json',
  GOOGLE_LOGIN_PATH, GOOGLE_CALLBACK_PATH, GOOGLE_LOGOUT_PATH, DISCORD_LOGIN_PATH, DISCORD_CALLBACK_PATH,
]);

/**
 * The default anonymous surface. Exact shell paths, never a prefix, so an
 * authenticated tree cannot leak by spelling; content-addressed public rooms
 * under their own tree; the dereferenceable `/ns/` vocabulary, which is public
 * by doctrine and read-only.
 */
export const defaultPublicRoute: PublicRoute = (pathname, method) => {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (APP_MODULE.test(pathname) || APP_STYLES.test(pathname) || BROWSER_MODULE.test(pathname)) return true;
  const room = PUBLIC_ROOM.exec(pathname);
  if (room !== null && CONTENT_ADDRESS.test(room[1]!)) return true;
  return pathname === '/ns' || pathname.startsWith('/ns/');
};

/**
 * A request path reduced to one spelling, or null when it cannot be one. Dot
 * segments, backslashes, and encoded separators are not spellings of a public
 * route; they are attempts to reach past it.
 */
export function canonicalPath(pathname: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\\') || decoded.includes('\0')) return null;
  const segments = decoded.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  return decoded;
}

function json(status: number, value: unknown, headers: Array<[string, string]> = []): Response {
  return new Response(JSON.stringify(value), { status, headers: [['content-type', JSON_TYPE], ...headers] });
}

function authResponse(result: AuthResult): Response {
  if (result.status === 302 && 'redirect' in result) {
    return new Response(null, { status: 302, headers: [['location', result.redirect], ...(result.cookies ?? []).map((cookie): [string, string] => ['set-cookie', cookie])] });
  }
  const { status, cookies, ...body } = result as Extract<AuthResult, { error: string }>;
  const headers: Array<[string, string]> = [['content-type', JSON_TYPE]];
  if (typeof body.retryAfter === 'number') headers.push(['retry-after', String(body.retryAfter)]);
  // Cookies are credentials. They travel only in Set-Cookie, never in a body.
  for (const cookie of cookies ?? []) headers.push(['set-cookie', cookie]);
  return new Response(JSON.stringify(body), { status, headers });
}

function resource(id: string, match: string, methods: readonly string[], handler: (context: WebContext) => Promise<Response> | Response): WebResource {
  return Object.freeze({ id, match, methods, handler });
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export function createWebAdmissionApplication(options: WebAdmissionOptions): WebAdmissionApplication {
  const { providers, database = null, authorEmail, realm = 'web' } = options;
  const isPublic = options.publicRoute ?? defaultPublicRoute;
  const isAuthorRoute = options.authorRoute ?? (() => false);
  const applications = options.applications ?? { default: 'vaultmaze', authority: 'geode' };
  const now = options.now ?? Date.now;
  const googleCalls = options.calls?.google ?? defaultGoogleCalls;
  const discordCalls = options.calls?.discord ?? defaultDiscordCalls;
  const botCalls = options.calls?.bot ?? defaultBotCalls;
  const normalizedAuthor = typeof authorEmail === 'string' ? authorEmail.trim().toLowerCase() : null;

  const isAuthor = (session: GoogleSession): boolean => normalizedAuthor !== null && session.email.trim().toLowerCase() === normalizedAuthor;

  // The two paths are alternatives, not an identity guess. An allowlisted Google
  // principal enters through Google; a current Discord member holding the exact
  // role enters through Discord. Accounts are never linked by email or name.
  async function identify(request: Request): Promise<Principal | Unavailable | null> {
    if (providers.google) {
      const google = identifyGoogle(providers.google, request, now);
      if (google !== null) return Object.freeze({ provider: 'google', subjectHash: google.subjectHash, label: google.label, email: google.email, author: isAuthor(google) });
    }
    if (providers.discordCommand) {
      const command = await identifyDiscordCommandSession(providers.discordCommand, database, request, now, botCalls);
      if (command !== null && 'unavailable' in command) return command;
      if (command !== null) return Object.freeze({ provider: 'discord', subjectHash: command.subjectHash, label: command.label, author: false });
    }
    if (providers.discord) {
      const discord: DiscordSession | Unavailable | null = await identifyDiscord(providers.discord, database, request, now, discordCalls);
      if (discord !== null && 'unavailable' in discord) return discord;
      if (discord !== null) return Object.freeze({ provider: 'discord', subjectHash: discord.subjectHash, label: discord.label, author: false });
    }
    return null;
  }

  const accessRequired = (): Response => json(401, {
    error: 'access-required',
    ...(providers.google ? { login: GOOGLE_LOGIN_PATH } : {}),
    ...(providers.discord ? { discordLogin: DISCORD_LOGIN_PATH } : {}),
  }, [['www-authenticate', `Bearer realm="${realm}"`]]);

  function principalOf(context: WebContext): Principal | null {
    const stored = context.locals.principal;
    return stored && typeof stored === 'object' ? stored as Principal : null;
  }

  const gate: WebMiddleware = async (context) => {
    const path = canonicalPath(context.url.pathname);
    const request = requestOf(context);
    const method = request.method.toUpperCase();
    const principal = await identify(request);
    if (principal !== null && 'unavailable' in principal) {
      return json(503, { error: 'authorization-temporarily-unavailable' }, [['retry-after', String(principal.retryAfter)]]);
    }
    if (principal === null) {
      if (path !== null && isPublic(path, method)) return undefined;
      return accessRequired();
    }
    if (path === null) return json(404, { error: 'not-found' });
    if (isAuthorRoute(path, method) && !principal.author) return json(403, { error: 'authoring-authority-required' });
    context.locals.principal = principal;
    const t = String(now());
    const claims: Array<[string, string]> = [
      [CLAIM_SUBJECT, principal.subjectHash], [CLAIM_PROVIDER, principal.provider], [CLAIM_LABEL, principal.label],
      ...(principal.email === undefined ? [] : [[CLAIM_EMAIL, principal.email] as [string, string]]),
      [CLAIM_AUTHOR, String(principal.author)],
    ];
    return claims.map(([a, v]) => Object.freeze({ e: context.trace.id, a, v, t }));
  };

  const resources: WebResource[] = [
    resource('web-admission-identity', IDENTITY_PATH, ['GET'], (context) => {
      const principal = principalOf(context);
      if (principal === null) return accessRequired();
      return json(200, {
        provider: principal.provider,
        label: principal.label,
        ...(principal.email === undefined ? {} : { email: principal.email }),
        ...(principal.author ? { canAuthor: true } : {}),
        application: principal.author ? applications.authority : applications.default,
      });
    }),
    resource('web-admission-application', APPLICATION_PATH, ['GET'], (context) => {
      const principal = principalOf(context);
      if (principal === null) return accessRequired();
      return json(200, { schemaVersion: 'web-admission-application-surface/v1', application: principal.author ? applications.authority : applications.default });
    }),
  ];

  if (providers.google) {
    const google = providers.google;
    resources.push(
      resource('web-admission-google-login', GOOGLE_LOGIN_PATH, ['GET'], (context) => authResponse(beginGoogleLogin(google, context.url, now))),
      resource('web-admission-google-callback', GOOGLE_CALLBACK_PATH, ['GET'], async (context) => authResponse(await completeGoogleLogin(google, requestOf(context), context.url, now, googleCalls))),
    );
  }
  if (providers.discord) {
    const discord = providers.discord;
    resources.push(
      resource('web-admission-discord-login', DISCORD_LOGIN_PATH, ['GET'], (context) => authResponse(beginDiscordLogin(discord, context.url, now))),
      resource('web-admission-discord-callback', DISCORD_CALLBACK_PATH, ['GET'], async (context) => authResponse(await completeDiscordLogin(discord, database, requestOf(context), context.url, now, discordCalls))),
    );
  }
  if (providers.google || providers.discord) {
    resources.push(resource('web-admission-logout', GOOGLE_LOGOUT_PATH, ['GET', 'POST'], async (context) => {
      const cookies: string[] = [];
      if (providers.google) cookies.push(...(googleLogout(providers.google).cookies ?? []));
      if (providers.discord) cookies.push(...((await logoutDiscord(providers.discord, database, requestOf(context), discordCalls)).cookies ?? []));
      return authResponse({ status: 302, redirect: '/', cookies });
    }));
  }
  if (providers.discordCommand) {
    const command = providers.discordCommand;
    resources.push(
      resource('web-admission-discord-command-challenge', DISCORD_COMMAND_CHALLENGE_PATH, ['POST'], async (context) => {
        const body = await readJsonObject(requestOf(context));
        if (body === null) return json(400, { error: 'invalid-json' });
        if (body.action === 'create') return commandResponse(await createDiscordCommandChallenge(command, database, requestOf(context), now));
        if (body.action === 'poll') return commandResponse(await pollDiscordCommandChallenge(command, database, requestOf(context), body.challenge, now));
        return json(400, { error: 'invalid-discord-command-challenge-request' });
      }),
      resource('web-admission-discord-interactions', DISCORD_INTERACTION_PATH, ['POST'], (context) => acceptDiscordInteraction(command, database, requestOf(context), now)),
      resource('web-admission-discord-gateway-command', DISCORD_GATEWAY_COMMAND_PATH, ['POST'], (context) => acceptDiscordGatewayCommand(command, database, requestOf(context), now)),
    );
  }

  // The command-login routes are part of the anonymous surface by construction:
  // a challenge is how an anonymous reader becomes admitted.
  const commandPaths = new Set(providers.discordCommand ? [DISCORD_COMMAND_CHALLENGE_PATH, DISCORD_INTERACTION_PATH, DISCORD_GATEWAY_COMMAND_PATH] : []);
  const publicWithCommands: PublicRoute = (pathname, method) => (method === 'POST' && commandPaths.has(pathname)) || isPublic(pathname, method);

  return Object.freeze({
    middlewares: Object.freeze([withPublic(gate, publicWithCommands, isPublic)]),
    resources: Object.freeze(resources),
    identify,
    subjectOf: (context) => principalOf(context)?.subjectHash ?? null,
    isPublic: publicWithCommands,
  });
}

// The gate consults the public route including the command-login routes.
function withPublic(gate: WebMiddleware, isPublic: PublicRoute, _base: PublicRoute): WebMiddleware {
  return async (context) => {
    const path = canonicalPath(context.url.pathname);
    const method = requestOf(context).method.toUpperCase();
    if (path !== null && isPublic(path, method) && !(context.locals.principal)) {
      // Public routes still learn who is asking when someone is; the gate
      // decides that. It refuses nothing on a public route.
      const result = await gate(context);
      return result instanceof Response && result.status === 401 ? undefined : result;
    }
    return gate(context);
  };
}

function commandResponse(result: Awaited<ReturnType<typeof createDiscordCommandChallenge>>): Response {
  const { status } = result;
  const headers: Array<[string, string]> = [['content-type', JSON_TYPE]];
  if ('retryAfter' in result && typeof result.retryAfter === 'number') headers.push(['retry-after', String(result.retryAfter)]);
  const cookies = 'cookies' in result ? result.cookies : [];
  for (const cookie of cookies) headers.push(['set-cookie', cookie]);
  const { cookies: _cookies, ...body } = result as Record<string, unknown>;
  return new Response(JSON.stringify(body), { status, headers });
}

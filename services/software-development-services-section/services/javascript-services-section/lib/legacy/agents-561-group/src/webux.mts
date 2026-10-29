/**
 * webux — the human surface: a landing page, a one-click Google login, and the
 * "your connection" page.
 *
 * MCP clients (ChatGPT, Claude) drive OAuth themselves, but a person who wants
 * to point an OpenAI-compatible client (our openai-agent-tui, or any tool) at
 * this service needs a token to paste as an API key. This flow gives them one:
 * `/ui/login` runs the SAME OAuth authorization server through a built-in
 * first-party client, and `/ui/callback` exchanges the code and shows the issued
 * token together with the base URL, the roster, and each character's MCP URL.
 *
 * The PKCE verifier is held in memory keyed by the round-tripped `state`; this
 * is a single-process browser convenience, not the machine-to-machine path.
 */

import { htmlRepr, jsonRepr, type App, type Context, type Repr } from "@red-cup-engineering/http-server";

import type { Character } from "./characters.mts";
import { pkcePair, type AgentsAuth } from "./auth.mts";

export interface WebuxParts {
  readonly roster: readonly Character[];
  readonly auth: AgentsAuth;
  readonly publicBaseUrl: string;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${esc(title)}</title>` +
    `<style>body{font:16px/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem;color:#1a1a1a}` +
    `code,pre{background:#f4f4f5;border-radius:4px;padding:.1rem .3rem;font-size:.9em}` +
    `pre{padding:.8rem;overflow-x:auto}a.btn{display:inline-block;background:#1c7ed6;color:#fff;padding:.5rem 1rem;` +
    `border-radius:6px;text-decoration:none}.char{border:1px solid #e4e4e7;border-radius:8px;padding:.8rem 1rem;margin:.6rem 0}` +
    `.char h3{margin:0 0 .2rem}.muted{color:#71717a}</style></head><body>${body}</body></html>`;
}

function rosterHtml(roster: readonly Character[], base: string): string {
  return roster.map((c) =>
    `<div class="char"><h3>${esc(c.name)} <span class="muted">· ${esc(c.id)}</span></h3>` +
    `<p>${esc(c.description)}</p>` +
    `<p class="muted">chat model: <code>${esc(c.id)}</code> · MCP: <code>${esc(base)}/c/${esc(c.id)}/mcp</code></p></div>`,
  ).join("");
}

function landing(parts: WebuxParts): string {
  const base = parts.publicBaseUrl;
  return page("agents.561.group", `
    <h1>agents.561.group</h1>
    <p>Talk with the 561 Group characters. Each one keeps its own memory of you and
       fuses it with what it knows. Sign in with Google to get a token, then point
       any OpenAI-compatible client at <code>${esc(base)}/v1</code>, or connect a
       character to ChatGPT / Claude as an MCP server.</p>
    <p><a class="btn" href="/ui/login">Sign in with Google</a></p>
    <h2>The roster</h2>
    ${rosterHtml(parts.roster, base)}
    <h2>Connect from ChatGPT / Claude</h2>
    <p>Add a character's MCP URL above as a connector; your client will run the
       OAuth sign-in automatically. The character then remembers you across both
       the chat API and MCP.</p>`);
}

function connection(parts: WebuxParts, token: string): string {
  const base = parts.publicBaseUrl;
  return page("Your connection · agents.561.group", `
    <h1>You're connected</h1>
    <p>Use this token as the API key in any OpenAI-compatible client. It is yours;
       keep it private. It expires in an hour — sign in again for a fresh one.</p>
    <pre>${esc(token)}</pre>
    <h2>OpenAI-compatible client</h2>
    <pre>base URL:  ${esc(base)}/v1
API key:   (the token above)
model:     one of the character ids below</pre>
    <h2>The roster</h2>
    ${rosterHtml(parts.roster, base)}
    <p><a href="/">← back</a></p>`);
}

export function createWebuxApp(parts: WebuxParts): App {
  const { auth, publicBaseUrl } = parts;
  const redirectUri = `${publicBaseUrl}/ui/callback`;
  // A built-in public (PKCE) client for the browser login flow.
  const client = auth.oauth.registerClient({ redirect_uris: [redirectUri], client_name: "agents.561.group web" });
  const pending = new Map<string, string>(); // state → PKCE verifier

  const loginHandler = (): Repr => {
    const { verifier, challenge } = pkcePair();
    const state = `ui_${verifier.slice(0, 16)}`;
    pending.set(state, verifier);
    try {
      const googleUrl = auth.oauth.startAuthorization({
        client_id: client.client_id,
        redirect_uri: redirectUri,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
      });
      return { status: 302, headers: { location: googleUrl } };
    } catch (error) {
      return htmlRepr(page("Sign-in error", `<h1>Sign-in error</h1><p>${esc((error as Error).message)}</p><p><a href="/">← back</a></p>`), 500);
    }
  };

  const callbackHandler = (ctx: Context): Repr => {
    const code = ctx.url.searchParams.get("code") ?? "";
    const state = ctx.url.searchParams.get("state") ?? "";
    const verifier = pending.get(state);
    pending.delete(state);
    if (!code || !verifier) {
      return htmlRepr(page("Sign-in error", `<h1>Sign-in error</h1><p>Missing or stale sign-in state. <a href="/ui/login">Try again</a>.</p>`), 400);
    }
    try {
      const tokens = auth.oauth.exchangeCode({ client_id: client.client_id, code, code_verifier: verifier, redirect_uri: redirectUri });
      return htmlRepr(connection(parts, tokens.access_token));
    } catch (error) {
      return htmlRepr(page("Sign-in error", `<h1>Sign-in error</h1><p>${esc((error as Error).message)}</p><p><a href="/ui/login">Try again</a></p>`), 400);
    }
  };

  return {
    resources: [
      { match: "/", methods: ["GET"], produces: ["text/html"], handler: () => htmlRepr(landing(parts)) },
      { match: "/ui/login", methods: ["GET"], handler: loginHandler },
      { match: "/ui/callback", methods: ["GET"], produces: ["text/html"], handler: callbackHandler },
      { match: "/healthz", methods: ["GET"], handler: () => jsonRepr({ ok: true, characters: parts.roster.length }) },
    ],
  };
}

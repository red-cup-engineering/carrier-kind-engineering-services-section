import { timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { readJsonBody, sse, type App, type Context, type Repr } from "@emsenn/relating/running/http";
import { bearerToken } from "@red-cup-engineering/organizing-with-the-web/sync-guard";
import type { SectionFrame, SettledSection } from "../swarm-gui/index.mjs";
import { renderSectionFrame } from "../swarm-gui/index.mjs";

export type MessageFn = (agent: string, prompt: string, options?: unknown) => Promise<unknown> | unknown;

export type BeliefCharge = Readonly<{ pos?: number | boolean; neg?: number | boolean }>;
export type StandingMap = Readonly<Record<string, unknown>>;

export type ConsoleOptions = Readonly<{
  token: string;
  message?: MessageFn;
  agent?: string;
  messageOptions?: unknown;
  gateAssets?: boolean;
  gatePage?: boolean;
  now?: () => string;
}>;

export type ConsoleFrame = Readonly<{
  topic: string;
  type: "reply" | "state";
  agent?: string | null;
  office?: string | null;
  text?: string;
  html?: string;
  audit?: unknown;
  undetermined?: unknown;
  standing?: unknown;
  mode?: "calm" | "audit";
  at: string;
}>;

export type SwarmConsole = Readonly<{
  app: App;
  publish: (event: string, frame: ConsoleFrame) => ConsoleFrame;
  publishSection: (section: SettledSection, options?: { mode?: "calm" | "audit" }) => SectionFrame & { frame: ConsoleFrame };
  subscribers: () => number;
}>;

type ConsoleSseWriter = Readonly<{
  send(event: string, data: unknown, id?: string): void;
  comment(text: string): void;
  close(): void;
}>;

export const CLIENT_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SWARM Console</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header><h1>SWARM</h1><p id="status" role="status">closed</p></header>
  <main>
    <section id="chat"><h2>Conversation</h2><div id="chat-log"></div><form id="say-form"><textarea id="prompt" name="prompt"></textarea><button type="submit">say</button></form></section>
    <section id="belief"><h2>Settled memory</h2><label><input id="audit-toggle" type="checkbox"> audit</label><div id="contested-strip" hidden></div><div id="belief-frame"></div></section>
  </main>
  <script type="module" src="/app.js"></script>
</body>
</html>
`;

export const CLIENT_CSS = `body{font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin:0 auto;padding:1rem;max-width:72rem;color:#1b1b1b;background:#fbfbfa}main{display:grid;gap:1rem}section{border:1px solid #d8d6cf;border-radius:6px;padding:1rem;background:white}@media(min-width:60rem){main{grid-template-columns:1fr 1fr}}textarea{width:100%;min-height:5rem}button{border:1px solid #355c7d;background:#355c7d;color:white;border-radius:6px;padding:.4rem 1rem}#contested-strip{border:1px solid #8a5a00;background:#fdf6e8;color:#8a5a00;border-radius:6px;padding:.5rem;margin:.5rem 0}.gap{color:#777;font-style:italic}[data-contested=true]{color:#8a5a00;text-decoration:underline dotted #8a5a00}`;

export const CLIENT_JS = `import{authHeaders,eventsUrl,sayRequest,frameText,frameAudit,frameGaps,contestedLine,readBrowserToken,stripBrowserToken}from"/app-helpers.js";const $=id=>document.getElementById(id);const token=readBrowserToken(window);stripBrowserToken(window);if(!token){$("status").textContent="no token";}else{$("status").textContent="opening";const es=new EventSource(eventsUrl(token));es.addEventListener("open",()=>{$("status").textContent="open"});es.addEventListener("state",ev=>renderFrame(JSON.parse(ev.data)));es.addEventListener("reply",ev=>append("swarm",frameText(JSON.parse(ev.data))));$("say-form").addEventListener("submit",async ev=>{ev.preventDefault();const prompt=$("prompt").value.trim();if(!prompt)return;$("prompt").value="";append("you",prompt);const req=sayRequest(token,prompt);const res=await fetch(req.url,req.init);const frame=await res.json();append("swarm",frameText(frame));});}function append(who,text){const div=document.createElement("div");div.textContent=who+": "+text;$("chat-log").append(div)}function renderFrame(frame){$("belief-frame").innerHTML=frame.html||frameText(frame)||'<p class="gap">no rendered frame</p>';const held=frameAudit(frame);$("contested-strip").hidden=!held.length;$("contested-strip").textContent=held.map(contestedLine).join("\\n");const gaps=frameGaps(frame);if(gaps.length)$("belief-frame").insertAdjacentHTML("beforeend",'<p class="gap">gaps: '+gaps.join(", ")+"</p>")}`;

export const CLIENT_HELPERS_JS = `export ${parseTokenFrom.toString()};export ${authHeaders.toString()};export ${eventsUrl.toString()};export ${sayRequest.toString()};export ${frameText.toString()};export ${frameAudit.toString()};export ${frameGaps.toString()};export ${contestedLine.toString()};export function readBrowserToken(w){const fromHash=parseTokenFrom(w.location.hash);const fromQuery=parseTokenFrom(w.location.search);const stored=w.sessionStorage?.getItem("web-swarm-console-token")||"";const token=fromHash||fromQuery||stored||w.prompt?.("Enter access token")||"";if(token)w.sessionStorage?.setItem("web-swarm-console-token",token);return token.trim()}export function stripBrowserToken(w){try{const u=new URL(w.location.href);u.searchParams.delete("token");u.hash="";w.history.replaceState(null,"",u.pathname+u.search)}catch{}}`;

export function parseTokenFrom(value: unknown): string {
  const text = String(value ?? "").replace(/^[?#]/, "");
  return new URLSearchParams(text).get("token") ?? "";
}

export function authHeaders(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return { ...extra, authorization: `Bearer ${token}` };
}

export function eventsUrl(token: string, path = "/events"): string {
  return `${path}?token=${encodeURIComponent(token)}`;
}

export function sayRequest(token: string, prompt: string, path = "/say"): { url: string; init: RequestInit } {
  return {
    url: path,
    init: {
      method: "POST",
      headers: authHeaders(token, { "content-type": "application/json" }),
      body: JSON.stringify({ prompt }),
    },
  };
}

export function frameText(frame: unknown): string {
  return frame && typeof frame === "object" && typeof (frame as { text?: unknown }).text === "string" ? (frame as { text: string }).text : "";
}

export function frameAudit(frame: unknown): readonly unknown[] {
  return frame && typeof frame === "object" && Array.isArray((frame as { audit?: unknown }).audit) ? (frame as { audit: readonly unknown[] }).audit : [];
}

export function frameGaps(frame: unknown): readonly unknown[] {
  return frame && typeof frame === "object" && Array.isArray((frame as { undetermined?: unknown }).undetermined) ? (frame as { undetermined: readonly unknown[] }).undetermined : [];
}

export function contestedLine(cell: unknown): string {
  if (!cell || typeof cell !== "object") return "⊤ (unnamed cell)";
  const record = cell as { cell?: unknown; predicate?: unknown; glyph?: unknown; pos?: unknown; neg?: unknown };
  const name = record.cell ?? record.predicate ?? "(unnamed cell)";
  return `${record.glyph ?? "⊤"} ${String(name)} — held: affirmed ${record.pos ?? "?"}, denied ${record.neg ?? "?"}`;
}

export function chargeOf(value: unknown): BeliefCharge | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { pos?: unknown; neg?: unknown };
  const hasPos = typeof record.pos === "number" || typeof record.pos === "boolean";
  const hasNeg = typeof record.neg === "number" || typeof record.neg === "boolean";
  if (!hasPos || !hasNeg) return null;
  return Object.freeze({ pos: record.pos ? 1 : 0, neg: record.neg ? 1 : 0 });
}

export function chargeGlyph(value: unknown): "⊥" | "t" | "f" | "⊤" | null {
  const charge = chargeOf(value);
  if (!charge) return null;
  const pos = charge.pos ? 1 : 0;
  const neg = charge.neg ? 1 : 0;
  if (pos && neg) return "⊤";
  if (pos) return "t";
  if (neg) return "f";
  return "⊥";
}

export function isTopCharge(value: unknown): boolean {
  return chargeGlyph(value) === "⊤";
}

export function isDeterminedCharge(value: unknown): boolean {
  const glyph = chargeGlyph(value);
  return glyph === "t" || glyph === "f" || glyph === "⊤";
}

export function auditCells(standing: StandingMap = {}): readonly unknown[] {
  return Object.freeze(Object.entries(standing).flatMap(([cell, raw]) => {
    const charge = chargeOf(raw);
    if (!charge || !isTopCharge(charge)) return [];
    return [{ cell, glyph: "⊤", pos: charge.pos ? 1 : 0, neg: charge.neg ? 1 : 0, contested: true }];
  }));
}

export function calmText(standing: StandingMap = {}): string {
  return Object.entries(standing).map(([cell, raw]) => {
    const glyph = chargeGlyph(raw);
    return `${cell}: ${glyph ?? String(raw)}`;
  }).join("  ·  ");
}

export function gaps(standing: StandingMap = {}): readonly string[] {
  return Object.freeze(Object.entries(standing).flatMap(([cell, raw]) => {
    const charge = chargeOf(raw);
    return charge && !isDeterminedCharge(charge) ? [cell] : [];
  }));
}

export function tokenFromRequest(headers: IncomingHttpHeaders, url: URL): string {
  return bearerToken(headers) ?? url.searchParams.get("token") ?? "";
}

export function timingSafeEqualString(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorized(headers: IncomingHttpHeaders, url: URL, token: string): boolean {
  const presented = tokenFromRequest(headers, url);
  return presented.length > 0 && timingSafeEqualString(presented, token);
}

function repr(body: unknown, type: string, status = 200): Repr {
  return { status, type, body: typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n` };
}

function standingFrom(value: unknown): StandingMap {
  if (!value || typeof value !== "object") return {};
  const record = value as { standing?: unknown; office?: { standing?: unknown } };
  const standing = record.standing ?? record.office?.standing;
  return standing && typeof standing === "object" && !Array.isArray(standing) ? standing as StandingMap : {};
}

function officeFrom(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { office?: unknown; agent?: { office?: unknown } };
  if (record.office && typeof record.office === "object" && typeof (record.office as { name?: unknown }).name === "string") return String((record.office as { name: string }).name);
  if (record.agent && typeof record.agent === "object" && typeof record.agent.office === "string") return record.agent.office;
  return null;
}

function normalizeReply(value: unknown): { text: string; audit?: unknown; undetermined?: unknown; standing?: unknown; office?: string | null } {
  if (typeof value === "string") return { text: value };
  if (value && typeof value === "object") {
    const record = value as { reply?: unknown; text?: unknown; audit?: unknown; undetermined?: unknown };
    const standing = standingFrom(value);
    const standingText = calmText(standing);
    const out: { text: string; audit?: unknown; undetermined?: unknown; standing?: unknown; office?: string | null } = {
      text: String(record.text ?? record.reply ?? standingText),
    };
    const audit = record.audit ?? auditCells(standing);
    const undetermined = record.undetermined ?? gaps(standing);
    if (Object.keys(standing).length > 0) out.standing = standing;
    if (audit !== undefined) out.audit = audit;
    if (undetermined !== undefined) out.undetermined = undetermined;
    const office = officeFrom(value);
    if (office !== null) out.office = office;
    return out;
  }
  return { text: "" };
}

export function createSwarmConsole(options: ConsoleOptions): SwarmConsole {
  if (!options.token) throw new Error("createSwarmConsole requires a token");
  const writers = new Set<ConsoleSseWriter>();
  const now = options.now ?? (() => new Date().toISOString());
  const gate = (ctx: Context, allowAsset = false): Repr | null => {
    return allowAsset || authorized(ctx.req.headers, ctx.url, options.token)
      ? null
      : repr({ error: "unauthorized" }, "application/json; charset=utf-8", 401);
  };
  const publish = (event: string, frame: ConsoleFrame): ConsoleFrame => {
    for (const writer of [...writers]) {
      try { writer.send(event, frame); }
      catch { writers.delete(writer); }
    }
    return frame;
  };
  const pageGated = options.gatePage !== false;
  const assetsGated = options.gateAssets === true;
  const app: App = {
    resources: [
      { id: "swarm-console.page", name: "SWARM Console Page", route: "/", match: "/", methods: ["GET"], produces: ["text/html"], handler: async (ctx) => {
        const denied = pageGated ? gate(ctx) : null;
        if (denied) return denied;
        return repr(CLIENT_HTML, "text/html; charset=utf-8");
      } },
      { id: "swarm-console.app-js", name: "SWARM Console App JavaScript", route: "/app.js", match: "/app.js", methods: ["GET"], produces: ["text/javascript"], handler: async (ctx) => {
        const denied = gate(ctx, !assetsGated);
        if (denied) return denied;
        return repr(CLIENT_JS, "text/javascript; charset=utf-8");
      } },
      { id: "swarm-console.helpers-js", name: "SWARM Console Helpers JavaScript", route: "/app-helpers.js", match: "/app-helpers.js", methods: ["GET"], produces: ["text/javascript"], handler: async (ctx) => {
        const denied = gate(ctx, !assetsGated);
        if (denied) return denied;
        return repr(CLIENT_HELPERS_JS, "text/javascript; charset=utf-8");
      } },
      { id: "swarm-console.css", name: "SWARM Console CSS", route: "/style.css", match: "/style.css", methods: ["GET"], produces: ["text/css"], handler: async (ctx) => {
        const denied = gate(ctx, !assetsGated);
        if (denied) return denied;
        return repr(CLIENT_CSS, "text/css; charset=utf-8");
      } },
      { id: "swarm-console.events", name: "SWARM Console Events", route: "/events", match: "/events", methods: ["GET"], produces: ["text/event-stream"], handler: async (ctx) => {
        const denied = gate(ctx);
        if (denied) return denied;
        const writer = sse(ctx.req, ctx.res, () => writers.delete(writer));
        writers.add(writer);
        writer.comment("open");
      } },
      { id: "swarm-console.say", name: "SWARM Console Say", route: "/say", match: "/say", methods: ["POST"], produces: ["application/json"], handler: async (ctx) => {
        const denied = gate(ctx);
        if (denied) return denied;
        let body: { prompt?: unknown; agent?: unknown };
        try {
          body = await readJsonBody(ctx.req, { maxBytes: 1_000_000, empty: {} }) as { prompt?: unknown; agent?: unknown };
        } catch (error) {
          return repr({ error: "bad request body", reason: String(error instanceof Error ? error.message : error) }, "application/json; charset=utf-8", 400);
        }
        const prompt = typeof body.prompt === "string" ? body.prompt : "";
        if (!prompt) {
          return repr({ error: "missing prompt" }, "application/json; charset=utf-8", 400);
        }
        const agent = typeof body.agent === "string" && body.agent.length > 0 ? body.agent : options.agent ?? "orchestrator";
        if (!options.message) {
          const frame: ConsoleFrame = { topic: "swarm", type: "reply", agent, text: "", undetermined: ["message"], at: now() };
          publish("reply", frame);
          return repr({ error: "no message orchestration injected", ...frame }, "application/json; charset=utf-8", 503);
        }
        const reply = normalizeReply(await options.message(agent, prompt, options.messageOptions));
        const frame: ConsoleFrame = {
          topic: "swarm",
          type: "reply",
          agent,
          ...(reply.office !== undefined ? { office: reply.office } : {}),
          text: reply.text,
          at: now(),
          ...(reply.audit !== undefined ? { audit: reply.audit } : {}),
          ...(reply.undetermined !== undefined ? { undetermined: reply.undetermined } : {}),
          ...(reply.standing !== undefined ? { standing: reply.standing } : {}),
        };
        publish("reply", frame);
        return repr(frame, "application/json; charset=utf-8");
      } },
    ],
  };
  return Object.freeze({
    app,
    publish,
    subscribers: () => writers.size,
    publishSection: (section, sectionOptions = {}) => {
      const rendered = renderSectionFrame(section, sectionOptions);
      const frame: ConsoleFrame = {
        topic: "swarm",
        type: "state",
        html: rendered.html,
        audit: rendered.audit,
        undetermined: rendered.absurd,
        mode: sectionOptions.mode ?? "calm",
        at: now(),
      };
      publish("state", frame);
      return Object.freeze({ ...rendered, frame });
    },
  });
}

export function swarmConsoleApp(options: ConsoleOptions): App {
  return createSwarmConsole(options).app;
}

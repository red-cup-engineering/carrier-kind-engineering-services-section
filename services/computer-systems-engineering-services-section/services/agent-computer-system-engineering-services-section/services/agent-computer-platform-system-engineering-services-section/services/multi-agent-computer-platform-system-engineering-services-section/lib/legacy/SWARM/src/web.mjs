// web — a thin HTTP + SSE FACE for SWARM. It is a CARRIER, not a kernel: it never appends a row,
// never settles a value, never repairs a contradiction. It serializes already-produced agent state
// onto a read-only Server-Sent-Events wire and routes a posted prompt to an INJECTED message()
// orchestration (so this module never imports src/index.mjs — that import would close a cycle).
//
// THE LAW it serves, on the wire:
//   - HOLD ⊤. A contested cell ({pos:1,neg:1}) is published as a HELD value, never collapsed,
//     averaged, or overwritten. Its glyph face stays calm; its contradiction stays recoverable.
//   - CALM-by-default + AUDIT-on-demand. Every state frame carries a calm `text` (the glyph face a
//     human reads) AND an `audit` array that names every contested cell so the ⊤ is recoverable but
//     never flaunted. A ⊤ does not shout on the calm surface; it waits in the audit field.
//   - never hallucinate a ⊥. An undetermined cell is surfaced as a named gap, not invented.
//
// THE SURFACE:
//   createSwarmServer(opts) -> node:http.Server   — GET / (client), GET /events (SSE), POST /say
//
// opts:
//   message(agentName, prompt, options) -> { reply, ... }   — INJECTED orchestration (required to
//       route /say; if omitted, /say answers a named gap rather than inventing a reply).
//   agent     — default agent name for /say when the body omits one (default "groq").
//   messageOptions — options object forwarded to message() (root, env, fetch, now, …).
//   hub       — an existing SSE hub to publish onto (default: a fresh createSseHub()).
//   now()     — clock for event timestamps (default () => new Date().toISOString()).

import { createServer as createHttpServer } from "node:http";

import { createSseHub } from "@561-group/computer/carrier/sse";
import { glyph, isTop, isDetermined } from "@561-group/tab/value";

// chargeOf(x) — coerce a value into a {pos,neg} charge if it looks like one, else null. We never
// invent a charge: a thing that is not already a two-belief cell does not become one here.
function chargeOf(x) {
  if (x && typeof x === "object"
    && (typeof x.pos === "number" || typeof x.pos === "boolean")
    && (typeof x.neg === "number" || typeof x.neg === "boolean")) {
    return { pos: x.pos ? 1 : 0, neg: x.neg ? 1 : 0 };
  }
  return null;
}

// auditCells(standing) — walk a standing map of { cellName: charge } and project the AUDIT view:
// every contested cell (⊤) named, with its calm glyph face and its held contradiction recoverable.
// A non-charge entry is left out of the audit (it has no belief pair to contest). This never
// collapses ⊤ — it records that the cell holds both beliefs at once.
export function auditCells(standing = {}) {
  const audit = [];
  for (const [cell, raw] of Object.entries(standing)) {
    const charge = chargeOf(raw);
    if (!charge) continue;
    if (isTop(charge)) {
      audit.push({ cell, glyph: glyph(charge), pos: charge.pos, neg: charge.neg, contested: true });
    }
  }
  return audit;
}

// calmText(standing) — the human-facing CALM face: each cell rendered as "cell: <glyph>". A ⊤ shows
// its glyph (⊤) like any other value, in the same calm voice — it is not flagged, starred, or
// shouted. The contradiction lives in the audit field, recoverable, never flaunted on this surface.
export function calmText(standing = {}) {
  const parts = [];
  for (const [cell, raw] of Object.entries(standing)) {
    const charge = chargeOf(raw);
    parts.push(charge ? `${cell}: ${glyph(charge)}` : `${cell}: ${String(raw)}`);
  }
  return parts.join("  ·  ");
}

// gaps(standing) — the cells whose charge is undetermined (⊥): a NAMED gap, never an invented value.
export function gaps(standing = {}) {
  const named = [];
  for (const [cell, raw] of Object.entries(standing)) {
    const charge = chargeOf(raw);
    if (charge && !isDetermined(charge)) named.push(cell);
  }
  return named;
}

// stateEvent(payload) — build the SSE event for a settled agent standing. `topic` is the coarse
// channel ("swarm"); `type` is the fine SSE event name. The calm `text` is what a human reads; the
// `audit` array carries the recoverable ⊤; `undetermined` names the gaps. Nothing is collapsed.
export function stateEvent({ agent, office, standing = {}, now }) {
  return {
    topic: "swarm",
    type: "state",
    at: now,
    agent: agent ?? null,
    office: office ?? null,
    text: calmText(standing),
    standing,
    audit: auditCells(standing),
    undetermined: gaps(standing),
  };
}

// replyEvent(payload) — the SSE event for a routed reply. The reply text is calm; if the
// orchestration surfaced contested standing alongside it, the ⊤ rides in the audit field.
export function replyEvent({ agent, office, reply, standing = {}, now }) {
  return {
    topic: "swarm",
    type: "reply",
    at: now,
    agent: agent ?? null,
    office: office ?? null,
    text: typeof reply === "string" ? reply : String(reply ?? ""),
    audit: auditCells(standing),
    undetermined: gaps(standing),
  };
}

const CLIENT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SWARM face</title>
<style>
  body { font: 14px/1.5 ui-monospace, monospace; margin: 1.5rem; max-width: 52rem; }
  h1 { font-size: 1.1rem; }
  #log { white-space: pre-wrap; border: 1px solid #ccc; padding: .75rem; min-height: 12rem; }
  .audit { color: #a40; }
  form { margin-top: .75rem; display: flex; gap: .5rem; }
  input { flex: 1; font: inherit; padding: .35rem; }
  button { font: inherit; padding: .35rem .75rem; }
</style>
</head>
<body>
<h1>SWARM — calm by default, ⊤ recoverable on audit</h1>
<div id="log"></div>
<form id="say">
  <input id="prompt" placeholder="say something to the swarm" autocomplete="off">
  <button type="submit">say</button>
</form>
<script>
const log = document.getElementById("log");
function line(s, cls) {
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = s;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
const es = new EventSource("/events");
function render(ev) {
  const d = JSON.parse(ev.data);
  line((d.type || "event") + (d.agent ? " [" + d.agent + "]" : "") + ": " + (d.text || ""));
  if (d.audit && d.audit.length) {
    for (const a of d.audit) line("  audit ⊤ " + a.cell + " holds [pos=" + a.pos + ", neg=" + a.neg + "]", "audit");
  }
  if (d.undetermined && d.undetermined.length) line("  gaps: " + d.undetermined.join(", "), "audit");
}
es.addEventListener("state", render);
es.addEventListener("reply", render);
document.getElementById("say").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("prompt");
  const prompt = input.value;
  if (!prompt) return;
  input.value = "";
  line("you: " + prompt);
  const res = await fetch("/say", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) line("error: HTTP " + res.status, "audit");
});
</script>
</body>
</html>`;

// readBody(req) — collect a request body as a string, capped so a runaway POST cannot exhaust RAM.
function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    let body = "";
    let over = false;
    req.on("data", (chunk) => {
      if (over) return;
      body += chunk;
      if (body.length > limit) { over = true; reject(new Error("request body too large")); }
    });
    req.on("end", () => { if (!over) resolve(body); });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

// createSwarmServer(opts) — the node:http server. See the module header for opts.
export function createSwarmServer(opts = {}) {
  const hub = opts.hub ?? createSseHub();
  const now = opts.now ?? (() => new Date().toISOString());
  const defaultAgent = opts.agent ?? "groq";
  const messageOptions = opts.messageOptions ?? {};

  const createServer = opts.createServer ?? createHttpServer;

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    // GET / — the minimal single-file client.
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(CLIENT_HTML);
      return;
    }

    // GET /events — open the read-only SSE mirror. `?topics=` narrows the channels.
    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      const topics = url.searchParams.get("topics") ?? "";
      const unsubscribe = hub.subscribe(res, { topics });
      req.on("close", unsubscribe);
      req.on("error", unsubscribe);
      return;
    }

    // POST /say — route a prompt to a swarm agent via the INJECTED message(), publish the reply.
    if (req.method === "POST" && url.pathname === "/say") {
      let parsed;
      try {
        const raw = await readBody(req);
        parsed = raw ? JSON.parse(raw) : {};
      } catch (error) {
        sendJson(res, 400, { error: "bad request body", reason: String(error.message ?? error) });
        return;
      }
      const prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
      const agentName = typeof parsed.agent === "string" && parsed.agent ? parsed.agent : defaultAgent;
      if (!prompt) {
        sendJson(res, 400, { error: "missing prompt" });
        return;
      }
      // No injected orchestration: surface a NAMED gap rather than invent a reply.
      if (typeof opts.message !== "function") {
        const gap = { ...replyEvent({ agent: agentName, reply: "", now: now() }), undetermined: ["message"] };
        hub.publish(gap);
        sendJson(res, 503, { error: "no message orchestration injected", undetermined: ["message"] });
        return;
      }
      let result;
      try {
        result = await opts.message(agentName, prompt, messageOptions);
      } catch (error) {
        sendJson(res, 502, { error: "message orchestration failed", reason: String(error.message ?? error) });
        return;
      }
      const standing = result?.standing ?? result?.office?.standing ?? {};
      const office = result?.office?.name ?? result?.agent?.office ?? null;
      const ev = replyEvent({ agent: agentName, office, reply: result?.reply, standing, now: now() });
      hub.publish(ev);
      sendJson(res, 200, ev);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  // publishState(payload) — let a caller push a settled-standing frame onto the wire.
  server.publishState = (payload) => hub.publish(stateEvent({ ...payload, now: payload.now ?? now() }));
  server.hub = hub;
  return server;
}

export default createSwarmServer;

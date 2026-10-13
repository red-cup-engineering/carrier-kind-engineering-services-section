/**
 * The world in the browser: a person plays the 561 Group's MUD as their own character. Each
 * line goes to MetroPlat's `world-command` with the person's subject, so the world answers
 * under the offices they hold; this page keeps only the recent transcript it has shown them.
 *
 * The page is a text client that works with no script at all. A browser that runs modules plays
 * the same world as a game filling the window (world-view.mjs): it speaks through the JSON turn
 * resource, asking for the character's perception frame, reads the city's atlas once, and tracks
 * the person's journal (what awaits their move on the work board) beside the world. Its
 * modules are served from their own source, content-versioned, with the import map the page declares.
 *
 * The instance's front door is the city from the street: a visitor who has not signed in sees it
 * drawn whole, turning under its title card, from the street atlas (world-street.mjs), and is
 * asked in. A person who has signed in passes through the door to wherever the console lands them:
 * their obligations while any wait, otherwise the city. The door, the street atlas and the modules
 * are the only resources here a visitor reads; each declares itself public, and the entrance admits it.
 * @module
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { htmlRepr, jsonRepr, textRepr } from "@red-cup-engineering/http-services-section/representation";
import { readFormBody, readJsonBody } from "@red-cup-engineering/http-services-section/body";
import { renderTufteDocument, renderSignCellSection } from "@red-cup-engineering/web-page-tiling-engine/rendering";
import { projectFiber } from "@red-cup-engineering/qwzspace/fiber";
import { readBrowserModuleClosure, servedBrowserModules } from "@red-cup-engineering/web-page-tiling-engine/modules";
import { GAME_STYLES } from "@red-cup-engineering/qwzspace/game-styles";
import { subjectOf } from "@red-cup-engineering/organizing/agency/cast";
import { streetAliases, streetAtlas, streetPulse } from "./world-street.mjs";

const KEEP = 400;
const STREET_MS = 10 * 60 * 1000;
/** How long one street pulse serves every visitor. */
const PULSE_MS = 2000;
const VIEW_ENTRY = "world-view.mjs";
const VIEW = servedBrowserModules("/_play", await readBrowserModuleClosure({
  directory: path.dirname(fileURLToPath(import.meta.url)),
  entries: [VIEW_ENTRY],
}));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function turnLines(turn) {
  return [
    ...(turn?.messages ?? []),
    ...(turn?.results ?? []).map((result) => `${result.ok ? "✓" : "✗"} ${result.verb}: ${JSON.stringify(result.ok ? result.value : result.error, null, 2)}`),
  ];
}

/** The front door: the city drawn from the street under the instance's title card. Without a
 *  script the card stands alone, which is the whole of the door's text tier. */
function doorPage(title) {
  const name = escapeHtml(title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} · a MetroPlat city</title><meta name="description" content="${name} is a city of the 561 Group, where the group's offices, sections and work stand as buildings.">
<meta name="color-scheme" content="dark"><style>html,body{margin:0;background:#0b1020}</style><style id="qz-game-styles">${GAME_STYLES}</style>
<script type="importmap">${JSON.stringify(VIEW.importMap).replace(/</g, "\\u003c")}</script><script type="module" src="${VIEW.path}/${VIEW_ENTRY}"></script></head>
<body><main id="world-view" class="qz-game" data-mode="street" data-atlas="/play/atlas/street" data-pulse="/play/pulse/street" data-title="${name}">
<section class="qz-panel qz-card"><p class="qz-kicker">A MetroPlat city</p><h1>${name}</h1>
<p>Every section, office and work of the group stands here as a building, in the colour of its jurisdiction: science, engineering, operations and public services. Sign in to walk it as your character, speak with its offices, and take up its work.</p>
<a class="qz-enter" href="/sign-in?return_to=%2F">Enter the city</a><p class="qz-hint">Drag to turn the city, scroll to come closer, click a named building to fly to it.</p></section>
</main></body></html>`;
}

/** @param {{ title?: string, navigation: object[], run: (verb: string, input: object) => Promise<unknown>, runAs: (subject: string, verb: string, input: object) => Promise<unknown>, landing?: (principal: object) => Promise<string> }} parts
 *  landing names where a signed-in person entering at the door goes; the city by default. */
export function worldClientApp({ title = "MetroPlat", navigation: links, navigationTitle = "Group", run, runAs, landing = async () => "/play" }) {
  const navigation = Object.assign([...links], { title: navigationTitle });
  const transcripts = new Map();
  const perceptions = new Map();
  const append = (subject, lines) => {
    const next = [...(transcripts.get(subject) ?? []), ...lines].slice(-KEEP);
    transcripts.set(subject, next);
    return next;
  };
  // A document, not an SHP packet: a packet is inert by construction, and this page holds no
  // settled cells for one to carry; its content is the play itself.
  const page = (lines, subject) => htmlRepr(renderTufteDocument({
    title: "World",
    tiles: [
      { title: navigation.title ?? "Group", links: navigation, span: 12 },
      { title: "The city", span: 12, html: `<div id="world-view" data-mode="play" data-turn="/play/turn" data-atlas="/play/atlas" data-pulse="/play/pulse" data-tellings="/play/tellings" data-journal="/play/journal" data-title="${escapeHtml(title)}" data-navigation="${escapeHtml(JSON.stringify(navigation.map(({ href, label }) => ({ href, label }))))}"><noscript>The city is drawn with JavaScript; the world below plays without it.</noscript></div>` },
      { title: "The world", span: 12, html: `<pre class="world-transcript">${lines.join("\n").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</pre>` },
      ...(perceptions.get(subject)?.situation?.actions?.length ? [{ title: "Operations here", span: 12, html: perceptions.get(subject).situation.actions.map((action) => `<details><summary>${escapeHtml(action.command)}</summary><p>${escapeHtml(action.description)}</p><form method="post" action="/play"><label>Command <input name="line" value="${escapeHtml(action.command)}" required></label><button type="submit">Send</button></form></details>`).join("") }] : []),
      ...(perceptions.has(subject) ? [{ title: "Perceived evidence", span: 12, html: projectFiber(perceptions.get(subject)).entries.filter((entry) => entry.cells && entry.kind !== "exit").map((entry) => `<details><summary>${escapeHtml(entry.label)}</summary>${renderSignCellSection(entry.cells)}</details>`).join("") }] : []),
      { title: "Speak", span: 12, form: { action: "/play", method: "post", fields: [{ name: "line", label: "command", value: "", placeholder: "look, go <exit>, powers, <power> {json}" }], submitters: [{ label: "Send" }] } },
    ],
  }, { importMap: VIEW.importMap, scripts: [{ src: `${VIEW.path}/${VIEW_ENTRY}` }], styles: GAME_STYLES }), { cacheControl: { noStore: true } });
  const turn = async (subject, verb, input) => {
    try {
      const result = await runAs(subject, verb, { ...input, frame: true });
      if (result.frame) perceptions.set(subject, result.frame);
      return turnLines(result);
    }
    catch (error) { return [`✗ ${error?.message ?? String(error)}`]; }
  };
  // A browser's cookie is sent cross-site too; only this origin's pages may speak as the person.
  const sameOrigin = (headers) => {
    if (headers.authorization !== undefined) return true;
    try { return new URL(headers.origin ?? "").host === headers.host; } catch { return false; }
  };
  const assets = VIEW.assets.map((asset) => ({
    id: `ops-world.module:${asset.name}`,
    match: asset.path,
    methods: ["GET"],
    public: true,
    produces: ["text/javascript"],
    handler: () => textRepr(asset.source, { type: asset.contentType, cacheControl: { visibility: "public", maxAge: 31536000, immutable: true } }),
  }));
  // Every visitor sees the same street, so it is made once a while, not once a visitor.
  let street, streetAt = 0;
  const streetOf = () => {
    if (street === undefined || Date.now() - streetAt > STREET_MS) {
      streetAt = Date.now();
      street = run("world-atlas", {}).then(streetAtlas, (error) => { street = undefined; throw error; });
    }
    return street;
  };
  // The street's pulse is likewise one reading for every visitor, a couple of seconds old at most.
  let aliases, streetBeat, beatAt = 0;
  const streetPulseOf = () => {
    if (streetBeat === undefined || Date.now() - beatAt > PULSE_MS) {
      beatAt = Date.now();
      aliases ??= run("world-atlas", {}).then(streetAliases, (error) => { aliases = undefined; throw error; });
      streetBeat = Promise.all([run("world-pulse", {}), aliases]).then(([pulse, alias]) => streetPulse(pulse, alias), (error) => { streetBeat = undefined; throw error; });
    }
    return streetBeat;
  };
  const since = (ctx) => {
    const value = Number(ctx?.url?.searchParams?.get("since") ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  };
  return { resources: [...assets, {
    id: "ops-world.door",
    match: "/",
    methods: ["GET"],
    public: true,
    produces: ["text/html"],
    handler: async (ctx) => ctx.locals?.principal
      ? { status: 303, headers: { location: await landing(ctx.locals.principal) }, cacheControl: { noStore: true } }
      : htmlRepr(doorPage(title), { cacheControl: { noStore: true } }),
  }, {
    id: "ops-world.street",
    match: "/play/atlas/street",
    methods: ["GET"],
    public: true,
    produces: ["application/json"],
    handler: async () => jsonRepr(await streetOf(), { cacheControl: { visibility: "public", maxAge: 600 } }),
  }, {
    id: "ops-world.street-pulse",
    match: "/play/pulse/street",
    methods: ["GET"],
    public: true,
    produces: ["application/json"],
    handler: async () => jsonRepr(await streetPulseOf(), { cacheControl: { visibility: "public", maxAge: 2 } }),
  }, {
    id: "ops-world.pulse",
    match: "/play/pulse",
    methods: ["GET"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return { status: 401 };
      return jsonRepr(await runAs(subjectOf(principal), "world-pulse", { since: since(ctx) }), { cacheControl: { noStore: true } });
    },
  }, {
    // What the work arena told, for one signed in: the street never hears what was said.
    id: "ops-world.tellings",
    match: "/play/tellings",
    methods: ["GET"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return { status: 401 };
      const limit = Number(ctx?.url?.searchParams?.get("limit") ?? 0);
      return jsonRepr(await runAs(subjectOf(principal), "world-tellings", { since: since(ctx), ...(Number.isSafeInteger(limit) && limit > 0 && limit <= 400 ? { limit } : {}) }), { cacheControl: { noStore: true } });
    },
  }, {
    // What awaits the person's own move on the work board, for the view's quest tracker.
    id: "ops-world.journal",
    match: "/play/journal",
    methods: ["GET"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return { status: 401 };
      return jsonRepr(await runAs(subjectOf(principal), "world-journal", {}), { cacheControl: { noStore: true } });
    },
  }, {
    id: "ops-world.atlas",
    match: "/play/atlas",
    methods: ["GET"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return { status: 401 };
      return jsonRepr(await runAs(subjectOf(principal), "world-atlas", {}), { cacheControl: { visibility: "private", maxAge: 300 } });
    },
  }, {
    id: "ops-world.turn",
    match: "/play/turn",
    methods: ["POST"],
    produces: ["application/json"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return { status: 401 };
      if (!sameOrigin(ctx.req.headers)) return { status: 403 };
      const subject = subjectOf(principal);
      const line = String((await readJsonBody(ctx.req, { maxBytes: 64 * 1024 }))?.line ?? "").trim();
      if (line === "") return jsonRepr({ error: "Say something: a line is a MUD command." }, { status: 400, cacheControl: { noStore: true } });
      let turn;
      try {
        if (!transcripts.has(subject)) append(subject, turnLines(await runAs(subject, "world-connect", {})));
        turn = await runAs(subject, "world-command", { line, frame: true });
      } catch (error) {
        append(subject, [`> ${line}`, `✗ ${error?.message ?? String(error)}`]);
        return jsonRepr({ error: error?.message ?? String(error) }, { status: 502, cacheControl: { noStore: true } });
      }
      // The page's transcript is the text tier of the same play: a reload shows what was drawn.
      if (turn.frame) perceptions.set(subject, turn.frame);
      append(subject, [`> ${line}`, ...turnLines(turn)]);
      return jsonRepr(turn, { cacheControl: { noStore: true } });
    },
  }, {
    id: "ops-world.client",
    match: "/play",
    methods: ["GET", "POST"],
    produces: ["text/html"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return ctx.req.method === "GET" ? { status: 303, headers: { location: "/sign-in?return_to=%2Fplay" } } : { status: 401 };
      const subject = subjectOf(principal);
      if (ctx.req.method === "GET") {
        const lines = transcripts.get(subject) ?? append(subject, await turn(subject, "world-connect", {}));
        return page(lines, subject);
      }
      if (!sameOrigin(ctx.req.headers)) return { status: 403 };
      const line = String((await readFormBody(ctx.req, { maxBytes: 64 * 1024 })).get("line") ?? "").trim();
      if (line === "") return page(transcripts.get(subject) ?? [], subject);
      if (!transcripts.has(subject)) append(subject, await turn(subject, "world-connect", {}));
      return page(append(subject, [`> ${line}`, ...(await turn(subject, "world-command", { line }))]), subject);
    },
  }] };
}

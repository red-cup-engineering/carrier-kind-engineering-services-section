/**
 * Obligations: what the house needs a person to do with their own hands, such as giving consent
 * that only the holder of an account can give. Sections declare obligation sources; each says
 * which characters an obligation is to, and how to walk it. A signed-in person sees the
 * obligations addressed to the characters their account bears (MetroPlat's `account` reading),
 * lands on them at sign-in while any wait, and is walked through each one step by step in the
 * browser. A walk's private material (an OAuth verifier, say) stays on the node, owner-only, for
 * thirty minutes; the browser carries only the steps.
 *
 * An obligation source is a package export the instance's configuration names
 * (`obligationSources: [{ module, export, configuration }]`), resolved from the enterprise host
 * like the instance's own applications. Its factory takes the configuration with the node's
 * `repositoryRoot` and returns `{ id, title, obligations(), start(id), finish(id, memo, value, fields) }`:
 * obligations lists `{ id, to, title, why }`; start returns `{ steps, link?, input, memo }` (input is one text field `{ label, placeholder?, description?, secret?, submit? }`, or `{ fields: [{ name, label, options: [{ value, label }] }] }` for a short form of choices);
 * finish completes the walk from the person's input (the single value, and the form's fields) and returns `{ title, content }`, or throws
 * a refusal the person can act on.
 * @module
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { htmlRepr } from "@red-cup-engineering/http-services-section/representation";
import { readFormBody } from "@red-cup-engineering/http-services-section/body";
import { subjectOf } from "@red-cup-engineering/computer-networking-engineering-services-section/identity/subject";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine/rendering";

const BODY_LIMIT = 16 * 1024;
const WALK_MS = 30 * 60 * 1000;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const walkHref = (source, id) => `/obligations/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;

function sameOrigin(headers) {
  if (headers.authorization !== undefined) return true;
  try { return new URL(headers.origin ?? "").host === headers.host; } catch { return false; }
}

/** The declared sources, imported once from the enterprise host; a source that fails is retried next time. */
function obligationSources(declared) {
  const require = createRequire(process.env.FELTOS_ENTERPRISE_HOST ?? import.meta.url);
  const loaded = new Map();
  return () => Promise.all(declared.map(async (entry) => {
    const key = `${entry.module}#${entry.export}`;
    if (!loaded.has(key)) {
      loaded.set(key, import(pathToFileURL(require.resolve(entry.module)).href).then((imported) => {
        if (typeof imported[entry.export] !== "function") throw new TypeError(`${entry.module} does not export ${entry.export}`);
        return imported[entry.export]({ ...(entry.configuration ?? {}), repositoryRoot: process.env.METROPLAT_REPOSITORY_ROOT });
      }));
    }
    try { return { source: await loaded.get(key) }; }
    catch (error) { loaded.delete(key); return { failed: key, error: error?.message ?? String(error) }; }
  }));
}

function walkStore(stateDir) {
  const dir = join(stateDir, "obligation-walks");
  const path = (subject, source, id) => join(dir, `${createHash("sha256").update(JSON.stringify([subject, source, id])).digest("hex")}.json`);
  return {
    read(subject, source, id) {
      try {
        const walk = JSON.parse(readFileSync(path(subject, source, id), "utf8"));
        return Date.parse(walk.expiresAt) > Date.now() ? walk : undefined;
      } catch { return undefined; }
    },
    write(subject, source, id, started) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const walk = { ...started, expiresAt: new Date(Date.now() + WALK_MS).toISOString() };
      const temp = `${path(subject, source, id)}.${process.pid}.tmp`;
      writeFileSync(temp, `${JSON.stringify(walk)}\n`, { mode: 0o600 });
      renameSync(temp, path(subject, source, id));
      return walk;
    },
    end(subject, source, id) { rmSync(path(subject, source, id), { force: true }); },
  };
}

/** `/obligations` and the walks under it, and where a person lands at sign-in. */
export function obligationsApp({ stateDir, sources: declared = [], runAs, navigation: links, navigationTitle = "Group" }) {
  const navigation = Object.assign([...links], { title: navigationTitle });
  const sources = obligationSources(declared);
  const walks = walkStore(stateDir);
  const page = (title, tiles, status = 200) => htmlRepr(renderTufteDocument({
    title, tiles: [{ title: navigation.title, links: navigation, span: 12 }, ...tiles],
  }), { status, cacheControl: { noStore: true } });

  /** Every obligation addressed to a character this subject's account bears. */
  const owed = async (subject) => {
    const reading = await runAs(subject, "account", {});
    const bearers = new Set([subject, ...(reading?.bearers ?? [])]);
    const owing = [], unread = [];
    for (const loaded of await sources()) {
      if (loaded.failed) { unread.push(loaded); continue; }
      try {
        for (const obligation of await loaded.source.obligations()) {
          if (obligation.to.some((character) => bearers.has(character))) owing.push({ source: loaded.source, obligation });
        }
      } catch (error) { unread.push({ failed: loaded.source.title ?? loaded.source.id, error: error?.message ?? String(error) }); }
    }
    return { owing, unread };
  };
  const find = async (subject, sourceId, id) => {
    const { owing, unread } = await owed(subject);
    return { found: owing.find(({ source, obligation }) => source.id === sourceId && obligation.id === id), unread };
  };
  const unreadTiles = (unread) => unread.map(({ failed, error }) => ({ title: "Could not read every source", span: 12, content: `${failed}: ${error}` }));

  const listPage = ({ owing, unread }) => page("Obligations", [
    ...(owing.length === 0 && unread.length === 0 ? [{ title: "Nothing waits on you", span: 12, html: `<p>The house needs nothing from you right now.</p><p><a href="/play">Go to the city</a></p>` }] : []),
    ...owing.map(({ source, obligation }) => ({
      title: obligation.title, span: 12,
      html: `<p>${escapeHtml(obligation.why)}</p><p><a href="${escapeHtml(walkHref(source.id, obligation.id))}"><strong>Walk me through it</strong></a></p><p><small>From ${escapeHtml(source.title ?? source.id)}</small></p>`,
    })),
    ...unreadTiles(unread),
  ]);

  const walkPage = (sourceId, obligation, walk, notice, status = 200) => page(obligation.title, [
    ...(notice ? [{ title: notice.title, span: 12, content: notice.content }] : []),
    { title: "Why", span: 12, content: obligation.why },
    { title: "Steps", span: 12, html: [
      `<ol>${walk.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`,
      walk.link ? `<p><a href="${escapeHtml(walk.link.href)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(walk.link.label)}</strong></a></p>` : "",
    ].join("") },
    { title: "Finish", span: 12, form: { action: walkHref(sourceId, obligation.id), method: "post", fields: walk.input.fields
      ? walk.input.fields.map((field) => ({ name: field.name, kind: "select", label: field.label, required: true, ...(field.description ? { description: field.description } : {}), options: field.options.map((option) => ({ value: option.value, label: option.label })) }))
      : [
        { name: "value", kind: walk.input.secret ? "password" : "text", label: walk.input.label, required: true, autocomplete: "off", ...(walk.input.placeholder ? { placeholder: walk.input.placeholder } : {}), ...(walk.input.description ? { description: walk.input.description } : {}) },
      ], submitters: [{ label: walk.input.submit ?? "Connect" }] } },
    { title: "Stuck?", span: 12, html: `<p>This walk stays open for thirty minutes. <a href="${escapeHtml(walkHref(sourceId, obligation.id))}?again=1">Start over</a> for a fresh link, or go back to <a href="/obligations">your obligations</a>.</p>` },
  ], status);

  const signIn = (path) => ({ status: 303, headers: { location: `/sign-in?return_to=${encodeURIComponent(path)}` }, cacheControl: { noStore: true } });

  const list = async (ctx) => {
    const principal = ctx.locals?.principal;
    if (!principal) return signIn("/obligations");
    return listPage(await owed(subjectOf(principal)));
  };

  const walk = async (ctx) => {
    const principal = ctx.locals?.principal;
    const { source: sourceId, id } = ctx.params;
    if (!principal) return signIn(walkHref(sourceId, id));
    const subject = subjectOf(principal);
    const { found, unread } = await find(subject, sourceId, id);
    if (!found && unread.length) return page("Obligations unavailable", [
      ...unreadTiles(unread),
      { title: "This obligation has not been reconciled", span: 12, html: `<p>Its source could not be read. This does not mean it is done.</p><p><a href="/obligations">Your obligations</a></p>` },
    ], 503);
    if (!found) return page("Obligations", [{ title: "Nothing to walk", span: 12, html: `<p>This isn't waiting on you, or it's already done.</p><p><a href="/obligations">Your obligations</a></p>` }], 404);
    if (ctx.req.method === "GET") {
      const again = ctx.url?.searchParams?.get("again") === "1";
      const current = again ? undefined : walks.read(subject, sourceId, id);
      return walkPage(sourceId, found.obligation, current ?? walks.write(subject, sourceId, id, await found.source.start(id)));
    }
    if (!sameOrigin(ctx.req.headers)) return { status: 403 };
    const current = walks.read(subject, sourceId, id);
    if (!current) return walkPage(sourceId, found.obligation, walks.write(subject, sourceId, id, await found.source.start(id)), { title: "That walk expired", content: "Walks last thirty minutes. Here is a fresh one: start again from step 1." }, 409);
    const fields = Object.fromEntries(await readFormBody(ctx.req, { maxBytes: BODY_LIMIT }));
    let done;
    try { done = await found.source.finish(id, current.memo, String(fields.value ?? ""), fields); }
    catch (error) { return walkPage(sourceId, found.obligation, current, { title: "Not yet", content: error?.message ?? String(error) }, 400); }
    walks.end(subject, sourceId, id);
    const rest = await owed(subject);
    return page(done.title, [
      ...unreadTiles(rest.unread),
      { title: done.title, span: 12, html: `<p>${escapeHtml(done.content)}</p><p><a href="${rest.owing.length > 0 || rest.unread.length > 0 ? "/obligations" : "/play"}">${rest.owing.length > 0 ? `Next: ${rest.owing.length} more waiting` : rest.unread.length > 0 ? "Review unread obligation sources" : "Go to the city"}</a></p>` },
    ]);
  };

  return {
    /** Where a signed-in person lands: their obligations while any wait, else the city. */
    landing: async (principal) => {
      try { const { owing, unread } = await owed(subjectOf(principal)); return owing.length > 0 || unread.length > 0 ? "/obligations" : "/play"; }
      catch { return "/obligations"; }
    },
    resources: [
      { id: "ops-obligations", match: "/obligations", methods: ["GET"], produces: ["text/html"], handler: list },
      {
        id: "ops-obligations.walk",
        match: (path) => {
          const parts = path.startsWith("/obligations/") ? path.slice("/obligations/".length).split("/") : [];
          if (parts.length !== 2 || parts.some((part) => part === "")) return false;
          try { return { source: decodeURIComponent(parts[0]), id: decodeURIComponent(parts[1]) }; } catch { return false; }
        },
        methods: ["GET", "POST"], produces: ["text/html"], handler: walk,
      },
    ],
  };
}


/**
 * The bare-cedar-fog.561.group control plane: `/world`, `/world/:address`, `/records`, `/records/<path>`,
 * `/tasks`, `/tasks/view`, `/books`, `/books/view`, and `/books/report` read; `POST /tasks` admits
 * work into MetroPlat as the signed-in person. Every route is behind the same admission gate as
 * `/mcp`, which names the principal; OPS_DATA_DIR is only read.
 * @module
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { htmlRepr, jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { readFormBody, readJsonBody } from "@red-cup-engineering/http-services-section/body";
import { assertStructuredWorkIntent } from "@red-cup-engineering/feltos/work/structured-intent";
import { current, entities, unique, execute, foldIndependentEvidence, independentEvidenceRow } from "@red-cup-engineering/eavt-services-section";
import { LEDGER_REPORT_NAMES, readMetroplatBooks, renderBooksHtml } from "./books.mjs";
import { openingOfText, readMetroplatTaskList, renderTaskListHtml, workIntentOfOutline } from "./task-list.mjs";
import { fromSection } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket } from "@red-cup-engineering/web-page-tiling-engine";

const CONTROL_PLANE_LINKS = Object.freeze([
  { href: "/play", label: "Play" }, { href: "/network", label: "Network" }, { href: "/tasks/view", label: "Work" },
  { href: "/world", label: "World" }, { href: "/records", label: "Records" },
  { href: "/books/view", label: "Books" },
]);

// Bind source readings to the shared presentation components; this app owns no HTML.
export function readingHtml(navigation, value, title, url, links = [], tiles = []) {
  return renderTuftePacket(fromSection({ affirmed: [{ predicate: "reading", object: value, citation: url }] }, { subject: url, title }),
    { source: url, settlement: value, projection: "ops.reading.tufte" }, {
      title,
      tiles: [{ title: navigation.title ?? "Group", links: navigation, span: 12 },
        ...tiles,
        ...(links.length ? [{ title: "Objects", links, span: 12 }] : []),
        { title: "Details", data: value, span: 12 }],
    }).html;
}

function withReadingViews(resources, navigation) {
  return { resources: resources.map((resource) => {
    if (!resource.produces?.includes("application/json")) return resource;
    const present = (reply, ctx) => {
      if (!String(ctx?.req?.headers?.accept ?? "").includes("text/html") || (reply.status ?? 200) >= 400) return reply;
      const value = JSON.parse(reply.body);
      const url = ctx?.url?.pathname ?? resource.match;
      const links = Array.isArray(value.entities) ? value.entities.map((id) => ({ href: "/world/" + encodeURIComponent(id), label: id }))
        : Array.isArray(value.records) ? value.records.map((path) => ({ href: "/records/" + path.split("/").map(encodeURIComponent).join("/"), label: path }))
        : [];
      return htmlRepr(readingHtml(navigation, value, resource.id.replace("ops-control-plane.", ""), url, links), { cacheControl: { noStore: true } });
    };
    return { ...resource, produces: [...resource.produces, "text/html"], handler: (ctx) => {
      const reply = resource.handler(ctx);
      return reply?.then ? reply.then((value) => present(value, ctx)) : present(reply, ctx);
    } };
  }) };
}

const WORLD_STRATA = new Set(["asserted", "saturated", "settled"]);

// Historical assertion rows witness the positive side; null rows retract earlier assertions.
function settledWorldEntity(address, rows) {
  return foldIndependentEvidence({ subject: address, rows: current(rows).map((row) => independentEvidenceRow({
    subject: row.e, predicate: row.a, object: row.v, side: "positive", by: "world.eavt", witness: row,
  })) });
}

function stratifiedEntities(rows, stratum) {
  const facts = stratum === "asserted" ? unique(rows) : current(rows);
  const addresses = entities(facts);
  return stratum === "settled" ? addresses.filter((address) =>
    settledWorldEntity(address, facts).fiber.some((cell) => cell.predicate === "constituted" && cell.value.pos === 1)) : addresses;
}

// readWorldRows(worldPath) — the world.eavt rows, or an empty trace when the file does not yet
// exist (a freshly provisioned OPS_DATA_DIR has not been pushed any state yet).
function readWorldRows(worldPath) {
  try {
    return execute({ operation: "read", path: worldPath });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

// listRecordFiles(root) — every "*.json" file under root, as root-relative POSIX paths, sorted.
function listRecordFiles(root) {
  const out = [];
  function walk(dir, prefix) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), relPath);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(relPath);
    }
  }
  walk(root, "");
  return out.sort();
}

// resolveRecordPath(root, relPath) — path-traversal-hardened resolution: decode each "/"-separated
// segment on its own (never the whole string at once, so an encoded "/" cannot introduce a segment
// boundary the caller did not name), resolve against root, and refuse anything that does not land
// strictly inside root. Returns null on refusal instead of throwing, so the caller renders one
// uniform 400 rather than leaking a stack distinguishing "traversal" from "decode error".
function resolveRecordPath(root, relPath) {
  let decoded;
  try {
    decoded = relPath.split("/").map((segment) => decodeURIComponent(segment)).join("/");
  } catch {
    return null;
  }
  const resolved = resolve(root, decoded);
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

const BODY_LIMIT = 256 * 1024;

/**
 * `POST /tasks`: write work as the signed-in person, who is its player whatever the body says.
 * A form opens a thread on the work board (a request, report, proposal or question, in the
 * person's words) or posts an outline, and returns to the work view. JSON accepts a typed opening
 * (`{ move, ... }`, as `work-open` takes it), an `{ outline }` or a structured work intent, and
 * returns MetroPlat's answer.
 */
function workAdmission(run, runAs, navigation) {
  const refused = (status, error, reason) => jsonRepr({ error, reason }, { status, cacheControl: { noStore: true } });
  return {
    id: "ops-control-plane.tasks-admit",
    match: "/tasks",
    methods: ["POST"],
    produces: ["application/json", "text/html"],
    handler: async (ctx) => {
      const principal = ctx.locals?.principal;
      if (!principal) return refused(401, "access-required", "sign in to write work");
      const headers = ctx.req.headers;
      const form = !/^application\/json\b/iu.test(headers["content-type"] ?? "");
      // A browser's cookie is sent cross-site too; only this origin's pages may post as the person.
      if (form && headers.authorization === undefined) {
        let from;
        try { from = new URL(headers.origin ?? "").host; } catch { from = undefined; }
        if (from !== headers.host) return refused(403, "cross-origin", "work is written from ops's own pages");
      }
      // A bearer principal is already the authorization server's subject, as over /mcp.
      const producer = principal.provider === "bearer" ? principal.subjectHash : `${principal.provider}:${principal.subjectHash}`;
      let body;
      let intent;
      let opening;
      try {
        if (form) {
          const fields = await readFormBody(ctx.req, { maxBytes: BODY_LIMIT });
          body = fields.has("text") ? { move: fields.get("move") ?? "request", text: fields.get("text") } : {
            outline: fields.get("outline") ?? "",
            ...(fields.has("parentScope") ? { parentScope: fields.get("parentScope"), parentSubject: fields.get("parentSubject"), parentWitness: fields.get("parentWitness") } : {}),
          };
        } else body = await readJsonBody(ctx.req, { maxBytes: BODY_LIMIT });
        const externalParent = body?.parentScope === undefined ? undefined : {
          scope: body.parentScope, subject: body.parentSubject, witness: body.parentWitness,
        };
        if (typeof body?.move === "string") {
          opening = typeof body.text === "string" ? openingOfText(body.move, body.text) : body;
        } else {
          intent = typeof body?.outline === "string" ? workIntentOfOutline(body.outline, producer, externalParent, body.need)
            : assertStructuredWorkIntent({ ...body, producer: { id: producer } });
        }
      } catch (error) {
        if (!form) return refused(error?.status ?? 400, "bad_work", error.message);
        let readout;
        try { readout = await readMetroplatTaskList(run); } catch { readout = { tasks: [], milestones: [], roadmapMilestones: [] }; }
        return htmlRepr(renderTaskListHtml(readout, { navigation, scope: body?.parentScope, outline: body?.outline, need: body?.need, text: body?.text, error: error.message }), { status: 400, cacheControl: { noStore: true } });
      }
      let admission;
      try {
        admission = opening !== undefined
          ? await runAs(producer, "work-open", opening)
          : await run("structured-work-intent-admit", intent);
      } catch (error) {
        if (ctx?.signal?.aborted) throw error;
        if (opening !== undefined && error instanceof TypeError) {
          if (!form) return refused(400, "bad_work", error.message);
          let readout;
          try { readout = await readMetroplatTaskList(run); } catch { readout = { tasks: [], milestones: [], roadmapMilestones: [] }; }
          return htmlRepr(renderTaskListHtml(readout, { navigation, text: body?.text, error: error.message }), { status: 400, cacheControl: { noStore: true } });
        }
        return refused(502, "bad_gateway", "MetroPlat did not admit the work");
      }
      if (admission.peerHandoff === "failed") {
        const message = "Work was opened locally, but peer handoff could not be queued. Open the same thread again to retry.";
        if (!form) return jsonRepr({ ...admission, message }, { status: 202, cacheControl: { noStore: true } });
        let readout;
        try { readout = await readMetroplatTaskList(run); } catch { readout = { tasks: [], milestones: [], roadmapMilestones: [] }; }
        return htmlRepr(renderTaskListHtml(readout, { navigation, text: body?.text, error: message }), { status: 202, cacheControl: { noStore: true } });
      }
      if (form) return { status: 303, headers: { location: body?.parentScope ? `/tasks/view?scope=${encodeURIComponent(body.parentScope)}` : "/tasks/view" }, cacheControl: { noStore: true } };
      return jsonRepr(admission, { status: admission?.status === "admitted" ? 201 : 200, cacheControl: { noStore: true } });
    },
  };
}

export function controlPlaneApp(dataDir, { runAs, run = () => { throw new Error("MetroPlat is not federated"); }, navigationTitle = "Group", navigationLinks = [] } = {}) {
  const navigation = Object.freeze(Object.assign([...CONTROL_PLANE_LINKS, ...navigationLinks], { title: navigationTitle }));
  const resources = [
    {
      id: "ops-control-plane.network",
      match: "/network", methods: ["GET"], produces: ["text/html"],
      // The world is where a person starts: they enter as their character, at their office.
      handler: () => ({ status: 303, headers: { location: "/play" }, cacheControl: { noStore: true } }),
    },
    {
      id: "ops-control-plane.tasks",
      match: "/tasks",
      methods: ["GET"],
      produces: ["application/json"],
      handler: async (ctx) => {
        try {
          return jsonRepr(await readMetroplatTaskList(run));
        } catch (error) {
          if (ctx?.signal?.aborted) throw error;
          return jsonRepr(
            { error: "bad_gateway", reason: "MetroPlat did not complete the canonical work reading" },
            { status: 502, cacheControl: { noStore: true } },
          );
        }
      },
    },
    {
      id: "ops-control-plane.tasks-view",
      match: "/tasks/view",
      methods: ["GET"],
      produces: ["text/html"],
      handler: async (ctx) => {
        try {
          return htmlRepr(renderTaskListHtml(
            await readMetroplatTaskList(run),
            { navigation, scope: ctx?.url?.searchParams?.get("scope") ?? undefined },
          ));
        } catch (error) {
          if (ctx?.signal?.aborted) throw error;
          return htmlRepr(
            readingHtml(navigation, { error: "work_unavailable" }, "Work is unavailable", "/tasks"),
            { status: 502, cacheControl: { noStore: true } },
          );
        }
      },
    },
    {
      id: "ops-control-plane.books",
      match: "/books",
      methods: ["GET"],
      produces: ["application/json"],
      handler: async (ctx) => {
        try {
          return jsonRepr(await readMetroplatBooks(run));
        } catch (error) {
          if (ctx?.signal?.aborted) throw error;
          return jsonRepr(
            { error: "bad_gateway", reason: "MetroPlat did not complete the ledger reading" },
            { status: 502, cacheControl: { noStore: true } },
          );
        }
      },
    },
    {
      id: "ops-control-plane.books-view",
      match: "/books/view",
      methods: ["GET"],
      produces: ["text/html"],
      handler: async (ctx) => {
        try {
          return htmlRepr(renderBooksHtml(
            await readMetroplatBooks(run),
            { navigation },
          ));
        } catch (error) {
          if (ctx?.signal?.aborted) throw error;
          return htmlRepr(
            readingHtml(navigation, { error: "books_unavailable" }, "Ledger books are unavailable", "/books"),
            { status: 502, cacheControl: { noStore: true } },
          );
        }
      },
    },
    {
      id: "ops-control-plane.books-report",
      match: "/books/report",
      methods: ["GET"],
      produces: ["application/json"],
      handler: async (ctx) => {
        const params = ctx?.url?.searchParams;
        const report = params?.get("report") ?? undefined;
        if (!LEDGER_REPORT_NAMES.includes(report)) {
          return jsonRepr(
            { error: "bad_report", reason: `report must be one of ${LEDGER_REPORT_NAMES.join(", ")}` },
            { status: 400, cacheControl: { noStore: true } },
          );
        }
        const input = { report };
        for (const key of ["begin", "end", "account"]) {
          const value = params?.get(key);
          if (value !== null && value !== undefined) input[key] = value;
        }
        const depthParam = params?.get("depth");
        if (depthParam !== null && depthParam !== undefined && depthParam !== "") {
          const depth = Number(depthParam);
          if (Number.isFinite(depth)) input.depth = depth;
        }
        try {
          return jsonRepr(await run("ledger-report", input));
        } catch (error) {
          if (ctx?.signal?.aborted) throw error;
          return jsonRepr(
            { error: "bad_gateway", reason: "MetroPlat did not complete the ledger report reading" },
            { status: 502, cacheControl: { noStore: true } },
          );
        }
      },
    },
  ];
  const admit = workAdmission(run, runAs, navigation);
  if (dataDir === undefined) return { resources: [...withReadingViews(resources, navigation).resources, admit] };
  const worldPath = join(dataDir, "world.eavt");
  const recordsRoot = join(dataDir, "records");
  resources.push(
    {
      id: "ops-control-plane.world",
      match: "/world",
      methods: ["GET"],
      produces: ["application/json"],
      handler: (ctx) => {
        const stratum = ctx?.url?.searchParams?.get("stratum") ?? "settled";
        if (!WORLD_STRATA.has(stratum)) {
          return jsonRepr(
            { error: "bad_stratum", reason: `stratum must be one of ${[...WORLD_STRATA].join(", ")}` },
            { status: 400, cacheControl: { noStore: true } },
          );
        }
        return jsonRepr({ stratum, entities: stratifiedEntities(readWorldRows(worldPath), stratum) });
      },
    },
    {
      id: "ops-control-plane.world-entity",
      match: (path) => path.startsWith("/world/") ? { address: decodeURIComponent(path.slice("/world/".length)) } : false,
      methods: ["GET"],
      produces: ["application/json"],
      handler: (ctx) => jsonRepr(settledWorldEntity(ctx.params.address, readWorldRows(worldPath))),
    },
    {
      id: "ops-control-plane.records",
      match: "/records",
      methods: ["GET"],
      produces: ["application/json"],
      handler: () => jsonRepr({ records: listRecordFiles(recordsRoot) }),
    },
    {
      id: "ops-control-plane.record",
      match: (path) => path.startsWith("/records/") ? { relPath: path.slice("/records/".length) } : false,
      methods: ["GET"],
      produces: ["application/json"],
      handler: (ctx) => {
        const resolved = resolveRecordPath(recordsRoot, ctx.params.relPath);
        if (resolved === null) {
          return jsonRepr({ error: "forbidden", reason: "path escapes the records root" }, { status: 400, cacheControl: { noStore: true } });
        }
        let text;
        try {
          text = readFileSync(resolved, "utf8");
        } catch (error) {
          if (error?.code === "ENOENT" || error?.code === "EISDIR") {
            return jsonRepr({ error: "not_found", reason: "no such record" }, { status: 404, cacheControl: { noStore: true } });
          }
          throw error;
        }
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          return jsonRepr({ error: "not_json", reason: "record file did not parse as JSON" }, { status: 502, cacheControl: { noStore: true } });
        }
        return jsonRepr(parsed);
      },
    },
  );
  return { resources: [...withReadingViews(resources, navigation).resources, admit] };
}

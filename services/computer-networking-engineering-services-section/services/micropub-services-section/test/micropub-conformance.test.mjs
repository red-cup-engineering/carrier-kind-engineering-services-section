// Micropub (W3C Recommendation) conformance, one case per requirement and per micropub.rocks
// server test family: 100s form create, 200s JSON create, 300s update, 400s delete/undelete,
// 500s media, 600s queries, 800s authentication.
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { serializeMultipartForm } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/multipart-form-data";
import { micropubFormAccessToken, parseMicropubForm, parseMicropubJson } from "../src/codec.mjs";
import { micropubApp } from "../src/resource.mjs";
import { applyMicropubUpdate, micropubChangeRelations, micropubSourceResponse, sourceCells, sourceFromCells } from "../src/source.mjs";

const SITE = "https://site.example";
const verifyToken = async (token) => (token === "good" ? { me: "https://author.example/", scope: "create update delete media" } : null);

function ctx(method, url, { body = "", type, token = "good", header = true } = {}) {
  const req = Readable.from([body]);
  Object.assign(req, { method, url: new URL(url).pathname + new URL(url).search, headers: { ...(header && token ? { authorization: `Bearer ${token}` } : {}), ...(type ? { "content-type": type } : {}) } });
  return { req, url: new URL(url) };
}
const FORM = "application/x-www-form-urlencoded";
const post = (resource, body, opts = {}) => resource.handler(ctx("POST", `${SITE}/micropub`, { body, type: FORM, ...opts }));
const jsonPost = (resource, value, opts = {}) => resource.handler(ctx("POST", `${SITE}/micropub`, { body: JSON.stringify(value), type: "application/json", ...opts }));
const parsed = (response) => JSON.parse(String(response.body));

// -- 3.1.1, 3.2, 3.3: syntax -------------------------------------------------------------------------
test("rocks 100-101: h=entry form create; category[]=a&category[]=b is an array; a bare value is a one-element array", () => {
  const c = parseMicropubForm(new URLSearchParams("h=entry&content=hello+world&category[]=foo&category[]=bar"));
  assert.deepEqual(c.type, ["h-entry"]);
  assert.deepEqual(c.properties, { content: ["hello world"], category: ["foo", "bar"] });
  assert.deepEqual(parseMicropubForm(new URLSearchParams("h=entry&category=foo")).properties.category, ["foo"]);
  assert.deepEqual(parseMicropubForm(new URLSearchParams("content=x")).type, ["h-entry"], "h-entry is the default type");
});
test("3.2: mp-* are server commands and access_token is never stored in the post", () => {
  const c = parseMicropubForm(new URLSearchParams("h=entry&content=x&mp-slug=my-post&mp-syndicate-to[]=a&mp-syndicate-to[]=b&access_token=secret"));
  assert.deepEqual(c.properties, { content: ["x"] });
  assert.deepEqual(c.mp, { slug: ["my-post"], "syndicate-to": ["a", "b"] });
  assert.equal(micropubFormAccessToken(new URLSearchParams("access_token=secret&h=entry")), "secret");
  const j = parseMicropubJson({ type: ["h-entry"], properties: { content: ["x"], "mp-slug": ["s"] } });
  assert.deepEqual([j.properties, j.mp], [{ content: ["x"] }, { slug: ["s"] }]);
});
test("rocks 200-205: JSON create keeps arrays, HTML content, alt-text photos, nested objects and unrecognized properties", () => {
  const c = parseMicropubJson({ type: ["h-entry"], properties: {
    content: [{ html: "<b>hi</b>" }], photo: [{ value: "https://p.example/a.jpg", alt: "A" }],
    weight: [{ type: ["h-measure"], properties: { num: ["70.64"], unit: ["kg"] } }], "x-unknown": ["kept"] } });
  assert.deepEqual(c.properties.content, [{ html: "<b>hi</b>" }]);
  assert.deepEqual(c.properties.photo[0], { value: "https://p.example/a.jpg", alt: "A" });
  assert.equal(c.properties.weight[0].properties.unit[0], "kg");
  assert.deepEqual(c.properties["x-unknown"], ["kept"]);
});

// -- 3.3.6, 3.8 and the 800s: responses and authentication --------------------------------------------
test("rocks 100/200: a create answers 201 with the Location of the post; 202 when the writer accepts asynchronously", async () => {
  const app = micropubApp({ verifyToken, write: async () => ({ url: `${SITE}/p/1` }) });
  const r = await post(app.resources[0], "h=entry&content=hi");
  assert.equal(r.status, 201);
  assert.equal(r.headers.location, `${SITE}/p/1`);
  const accepted = micropubApp({ verifyToken, write: async () => ({ url: `${SITE}/p/2`, accepted: true }) });
  assert.equal((await jsonPost(accepted.resources[0], { type: ["h-entry"], properties: { content: ["x"] } })).status, 202);
});
test("rocks 801-802: the token is accepted in the Authorization header or the form access_token", async () => {
  const seen = [];
  const app = micropubApp({ verifyToken, write: async (command, auth) => { seen.push([command.properties, auth.subject]); return { url: `${SITE}/p/1` }; } });
  assert.equal((await post(app.resources[0], "h=entry&content=a")).status, 201);
  const viaForm = await post(app.resources[0], "h=entry&content=b&access_token=good", { header: false });
  assert.equal(viaForm.status, 201);
  assert.deepEqual(seen[1], [{ content: ["b"] }, "https://author.example/"], "the token never reaches the post");
});
test("RFC 6750 2: a token by two methods is refused", async () => {
  const app = micropubApp({ verifyToken, write: async () => ({ url: `${SITE}/p/1` }) });
  const r = await post(app.resources[0], "h=entry&content=a&access_token=good");
  assert.equal(r.status, 400);
  assert.equal(parsed(r).error, "invalid_request");
});
test("3.8: no token is 401 unauthorized; a token without permission is 403 forbidden; too little scope is 401 insufficient_scope", async () => {
  const app = micropubApp({ verifyToken: async (t) => (t === "narrow" ? { scope: "create" } : t === "good" ? { scope: "create update delete" } : null), write: async () => ({ url: `${SITE}/p/1` }) });
  const none = await post(app.resources[0], "h=entry&content=a", { header: false });
  assert.deepEqual([none.status, parsed(none).error], [401, "unauthorized"]);
  assert.match(none.headers["www-authenticate"], /^Bearer /);
  const bad = await post(app.resources[0], "h=entry&content=a", { token: "bogus" });
  assert.deepEqual([bad.status, parsed(bad).error], [403, "forbidden"]);
  const narrow = await post(app.resources[0], "action=delete&url=https%3A%2F%2Fsite.example%2Fp%2F1", { token: "narrow" });
  assert.deepEqual([narrow.status, parsed(narrow).error], [401, "insufficient_scope"]);
  assert.match(narrow.headers["www-authenticate"], /insufficient_scope/);
  assert.equal((await app.resources[0].handler(ctx("GET", `${SITE}/micropub?q=config`, { header: false }))).status, 401);
});
test("a request the writer never sees: unsupported media type is 400 invalid_request", async () => {
  let writes = 0;
  const app = micropubApp({ verifyToken, write: async () => { writes += 1; return {}; } });
  const r = await app.resources[0].handler(ctx("POST", `${SITE}/micropub`, { body: "x", type: "text/plain" }));
  assert.deepEqual([r.status, parsed(r).error, writes], [400, "invalid_request", 0]);
});

// -- 3.3.1: file upload to the Micropub endpoint (multipart) ---------------------------------------------
const multipartBody = () => {
  const boundary = "553d9cee2030456a81931fb708ece92c";
  const body = serializeMultipartForm([
    { name: "h", data: "entry" }, { name: "content", data: "Hello World!" },
    { name: "photo", filename: "aaronpk.png", contentType: "image/png", data: Buffer.from([1, 2, 3]) },
  ], boundary);
  return { body: body.toString("latin1"), type: `multipart/form-data; boundary=${boundary}` };
};
test("rocks 107: a multipart create with a photo part hands the file to the writer when no media store is configured", async () => {
  let command;
  const app = micropubApp({ verifyToken, write: async (c) => { command = c; return { url: `${SITE}/p/1` }; } });
  assert.equal((await app.resources[0].handler(ctx("POST", `${SITE}/micropub`, multipartBody()))).status, 201);
  assert.deepEqual(command.properties, { content: ["Hello World!"] });
  assert.deepEqual([command.files[0].property, command.files[0].filename, command.files[0].contentType, [...command.files[0].data]], ["photo", "aaronpk.png", "image/png", [1, 2, 3]]);
});
test("a multipart create stores its file parts through writeMedia and files the URL under the photo property", async () => {
  let command;
  const app = micropubApp({ verifyToken, write: async (c) => { command = c; return { url: `${SITE}/p/1` }; }, writeMedia: async () => ({ url: "https://cdn.example/a.png" }) });
  await app.resources[0].handler(ctx("POST", `${SITE}/micropub`, multipartBody()));
  assert.deepEqual(command.properties.photo, ["https://cdn.example/a.png"]);
  assert.equal(command.files, undefined);
});

// -- 3.4 update (rocks 300s) -------------------------------------------------------------------------------
const source = Object.freeze({ type: ["h-entry"], properties: Object.freeze({ content: ["hello world"], category: ["a", "b"], photo: ["https://p.example/1.jpg"] }) });
const update = (fields) => parseMicropubJson({ action: "update", url: `${SITE}/p/1`, ...fields });

test("3.4.1 replace: all values of a property, creating it when absent, leaving the rest", () => {
  const next = applyMicropubUpdate(source, update({ replace: { content: ["hello moon"], summary: ["s"] } }));
  assert.deepEqual(next.properties.content, ["hello moon"]);
  assert.deepEqual(next.properties.summary, ["s"]);
  assert.deepEqual(next.properties.category, ["a", "b"]);
  assert.deepEqual(source.properties.content, ["hello world"], "the input is not mutated");
});
test("3.4.2 add: new values are appended and existing ones unchanged, creating the property when absent", () => {
  const next = applyMicropubUpdate(source, update({ add: { category: ["c", "a"], syndication: ["https://s.example/1"] } }));
  assert.deepEqual(next.properties.category, ["a", "b", "c"]);
  assert.deepEqual(next.properties.syndication, ["https://s.example/1"]);
});
test("3.4.3 delete: a property by name, or values of it; no values left removes the property", () => {
  assert.equal("category" in applyMicropubUpdate(source, update({ delete: ["category"] })).properties, false);
  assert.deepEqual(applyMicropubUpdate(source, update({ delete: { category: ["a"] } })).properties.category, ["b"]);
  assert.equal("category" in applyMicropubUpdate(source, update({ delete: { category: ["a", "b"] } })).properties, false);
  assert.deepEqual(applyMicropubUpdate(source, update({ delete: { category: ["zzz"] } })).properties.category, ["a", "b"]);
  const objects = { type: ["h-entry"], properties: { photo: [{ value: "u", alt: "x" }, "v"] } };
  assert.deepEqual(applyMicropubUpdate(objects, update({ delete: { photo: [{ alt: "x", value: "u" }] } })).properties.photo, ["v"]);
});
test("an update needs a url and only an update command applies", () => {
  assert.throws(() => parseMicropubJson({ action: "update", replace: { content: ["x"] } }), /requires url/);
  assert.throws(() => applyMicropubUpdate(source, parseMicropubJson({ type: ["h-entry"], properties: {} })), /only an update/);
});
test("3.4.4: update answers 204; 200 with a body when the writer describes the change; 201 with Location when the URL changed", async () => {
  const run = async (result) => micropubApp({ verifyToken, write: async () => result }).resources[0].handler(ctx("POST", `${SITE}/micropub`, { body: JSON.stringify({ action: "update", url: `${SITE}/p/1`, replace: { content: ["x"] } }), type: "application/json" }));
  assert.equal((await run({})).status, 204);
  const described = await run({ body: { changed: ["content"] } });
  assert.deepEqual([described.status, parsed(described)], [200, { changed: ["content"] }]);
  const moved = await run({ url: `${SITE}/p/renamed` });
  assert.deepEqual([moved.status, moved.headers.location], [201, `${SITE}/p/renamed`]);
});

// -- 3.5 delete and undelete (rocks 400s) ----------------------------------------------------------------------
test("rocks 400-403: delete and undelete, form and JSON, answer 204", async () => {
  const seen = [];
  const app = micropubApp({ verifyToken, write: async (c) => { seen.push(c.action); return {}; } });
  for (const action of ["delete", "undelete"]) {
    assert.equal((await post(app.resources[0], `action=${action}&url=${encodeURIComponent(`${SITE}/p/1`)}`)).status, 204);
    assert.equal((await jsonPost(app.resources[0], { action, url: `${SITE}/p/1` })).status, 204);
  }
  assert.deepEqual(seen, ["delete", "delete", "undelete", "undelete"]);
  assert.equal((await post(app.resources[0], "action=delete")).status, 400, "a delete without url is invalid_request");
});

// -- 3.7 queries (rocks 600s) ---------------------------------------------------------------------------------------
test("rocks 600-603: config, syndicate-to and source queries", async () => {
  const targets = [{ uid: "https://archive.org/", name: "archive.org" }];
  const app = micropubApp({ verifyToken, write: async () => ({}), config: { "media-endpoint": `${SITE}/micropub/media`, "syndicate-to": targets }, source: async () => source });
  const get = (qs) => app.resources[0].handler(ctx("GET", `${SITE}/micropub?${qs}`));
  assert.equal(parsed(await get("q=config"))["media-endpoint"], `${SITE}/micropub/media`);
  assert.deepEqual(parsed(await get("q=syndicate-to")), { "syndicate-to": targets });
  const all = parsed(await get(`q=source&url=${encodeURIComponent(`${SITE}/p/1`)}`));
  assert.deepEqual(all.type, ["h-entry"]);
  assert.equal(all.properties.content[0], "hello world");
  const some = parsed(await get(`q=source&properties[]=category&properties[]=content&url=${encodeURIComponent(`${SITE}/p/1`)}`));
  assert.deepEqual(Object.keys(some.properties).sort(), ["category", "content"]);
  assert.equal("type" in some, false, "the type accompanies only a whole-source response");
  assert.equal((await get("q=nonsense")).status, 400);
  assert.deepEqual(micropubSourceResponse(source, ["nope"]), { properties: {} });
});

// -- the monotone store ---------------------------------------------------------------------------------------------------
test("an update is told as the difference: what left against, what arrived for; delete denies and undelete restores", () => {
  const after = applyMicropubUpdate(source, update({ replace: { content: ["hello moon"] } }));
  const rel = micropubChangeRelations(`${SITE}/p/1`, source, after, { action: "update" });
  assert.deepEqual(rel.filter((r) => r.polarity === "against").map((r) => [r.predicate, r.object]), [["content", "hello world"]]);
  assert.deepEqual(rel.filter((r) => r.polarity === "for").map((r) => [r.predicate, r.object]), [["content", "hello moon"]]);
  const deleted = micropubChangeRelations(`${SITE}/p/1`, source, null, { action: "delete" });
  assert.ok(deleted.length === sourceCells(source).length && deleted.every((r) => r.polarity === "against"));
  const restored = micropubChangeRelations(`${SITE}/p/1`, null, source, { action: "undelete" });
  assert.ok(restored.every((r) => r.polarity === "for"));
  assert.deepEqual(sourceFromCells(sourceCells(source)), source);
});
test("the endpoint observes an update as that difference when it can read the current source", async () => {
  let observed;
  const app = micropubApp({ verifyToken, source: async () => source, write: async () => ({}), observe: async (o) => { observed = o; } });
  await jsonPost(app.resources[0], { action: "update", url: `${SITE}/p/1`, replace: { content: ["hello moon"] } });
  assert.deepEqual(observed.relations.map((r) => [r.polarity, r.predicate, r.object]), [["against", "content", "hello world"], ["for", "content", "hello moon"]]);
});

import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { serializeMultipartForm } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/multipart-form-data";
import { parseMicropubForm, parseMicropubJson, scopeAllows } from "../src/codec.mjs";
import { micropubApp } from "../src/resource.mjs";
const verifyToken = async (token) => token === "good"
    ? { me: "https://author.example/", scope: "create update delete media" }
    : null;
function context(method, url, body = "", contentType, token = "good") {
    const request = Readable.from([body]);
    Object.assign(request, {
        method,
        url: new URL(url).pathname + new URL(url).search,
        headers: {
            authorization: `Bearer ${token}`,
            ...(contentType === undefined ? {} : { "content-type": contentType }),
        },
    });
    return { req: request, url: new URL(url) };
}
async function invoke(resource, ctx) {
    return await resource.handler(ctx);
}
test("JSON and form commands normalize create and update operations", () => {
    const created = parseMicropubJson({ type: ["h-entry"], properties: { content: ["hello"], category: "notes" } });
    assert.equal(created.action, "create");
    assert.deepEqual(created.properties.category, ["notes"]);
    const updated = parseMicropubForm(new URLSearchParams([
        ["action", "update"], ["url", "https://site.example/post"],
        ["replace[content]", "new"], ["add[category]", "web"], ["delete", "photo"],
        ["access_token", "must-not-be-content"],
    ]));
    assert.deepEqual(updated.replace.content, ["new"]);
    assert.deepEqual(updated.add.category, ["web"]);
    assert.equal(updated.delete.photo, true);
    assert.equal(updated.properties.access_token, undefined);
    assert.throws(() => parseMicropubJson({ action: "update" }), /requires url/);
    assert.throws(() => parseMicropubForm(new URLSearchParams({ action: "publish" })), /unsupported/);
});
test("scope policy covers create/post compatibility and mutation boundaries", () => {
    assert.equal(scopeAllows("create", "post"), true);
    assert.equal(scopeAllows("update", ["create", "update"]), true);
    assert.equal(scopeAllows("undelete", "delete"), true);
    assert.equal(scopeAllows("delete", "update"), false);
});
test("config is authenticated and exposes declared endpoint capabilities", async () => {
    const app = micropubApp({
        verifyToken,
        write: async () => ({}),
        config: { "media-endpoint": "https://site.example/micropub/media" },
    });
    const endpoint = app.resources[0];
    const response = await invoke(endpoint, context("GET", "https://site.example/micropub?q=config"));
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(String(response.body))["media-endpoint"], "https://site.example/micropub/media");
    const missing = context("GET", "https://site.example/micropub?q=config");
    delete missing.req.headers.authorization;
    const denied = await invoke(endpoint, missing);
    assert.equal(denied.status, 401);
    assert.match(String(denied.headers?.["www-authenticate"]), /^Bearer /);
});
test("create, update, delete, and undelete cross the writer boundary with action scopes", async () => {
    const commands = [];
    const app = micropubApp({
        verifyToken,
        write: async (command) => {
            commands.push(command);
            return command.action === "create" ? { url: "https://site.example/new" } : {};
        },
    });
    const endpoint = app.resources[0];
    const create = await invoke(endpoint, context("POST", "https://site.example/micropub", JSON.stringify({ properties: { content: ["hello"] } }), "application/json"));
    assert.equal(create.status, 201);
    assert.equal(create.headers?.location, "https://site.example/new");
    for (const action of ["update", "delete", "undelete"]) {
        const form = new URLSearchParams({ action, url: "https://site.example/new" });
        if (action === "update")
            form.set("replace[content]", "edited");
        const result = await invoke(endpoint, context("POST", "https://site.example/micropub", form.toString(), "application/x-www-form-urlencoded"));
        assert.equal(result.status, 204, action);
    }
    assert.deepEqual(commands.map(({ action }) => action), ["create", "update", "delete", "undelete"]);
    assert.equal(commands[1].replace.content[0], "edited");
});
test("insufficient scope and unsupported media types do not call the writer", async () => {
    let writes = 0;
    const app = micropubApp({
        verifyToken: async () => ({ scope: "create" }),
        write: async () => { writes += 1; return {}; },
    });
    const endpoint = app.resources[0];
    const denied = await invoke(endpoint, context("POST", "https://site.example/micropub", new URLSearchParams({ action: "delete", url: "https://site.example/post" }).toString(), "application/x-www-form-urlencoded"));
    assert.equal(denied.status, 401);
    assert.equal(JSON.parse(String(denied.body)).error, "insufficient_scope");
    const unsupported = await invoke(endpoint, context("POST", "https://site.example/micropub", "text", "text/plain"));
    assert.equal(unsupported.status, 400);
    assert.equal(writes, 0);
});
test("source query authorizes, reads, and filters requested properties", async () => {
    const app = micropubApp({
        verifyToken,
        write: async () => ({}),
        source: async () => ({
            type: ["h-entry"],
            properties: { content: ["body"], category: ["one", "two"], name: ["Title"] },
        }),
    });
    const endpoint = app.resources[0];
    const response = await invoke(endpoint, context("GET", "https://site.example/micropub?q=source&url=https%3A%2F%2Fsite.example%2Fpost&properties%5B%5D=content&properties%5B%5D=category"));
    assert.equal(response.status, 200);
    const source = JSON.parse(String(response.body));
    assert.deepEqual(Object.keys(source.properties), ["content", "category"]);
});
test("media endpoint uses bounded multipart custody and returns its location", async () => {
    const boundary = "micropub-test";
    const body = serializeMultipartForm([
        { name: "alt", data: "description" },
        { name: "file", filename: "photo.png", contentType: "image/png", data: Buffer.from([1, 2, 3]) },
    ], boundary);
    let observed;
    const app = micropubApp({
        verifyToken,
        write: async () => ({}),
        writeMedia: async (input) => {
            observed = { ...(input.filename ? { filename: input.filename } : {}), data: input.data, alt: input.fields.get("alt") };
            return { url: "https://cdn.example/photo.png" };
        },
    });
    const media = app.resources[1];
    const response = await invoke(media, context("POST", "https://site.example/micropub/media", body.toString("latin1"), `multipart/form-data; boundary=${boundary}`));
    assert.equal(response.status, 201);
    assert.equal(response.headers?.location, "https://cdn.example/photo.png");
    assert.equal(observed?.filename, "photo.png");
    assert.deepEqual(observed?.data, Buffer.from([1, 2, 3]));
    assert.equal(observed?.alt, "description");
});
test("bounded bodies reject oversized content before writer custody", async () => {
    let called = false;
    const app = micropubApp({ verifyToken, write: async () => { called = true; return {}; }, maxBodyBytes: 8 });
    const response = await invoke(app.resources[0], context("POST", "https://site.example/micropub", JSON.stringify({ properties: { content: ["too large"] } }), "application/json"));
    assert.equal(response.status, 413);
    assert.equal(called, false);
});

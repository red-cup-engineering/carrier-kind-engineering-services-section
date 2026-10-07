// Moved down from computer-web-server (test/server.test.mjs): these tests
// exercise createWebServer itself, which now lives in this package
// (web-application.mjs). The Node transport binding tests that used to sit
// alongside these (via the now-removed web-application-node.mjs) moved to
// test/web-application-pipeline.test.mjs, node-server.mjs's own test file.
import assert from "node:assert/strict";
import test from "node:test";
import { createWebServer } from "../src/web-application.mjs";
test("a compiled web server carries its specification and one fetch handler", async ()=>{
    const server = createWebServer({
        resources: [
            {
                match: "/value",
                methods: [
                    "GET"
                ],
                handler: ()=>Response.json({
                        value: 1
                    })
            }
        ]
    });
    assert.equal(typeof server.fetch, "function");
    assert.equal(server.specification.resources?.length, 1);
    const response = await server.fetch(new Request("https://example.test/value"));
    assert.deepEqual(await response.json(), {
        value: 1
    });
    assert.equal((await server.fetch(new Request("https://example.test/value", {
        method: "POST"
    }))).status, 405);
    assert.equal((await server.fetch(new Request("https://example.test/missing"))).status, 404);
});
test("completion-hook failure always leaves a terminal response", async ()=>{
    for (const terminal of [
        "end",
        "cancel",
        "HEAD"
    ]){
        const engine = createWebServer({
            onComplete: ()=>{
                throw new Error("completion failed");
            },
            resources: [
                {
                    match: "/",
                    handler: ()=>new Response("value")
                }
            ]
        });
        const fetching = engine.fetch(new Request("https://example.test/", {
            method: terminal === "HEAD" ? "HEAD" : "GET"
        }));
        if (terminal === "HEAD") await assert.rejects(fetching, /completion failed/);
        else {
            const response = await fetching;
            await assert.rejects(terminal === "end" ? response.text() : response.body.cancel(), /completion failed/);
        }
    }
});

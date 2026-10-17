// Webmention conformance: every case is derived from the W3C Webmention Recommendation
// (https://www.w3.org/TR/webmention/) -- sender discovery 3.1.2 (the webmention.rocks discovery
// suite, tests 1-23), receiver request/verification 3.2, and updating/deleting 6 -- with an injected
// fetch, so no network is touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import {
  acceptsTarget,
  classifyMention,
  discoverWebmentionEndpoint,
  jsonMentionHits,
  linksToTarget,
  mentionObservation,
  outboundLinks,
  parseMentionRequest,
  receiveMentionRequest,
  sendAllWebmentions,
  sendSalmentions,
  sendWebmention,
  validateMentionPair,
  verifyMentionBody,
  verifyVouchBody,
  verifyWebmention,
  webmentionEndpointsInHtml,
  webmentionEndpointsInLinkHeader,
  webmentionReceiverApp,
} from "../src/index.mjs";

const PUBLIC = { resolveHost: async () => ["93.184.216.34"] };

function fakeFetch(routes, log) {
  return async (url, init = {}) => {
    log?.push({ url, method: init.method ?? "GET", body: init.body, headers: init.headers });
    const r = routes[url];
    if (!r) throw new Error(`no route for ${url}`);
    const headers = new Map(Object.entries(r.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    return {
      url: r.finalUrl ?? url,
      status: r.status ?? 200,
      headers: { get: (name) => headers.get(name.toLowerCase()) ?? null },
      async text() { return r.body ?? ""; },
    };
  };
}
const opts = (routes, log) => ({ fetch: fakeFetch(routes, log), network: PUBLIC });

// --- sender discovery: webmention.rocks tests 1-23 (W3C Webmention 3.1.2) --------------------------
const T = "https://t.example/post/1";
const html = (head, body = "") => ({ headers: { "content-type": "text/html" }, body: `<html><head>${head}</head><body>${body}</body></html>` });
const discover = async (page) => (await discoverWebmentionEndpoint(T, opts({ [T]: page }))).endpoint;

test("rocks 1-2: Link header, unquoted and quoted rel", async () => {
  assert.equal(await discover({ headers: { link: "<https://t.example/wm>; rel=webmention" } }), "https://t.example/wm");
  assert.equal(await discover({ headers: { link: '<https://t.example/wm>; rel="webmention"' } }), "https://t.example/wm");
});
test("rocks 3-4: HTML link and a elements", async () => {
  assert.equal(await discover(html('<link rel="webmention" href="https://t.example/wm">')), "https://t.example/wm");
  assert.equal(await discover(html("", '<a rel="webmention" href="https://t.example/wm">x</a>')), "https://t.example/wm");
});
test("rocks 5-7, 22: relative endpoints resolve against the final document URL", async () => {
  assert.equal(await discover({ headers: { link: "</wm>; rel=webmention" } }), "https://t.example/wm");
  assert.equal(await discover(html('<link rel="webmention" href="/wm">')), "https://t.example/wm");
  assert.equal(await discover(html('<link rel="webmention" href="wm">')), "https://t.example/post/wm");
  assert.equal(await discover(html('<link rel="webmention" href="?wm=1">')), "https://t.example/post/1?wm=1");
});
test("rocks 8-9: multiple rel values", async () => {
  assert.equal(await discover({ headers: { link: '<https://t.example/wm>; rel="webmention somethingelse"' } }), "https://t.example/wm");
  assert.equal(await discover(html('<link rel="other webmention" href="https://t.example/wm">')), "https://t.example/wm");
});
test("rocks 11-12: first endpoint in document order wins; rel match is by whole token", async () => {
  assert.equal(await discover(html('<link rel="not-webmention" href="/no"><link rel="webmention" href="/first"><a rel="webmention" href="/second">')), "https://t.example/first");
});
test("rocks 13-14: endpoints in comments or escaped text are not endpoints", async () => {
  assert.equal(await discover(html('<!-- <link rel="webmention" href="/false"> -->', '&lt;a rel="webmention" href="/false"&gt;')), null);
});
test("rocks 15: an empty href is the page itself", async () => {
  assert.equal(await discover(html('<link rel="webmention" href="">')), T);
});
test("rocks 16-17: Link header outranks HTML; link and a share document order", async () => {
  assert.equal(await discover({ headers: { "content-type": "text/html", link: "</header>; rel=webmention" }, body: '<link rel="webmention" href="/html">' }), "https://t.example/header");
  assert.equal(await discover(html("", '<a rel="webmention" href="/a"></a><link rel="webmention" href="/l">')), "https://t.example/a");
});
test("rocks 18-19: several Link headers, or several values in one header", async () => {
  assert.equal(await discover({ headers: { link: '</hub>; rel="hub", </wm>; rel="webmention"' } }), "https://t.example/wm");
  assert.equal(await discover({ headers: { link: '</hub>; rel="hub", </a>; rel="webmention", </b>; rel="webmention"' } }), "https://t.example/a");
});
test("rocks 20: a link without href is ignored", async () => {
  assert.equal(await discover(html('<link rel="webmention"><link rel="webmention" href="/wm">')), "https://t.example/wm");
});
test("rocks 21: endpoint query strings are preserved", async () => {
  assert.equal(await discover(html('<link rel="webmention" href="https://t.example/wm?token=a&amp;b=c">')), "https://t.example/wm?token=a&b=c");
});
test("rocks 23: relative endpoint resolves against the redirected-to URL", async () => {
  const page = { finalUrl: "https://other.example/dir/final", ...html('<link rel="webmention" href="wm">') };
  assert.equal(await discover(page), "https://other.example/dir/wm");
});
test("<base href> is honoured and no endpoint yields null", async () => {
  assert.equal(await discover(html('<base href="https://t.example/root/"><link rel="webmention" href="wm">')), "https://t.example/root/wm");
  assert.equal(await discover(html("<title>none</title>")), null);
  assert.deepEqual(webmentionEndpointsInLinkHeader('<x>; rel="stylesheet"', T), []);
  assert.deepEqual(webmentionEndpointsInHtml("", T), []);
});

// --- sending (3.1) ---------------------------------------------------------------------------------
test("send: discovers then POSTs exactly source and target, form-encoded; 201 Location is surfaced", async () => {
  const log = [];
  const r = await sendWebmention("https://me.example/p", T, opts({
    [T]: { headers: { link: "<https://t.example/wm?x=1>; rel=webmention" } },
    "https://t.example/wm?x=1": { status: 201, headers: { location: "https://t.example/status/1" } },
  }, log));
  assert.equal(r.status, "sent");
  assert.equal(r.location, "https://t.example/status/1");
  const post = log.find((e) => e.method === "POST");
  assert.match(post.headers["content-type"], /^application\/x-www-form-urlencoded/);
  assert.deepEqual([...new URLSearchParams(post.body)], [["source", "https://me.example/p"], ["target", T]]);
});
test("send: 202 sent; 4xx rejected; no endpoint; endpoint option skips discovery", async () => {
  const wm = "https://t.example/wm";
  const page = { headers: { link: `<${wm}>; rel=webmention` } };
  assert.equal((await sendWebmention("https://me.example/p", T, opts({ [T]: page, [wm]: { status: 202 } }))).status, "sent");
  const rej = await sendWebmention("https://me.example/p", T, opts({ [T]: page, [wm]: { status: 400 } }));
  assert.equal(rej.status, "rejected");
  assert.equal(rej.httpStatus, 400);
  assert.equal((await sendWebmention("https://me.example/p", T, opts({ [T]: html("") }))).status, "no-endpoint");
  const log = [];
  await sendWebmention("https://me.example/p", T, { ...opts({ [wm]: { status: 202 } }, log), endpoint: wm });
  assert.equal(log.length, 1);
});
test("send: private-network endpoints and targets are refused by the network policy", async () => {
  const r = await sendWebmention("https://me.example/p", "http://127.0.0.1/post", { fetch: fakeFetch({}) });
  assert.equal(r.ok, false);
  assert.equal(r.status, "error");
});
test("sendAll and salmentions fan out in order, excluding the source itself", async () => {
  const wm = "https://a.example/wm";
  const routes = { "https://a.example/p": { headers: { link: `<${wm}>; rel=webmention` } }, [wm]: { status: 202 }, "https://b.example/p": html("") };
  const all = await sendAllWebmentions("https://me.example/post", ["https://a.example/p", "https://b.example/p"], opts(routes));
  assert.deepEqual(all.map((r) => r.status), ["sent", "no-endpoint"]);
  const sal = await sendSalmentions("https://me.example/post", '<a href="https://a.example/p">a</a><a href="https://me.example/post">self</a><a href="mailto:x@y">m</a>', opts(routes));
  assert.deepEqual(sal.map((r) => r.target), ["https://a.example/p"]);
  assert.deepEqual(outboundLinks('<a href="/x">x</a><a href="javascript:0">j</a>', "https://s.example/"), ["https://s.example/x"]);
});

// --- receiving: request (3.2.1) --------------------------------------------------------------------
test("request: source and target are required, must be http(s) URLs and must differ", () => {
  assert.deepEqual({ ...parseMentionRequest("source=https%3A%2F%2Fa.example%2F&target=https%3A%2F%2Fb.example%2F") }, { source: "https://a.example/", target: "https://b.example/" });
  assert.throws(() => parseMentionRequest("source=https://a.example/"), /required/);
  assert.throws(() => parseMentionRequest("source=ftp://a.example/&target=https://b.example/"), /scheme/);
  assert.throws(() => parseMentionRequest("source=https://a.example/&target=https://a.example/"), /differ/);
  assert.equal(validateMentionPair("x", "https://b.example/"), "source is not a valid URL");
  assert.equal(parseMentionRequest(JSON.stringify({ source: "https://a/x", target: "https://b/y", vouch: "https://c/z" }), "application/json").vouch, "https://c/z");
});
test("request: targets outside this site are rejected before any fetch", async () => {
  assert.equal(acceptsTarget("https://me.example/blog/p", "https://me.example/blog/"), true);
  assert.equal(acceptsTarget("https://me.example/other", "https://me.example/blog/"), false);
  const body = "source=https://a.example/p&target=https://evil.example/x";
  const r = await receiveMentionRequest(body, "application/x-www-form-urlencoded", { baseUrl: "https://me.example/", verify: () => assert.fail("must not verify") });
  assert.deepEqual([r.accepted, r.status], [false, 400]);
  const own = await receiveMentionRequest(body, "application/x-www-form-urlencoded", { ownsTarget: async () => false, verify: () => assert.fail("must not verify") });
  assert.equal(own.accepted, false);
});

// --- receiving: verification (3.2.2) and updates/deletes (6) ---------------------------------------
const S = "https://them.example/reply";
const G = "https://me.example/article";
const verify = (page) => verifyWebmention(S, G, opts({ [S]: page }));

test("verify: an exact link verifies; near-misses and other URLs do not", async () => {
  assert.equal((await verify(html("", `<a href="${G}">x</a>`))).status, "verified");
  assert.equal((await verify(html("", `<a href="${G}x">x</a>`))).status, "retracted");
  assert.equal((await verify(html("", '<a href="/relative">x</a>'))).retract, true);
});
test("verify: relative links resolve against the redirected-to source and <base>", async () => {
  assert.equal((await verify({ finalUrl: "https://me.example/dir/s", ...html("", '<a href="../article">x</a>') })).verified, true);
  assert.equal((await verify(html('<base href="https://me.example/">', '<a href="article">x</a>'))).verified, true);
});
test("verify: media elements count (a, link, img, video, audio, source)", async () => {
  for (const tag of [`<img src="${G}">`, `<video src="${G}"></video>`, `<audio src="${G}"></audio>`, `<video><source src="${G}"></video>`, `<link href="${G}">`]) {
    assert.equal((await verify(html("", tag))).verified, true, tag);
  }
});
test("verify: JSON sources match on any exact string value; text/plain on containment", async () => {
  assert.equal((await verify({ headers: { "content-type": "application/json" }, body: JSON.stringify({ a: [{ b: G }] }) })).verified, true);
  assert.equal((await verify({ headers: { "content-type": "application/json" }, body: JSON.stringify({ a: `${G}/` }) })).verified, false);
  assert.equal((await verify({ headers: { "content-type": "application/json" }, body: "{not json" })).status, "retracted");
  assert.equal((await verify({ headers: { "content-type": "text/plain; charset=utf-8" }, body: `see ${G} now` })).verified, true);
  assert.equal((await verify({ headers: { "content-type": "image/png" }, body: "x" })).status, "invalid");
  const mf2 = { items: [{ type: ["h-entry"], properties: { "in-reply-to": [G] } }] };
  assert.equal(classifyMention(jsonMentionHits(mf2, G)), "reply");
});
test("verify: microformats2 response properties classify, strongest first", async () => {
  for (const [cls, type] of [["u-in-reply-to", "reply"], ["u-like-of", "like"], ["u-repost-of", "repost"], ["u-bookmark-of", "bookmark"], ["u-other", "mention"]]) {
    assert.equal((await verify(html("", `<a class="h-cite ${cls}" href="${G}">x</a>`))).type, type);
  }
  assert.equal((await verify(html("", `<a class="u-bookmark-of" href="${G}"></a><a class="u-like-of" href="${G}"></a>`))).type, "like");
});
test("verify: 410 deletes, 2xx without a link retracts, other errors are invalid, fetch failures are errors", async () => {
  const gone = await verify({ status: 410 });
  assert.deepEqual([gone.status, gone.retract], ["deleted", true]);
  const nolink = await verify(html("", "<p>edited"));
  assert.deepEqual([nolink.status, nolink.retract], ["retracted", true]);
  const nf = await verify({ status: 404 });
  assert.deepEqual([nf.status, nf.retract], ["invalid", false]);
  assert.equal((await verifyWebmention(S, G, opts({}))).status, "error");
  assert.equal(verifyMentionBody({ source: S, target: G, httpStatus: 200, contentType: "text/html", body: `<a href="${G}#frag">x</a>` }).status, "retracted");
  assert.equal(linksToTarget(`<a href="${G}">x</a>`, S, `${G}#frag`).length, 1, "a fragmention falls back to the fragmentless page");
});
test("vouch: the vouch page must link to both parties", () => {
  const base = { vouch: "https://v.example/", source: S, target: G, httpStatus: 200 };
  assert.equal(verifyVouchBody({ ...base, body: `<a href="${S}">s</a><a href="${G}">g</a>` }).verified, true);
  assert.equal(verifyVouchBody({ ...base, body: `<a href="${S}">s</a>` }).verified, false);
});
test("a received mention is told as a relation: for when verified, against when retracted", () => {
  const request = { source: S, target: G };
  const ok = mentionObservation({ accepted: true, request, verdict: { verified: true, type: "like", status: "verified" } }, { endpoint: "/webmention" });
  const gone = mentionObservation({ accepted: true, request, verdict: { verified: false, retract: true, status: "deleted" } });
  assert.ok(ok && gone && JSON.stringify(ok) !== JSON.stringify(gone));
});

// --- the receiver resource ---------------------------------------------------------------------------
async function post(app, body, contentType = "application/x-www-form-urlencoded") {
  const req = Readable.from([Buffer.from(body)]);
  req.headers = { "content-type": contentType };
  req.method = "POST";
  return app.resources[0].handler({ req });
}

test("receiver: verifies, hands custody, answers 202; a bad request is 400; a wrong media type 415", async () => {
  const kept = [];
  const app = webmentionReceiverApp({
    baseUrl: "https://me.example/",
    ...opts({ [S]: html("", `<a class="u-like-of" href="${G}">x</a>`) }),
    custody: async (record) => kept.push(record),
  });
  const ok = await post(app, `source=${encodeURIComponent(S)}&target=${encodeURIComponent(G)}`);
  assert.equal(ok.status, 202);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].verdict.type, "like");
  assert.equal((await post(app, "source=x")).status, 400);
  assert.equal((await post(app, "{}", "application/json")).status, 415);
});
test("receiver: a custody failure is not acknowledged", async () => {
  const app = webmentionReceiverApp({ baseUrl: "https://me.example/", ...opts({ [S]: html("", `<a href="${G}">x</a>`) }), custody: async () => { throw new Error("disk full"); } });
  assert.equal((await post(app, `source=${encodeURIComponent(S)}&target=${encodeURIComponent(G)}`)).status, 500);
});

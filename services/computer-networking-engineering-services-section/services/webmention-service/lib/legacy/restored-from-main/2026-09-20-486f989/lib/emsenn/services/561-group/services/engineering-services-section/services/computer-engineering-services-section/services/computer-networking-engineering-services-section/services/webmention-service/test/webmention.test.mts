import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import type { Context } from "@red-cup-engineering/http-server-application-contract-service";
import {
  classifyMention,
  discoverEndpoint,
  endpointsInHtml,
  endpointsInLinkHeader,
  fetchWithPolicy,
  isPublicAddress,
  parseMentionRequest,
  receiveMention,
  sendMention,
  verifyMention,
  webmentionReceiverApp,
  type FetchLike,
  type Verdict,
} from "../src/index.mts";

const allow = async () => {};
const network = (fetchImpl: FetchLike) => ({ fetchImpl, authorize: allow });

test("discovery gives the Link header priority over HTML and resolves both", async () => {
  const fetchImpl: FetchLike = async () => new Response(
    '<base href="/base/"><a rel="webmention" href="html-endpoint">receiver</a>',
    { status: 200, headers: { "content-type": "text/html", link: '<../header-endpoint>; rel="alternate webmention"' } },
  );
  const result = await discoverEndpoint("https://site.example/posts/one", network(fetchImpl));
  assert.deepEqual(result, {
    endpoint: "https://site.example/header-endpoint",
    via: "link-header",
    status: 200,
    finalUrl: "https://site.example/posts/one",
  });
  assert.deepEqual(endpointsInHtml('<base href="/x/"><link rel="webmention" href="inbox">', "https://site.example/a"), ["https://site.example/x/inbox"]);
  assert.deepEqual(endpointsInLinkHeader('<one>; rel=next, <two>; rel="webmention"', "https://site.example/a"), ["https://site.example/two"]);
});

test("HTML discovery ignores endpoint-looking text in scripts", () => {
  assert.deepEqual(endpointsInHtml('<script>"<a rel=webmention href=/false>"</script><a rel=webmention href=/true>', "https://site.example/"), ["https://site.example/true"]);
});

test("the network boundary rejects loopback before fetch and authorizes redirect hops", async () => {
  assert.equal(isPublicAddress("ff02::1"), false);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  let called = false;
  await assert.rejects(fetchWithPolicy("http://127.0.0.1/admin", {}, "verification", {
    fetchImpl: async () => { called = true; return new Response(); },
  }), /private or special-use/);
  assert.equal(called, false);

  const authorized: string[] = [];
  let call = 0;
  const response = await fetchWithPolicy("https://one.example/start", {}, "discovery", {
    authorize: async (url) => { authorized.push(url.href); },
    fetchImpl: async () => call++ === 0
      ? new Response(null, { status: 302, headers: { location: "https://two.example/final" } })
      : new Response("ok", { status: 200 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(authorized, ["https://one.example/start", "https://two.example/final"]);
});

test("verification classifies Microformats links and reports retraction and deletion", async () => {
  const target = "https://target.example/post";
  const like = await verifyMention("https://source.example/like", target, network(async () => new Response(
    `<a class="u-like-of" href="${target}">liked</a>`,
    { status: 200, headers: { "content-type": "text/html" } },
  )));
  assert.equal(like.status, "verified");
  assert.equal(like.type, "like");
  assert.equal(like.linkCount, 1);

  const retracted = await verifyMention("https://source.example/gone", target, network(async () => new Response(
    "<p>gone</p>",
    { status: 200, headers: { "content-type": "text/html" } },
  )));
  assert.equal(retracted.status, "retracted");
  assert.equal(retracted.retract, true);
  const deleted = await verifyMention("https://source.example/deleted", target, network(async () => new Response(null, { status: 410 })));
  assert.equal(deleted.status, "deleted");
  assert.equal(classifyMention([{ mf2Props: ["u-repost-of", "u-like-of"] }]), "like");
});

test("receive validates ownership before fetching and transfers every verdict to custody", async () => {
  let verified = false;
  const records: unknown[] = [];
  const verdict: Verdict = {
    status: "verified", verified: true, retract: false, type: "reply", linkCount: 1,
    httpStatus: 200, source: "https://source.example/post", target: "https://ours.example/post",
  };
  const result = await receiveMention("source=https%3A%2F%2Fsource.example%2Fpost&target=https%3A%2F%2Fours.example%2Fpost", {
    ownsTarget: (target) => target.origin === "https://ours.example",
    verify: async () => { verified = true; return verdict; },
    custody: async (record) => { records.push(record); },
    now: () => new Date("2026-08-27T12:00:00Z"),
  });
  assert.equal(result.accepted, true);
  assert.equal(verified, true);
  assert.equal(records.length, 1);
  assert.equal((records[0] as { receivedAt: string }).receivedAt, "2026-08-27T12:00:00.000Z");

  verified = false;
  const foreign = await receiveMention("source=https%3A%2F%2Fsource.example%2Fpost&target=https%3A%2F%2Fforeign.example%2Fpost", {
    ownsTarget: () => false,
    verify: async () => { verified = true; return verdict; },
    custody: async () => {},
  });
  assert.equal(foreign.status, 400);
  assert.equal(verified, false);
});

test("custody failure is not acknowledged as accepted", async () => {
  const verdict: Verdict = {
    status: "verified", verified: true, retract: false, type: "mention", linkCount: 1,
    httpStatus: 200, source: "https://source.example/", target: "https://ours.example/",
  };
  const result = await receiveMention("source=https%3A%2F%2Fsource.example%2F&target=https%3A%2F%2Fours.example%2F", {
    ownsTarget: () => true,
    verify: async () => verdict,
    custody: async () => { throw new Error("store offline"); },
  });
  assert.equal(result.accepted, false);
  assert.equal(result.status, 500);
  assert.match(result.reason!, /store offline/);
});

test("sender discovers then posts the standard form boundary", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, ...(init === undefined ? {} : { init }) });
    return calls.length === 1
      ? new Response("", { status: 200, headers: { link: '<https://target.example/webmention>; rel="webmention"' } })
      : new Response("", { status: 202, headers: { location: "/status/1" } });
  };
  const result = await sendMention("https://source.example/post", "https://target.example/post", { network: network(fetchImpl) });
  assert.equal(result.status, "sent");
  assert.equal(calls[1]!.url, "https://target.example/webmention");
  assert.equal(calls[1]!.init?.method, "POST");
  assert.equal(calls[1]!.init?.body, "source=https%3A%2F%2Fsource.example%2Fpost&target=https%3A%2F%2Ftarget.example%2Fpost");
});

test("the receiver application exposes a bounded POST resource and invokes custody", async () => {
  const records: unknown[] = [];
  const app = webmentionReceiverApp({
    ownsTarget: () => true,
    custody: async (record) => { records.push(record); },
    verify: async (source, target) => ({
      status: "verified", verified: true, retract: false, type: "mention", linkCount: 1,
      httpStatus: 200, source, target,
    }),
  });
  const resource = app.resources![0]!;
  assert.equal(resource.match, "/webmention");
  assert.deepEqual(resource.methods, ["POST"]);
  const request = Readable.from(["source=https%3A%2F%2Fsource.example%2F&target=https%3A%2F%2Four.example%2F"]);
  Object.assign(request, { headers: { "content-type": "application/x-www-form-urlencoded" } });
  const response = await resource.handler({ req: request } as unknown as Context) as ReprLike;
  assert.equal(response.status, 202);
  assert.equal(records.length, 1);
});

test("request parsing rejects absent, non-HTTP, and self mentions", () => {
  assert.equal(parseMentionRequest("").status, 400);
  assert.match(parseMentionRequest("source=file%3A%2F%2Fa&target=https%3A%2F%2Fb.example").reason!, /source scheme/);
  assert.match(parseMentionRequest("source=https%3A%2F%2Fa.example&target=https%3A%2F%2Fa.example").reason!, /must differ/);
});

type ReprLike = { status?: number; body?: unknown };

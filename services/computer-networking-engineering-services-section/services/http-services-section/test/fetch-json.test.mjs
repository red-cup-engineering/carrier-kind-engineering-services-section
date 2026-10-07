import assert from "node:assert/strict";
import test from "node:test";

import { fetchJson, FetchJsonError } from "../scripts/fetch-json.mjs";

// This sandbox refuses real loopback TCP connections (even a `node:http`
// server on 127.0.0.1 gets ECONNREFUSED from the same process), so these
// tests stub the platform `fetch` global directly rather than spinning up a
// real server -- exercising fetch-json's own logic (status handling, JSON
// parsing, error shape, signal combination) without any real networking.

function stubFetch(impl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return Promise.resolve(run()).finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(status, body, init = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" }, ...init });
}

test("parses a successful JSON response", async () => {
  await stubFetch(
    async (url) => {
      assert.equal(url, "http://example.test/thing");
      return jsonResponse(200, { ok: true, value: 42 });
    },
    async () => {
      const body = await fetchJson("http://example.test/thing");
      assert.deepEqual(body, { ok: true, value: 42 });
    },
  );
});

test("forwards fetch options (method, headers, body)", async () => {
  await stubFetch(
    async (url, init) => {
      assert.equal(init.method, "POST");
      assert.equal(init.headers.authorization, "Bearer x");
      assert.equal(init.body, '{"a":1}');
      return jsonResponse(200, { received: true });
    },
    async () => {
      const body = await fetchJson("http://example.test/echo", {
        method: "POST",
        headers: { authorization: "Bearer x" },
        body: JSON.stringify({ a: 1 }),
      });
      assert.deepEqual(body, { received: true });
    },
  );
});

test("refuses a non-ok status, carrying status and url on the thrown error", async () => {
  await stubFetch(
    async () => jsonResponse(404, { error: "not found" }),
    async () => {
      const url = "http://example.test/missing";
      await assert.rejects(
        () => fetchJson(url),
        (error) => {
          assert.ok(error instanceof FetchJsonError);
          assert.equal(error.status, 404);
          assert.equal(error.url, url);
          return true;
        },
      );
    },
  );
});

test("refuses a non-JSON response body, carrying status and url", async () => {
  await stubFetch(
    async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } }),
    async () => {
      const url = "http://example.test/text";
      await assert.rejects(
        () => fetchJson(url),
        (error) => {
          assert.ok(error instanceof FetchJsonError);
          assert.equal(error.status, 200);
          assert.equal(error.url, url);
          assert.ok(error.cause);
          return true;
        },
      );
    },
  );
});

test("carries the url (not a status) when the network request itself fails", async () => {
  await stubFetch(
    async () => {
      throw new TypeError("fetch failed");
    },
    async () => {
      const url = "http://example.test/nope";
      await assert.rejects(
        () => fetchJson(url),
        (error) => {
          assert.ok(error instanceof FetchJsonError);
          assert.equal(error.status, undefined);
          assert.equal(error.url, url);
          assert.ok(error.cause);
          return true;
        },
      );
    },
  );
});

test("timeoutMs passes an aborting signal through to fetch", async () => {
  await stubFetch(
    (url, init) =>
      new Promise((resolve, reject) => {
        assert.ok(init.signal instanceof AbortSignal);
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    async () => {
      await assert.rejects(() => fetchJson("http://example.test/slow", { timeoutMs: 10 }), FetchJsonError);
    },
  );
});

test("an already-aborted supplied signal is honored", async () => {
  await stubFetch(
    (url, init) => {
      if (init.signal?.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
      return jsonResponse(200, {});
    },
    async () => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(() => fetchJson("http://example.test/thing", { signal: controller.signal }), FetchJsonError);
    },
  );
});

test("combines a supplied signal with a timeout into one signal fetch receives", async () => {
  await stubFetch(
    (url, init) =>
      new Promise((resolve, reject) => {
        assert.ok(init.signal instanceof AbortSignal);
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    async () => {
      const controller = new AbortController();
      const promise = fetchJson("http://example.test/slow", { signal: controller.signal, timeoutMs: 5_000 });
      queueMicrotask(() => controller.abort());
      await assert.rejects(() => promise, FetchJsonError);
    },
  );
});

test("no options at all: a plain GET with no signal added", async () => {
  await stubFetch(
    async (url, init) => {
      assert.equal(init.signal, undefined);
      return jsonResponse(200, { plain: true });
    },
    async () => {
      const body = await fetchJson("http://example.test/plain");
      assert.deepEqual(body, { plain: true });
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { fetchText } from "../scripts/fetch-text.mjs";

test("caller-selected retry work can exceed the obsolete six-attempt ceiling", async () => {
  let requests = 0, waits = 0;
  const body = await fetchText("https://wire.example.test/news", {
    retries: 7,
    backoff: async () => { waits++; },
    fetchImpl: async () => {
      requests++;
      if (requests <= 7) return { ok: false, status: 503 };
      return { ok: true, status: 200, text: async () => "admitted" };
    },
  });
  assert.equal(body, "admitted");
  assert.equal(requests, 8);
  assert.equal(waits, 7);
});

test("invalid retry budgets refuse without starting a network request", async () => {
  let requests = 0;
  const fetchImpl = async () => { requests++; return { ok: true, text: async () => "ok" }; };
  for (const retries of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, "3", null]) {
    await assert.rejects(() => fetchText("https://wire.example.test/", {
      fetchImpl, retries,
    }), /non-negative safe integer/);
  }
  assert.equal(requests, 0);
  assert.equal(await fetchText("https://wire.example.test/", { fetchImpl, retries: 0 }), "ok");
  assert.equal(requests, 1);
});

test("server errors still refuse when the selected retry budget is exhausted", async () => {
  let requests = 0;
  await assert.rejects(() => fetchText("https://wire.example.test/", {
    retries: 2, backoff: async () => {},
    fetchImpl: async () => { requests++; return { ok: false, status: 429 }; },
  }), /429/);
  assert.equal(requests, 3);
});

import assert from "node:assert/strict";
import test from "node:test";
import { handlePrivateFinancialReadout, renderPrivateFinancialReadout } from "../src/financial-readout.mjs";

test("renders source identities, observation times, and unknown values without converting them to claims", () => {
  const result = renderPrivateFinancialReadout({
    title: "561 Group daily financial readout",
    asOf: "2026-09-08T22:06:00.000Z",
    observations: [
      { id: "ledger:561-group-main-ledger.beancount", observedAt: "2026-09-05T15:41:00.000Z", label: "Provider invoice", status: "unknown", value: "unknown" },
    ],
  });
  assert.equal(result.kind, "PrivateFinancialReadout");
  assert.match(result.html, /ledger:561-group-main-ledger\.beancount/);
  assert.match(result.html, /2026-09-05T15:41:00\.000Z/);
  assert.match(result.html, />unknown</);
});

test("does not read or expose the document until the host authentication guard accepts the request", async () => {
  let reads = 0;
  const response = await handlePrivateFinancialReadout(new Request("https://example.test/founder/books"), {
    authorize: () => false,
    read: () => { reads += 1; return {}; },
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(reads, 0);
});

test("renders an accepted host-owned readout with private no-store caching", async () => {
  const response = await handlePrivateFinancialReadout(new Request("https://example.test/founder/books"), {
    authorize: () => true,
    read: () => ({ title: "Books", asOf: "2026-09-08T22:06:00.000Z", observations: [] }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(await response.text(), /Books/);
});

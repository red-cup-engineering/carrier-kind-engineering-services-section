import assert from "node:assert/strict";
import { test } from "node:test";
import { renderBalanceDirective, renderFile, renderPriceDirective } from "../src/beancount-render.mjs";

test("renderBalanceDirective: renders the directive line and quoted-string metadata", () => {
  const text = renderBalanceDirective({
    date: "2026-09-05",
    account: "Assets:Digital-Assets:Hive:Liquid",
    amount: "142.423",
    commodity: "HIVE",
    metadata: { reconciliation_id: "REC-20260904-HIVE-HIVE", cutoff: "2026-09-04", source_balance: "142.423" },
  });
  assert.equal(text, [
    "2026-09-05 balance Assets:Digital-Assets:Hive:Liquid 142.423 HIVE",
    '  reconciliation_id: "REC-20260904-HIVE-HIVE"',
    '  cutoff: "2026-09-04"',
    '  source_balance: "142.423"',
  ].join("\n"));
});

test("renderBalanceDirective: rejects a non-YYYY-MM-DD date", () => {
  assert.throws(() => renderBalanceDirective({
    date: "09/05/2026", account: "A", amount: "1", commodity: "X", metadata: {},
  }), TypeError);
});

test("renderPriceDirective: renders without metadata when none given", () => {
  const text = renderPriceDirective({ date: "2026-09-04", symbol: "HIVE", price: "0.04643451" });
  assert.equal(text, "2026-09-04 price HIVE 0.04643451 USD");
});

test("renderPriceDirective: renders with metadata when given", () => {
  const text = renderPriceDirective({
    date: "2026-09-04", symbol: "LEO", price: "0.0037174284", metadata: { source: "hive-engine-metrics x coingecko" },
  });
  assert.equal(text, [
    "2026-09-04 price LEO 0.0037174284 USD",
    '  source: "hive-engine-metrics x coingecko"',
  ].join("\n"));
});

test("renderPriceDirective: an explicit quoteCommodity prices the symbol in that commodity, never USD", () => {
  const text = renderPriceDirective({
    date: "2026-09-05", symbol: "USD", price: "7.0274068868", quoteCommodity: "KWH",
    metadata: { inverse_of: "KWH" },
  });
  assert.equal(text, [
    "2026-09-05 price USD 7.0274068868 KWH",
    '  inverse_of: "KWH"',
  ].join("\n"));
});

test("renderFile: joins header and blocks with blank-line separation and a trailing newline", () => {
  const text = renderFile("; header", ["block one", "block two"]);
  assert.equal(text, "; header\n\nblock one\n\nblock two\n");
});

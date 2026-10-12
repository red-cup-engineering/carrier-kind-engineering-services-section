import assert from "node:assert/strict";
import test from "node:test";
import { foldFileTouchMarket, projectFileTouchMarket } from "../src/file-touch-market.mjs";

const generatedAt = "2026-08-30T12:00:00.000Z";

test("folds explicit file observations into quoted assets", () => {
  const market = foldFileTouchMarket([
    { at: generatedAt, event: "file-read", trace: "a", tool: "read", paths: ["src/a.mjs"], evidence: [], estimatedTokens: 1000, budgetBand: "ok", score: 2 },
    { at: generatedAt, event: "file-write", trace: "a", tool: "edit", paths: ["src/a.mjs"], evidence: ["change"], estimatedTokens: 0, budgetBand: "ok", score: 1 },
  ], { generatedAt });
  assert.equal(market.assets[0].touches, 2);
  assert.equal(market.assets[0].regime, "volatile");
  assert.equal(market.assets[0].quote.ask > market.assets[0].quote.bid, true);
});

test("projects a focused bounded market", () => {
  const market = foldFileTouchMarket([
    { at: generatedAt, event: "file-read", trace: "a", tool: null, paths: ["src/a.mjs", "test/a.test.mjs"], evidence: [], estimatedTokens: 0, budgetBand: "ok", score: 1 },
  ], { generatedAt });
  assert.deepEqual(projectFileTouchMarket(market, { focus: "src/", limit: 1 }).assets.map((asset) => asset.path), ["src/a.mjs"]);
});

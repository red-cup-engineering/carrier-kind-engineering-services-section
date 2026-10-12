import assert from "node:assert/strict";
import test from "node:test";
import { negotiateLanguage } from "../src/negotiate-http-language.mts";

test("selects languages using quality and basic filtering", () => {
  assert.equal(negotiateLanguage("fr;q=.5, en-US;q=1", ["fr-CA", "en-US"]), "en-US");
  assert.equal(negotiateLanguage("en;q=0", ["en-US"]), null);
});

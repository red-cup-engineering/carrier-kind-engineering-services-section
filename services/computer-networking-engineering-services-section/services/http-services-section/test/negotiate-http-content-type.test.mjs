import assert from "node:assert/strict";
import test from "node:test";
import { negotiateType } from "../src/negotiation.mjs";
test("selects the highest-quality offered content type", ()=>{
    assert.equal(negotiateType("text/*;q=0.5, application/json;q=0.9", [
        "text/html",
        "application/json"
    ]), "application/json");
    assert.equal(negotiateType("application/json;q=0", [
        "application/json"
    ]), null);
});

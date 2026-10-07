import assert from "node:assert/strict";
import test from "node:test";
import { ifMatch, ifNoneMatch, ifModifiedSince } from "../src/conditional-request.mjs";
test("evaluates entity-tag and date preconditions", ()=>{
    assert.equal(ifMatch('"one"', '"one"'), true);
    assert.equal(ifNoneMatch('W/"one"', '"one"'), true);
    assert.equal(ifModifiedSince("Sun, 09 Aug 2026 00:00:00 GMT", new Date("2026-08-09T00:00:00Z")), true);
});

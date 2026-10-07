import assert from "node:assert/strict";
import test from "node:test";
import { wellKnown } from "../../src/well-known/form-well-known-http-resources.mjs";
test("forms exact and prefix well-known resources", ()=>{
    const app = wellKnown([
        {
            name: "one",
            repr: {
                body: "one"
            }
        },
        {
            name: "tree",
            prefix: true,
            repr: {
                body: "tree"
            }
        }
    ]);
    assert.equal(app.resources?.[0]?.match, "/.well-known/one");
    assert.ok(app.resources?.[1]?.match instanceof RegExp);
    assert.throws(()=>wellKnown([
            {
                name: "../bad",
                repr: {}
            }
        ]), /invalid well-known name/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { processEsi } from "../../src/esi/resolve-edge-side-includes.mjs";
test("resolves includes and variables", async ()=>assert.equal(await processEsi('<esi:vars>$(NAME)</esi:vars><esi:include src="/part"/>', {}, async ()=>"! ", {
        vars: {
            NAME: "Hi"
        }
    }), "Hi! "));

import assert from "node:assert/strict"; import test from "node:test"; import { bearerChallenge, bearerToken } from "../src/code-http-bearer-authentication.mts";
test("parses tokens and forms challenges",()=>{assert.equal(bearerToken("Bearer abc"),"abc");assert.equal(bearerChallenge({realm:"example"}),'Bearer realm="example"');});

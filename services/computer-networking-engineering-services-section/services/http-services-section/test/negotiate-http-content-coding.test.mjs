import assert from "node:assert/strict";
import test from "node:test";
import { negotiateEncoding } from "../src/negotiation.mjs";
import { parseAcceptEncoding } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/preferences";
test("selects only an acceptable offered content coding", ()=>{
    assert.equal(negotiateEncoding("gzip;q=0.4, br;q=1", [
        "gzip",
        "br",
        "identity"
    ]), "br");
    assert.equal(negotiateEncoding("identity;q=0, *;q=0", [
        "gzip",
        "identity"
    ]), null);
});
test("distinguishes absent, empty, and explicit identity preferences", ()=>{
    assert.equal(negotiateEncoding(undefined, [
        "gzip",
        "identity"
    ]), "identity");
    assert.equal(negotiateEncoding(undefined, [
        "gzip"
    ]), "gzip");
    for (const header of [
        "",
        " \t",
        ", ,"
    ]){
        assert.equal(negotiateEncoding(header, [
            "gzip"
        ]), null);
        assert.equal(negotiateEncoding(header, [
            "gzip",
            "identity"
        ]), "identity");
    }
    assert.equal(negotiateEncoding("*;q=0, identity;q=0.5", [
        "gzip",
        "identity"
    ]), "identity");
    assert.equal(negotiateEncoding("*;q=1, identity;q=0", [
        "identity",
        "gzip"
    ]), "gzip");
    assert.equal(negotiateEncoding("gzip;q=0, *;q=1", [
        "gzip",
        "br"
    ]), "br");
    assert.equal(negotiateEncoding("gzip;q=0.1", [
        "identity",
        "gzip"
    ]), "gzip");
    assert.equal(negotiateEncoding("compress", [
        "gzip",
        "identity"
    ]), "identity");
    assert.equal(negotiateEncoding("gzip", []), null);
});
test("parses case-insensitive tokens and RFC qvalues without accepting numeric prefixes", ()=>{
    assert.deepEqual([
        ...parseAcceptEncoding(" GZip ; Q=0.500, BR;q=1., deflate;q=0 ")
    ], [
        [
            "gzip",
            0.5
        ],
        [
            "br",
            1
        ],
        [
            "deflate",
            0
        ]
    ]);
    for (const q of [
        "",
        "NaN",
        "0.5junk",
        "2",
        "-1",
        "0.1234",
        "1.001",
        ".4",
        "1e0",
        "Infinity"
    ]){
        assert.equal(parseAcceptEncoding(`gzip;q=${q}`).get("gzip"), 0, q);
        assert.equal(negotiateEncoding(`gzip;q=${q}, *;q=1`, [
            "gzip"
        ]), null, q);
    }
    assert.equal(parseAcceptEncoding("gzip;q=0;q=1").get("gzip"), 0);
    assert.equal(parseAcceptEncoding("gzip;q=1, GZIP;q=0").get("gzip"), 0);
});
test("equal weights retain the offered order regardless of header order", ()=>{
    assert.equal(negotiateEncoding("gzip, br", [
        "br",
        "gzip"
    ]), "br");
    assert.equal(negotiateEncoding("br, gzip", [
        "gzip",
        "br"
    ]), "gzip");
    assert.equal(negotiateEncoding("*", [
        "identity",
        "gzip"
    ]), "identity");
    assert.equal(negotiateEncoding("gzip, identity", [
        "identity",
        "gzip"
    ]), "identity");
});

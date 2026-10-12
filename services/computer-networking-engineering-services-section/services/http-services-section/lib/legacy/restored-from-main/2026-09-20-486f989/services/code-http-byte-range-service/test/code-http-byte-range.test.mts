import assert from "node:assert/strict"; import test from "node:test"; import { contentRange, parseRanges } from "../src/code-http-byte-range.mts";
test("parses and forms byte ranges",()=>{assert.deepEqual(parseRanges("bytes=0-4,-2",10),[{start:0,end:4},{start:8,end:9}]);assert.equal(contentRange({start:0,end:4},10),"bytes 0-4/10");});

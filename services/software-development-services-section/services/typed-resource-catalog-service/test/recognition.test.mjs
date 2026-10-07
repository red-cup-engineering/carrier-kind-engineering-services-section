import assert from "node:assert/strict";
import test from "node:test";
import { recognize, validateRecognition } from "../src/recognition.mjs";

function matches(content, pointer, value) {
  const clause = { op: "json-pointer-equals", pointer, value };
  validateRecognition(clause);
  return recognize({ path: "/resource.json", content }, clause);
}

test("JSON pointers do not recognize inherited object members", () => {
  assert.equal(matches("{}", "/__proto__", {}), false);
  assert.equal(matches("{}", "/constructor/prototype", {}), false);
  assert.equal(matches("{}", "/toString", undefined), false);
  assert.equal(matches('{"nested":{}}', "/nested/__proto__", {}), false);
});

test("JSON pointers preserve actual own members with prototype-related names", () => {
  const content = '{"__proto__":{"kind":"own"},"constructor":{"prototype":"own"},"toString":null,"hasOwnProperty":true}';
  assert.equal(matches(content, "/__proto__", { kind: "own" }), true);
  assert.equal(matches(content, "/__proto__/kind", "own"), true);
  assert.equal(matches(content, "/constructor/prototype", "own"), true);
  assert.equal(matches(content, "/toString", null), true);
  assert.equal(matches(content, "/hasOwnProperty", true), true);
});

test("JSON pointers do not recognize array length or inherited members", () => {
  assert.equal(matches('["first","second"]', "/length", 2), false);
  assert.equal(matches("[]", "/__proto__", []), false);
  assert.equal(matches("[]", "/constructor/prototype", []), false);
  assert.equal(matches("[]", "/constructor/name", "Array"), false);
  assert.equal(matches('{"items":[]}', "/items/length", 0), false);
});

test("JSON pointers recognize canonical in-range array indices", () => {
  const content = '["first",{"value":false},null]';
  assert.equal(matches(content, "/0", "first"), true);
  assert.equal(matches(content, "/1/value", false), true);
  assert.equal(matches(content, "/2", null), true);
  assert.equal(matches('{"items":[[42]]}', "/items/0/0", 42), true);
  assert.equal(matches(JSON.stringify(Array.from({ length: 11 }, (_, index) => index)), "/10", 10), true);
});

test("JSON pointers leave noncanonical and missing array indices unresolved", () => {
  for (const token of ["", "00", "01", "+0", "+1", "-0", "-1", "-", "1.0", "1e0", " 0", "0 ", "\u0660", "3", "4294967295", "9007199254740993"]) {
    assert.equal(matches('["element","element","element"]', `/${token}`, "element"), false, token);
    assert.equal(matches('["element","element","element"]', `/${token}`, undefined), false, token);
  }
});

test("array-index restrictions do not apply to JSON object member names", () => {
  const content = '{"01":"leading zero","-":"dash","+0":"plus","length":3}';
  assert.equal(matches(content, "/01", "leading zero"), true);
  assert.equal(matches(content, "/-", "dash"), true);
  assert.equal(matches(content, "/+0", "plus"), true);
  assert.equal(matches(content, "/length", 3), true);
});

test("JSON pointers decode escaped slashes and tildes in RFC 6901 order", () => {
  const content = '{"a/b":{"m~n":1},"~1":2,"/":3,"~0":4,"~":5}';
  assert.equal(matches(content, "/a~1b/m~0n", 1), true);
  assert.equal(matches(content, "/~01", 2), true);
  assert.equal(matches(content, "/~1", 3), true);
  assert.equal(matches(content, "/~00", 4), true);
  assert.equal(matches(content, "/~0", 5), true);
  assert.equal(matches(content, "/~01", 3), false);
});

test("JSON pointer validation rejects malformed tilde escapes", () => {
  for (const pointer of ["/~", "/~2", "/a~b", "/~~0", "/~0~", "/valid/~x", "/~1~2"]) {
    const clause = { op: "json-pointer-equals", pointer, value: 1 };
    assert.throws(() => validateRecognition(clause), TypeError, pointer);
    assert.throws(() => recognize({ content: "{}" }, clause), TypeError, pointer);
  }
});

test("malformed JSON cannot hide invalid pointer syntax", () => {
  const clause = { op: "json-pointer-equals", pointer: "/~2", value: 1 };
  assert.throws(() => recognize({ content: "not JSON" }, clause), TypeError);
});

test("JSON pointers preserve the bounded nonempty absolute-pointer subset", () => {
  for (const pointer of ["", "relative", "#/value", null, 0, "/" + "a".repeat(16_384)]) {
    assert.throws(() => validateRecognition({ op: "json-pointer-equals", pointer, value: 1 }), TypeError);
  }
  assert.doesNotThrow(() => validateRecognition({ op: "json-pointer-equals", pointer: "/" + "a".repeat(16_383), value: 1 }));
});

test("JSON pointers can address empty object member names", () => {
  assert.equal(matches('{"":0}', "/", 0), true);
  assert.equal(matches('{"":{"":false}}', "//", false), true);
  assert.equal(matches("{}", "/", 0), false);
});

test("JSON pointers compare Unicode member names without normalization", () => {
  const content = '{"\u00e9":1,"e\u0301":2,"\ud83d\ude00":3}';
  assert.equal(matches(content, "/\u00e9", 1), true);
  assert.equal(matches(content, "/e\u0301", 2), true);
  assert.equal(matches(content, "/\ud83d\ude00", 3), true);
  assert.equal(matches('{"\u00e9":1}', "/e\u0301", 1), false);
});

test("JSON pointers return false for malformed JSON, missing members and primitive traversal", () => {
  for (const content of ["not JSON", "{", "undefined", "null", "true", "42", '"text"']) {
    assert.equal(matches(content, "/value", undefined), false, content);
  }
  assert.equal(matches('{"value":null}', "/missing", undefined), false);
  for (const value of [null, true, 42, "text"]) {
    assert.equal(matches(JSON.stringify({ value }), "/value/child", undefined), false);
  }
  assert.equal(matches('{"value":"text"}', "/value/length", 4), false);
  assert.equal(matches('{"value":"text"}', "/value/0", "t"), false);
});

test("JSON pointer equality preserves JSON values and structural comparison", () => {
  const content = '{"value":{"b":[false,null,0],"a":"text"}}';
  assert.equal(matches(content, "/value", { a: "text", b: [false, null, 0] }), true);
  assert.equal(matches(content, "/value/b", [false, null, 0]), true);
  assert.equal(matches(content, "/value/b/1", null), true);
  assert.equal(matches(content, "/value/b", { 0: false, 1: null, 2: 0 }), false);
  assert.equal(matches(content, "/value/b/2", "0"), false);
});

test("JSON pointer recognition composes with the existing boolean operations", () => {
  const resource = { path: "/resource.json", content: '{"kind":"example"}' };
  const own = { op: "json-pointer-equals", pointer: "/kind", value: "example" };
  const inherited = { op: "json-pointer-equals", pointer: "/__proto__", value: {} };
  for (const clause of [
    { op: "all", clauses: [own, { op: "path-suffix", value: ".json" }] },
    { op: "any", clauses: [inherited, own] },
    { op: "not", clause: inherited },
  ]) {
    validateRecognition(clause);
    assert.equal(recognize(resource, clause), true);
  }
});

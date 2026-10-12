#!/usr/bin/env node
/** RFC 8785 (JCS) canonical JSON: strict admission of runtime values and JSON
 * text, optional resource bounds, and the one canonical serialization. */
export const CANONICAL_JSON_PROFILE = "RFC8785";
export const inputSchema = {};
export const outputSchema = { type: "string" };

/** No bounds: the default for values the caller already holds. */
export const UNBOUNDED_JSON_ENVELOPE = Object.freeze({
  maxSourceBytes: Infinity,
  maxCanonicalBytes: Infinity,
  maxDepth: Infinity,
  maxNodes: Infinity,
  maxObjectMembers: Infinity,
  maxArrayLength: Infinity,
  maxStringBytes: Infinity,
  maxKeyBytes: Infinity,
});

/** Bounds for admitting untrusted JSON: 1 MiB, depth 64, 100k nodes. */
export const JSON_RESOURCE_ENVELOPE = Object.freeze({
  maxSourceBytes: 1_048_576,
  maxCanonicalBytes: 1_048_576,
  maxDepth: 64,
  maxNodes: 100_000,
  maxObjectMembers: 4_096,
  maxArrayLength: 65_536,
  maxStringBytes: 262_144,
  maxKeyBytes: 1_024,
});

const utf8Encoder = new TextEncoder();
const numberGrammar = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/u;

function byteLength(value) {
  return utf8Encoder.encode(value).byteLength;
}

function pathText(path) {
  if (typeof path === "string") return path;
  const parts = [];
  for (let node = path; node !== null; node = node.parent) parts.push(node.segment);
  let text = "$";
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    text += part.kind === "index" ? `[${part.value}]` : `.${part.value}`;
  }
  return text;
}

function propertyPath(path, key) {
  return { parent: path, kind: "property", value: key };
}

function indexPath(path, index) {
  return { parent: path, kind: "index", value: index };
}

function fail(code, path, message) {
  const renderedPath = pathText(path);
  const error = new TypeError(`${code} at ${renderedPath}: ${message}`);
  error.code = code;
  error.path = renderedPath;
  throw error;
}

function assertUnicodeScalars(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        fail("unicode-scalar", path, "must not contain a lone Unicode surrogate (high)");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail("unicode-scalar", path, "must not contain a lone Unicode surrogate (low)");
    }
  }
}

function stringText(value, path, limit, code) {
  assertUnicodeScalars(value, path);
  if (byteLength(value) > limit) fail(code, path, `UTF-8 string exceeds ${limit} bytes`);
  return JSON.stringify(value);
}

function chargeCanonical(state, amount, path) {
  state.canonicalBytes += amount;
  if (state.canonicalBytes > state.envelope.maxCanonicalBytes) {
    fail("canonical-limit", path, `canonical JSON exceeds ${state.envelope.maxCanonicalBytes} bytes`);
  }
}

function projectValue(value, path, depth, state) {
  const tokens = [];
  const frames = [{ source: value, path, depth, entered: false }];
  let result;

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    if (!frame.entered) {
      frame.entered = true;
      state.nodes += 1;
      if (state.nodes > state.envelope.maxNodes) {
        fail("node-limit", frame.path, `JSON value exceeds ${state.envelope.maxNodes} nodes`);
      }
      const item = frame.source;
      if (item === null) {
        chargeCanonical(state, 4, frame.path);
        tokens.push("null");
        result = null;
        frames.pop();
        continue;
      }
      if (typeof item === "boolean") {
        const text = item ? "true" : "false";
        chargeCanonical(state, text.length, frame.path);
        tokens.push(text);
        result = item;
        frames.pop();
        continue;
      }
      if (typeof item === "string") {
        const text = stringText(item, frame.path, state.envelope.maxStringBytes, "string-limit");
        chargeCanonical(state, byteLength(text), frame.path);
        tokens.push(text);
        result = item;
        frames.pop();
        continue;
      }
      if (typeof item === "number") {
        if (!Number.isFinite(item)) fail("invalid-json-value", frame.path, "JCS admits only finite IEEE-754 numbers");
        const text = JSON.stringify(item);
        chargeCanonical(state, byteLength(text), frame.path);
        tokens.push(text);
        result = Object.is(item, -0) ? 0 : item;
        frames.pop();
        continue;
      }
      if (typeof item !== "object") {
        fail("invalid-json-value", frame.path, `unsupported JSON value type: ${typeof item}`);
      }
      if (frame.depth >= state.envelope.maxDepth) {
        fail("depth-limit", frame.path, `JSON nesting exceeds depth ${state.envelope.maxDepth}`);
      }
      if (state.active.has(item)) fail("invalid-json-value", frame.path, "must not contain a cycle");
      state.active.add(item);
      frame.container = item;
      frame.index = 0;

      if (Array.isArray(item)) {
        if (item.length > state.envelope.maxArrayLength) {
          fail("array-length-limit", frame.path, `array exceeds ${state.envelope.maxArrayLength} elements`);
        }
        const ownKeys = Reflect.ownKeys(item);
        if (ownKeys.some((key) => key !== "length" && (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= item.length))) {
          fail("invalid-json-value", frame.path, "arrays may not carry symbol or non-index properties");
        }
        chargeCanonical(state, 2 + Math.max(0, item.length - 1), frame.path);
        tokens.push("[");
        frame.array = true;
        frame.carried = [];
        frame.length = item.length;
      } else {
        if (Object.getPrototypeOf(item) !== Object.prototype) {
          fail("invalid-json-value", frame.path, "only ordinary JSON objects with Object.prototype are admitted");
        }
        const keys = Reflect.ownKeys(item);
        if (keys.some((key) => typeof key !== "string")) {
          fail("invalid-json-value", frame.path, "symbol properties are outside the JSON data model");
        }
        if (keys.length > state.envelope.maxObjectMembers) {
          fail("object-member-limit", frame.path, `object exceeds ${state.envelope.maxObjectMembers} members`);
        }
        frame.keys = keys.sort();
        chargeCanonical(state, 2 + Math.max(0, frame.keys.length - 1) + frame.keys.length, frame.path);
        tokens.push("{");
        frame.carried = {};
        frame.array = false;
      }
      continue;
    }

    const count = frame.array ? frame.length : frame.keys.length;
    if (frame.awaitingChild) {
      if (frame.array) {
        frame.carried.push(result);
      } else {
        Object.defineProperty(frame.carried, frame.key, {
          value: result,
          enumerable: true,
          configurable: false,
          writable: false,
        });
      }
      frame.awaitingChild = false;
      frame.index += 1;
    }
    if (frame.index === count) {
      tokens.push(frame.array ? "]" : "}");
      const carried = Object.freeze(frame.carried);
      state.active.delete(frame.container);
      result = carried;
      frames.pop();
      continue;
    }
    if (frame.index > 0) tokens.push(",");
    let child;
    let childPath;
    if (frame.array) {
      const index = frame.index;
      const descriptor = Object.getOwnPropertyDescriptor(frame.container, String(index));
      childPath = indexPath(frame.path, index);
      if (descriptor === undefined) {
        fail("invalid-json-value", childPath, "sparse arrays are outside the admitted JSON value model");
      }
      if (!("value" in descriptor) || !descriptor.enumerable) {
        fail("invalid-json-value", childPath, "array accessors and non-enumerable elements are outside the JSON data model");
      }
      child = descriptor.value;
    } else {
      const key = frame.keys[frame.index];
      const descriptor = Object.getOwnPropertyDescriptor(frame.container, key);
      childPath = propertyPath(frame.path, key);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        fail("invalid-json-value", childPath, "accessor and non-enumerable properties are outside the JSON data model");
      }
      const keyText = stringText(key, childPath, state.envelope.maxKeyBytes, "key-limit");
      chargeCanonical(state, byteLength(keyText), childPath);
      tokens.push(keyText, ":");
      frame.key = key;
      child = descriptor.value;
    }
    frame.awaitingChild = true;
    frames.push({ source: child, path: childPath, depth: frame.depth + 1, entered: false });
  }

  return { value: result, text: tokens.join("") };
}

class StrictJsonParser {
 index = 0;
 nodes = 0;
 source;
 envelope;

  constructor(source, envelope) {
    this.source = source;
    this.envelope = envelope;
  }

  parse() {
    this.space();
    const value = this.value("$", 0);
    this.space();
    if (this.index !== this.source.length) fail("malformed-json", "$", `unexpected input at UTF-16 offset ${this.index}`);
    return value;
  }

 value(path, depth) {
    this.nodes += 1;
    if (this.nodes > this.envelope.maxNodes) fail("node-limit", path, `JSON value exceeds ${this.envelope.maxNodes} nodes`);
    const lead = this.source[this.index];
    if (lead === "{") return this.object(path, depth);
    if (lead === "[") return this.array(path, depth);
    if (lead === "\"") return this.string(path, this.envelope.maxStringBytes, "string-limit");
    if (this.source.startsWith("true", this.index)) return this.literal("true", true);
    if (this.source.startsWith("false", this.index)) return this.literal("false", false);
    if (this.source.startsWith("null", this.index)) return this.literal("null", null);
    return this.number(path);
  }

 literal(token, value) {
    this.index += token.length;
    return value;
  }

 object(path, depth) {
    if (depth >= this.envelope.maxDepth) fail("depth-limit", path, `JSON nesting exceeds depth ${this.envelope.maxDepth}`);
    this.index += 1;
    this.space();
    const out = {};
    const names = new Set();
    if (this.take("}")) return Object.freeze(out);
    let members = 0;
    while (true) {
      if (this.source[this.index] !== "\"") fail("malformed-json", path, `object name expected at UTF-16 offset ${this.index}`);
      const key = this.string(path, this.envelope.maxKeyBytes, "key-limit");
      if (names.has(key)) fail("duplicate-key", `${path}.${key}`, `duplicate object name: ${JSON.stringify(key)}`);
      names.add(key);
      members += 1;
      if (members > this.envelope.maxObjectMembers) {
        fail("object-member-limit", path, `object exceeds ${this.envelope.maxObjectMembers} members`);
      }
      this.space();
      if (!this.take(":")) fail("malformed-json", `${path}.${key}`, `colon expected at UTF-16 offset ${this.index}`);
      this.space();
      Object.defineProperty(out, key, {
        value: this.value(`${path}.${key}`, depth + 1),
        enumerable: true,
        configurable: false,
        writable: false,
      });
      this.space();
      if (this.take("}")) return Object.freeze(out);
      if (!this.take(",")) fail("malformed-json", path, `comma or object close expected at UTF-16 offset ${this.index}`);
      this.space();
    }
  }

 array(path, depth) {
    if (depth >= this.envelope.maxDepth) fail("depth-limit", path, `JSON nesting exceeds depth ${this.envelope.maxDepth}`);
    this.index += 1;
    this.space();
    const out = [];
    if (this.take("]")) return Object.freeze(out);
    while (true) {
      if (out.length >= this.envelope.maxArrayLength) {
        fail("array-length-limit", path, `array exceeds ${this.envelope.maxArrayLength} elements`);
      }
      out.push(this.value(`${path}[${out.length}]`, depth + 1));
      this.space();
      if (this.take("]")) return Object.freeze(out);
      if (!this.take(",")) fail("malformed-json", path, `comma or array close expected at UTF-16 offset ${this.index}`);
      this.space();
    }
  }

 string(path, limit, code) {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const unit = this.source.charCodeAt(this.index);
      if (unit === 0x22) {
        this.index += 1;
        const raw = this.source.slice(start, this.index);
        let decoded;
        try {
          decoded = JSON.parse(raw);
        } catch {
          fail("malformed-json", path, `invalid JSON string at UTF-16 offset ${start}`);
        }
        if (typeof decoded !== "string") fail("malformed-json", path, "internal JSON string decoding failure");
        stringText(decoded, path, limit, code);
        return decoded;
      }
      if (unit < 0x20) fail("malformed-json", path, `unescaped control character at UTF-16 offset ${this.index}`);
      if (unit === 0x5c) {
        this.index += 1;
        const escape = this.source[this.index];
        if (escape === undefined || !'"\\/bfnrtu'.includes(escape)) {
          fail("malformed-json", path, `invalid string escape at UTF-16 offset ${this.index}`);
        }
        if (escape === "u") {
          const digits = this.source.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(digits)) fail("malformed-json", path, `invalid Unicode escape at UTF-16 offset ${this.index}`);
          this.index += 4;
        }
      }
      this.index += 1;
    }
    fail("malformed-json", path, `unterminated JSON string at UTF-16 offset ${start}`);
  }

 number(path) {
    const start = this.index;
    while (this.index < this.source.length && !/[\u0009\u000a\u000d\u0020,\]}]/u.test(this.source[this.index])) this.index += 1;
    const token = this.source.slice(start, this.index);
    if (!numberGrammar.test(token)) fail("malformed-json", path, `invalid JSON token at UTF-16 offset ${start}`);
    const value = Number(token);
    if (!Number.isFinite(value)) fail("invalid-json-value", path, "JCS admits only finite IEEE-754 numbers");
    return Object.is(value, -0) ? 0 : value;
  }

 space() {
    while (this.index < this.source.length && /[\u0009\u000a\u000d\u0020]/u.test(this.source[this.index])) this.index += 1;
  }

 take(token) {
    if (this.source[this.index] !== token) return false;
    this.index += 1;
    return true;
  }
}

/** Canonicalize one runtime JSON value: a frozen copy, its RFC 8785 text and
 * the text's UTF-8 length. Refusals are TypeErrors carrying `code` and `path`. */
export function canonicalizeJson(value, envelope = UNBOUNDED_JSON_ENVELOPE) {
  const state = { nodes: 0, canonicalBytes: 0, active: new WeakSet(), envelope };
  const projected = projectValue(value, "$", 0, state);
  return Object.freeze({ value: projected.value, text: projected.text, byteLength: state.canonicalBytes });
}

/** Admit JSON text or UTF-8 bytes strictly (no duplicate names, no lone
 * surrogates, bounded) and canonicalize the value it denotes. */
export function admitCanonicalJson(source, envelope = JSON_RESOURCE_ENVELOPE) {
  const sourceBytes = typeof source === "string" ? byteLength(source) : source.byteLength;
  if (sourceBytes > envelope.maxSourceBytes) fail("source-limit", "$", `source exceeds ${envelope.maxSourceBytes} bytes`);
  let text;
  try {
    text = typeof source === "string" ? source : new TextDecoder("utf-8", { fatal: true }).decode(source);
  } catch {
    fail("malformed-utf8", "$", "source is not well-formed UTF-8");
  }
  return canonicalizeJson(new StrictJsonParser(text, envelope).parse(), envelope);
}

/** The RFC 8785 text of one JSON value. */
export function canonicalJson(value, envelope = UNBOUNDED_JSON_ENVELOPE) {
  return canonicalizeJson(value, envelope).text;
}

/** The same JSON value with every object's keys in canonical order. */
export function canonicalJsonValue(value) {
  return JSON.parse(canonicalJson(value));
}
export default canonicalJson;
if (import.meta.main) {
  const { readFileSync } = await import("node:fs");
  process.stdout.write(
    JSON.stringify(canonicalJson(JSON.parse(readFileSync(0, "utf8")))) + "\n",
  );
}

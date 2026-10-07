const MAX_CLAUSES = 256;
const MAX_TEXT = 16_384;

function text(value, context) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TEXT) {
    throw new TypeError(`${context}: expected a nonempty bounded string`);
  }
  return value;
}

function pointerParts(pointer) {
  const source = text(pointer, "json-pointer-equals.pointer");
  if (!source.startsWith("/") || /~(?![01])/u.test(source)) throw new TypeError("json-pointer-equals.pointer: expected an RFC 6901 absolute pointer");
  return source.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function jsonAt(content, pointer) {
  const parts = pointerParts(pointer);
  let value;
  try { value = JSON.parse(content); } catch { return { found: false }; }
  for (const part of parts) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, part)) return { found: false };
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/u.test(part)) return { found: false };
    value = value[part];
  }
  return { found: true, value };
}

function sameJson(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && sameJson(left[key], right[key]));
}

export function validateRecognition(clause, count = { value: 0 }) {
  count.value += 1;
  if (count.value > MAX_CLAUSES) throw new TypeError(`recognition expression exceeds ${MAX_CLAUSES} clauses`);
  if (clause === null || typeof clause !== "object" || Array.isArray(clause)) throw new TypeError("recognition clause must be an object");
  switch (clause.op) {
    case "true": return;
    case "path-suffix":
    case "path-prefix":
    case "path-segment":
    case "content-includes": text(clause.value, `${clause.op}.value`); return;
    case "json-pointer-equals": pointerParts(clause.pointer); return;
    case "all":
    case "any":
      if (!Array.isArray(clause.clauses) || clause.clauses.length === 0) throw new TypeError(`${clause.op}.clauses must be nonempty`);
      for (const child of clause.clauses) validateRecognition(child, count);
      return;
    case "not": validateRecognition(clause.clause, count); return;
    default: throw new TypeError(`unknown recognition operation: ${JSON.stringify(clause.op)}`);
  }
}

export function recognize(resource, clause) {
  switch (clause.op) {
    case "true": return true;
    case "path-suffix": return resource.path.endsWith(clause.value);
    case "path-prefix": return resource.path.startsWith(clause.value);
    case "path-segment": return resource.path.split("/").includes(clause.value);
    case "content-includes": return resource.content.includes(clause.value);
    case "json-pointer-equals": {
      const found = jsonAt(resource.content, clause.pointer);
      return found.found && sameJson(found.value, clause.value);
    }
    case "all": return clause.clauses.every((child) => recognize(resource, child));
    case "any": return clause.clauses.some((child) => recognize(resource, child));
    case "not": return !recognize(resource, clause.clause);
    default: return false;
  }
}

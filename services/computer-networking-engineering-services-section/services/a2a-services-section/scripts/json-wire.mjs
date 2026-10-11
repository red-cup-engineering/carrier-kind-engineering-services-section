// A2A 1.0 JSON representation boundary. The house keeps tagged Part unions
// internally; the protocol carries exactly one direct text/raw/url/data member.
// Only named protocol positions are traversed. Economic/authority metadata and
// structured data are opaque JSON values, never recursively rewritten as Parts.
const cases = ["text", "raw", "url", "data"];
const own = (value, key) => Object.hasOwn(value, key);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function object(value, label) {
  if (!record(value)) throw new TypeError(`A2A ${label}: expected object`);
  return value;
}
function string(value, label, nonempty = false) {
  if (typeof value !== "string" || (nonempty && value.length === 0)) throw new TypeError(`A2A ${label}: expected ${nonempty ? "nonempty " : ""}string`);
  return value;
}
function json(value, label) {
  if (value === null || ["string", "boolean"].includes(typeof value) || (typeof value === "number" && Number.isFinite(value))) return;
  if (Array.isArray(value)) { for (const item of value) json(item, label); return; }
  if (record(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))) { for (const item of Object.values(value)) json(item, label); return; }
  throw new TypeError(`A2A ${label}: expected JSON value`);
}
function metadata(value, label) {
  if (value === undefined) return;
  object(value, label); json(value, label);
}
function base64(value, internal) {
  if (internal && value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  string(value, "Part raw");
  // ProtoJSON accepts standard or URL-safe base64, with or without padding.
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/u.test(value) || value.replace(/=+$/u, "").length % 4 === 1 || (value.includes("=") && value.length % 4 !== 0)) throw new TypeError("A2A Part raw: invalid base64");
  const bytes = Buffer.from(value, "base64");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").replace(/=+$/u, "");
  if (bytes.toString("base64").replace(/=+$/u, "") !== normalized) throw new TypeError("A2A Part raw: invalid base64");
  return bytes.toString("base64");
}
function part(value, outward) {
  object(value, "Part");
  const direct = cases.filter((key) => own(value, key));
  const tagged = own(value, "content");
  if (tagged && (!outward || direct.length)) throw new TypeError("A2A Part: tagged content is internal only and cannot mix with wire members");
  let kind, body;
  if (tagged) {
    object(value.content, "Part content");
    kind = value.content.$case; body = value.content.value;
    if (!cases.includes(kind) || !own(value.content, "value")) throw new TypeError("A2A Part: invalid internal content union");
  } else {
    if (direct.length !== 1) throw new TypeError("A2A Part: expected exactly one text/raw/url/data member");
    kind = direct[0]; body = value[kind];
  }
  if (kind === "raw") body = base64(body, outward);
  else if (kind === "data") json(body, "Part data");
  else string(body, `Part ${kind}`);
  metadata(value.metadata, "Part metadata");
  for (const key of ["filename", "mediaType"]) if (value[key] !== undefined) string(value[key], `Part ${key}`);
  const rest = { ...value };
  delete rest.content;
  for (const key of cases) delete rest[key];
  return outward ? { ...rest, [kind]: body } : { ...rest, content: { $case: kind, value: body } };
}
export const partToJson = (value) => part(value, true);
export const partFromJson = (value) => part(value, false);
function parts(values, outward) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError("A2A parts: expected at least one part");
  return values.map((value) => part(value, outward));
}
function message(value, outward) {
  object(value, "Message"); string(value.messageId, "Message messageId", true);
  if (!["ROLE_USER", "ROLE_AGENT"].includes(value.role)) throw new TypeError("A2A Message: invalid role");
  for (const key of ["contextId", "taskId"]) if (value[key] !== undefined) string(value[key], `Message ${key}`);
  for (const key of ["extensions", "referenceTaskIds"]) if (value[key] !== undefined) {
    if (!Array.isArray(value[key])) throw new TypeError(`A2A Message ${key}: expected array`);
    value[key].forEach((item) => string(item, `Message ${key}`, true));
  }
  metadata(value.metadata, "Message metadata");
  return { ...value, parts: parts(value.parts, outward) };
}
export const messageToJson = (value) => message(value, true);
export const messageFromJson = (value) => message(value, false);
function task(value, outward) {
  object(value, "Task"); string(value.id, "Task id", true); object(value.status, "Task status");
  if (!["UNSPECIFIED", "SUBMITTED", "WORKING", "COMPLETED", "FAILED", "CANCELED", "INPUT_REQUIRED", "REJECTED", "AUTH_REQUIRED"].some((state) => value.status.state === `TASK_STATE_${state}`)) throw new TypeError("A2A Task: invalid status state");
  const status = { ...value.status, ...(value.status.message === undefined ? {} : { message: message(value.status.message, outward) }) };
  const result = { ...value, status };
  if (value.history !== undefined) {
    if (!Array.isArray(value.history)) throw new TypeError("A2A Task history: expected array");
    result.history = value.history.map((item) => message(item, outward));
  }
  if (value.artifacts !== undefined) {
    if (!Array.isArray(value.artifacts)) throw new TypeError("A2A Task artifacts: expected array");
    result.artifacts = value.artifacts.map((item) => {
      object(item, "Artifact"); string(item.artifactId, "Artifact artifactId", true);
      metadata(item.metadata, "Artifact metadata");
      return { ...item, parts: parts(item.parts, outward) };
    });
  }
  metadata(value.metadata, "Task metadata");
  return result;
}
export const taskToJson = (value) => task(value, true);
export const taskFromJson = (value) => task(value, false);

const methods = Object.freeze({ "message/send": "SendMessage", "tasks/get": "GetTask", "tasks/cancel": "CancelTask" });
export const wireMethod = (method) => methods[method] ?? method;
export const internalMethod = (method) => Object.keys(methods).find((key) => methods[key] === method) ?? method;
export function requestToJson(method, params) {
  return wireMethod(method) === "SendMessage" ? { ...object(params, "SendMessage params"), message: messageToJson(params.message) } : params;
}
export function requestFromJson(method, params) {
  object(params, `${method} params`);
  if (method === "SendMessage") {
    if (params.configuration !== undefined) {
      object(params.configuration, "SendMessage configuration");
      const { returnImmediately, historyLength } = params.configuration;
      if (returnImmediately !== undefined && typeof returnImmediately !== "boolean") throw new TypeError("A2A returnImmediately: expected boolean");
      if (historyLength !== undefined && (!Number.isSafeInteger(historyLength) || historyLength < 0)) throw new TypeError("A2A historyLength: expected nonnegative safe integer");
    }
    return { ...params, message: messageFromJson(params.message) };
  }
  if (["GetTask", "CancelTask"].includes(method)) string(params.id, `${method} id`, true);
  if (params.historyLength !== undefined && (!Number.isSafeInteger(params.historyLength) || params.historyLength < 0)) throw new TypeError("A2A historyLength: expected nonnegative safe integer");
  return params;
}
export function resultToJson(method, result) {
  if (method === "SendMessage") {
    object(result, "SendMessage result");
    if (own(result, "parts") === own(result, "status")) throw new TypeError("A2A SendMessage result: expected one Message or Task");
    return own(result, "parts") ? { message: messageToJson(result) } : { task: taskToJson(result) };
  }
  return ["GetTask", "CancelTask"].includes(method) ? taskToJson(result) : result;
}
export function resultFromJson(method, result) {
  method = wireMethod(method);
  if (method === "SendMessage") {
    object(result, "SendMessageResponse");
    if (own(result, "message") === own(result, "task")) throw new TypeError("A2A SendMessageResponse: expected exactly one message/task member");
    return own(result, "message") ? messageFromJson(result.message) : taskFromJson(result.task);
  }
  return ["GetTask", "CancelTask"].includes(method) ? taskFromJson(result) : result;
}

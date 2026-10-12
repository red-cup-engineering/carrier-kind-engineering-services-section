import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";


const MAX_BODY_BYTES = 4 * 1024 * 1024;

function freeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function jsonSnapshot(value, label) {
  let text;
  try { text = JSON.stringify(value); } catch { throw new TypeError(`${label} must be JSON-safe`); }
  if (text === undefined) throw new TypeError(`${label} must be JSON-safe`);
  return freeze(JSON.parse(text));
}

function descriptor(value) {
  if (value === null || typeof value !== "object" || typeof value.id !== "string" || value.id.length === 0 || typeof value.description !== "string" || typeof value.execute !== "function") {
    throw new TypeError("every pure operation needs id, description, and execute");
  }
  const inputSchema = value.inputSchema ?? { type: "object" };
  if (inputSchema === null || typeof inputSchema !== "object" || Array.isArray(inputSchema)) throw new TypeError("pure operation inputSchema must be a JSON object");
  return Object.freeze({ id: value.id, description: value.description, inputSchema: jsonSnapshot(inputSchema, "pure operation inputSchema"), execute: value.execute });
}

export function createPureOperationRegistry(values = []) {
  const byId = new Map();
  for (const value of Array.isArray(values) ? values : Object.values(values)) {
    const admitted = descriptor(value);
    if (byId.has(admitted.id)) throw new TypeError(`duplicate pure operation id: ${admitted.id}`);
    byId.set(admitted.id, admitted);
  }
  return Object.freeze({
    list: () => Object.freeze([...byId.values()].map(({ id, description, inputSchema }) => Object.freeze({ id, description, inputSchema }))),
    execute: (id, input) => {
      const operation = byId.get(id);
      if (operation === undefined) throw new TypeError("unknown pure operation");
      return operation.execute(input);
    },
  });
}

async function inputFrom(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    if (length > MAX_BODY_BYTES) throw new TypeError("operation input exceeds 4194304 bytes");
    chunks.push(bytes);
  }
  if (length === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks, length).toString("utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch { throw new TypeError("operation input must be a JSON object"); }
}

export function pureOperationsApp(registry) {
  return { resources: [
    { id: "ops-pure-operations.list", match: "/operations", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr({ operations: registry.list() }) },
    { id: "ops-pure-operations.execute", match: (path) => path.startsWith("/operations/") ? { encodedId: path.slice("/operations/".length) } : false, methods: ["POST"], produces: ["application/json"], handler: async (ctx) => {
      try { return jsonRepr({ result: await registry.execute(decodeURIComponent(ctx.params.encodedId), await inputFrom(ctx.req)) }); }
      catch (error) { return jsonRepr({ error: "invalid_operation", reason: error instanceof Error ? error.message : "operation did not complete" }, { status: 400, cacheControl: { noStore: true } }); }
    } },
  ] };
}

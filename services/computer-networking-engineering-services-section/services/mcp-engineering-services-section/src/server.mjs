// The house's one Model Context Protocol server: JSON-RPC 2.0 dispatch of the lifecycle, tools,
// resources, resource templates and prompts, and the stdio transport. The Streamable HTTP
// transport is `./http.mjs`; clients are `./client.mjs`. No SDK, no zod: tool arguments are
// admitted against their declared `inputSchema` through the data section's type system.

import { admit, defineType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";

/** Protocol revisions this server speaks, newest first. `initialize` echoes the client's when it
 *  is one of these and answers with the newest otherwise, as the lifecycle specifies. */
export const MCP_PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]);
export const LATEST_MCP_PROTOCOL_VERSION = MCP_PROTOCOL_VERSIONS[0];

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;
export const RESOURCE_NOT_FOUND = -32002;

const rpcId = (id) => (typeof id === "string" || typeof id === "number" ? id : null);
const message = (error) => (error instanceof Error ? error.message : String(error));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function mcpOk(id, result) { return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), result }); }
export function mcpRpcError(id, code, text, data) {
  return Object.freeze({ jsonrpc: "2.0", id: rpcId(id), error: Object.freeze({ code, message: text, ...(data === undefined ? {} : { data }) }) });
}

/** A handler's value as a CallToolResult: passed through when it already carries `content`,
 *  otherwise JSON text plus `structuredContent` (which the protocol requires to be an object). */
export function mcpToolResult(value) {
  if (isObject(value) && Array.isArray(value.content)) return value;
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);
  return Object.freeze({ content: Object.freeze([{ type: "text", text }]), ...(isObject(value) ? { structuredContent: value } : {}) });
}

/** A tool-level failure: reported inside the result, so the calling model can read and recover. */
export function mcpToolError(error) {
  const text = isObject(error) && typeof error.code === "string" && typeof error.message === "string" && !(error instanceof Error) ? `${error.code}: ${error.message}` : message(error);
  return Object.freeze({ isError: true, content: Object.freeze([{ type: "text", text }]) });
}

function inputTypeOf(tool) {
  if (tool.inputSchema === undefined || tool.admitArguments === false) return undefined;
  const declared = defineType({ id: `mcp:${tool.name}:input`, name: tool.name, description: tool.description ?? tool.name, schema: tool.inputSchema, parents: [] });
  if (!declared.ok) throw new TypeError(`tool ${tool.name} declares an invalid inputSchema: ${declared.refusal.message}`);
  return declared.value;
}

const toolView = ({ handler: _handler, visible: _visible, admitArguments: _admit, ...view }) => ({ inputSchema: { type: "object" }, ...view });
const resourceView = ({ read: _read, visible: _visible, ...view }) => view;
const templateView = ({ read: _read, match: _match, visible: _visible, ...view }) => view;
const promptView = ({ get: _get, visible: _visible, ...view }) => view;

/** RFC 6570 level-1 templates (`{name}`) as a matcher from a URI to its variables. */
function templateMatcher(uriTemplate) {
  const names = [];
  const pattern = uriTemplate.replace(/[.*+?^$()|[\]\\]/gu, "\\$&").replace(/\\?\{([^}]+)\\?\}/gu, (_whole, name) => { names.push(name); return "([^/?#]+)"; });
  const expression = new RegExp(`^${pattern}$`, "u");
  return (uri) => {
    const found = expression.exec(uri);
    return found ? Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(found[index + 1])])) : undefined;
  };
}

function page(items, cursor, size) {
  if (size === undefined) return { items, next: undefined };
  const start = cursor === undefined ? 0 : Number.parseInt(Buffer.from(String(cursor), "base64url").toString("utf8"), 10);
  if (!Number.isSafeInteger(start) || start < 0 || start > items.length) throw Object.assign(new Error("invalid cursor"), { rpcCode: INVALID_PARAMS });
  const end = start + size;
  return { items: items.slice(start, end), next: end < items.length ? Buffer.from(String(end)).toString("base64url") : undefined };
}

/**
 * One MCP server over a catalog. Every handler receives the request `context` (the transport's
 * principal, bearer, HTTP context and whatever the host binds), and each entry's optional
 * `visible(context)` hides it from principals it is not for.
 *
 * @param {{
 *   name: string, version: string, title?: string, instructions?: string,
 *   tools?: {name: string, title?: string, description?: string, inputSchema?: object, outputSchema?: object, annotations?: object, visible?: (context: object) => boolean, admitArguments?: false, handler: (args: object, context: object) => unknown}[],
 *   toolSources?: (object[] & {refresh?: Function, subscribe?: Function})[],
 *   resources?: {uri: string, name: string, title?: string, description?: string, mimeType?: string, visible?: Function, read: (uri: string, context: object) => unknown}[],
 *   resourceTemplates?: {uriTemplate: string, name: string, description?: string, mimeType?: string, visible?: Function, read: (uri: string, variables: object, context: object) => unknown}[],
 *   prompts?: {name: string, title?: string, description?: string, arguments?: object[], visible?: Function, get: (args: object, context: object) => unknown}[],
 *   pageSize?: number,
 *   observe?: (event: {direction: "in"|"out", message: object, context: object}) => void,
 * }} options
 */
export function createMcpServer({ name, version, title, instructions, tools = [], toolSources = [], resources = [], resourceTemplates = [], prompts = [], pageSize, observe }) {
  if (typeof name !== "string" || typeof version !== "string") throw new TypeError("an MCP server needs a name and a version");
  let catalogTools;
  let toolsByName;
  let inputTypes;
  const refreshToolCatalog = () => {
    catalogTools = [...toolSources.flatMap((source) => [...source]), ...tools];
    const nextTools = new Map(catalogTools.map((tool) => [tool.name, tool]));
    if (nextTools.size !== catalogTools.length) throw new TypeError("tool names must be unique");
    toolsByName = nextTools;
    inputTypes = new Map(catalogTools.map((tool) => [tool.name, inputTypeOf(tool)]));
  };
  refreshToolCatalog();
  const notificationListeners = new Set();
  const toolsCanChange = toolSources.some((source) => typeof source.subscribe === "function");
  const changed = (notification = { jsonrpc: "2.0", method: "notifications/tools/list_changed" }) => {
    refreshToolCatalog();
    for (const listener of notificationListeners) {
      try {
        const sent = listener(notification);
        sent?.catch?.(() => undefined);
      } catch { /* A disconnected transport does not prevent catalog replacement. */ }
    }
  };
  for (const source of toolSources) source.subscribe?.(changed);
  const templates = resourceTemplates.map((template) => ({ template, match: templateMatcher(template.uriTemplate) }));
  const promptsByName = new Map(prompts.map((prompt) => [prompt.name, prompt]));
  const shown = (entry, context) => entry.visible === undefined || entry.visible(context) === true;
  const capabilities = Object.freeze({
    ...(catalogTools.length > 0 || toolSources.length > 0 ? { tools: { listChanged: toolsCanChange } } : {}),
    ...(resources.length + resourceTemplates.length > 0 ? { resources: { subscribe: false, listChanged: false } } : {}),
    ...(prompts.length > 0 ? { prompts: { listChanged: false } } : {}),
    logging: {},
    completions: {},
  });

  const methods = {
    initialize: (params) => ({
      protocolVersion: MCP_PROTOCOL_VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : LATEST_MCP_PROTOCOL_VERSION,
      capabilities,
      serverInfo: { name, version, ...(title === undefined ? {} : { title }) },
      ...(instructions === undefined ? {} : { instructions }),
    }),
    ping: () => ({}),
    "logging/setLevel": () => ({}),
    "completion/complete": () => ({ completion: { values: [], hasMore: false } }),
    "tools/list": async (params, context) => {
      await Promise.all(toolSources.map((source) => source.refresh?.()));
      refreshToolCatalog();
      const { items, next } = page(catalogTools.filter((tool) => shown(tool, context)), params?.cursor, pageSize);
      return { tools: items.map(toolView), ...(next === undefined ? {} : { nextCursor: next }) };
    },
    "tools/call": async (params, context) => {
      refreshToolCatalog();
      const tool = toolsByName.get(params?.name);
      if (tool === undefined || !shown(tool, context)) throw Object.assign(new Error(`unknown tool: ${params?.name}`), { rpcCode: INVALID_PARAMS });
      const args = params?.arguments ?? {};
      const inputType = inputTypes.get(tool.name);
      if (inputType !== undefined) {
        const admitted = admit(inputType, args);
        if (!admitted.ok) {
          const issues = admitted.refusal.issues.map((issue) => `${issue.path || "/"} ${issue.message}`).join("; ");
          throw Object.assign(new Error(`tool ${tool.name} arguments outside inputSchema: ${issues}`), { rpcCode: INVALID_PARAMS });
        }
      }
      try { return mcpToolResult(await tool.handler(args, context)); }
      catch (error) { return mcpToolError(error); }
    },
    "resources/list": (params, context) => {
      const { items, next } = page(resources.filter((resource) => shown(resource, context)), params?.cursor, pageSize);
      return { resources: items.map(resourceView), ...(next === undefined ? {} : { nextCursor: next }) };
    },
    "resources/templates/list": (params, context) => {
      const { items, next } = page(resourceTemplates.filter((template) => shown(template, context)), params?.cursor, pageSize);
      return { resourceTemplates: items.map(templateView), ...(next === undefined ? {} : { nextCursor: next }) };
    },
    "resources/read": async (params, context) => {
      const uri = params?.uri;
      const direct = resources.find((resource) => resource.uri === uri && shown(resource, context));
      const read = direct !== undefined ? () => direct.read(uri, context) : (() => {
        for (const { template, match } of templates) {
          const variables = shown(template, context) ? match(uri) : undefined;
          if (variables !== undefined) return () => template.read(uri, variables, context);
        }
        return undefined;
      })();
      if (read === undefined) throw Object.assign(new Error(`resource not found: ${uri}`), { rpcCode: RESOURCE_NOT_FOUND });
      const value = await read();
      if (value === undefined || value === null) throw Object.assign(new Error(`resource not found: ${uri}`), { rpcCode: RESOURCE_NOT_FOUND });
      const contents = Array.isArray(value?.contents) ? value.contents : [value];
      return { contents: contents.map((content) => ({ uri, ...content })) };
    },
    "prompts/list": (params, context) => {
      const { items, next } = page(prompts.filter((prompt) => shown(prompt, context)), params?.cursor, pageSize);
      return { prompts: items.map(promptView), ...(next === undefined ? {} : { nextCursor: next }) };
    },
    "prompts/get": async (params, context) => {
      const prompt = promptsByName.get(params?.name);
      if (prompt === undefined || !shown(prompt, context)) throw Object.assign(new Error(`unknown prompt: ${params?.name}`), { rpcCode: INVALID_PARAMS });
      const got = await prompt.get(params?.arguments ?? {}, context);
      return Array.isArray(got) ? { messages: got } : got;
    },
  };

  async function handleOne(request, context) {
    if (!isObject(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string") return mcpRpcError(request?.id, INVALID_REQUEST, "invalid request");
    const notification = !("id" in request);
    if (request.method.startsWith("notifications/") || notification) return null;
    const method = methods[request.method];
    if (method === undefined) return mcpRpcError(request.id, METHOD_NOT_FOUND, `method not found: ${request.method}`);
    try { return mcpOk(request.id, await method(request.params, context)); }
    catch (error) { return mcpRpcError(request.id, error?.rpcCode ?? INTERNAL_ERROR, message(error)); }
  }

  /** One JSON-RPC message or batch in, its response (or `null` for notifications) out. */
  async function handleMessage(incoming, context = {}) {
    observe?.({ direction: "in", message: incoming, context });
    let response;
    if (Array.isArray(incoming)) {
      const answers = (await Promise.all(incoming.map((one) => handleOne(one, context)))).filter((answer) => answer !== null);
      response = incoming.length === 0 ? mcpRpcError(null, INVALID_REQUEST, "empty batch") : answers.length === 0 ? null : answers;
    } else {
      response = await handleOne(incoming, context);
    }
    if (response !== null) observe?.({ direction: "out", message: response, context });
    return response;
  }

  const subscribeNotifications = (listener) => { notificationListeners.add(listener); return () => notificationListeners.delete(listener); };
  return Object.freeze({
    name,
    version,
    handleMessage,
    onNotification: subscribeNotifications,
    serveStdio: (options) => serveMcpStdio(handleMessage, { ...options, subscribeNotifications }),
  });
}

/**
 * Tools over typed operations: each operation's id, description, domain and codomain become a
 * tool, and a call executes through the platform the context carries (`context.platform`),
 * with the operation's own effects allowed unless `effects(operation, context)` says otherwise.
 */
export function mcpOperationTools(operations, { effects, only } = {}) {
  const schemaOf = (schema) => (isObject(schema) ? schema : { type: "object" });
  return operations.filter((operation) => only === undefined || only.includes(operation.id)).map((operation) => ({
    name: operation.id,
    ...(operation.description === undefined ? {} : { description: operation.description }),
    inputSchema: schemaOf(operation.domain?.schema),
    ...(isObject(operation.codomain?.schema) && operation.codomain.schema.type === "object" ? { outputSchema: operation.codomain.schema } : {}),
    handler: async (args, context) => {
      const platform = context?.platform;
      if (platform === undefined) throw new Error("HostUnavailable: the request runs over no computer platform");
      const outcome = await platform.execute(operation.id, args, { allowedEffects: effects?.(operation, context) ?? operation.effects });
      if (!outcome.ok) throw outcome.refusal;
      return outcome.value;
    },
  }));
}

/**
 * The stdio transport: JSON-RPC messages framed one per line (the protocol's framing) or with
 * `Content-Length` headers (the LSP framing some hosts still send), answered in the framing each
 * arrived in, in order, with backpressure on the output.
 */
export function serveMcpStdio(handleMessage, { input = process.stdin, output = process.stdout, context = {}, subscribeNotifications } = {}) {
  let buffer = Buffer.alloc(0);
  let chain = Promise.resolve();
  let closed = false;
  const write = (text) => new Promise((resolve) => { if (output.write(text)) resolve(); else output.once("drain", resolve); });
  const respond = (framed, value) => {
    const text = JSON.stringify(value);
    return write(framed ? `Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}` : `${text}\n`);
  };
  const dispatch = (text, framed) => {
    chain = chain.then(async () => {
      if (text.trim() === "") return;
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (error) { await respond(framed, mcpRpcError(null, PARSE_ERROR, message(error))); return; }
      const answer = await handleMessage(parsed, context);
      if (answer !== null) await respond(framed, answer);
    });
  };
  const unsubscribeNotifications = subscribeNotifications?.((notification) => {
    chain = chain.then(() => respond(false, notification));
    return chain;
  });
  const drain = () => {
    for (;;) {
      if (/^\s*Content-Length:/iu.test(buffer.subarray(0, 32).toString("latin1"))) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end < 0) return;
        const length = Number(/Content-Length:\s*(\d+)/iu.exec(buffer.subarray(0, end).toString("latin1"))?.[1]);
        if (!Number.isSafeInteger(length)) { buffer = buffer.subarray(end + 4); continue; }
        if (buffer.length < end + 4 + length) return;
        dispatch(buffer.subarray(end + 4, end + 4 + length).toString("utf8"), true);
        buffer = buffer.subarray(end + 4 + length);
      } else {
        const newline = buffer.indexOf(0x0a);
        if (newline < 0) return;
        dispatch(buffer.subarray(0, newline).toString("utf8"), false);
        buffer = buffer.subarray(newline + 1);
      }
    }
  };
  const onData = (chunk) => { buffer = Buffer.concat([buffer, Buffer.from(chunk)]); drain(); };
  const onEnd = () => { if (buffer.length > 0) { dispatch(buffer.toString("utf8"), false); buffer = Buffer.alloc(0); } };
  input.on("data", onData);
  input.on("end", onEnd);
  return Object.freeze({
    done: () => chain,
    close: async () => {
      if (closed) return;
      closed = true;
      unsubscribeNotifications?.();
      input.off("data", onData);
      input.off("end", onEnd);
      await chain;
    },
  });
}

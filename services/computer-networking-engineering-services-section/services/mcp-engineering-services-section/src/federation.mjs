// MCP federation: several upstream MCP servers served as one. Each upstream's tools are listed
// through the one client and republished under the upstream's prefix, and a call is forwarded to
// the upstream that owns the tool, its result passed through unchanged. An upstream that
// restarted is initialized again and the call retried once.

import { createHash } from "node:crypto";
import { createMcpClient, mcpHttpTransport, mcpStdioTransport } from "./client.mjs";

/** Tool names every assistant accepts: letters, digits, `_` and `-`, at most 64 characters. */
export const federatedToolName = (prefix, name) => `${prefix}_${name}`.replace(/[^A-Za-z0-9_-]/gu, "_").slice(0, 64);

/** The client of one upstream: `{url, headers?}` over Streamable HTTP, or `{command, args?, cwd?, env?}` over stdio. */
export function upstreamClient(upstream, { clientInfo, fetchImpl } = {}) {
  const transport = upstream.url !== undefined
    ? mcpHttpTransport({ url: upstream.url, headers: upstream.headers ?? (() => ({})), ...(fetchImpl === undefined ? {} : { fetchImpl }) })
    : mcpStdioTransport({ command: upstream.command, args: upstream.args ?? [], cwd: upstream.cwd, env: upstream.env, stderr: upstream.stderr ?? "inherit" });
  return createMcpClient({ transport, ...(clientInfo === undefined ? {} : { clientInfo }) });
}

async function listAll(client) {
  const tools = [];
  let cursor;
  for (let page = 0; page < 64; page += 1) {
    const listed = await client.listTools(cursor === undefined ? {} : { cursor });
    tools.push(...(listed?.tools ?? []));
    cursor = listed?.nextCursor;
    if (cursor === undefined) return tools;
  }
  throw new Error("upstream tools/list did not end within 64 pages");
}

const errorMessage = (error) => error instanceof Error ? error.message : String(error);
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 60_000;
const REFRESH_WAIT_MS = 1_500;
const DEFAULT_SUSPICION_WINDOW_MS = 5 * 60_000;

/**
 * The federation of `upstreams`: `{prefix, description?, visible?, only?, principalMeta?, sessionMeta?, ...transport}` each.
 * An upstream naming `principalMeta` receives, under that `_meta` key of each call, the subject
 * of the principal the host admitted for the call, so the upstream can act as that account; one
 * naming `sessionMeta` receives under that key the hand the call came through: `harness:<id>` when the
 * harness names its own session, else the session it arrived in, else, where the entrance keeps no
 * sessions, `token:<digest>` of the credential it presented (each harness session mints its own), so the
 * hand is named without the token itself ever leaving the entrance.
 * Returns a live tools collection (pass it in `createMcpServer.toolSources`), each upstream's client (for a
 * host's own direct calls), the upstreams that could not be reached with why, and `close()`.
 */
/** The ingress-derived hand selector. Never read it from tool arguments or forwarded _meta. */
export function mcpCallerSession(context) {
  return typeof context?.harnessSession === "string" ? `harness:${context.harnessSession}`
    : context?.session ?? (typeof context?.bearer === "string" ? `token:${createHash("sha256").update(context.bearer).digest("hex").slice(0, 16)}` : undefined);
}

export async function federateMcpServers(upstreams, {
  clientInfo = { name: "mcp-federation", version: "0.1.0" },
  fetchImpl,
  suspicionWindowMs = DEFAULT_SUSPICION_WINDOW_MS,
  now = Date.now,
  clock,
  onObservation,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!Number.isFinite(suspicionWindowMs) || suspicionWindowMs < 0) throw new TypeError("suspicionWindowMs must be a non-negative finite number");
  const readTime = typeof clock === "function" ? clock : typeof clock?.now === "function" ? () => clock.now() : now;
  const clients = new Map();
  const unavailable = [];
  const tools = [];
  const listeners = new Set();
  const states = upstreams.map((upstream) => {
    const client = upstream.client ?? upstreamClient(upstream, { clientInfo, fetchImpl });
    clients.set(upstream.prefix, client);
    return {
      upstream,
      client,
      reading: "unknown",
      incarnation: 0,
      since: readTime(),
      reason: undefined,
      published: [],
      fingerprint: "[]",
      retryMs: RETRY_MIN_MS,
      timer: undefined,
      listing: undefined,
    };
  });
  let closed = false;

  const readingOf = (state) => Object.freeze({
    prefix: state.upstream.prefix,
    reading: state.reading,
    incarnation: state.incarnation,
    since: state.since,
    ...(state.reason === undefined ? {} : { reason: state.reason }),
  });
  const emitObservation = (state) => {
    if (onObservation === undefined) return;
    try {
      const emitted = onObservation(readingOf(state));
      emitted?.catch?.(() => undefined);
    } catch { /* Observation consumers do not own federation progress. */ }
  };
  const syncUnavailable = () => {
    unavailable.splice(0, unavailable.length, ...states
      .filter((state) => state.reading !== "alive")
      .map((state) => Object.freeze({ prefix: state.upstream.prefix, ...(state.reason === undefined ? {} : { reason: state.reason }) })));
  };
  const observe = (state, reading, reason) => {
    const observedAt = readTime();
    if (reading === "alive" && (state.reading === "suspect" || state.reading === "dead")) state.incarnation += 1;
    if (state.reading !== reading) state.since = observedAt;
    state.reading = reading;
    state.reason = reading === "alive" ? undefined : reason;
    syncUnavailable();
    emitObservation(state);
  };
  const promoteDead = (state) => {
    if (state.reading === "suspect" && readTime() - state.since >= suspicionWindowMs) observe(state, "dead", state.reason);
  };
  const rebuildTools = () => {
    tools.splice(0, tools.length, ...states.flatMap((state) => state.published));
    const notification = Object.freeze({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
    for (const listener of listeners) {
      try {
        const sent = listener(notification);
        sent?.catch?.(() => undefined);
      } catch { /* A disconnected downstream does not prevent publication. */ }
    }
  };
  const cancelRetry = (state) => {
    if (state.timer === undefined) return;
    clearTimer(state.timer);
    state.timer = undefined;
  };
  const scheduleRetry = (state) => {
    if (closed || state.timer !== undefined) return;
    const delay = state.retryMs;
    state.retryMs = Math.min(RETRY_MAX_MS, delay * 2);
    state.timer = setTimer(() => {
      state.timer = undefined;
      void attemptList(state);
    }, delay);
    state.timer?.unref?.();
  };
  const failedCall = (state, error) => {
    const reason = errorMessage(error);
    observe(state, "suspect", reason);
    scheduleRetry(state);
    promoteDead(state);
    const reading = readingOf(state);
    return Object.freeze({
      code: `upstream_${reading.reading}`,
      message: `${reading.prefix} is ${reading.reading}: ${reading.reason ?? reason}`,
      ...reading,
    });
  };
  const republish = (state, listed) => {
    const { upstream, client } = state;
    const selected = listed.filter((tool) => upstream.only === undefined || upstream.only.includes(tool.name));
    const fingerprint = JSON.stringify(selected);
    if (fingerprint === state.fingerprint) return;
    state.fingerprint = fingerprint;
    state.published = selected.map((tool) => {
      const call = (args, context) => {
        const subject = upstream.principalMeta === undefined ? undefined : context?.principal?.subject;
        const session = upstream.sessionMeta === undefined ? undefined : mcpCallerSession(context);
        const meta = { ...(typeof subject === "string" ? { [upstream.principalMeta]: subject } : {}), ...(typeof session === "string" ? { [upstream.sessionMeta]: session } : {}) };
        return client.callTool({ name: tool.name, arguments: args, ...(Object.keys(meta).length === 0 ? {} : { _meta: meta }) });
      };
      return Object.freeze({
        ...tool,
        name: federatedToolName(upstream.prefix, tool.name),
        description: `${upstream.description === undefined ? "" : `[${upstream.description}] `}${tool.description ?? tool.name}`,
        ...(upstream.visible === undefined ? {} : { visible: upstream.visible }),
        admitArguments: false,
        handler: async (args, context) => {
          try {
            const result = await call(args, context);
            cancelRetry(state);
            observe(state, "alive");
            return result;
          }
          catch (error) {
            if (error?.code !== undefined) throw failedCall(state, error);
            observe(state, "suspect", errorMessage(error));
            client.reset();
            try {
              const result = await call(args, context);
              cancelRetry(state);
              observe(state, "alive");
              return result;
            } catch (retryError) { throw failedCall(state, retryError); }
          }
        },
      });
    });
    rebuildTools();
  };
  async function attemptList(state) {
    if (closed) return;
    if (state.listing !== undefined) return state.listing;
    cancelRetry(state);
    state.listing = (async () => {
      try {
        const listed = await listAll(state.client);
        if (closed) return;
        observe(state, "alive");
        state.retryMs = RETRY_MIN_MS;
        republish(state, listed);
      } catch (error) {
        if (closed) return;
        observe(state, "suspect", errorMessage(error));
        scheduleRetry(state);
      } finally {
        state.listing = undefined;
      }
    })();
    return state.listing;
  }
  Object.defineProperties(tools, {
    // A client's tools/list asks every upstream not known alive again, but waits at most
    // REFRESH_WAIT_MS: a hung upstream cannot stall the list, and its tools arrive by list_changed.
    refresh: { value: () => {
      const due = states.filter((state) => state.reading !== "alive");
      if (due.length === 0) return Promise.resolve();
      let timer;
      const waited = new Promise((resolve) => { timer = setTimeout(resolve, REFRESH_WAIT_MS); });
      return Promise.race([Promise.all(due.map((state) => attemptList(state))), waited]).finally(() => clearTimeout(timer));
    } },
    subscribe: { value: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } },
  });
  // Initial discovery has the same bound as later catalogue reads. Ready peers publish
  // independently; an unfinished peer remains unknown and publishes when it answers.
  syncUnavailable();
  await tools.refresh();
  return Object.freeze({
    tools,
    clients,
    unavailable,
    availability: () => {
      for (const state of states) promoteDead(state);
      return Object.freeze(states.map((state) => readingOf(state)));
    },
    close: async () => {
      if (closed) return;
      closed = true;
      for (const state of states) cancelRetry(state);
      listeners.clear();
      await Promise.all([...new Set(clients.values())].map((client) => client.close().catch(() => undefined)));
    },
  });
}

/**
 * A stdio MCP host bridged to an upstream: each line-framed message is forwarded as it is and the
 * answer written back, so a harness that speaks only stdio reaches a remote server whole (tools,
 * resources and prompts). A lost session is initialized again by replaying the host's own
 * `initialize` before the message that failed.
 *
 * The handshake is the bridge's own once it has met the server: `cache` ({ read, write }) keeps the
 * server's last initialize result (for the protocol version asked) and first tool page, so a host
 * whose startup waits on the handshake starts at once from them while the bridge connects behind
 * it. Only a call waits for the server, and a tool list that changed is announced
 * (`notifications/tools/list_changed`) once the server answers. Before the first contact every
 * message is the server's, as without a cache.
 */
export function bridgeMcpStdio(transport, { input = process.stdin, output = process.stdout, onError = () => undefined, cache } = {}) {
  let buffer = "";
  let initialize;
  let chain = Promise.resolve();
  let known = {};
  try { known = cache?.read() ?? {}; } catch (error) { onError(error); }
  let upstream;
  let connected = false;
  let served;
  const remember = (entry) => {
    known = { ...known, ...entry };
    try { cache?.write(known); } catch (error) { onError(error); }
  };
  const write = (value) => new Promise((resolve) => { if (output.write(`${JSON.stringify(value)}\n`)) resolve(); else output.once("drain", resolve); });
  const handshake = () => (upstream ??= (async () => {
    const answer = await transport.send(initialize);
    if (answer?.result !== undefined) remember({ initialize: answer.result, requested: initialize.params?.protocolVersion });
    await transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    connected = true;
    return answer;
  })().catch((error) => { upstream = undefined; throw error; }));
  const forward = async (message) => {
    if (initialize !== undefined) await handshake();
    try { return await transport.send(message); }
    catch (error) {
      onError(error);
      if (initialize === undefined || error?.status === 401) throw error;
      transport.reset?.();
      upstream = undefined;
      connected = false;
      await handshake();
      return transport.send(message);
    }
  };
  const firstToolPage = (message) => message.method === "tools/list" && message.params?.cursor === undefined;
  // After a start from the cache, the server's own tool list replaces the one served.
  const refreshTools = async () => {
    const answer = await forward({ jsonrpc: "2.0", id: "bridge-tools-list", method: "tools/list" });
    if (answer?.result === undefined) return;
    remember({ tools: answer.result });
    if (served !== undefined && JSON.stringify(served) !== JSON.stringify(answer.result)) await write({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
    served = undefined;
  };
  const answerOf = async (message) => {
    if (message?.method === "initialize") {
      initialize = message;
      if (known.initialize !== undefined && known.requested === message.params?.protocolVersion) {
        handshake().then(() => (served === undefined ? undefined : refreshTools())).catch(onError);
        const capabilities = known.initialize.capabilities ?? {};
        return { jsonrpc: "2.0", id: message.id, result: { ...known.initialize, capabilities: { ...capabilities, tools: { ...capabilities.tools, listChanged: true } } } };
      }
      const answer = await handshake();
      return answer === undefined ? undefined : { ...answer, id: message.id };
    }
    // The bridge's own handshake tells the server the session is initialized.
    if (message?.method === "notifications/initialized" && initialize !== undefined) return undefined;
    if (firstToolPage(message) && !connected && known.tools !== undefined && initialize !== undefined) {
      served = known.tools;
      return { jsonrpc: "2.0", id: message.id, result: known.tools };
    }
    const answer = await forward(message);
    if (firstToolPage(message) && answer?.result !== undefined) remember({ tools: answer.result });
    return answer;
  };
  input.setEncoding?.("utf8");
  input.on("data", (chunk) => {
    buffer += chunk;
    for (let newline = buffer.indexOf("\n"); newline >= 0; newline = buffer.indexOf("\n")) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line === "") continue;
      chain = chain.then(async () => {
        let message;
        try { message = JSON.parse(line); } catch { await write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); return; }
        try {
          const answer = await answerOf(message);
          if (answer !== undefined && "id" in message) await write(answer);
        } catch (error) {
          if ("id" in message) await write({ jsonrpc: "2.0", id: message.id ?? null, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } });
        }
      });
    }
  });
  return Object.freeze({ done: () => chain });
}

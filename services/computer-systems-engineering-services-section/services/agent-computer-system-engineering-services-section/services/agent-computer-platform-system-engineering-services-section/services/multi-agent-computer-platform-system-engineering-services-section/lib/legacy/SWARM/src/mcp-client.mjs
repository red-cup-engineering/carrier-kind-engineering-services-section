// mcp-client — consume EXTERNAL MCP tool servers (the 2026 interop standard) and fold their tools into
// SWARM's action space WITHOUT becoming a governance bypass. An MCP server speaks JSON-RPC: `tools/list`
// (discover the catalog) and `tools/call` (invoke one). Each remote tool MASSIVELY expands what the
// agent can do — but the server is a stranger, so every remote call is treated as an ASYNC ACTUATOR
// BEHIND THE SINGLE GATE: it passes the SAME spine `runGovernedTool` composes (tool-policy admission ->
// Gov regime -> held-⊤ safety) BEFORE the JSON-RPC ever hits the wire.
//
// The fail-closed property is STRUCTURAL, not a check we remember to write: an undiscovered remote tool
// name resolves to DEFAULT_POLICY (tool-policy.mjs:97 — known:false, requiresLeaderAuthorization:true),
// so tool-policy admission REFUSES it ("active") before a single byte leaves the process. A remote tool is
// admissible only when (a) its name is a KNOWN policy OR a leader/delegation-chain witness authorizes it,
// AND (b) the Gov regime admits, AND (c) no designated safety sector is held ⊤. Only then does the wire
// call happen, and it leaves ONE auditable EAVT trace row per remote call (mirroring recordSourceFetch,
// fetch-tool.mjs:27).
//
// THE GATE IS runGovernedTool. We do not re-implement the three gates: we CALL runGovernedTool as the
// chokepoint. It runs tool-policy -> Gov -> safety in fixed order and only a NATIVE actuator executes
// inside it; for a remote MCP name there is no native actuator, so when (and only when) all three spine
// gates PASS it reaches the actuator gate and reports `no-actuator`. That precise verdict
// (gate==="actuator", reason==="no-actuator") is the SPINE'S "all gates cleared, now run the async
// actuator" signal — at which point, and not before, the JSON-RPC hits the wire. Every other verdict
// (refused / unsettled / contested at tool-policy / governance / safety) is surfaced and the wire is
// NEVER touched. See neededExistingEdits: once the runner grows an injected-async-actuator seam, the
// JSON-RPC call moves INSIDE runGovernedTool and this module hands it the actuator instead.
//
// Charge/held-⊤ discipline: a contested or unsettled gate is SURFACED as a FOUR value on the returned
// verdict (never collapsed to a boolean ok/fail); the JSON-RPC is performed only on a passed spine.

import { createHash } from "node:crypto";

import { runGovernedTool } from "./governed-tool-runner.mjs";
import { toolPolicyFor } from "./tool-policy.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";


// DEFAULT_MCP_TIMEOUT_MS — NOT a hidden literal. The per-server request timeout is a GOVERNED/DECLARED
// parameter, resolved (in priority order) from (1) the caller's options/server descriptor, then (2) the
// server's own declared `timeoutMs`, and only then this exported documented default — the fail-closed
// last resort so a missing field never means "no bound at all" (an unbounded remote call is itself a
// hazard). It is exported so it is addressable, never buried. Mirrors DEFAULT_SUBPROCESS_TIMEOUT_MS
// (subprocess-actuator.mjs:31).
export const DEFAULT_MCP_TIMEOUT_MS = 30000;

// resolveTimeoutMs — the governed-parameter resolution. A non-finite or non-positive value at any level
// is ignored (it would mean "no bound"); the documented default fills the gap.
function resolveTimeoutMs(...candidates) {
  for (const c of [...candidates, DEFAULT_MCP_TIMEOUT_MS]) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MCP_TIMEOUT_MS;
}

// jsonRpcRequest — build a JSON-RPC 2.0 request envelope. id is a stable, content-addressed string so a
// request and its trace row share provenance.
function jsonRpcRequest(method, params, id) {
  return { jsonrpc: "2.0", id, method, params };
}

// === connectMcp ====================================================================================
// connectMcp({ transport, name, timeoutMs }) -> a SESSION speaking the two MCP methods this module
// needs: listTools() (JSON-RPC tools/list) and callTool(name, args) (JSON-RPC tools/call). The TRANSPORT
// is injected — an object with `send(jsonRpcRequest) -> Promise<jsonRpcResponse>`. This is the seam: a
// real transport speaks a socket/stdio/http; the test injects an in-process fake (no socket), exactly as
// scriptedToolProvider (tool-call.mjs:143) injects a fake provider via options.fetch. The session itself
// performs NO governance — discovery is read-only metadata; the GATE is on callTool's effects, applied
// by runMcpTool. The session merely speaks the wire when asked.
export function connectMcp({ transport, name = "mcp", timeoutMs } = {}) {
  if (!transport || typeof transport.send !== "function") {
    throw new Error("connectMcp: a transport with a send(request) method is required.");
  }
  const serverTimeoutMs = resolveTimeoutMs(timeoutMs);

  async function rpc(method, params) {
    const id = stableId([name, method, JSON.stringify(params ?? {})], "mcp-rpc");
    const request = jsonRpcRequest(method, params, id);
    const response = await transport.send(request, { timeoutMs: serverTimeoutMs });
    if (response && response.error) {
      const err = response.error;
      throw new Error(`mcp ${method} failed: ${err.message ?? "rpc-error"} (code ${err.code ?? "?"})`);
    }
    return response?.result ?? {};
  }

  return {
    name,
    timeoutMs: serverTimeoutMs,
    // listTools — JSON-RPC tools/list. Returns the server's advertised catalog: [{ name, description,
    // inputSchema }, ...]. Read-only metadata; no governance, no effect.
    async listTools() {
      const result = await rpc("tools/list", {});
      return Array.isArray(result.tools) ? result.tools : [];
    },
    // callTool — JSON-RPC tools/call. The WIRE call only. This is NOT the public entry point: callers
    // MUST go through runMcpTool so the spine gate runs FIRST. It is exposed on the session so runMcpTool
    // (and a future runner-injected async actuator) can perform the wire call after the gate clears.
    async callTool(toolName, args = {}) {
      return rpc("tools/call", { name: toolName, arguments: args ?? {} });
    },
  };
}

// === mcpToolSchemas ================================================================================
// mcpToolSchemas(session) -> OpenAI tool specs in the toolSchemasFor shape (tool-call.mjs:135):
// { type: "function", function: { name, description, parameters } }, so a discovered remote catalog
// slots DIRECTLY into runAgentLoop's toolSchemas (agent-loop.mjs:70) alongside native actuator schemas.
// The MCP `inputSchema` is the JSON-schema for `parameters`; a server that omits it gets an
// empty-object schema (the model may still call it with no args). Discovery is async (it speaks
// tools/list); the names it returns are exactly the names runMcpTool will gate.
export async function mcpToolSchemas(session) {
  if (!session || typeof session.listTools !== "function") {
    throw new Error("mcpToolSchemas: a connected MCP session is required.");
  }
  const tools = await session.listTools();
  return tools
    .filter((t) => typeof t?.name === "string" && t.name.length > 0)
    .map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description ?? `MCP remote tool ${t.name}`,
        parameters: t.inputSchema ?? { type: "object", properties: {}, required: [] },
      },
    }));
}

// digestOf — content digest of a result body, mirroring the actuators/fetch digest shape so an MCP
// result digest is comparable to a files.read / source-fetch digest on the same bytes.
function digestOf(value) {
  return "sha256-" + createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

// recordMcpCall — append the remote call's evidence witness as a foldable EAVT ledger row under
// ledger/mcp-calls/. Mirrors recordSourceFetch (fetch-tool.mjs:27): ONE auditable row per remote call,
// carrying the server, the tool, the spine verdict, and the result digest. Written on a CLEARED spine
// (the runner already wrote its own tool-run row for the gate verdict; this is the wire witness).
export function recordMcpCall(root, agent = {}, witness = {}, options = {}) {
  const id = options.id ?? stableId(["mcp-call", witness.server, witness.tool, witness.digest, witness.calledAt], "ledger");
  const term = `ledger/mcp-calls/${id}`;
  return writeTrace(root, term, {
    kind: "swarm.ledger.mcp_call",
    id,
    ledgerKind: "mcp-call",
    created: witness.calledAt,
    agent: agent.name ?? "",
    ...witness,
    evidence:
      "governed MCP remote call: an external tool server is an async actuator behind the single gate — the call passes tool-policy admission, the Gov regime, and the held-⊤ safety gate before the JSON-RPC hits the wire, and what it returned is recorded (server + tool + result digest)",
  }, { ...options, t: id });
}

// === runMcpTool ====================================================================================
// runMcpTool(root, agent, session, call, options) — invoke ONE remote MCP tool THROUGH THE SPINE.
//
//   call = { id?, name, arguments, argumentsMalformed? }  (the parseToolCalls shape, tool-call.mjs:96)
//
// STEP 1 — THE GATE. runGovernedTool runs tool-policy admission -> Gov regime -> held-⊤ safety in fixed
//   order and writes ITS OWN auditable tool-run row for the verdict. We pass call.name straight through:
//   an UNKNOWN remote name hits DEFAULT_POLICY (known:false) and is REFUSED at tool-policy ("active") — the
//   undiscovered tool FAILS CLOSED by construction, the wire untouched. A leader/chain-authorized name
//   (or a known policy) that also clears Gov + safety reaches the actuator gate.
//
// STEP 2 — THE WIRE, ONLY ON A CLEARED SPINE. There is no native actuator for a remote name, so a
//   fully-cleared spine surfaces as gate==="actuator", reason==="no-actuator" (governed-tool-runner
//   .mjs:108-117 actuator path). THAT — and ONLY that — is the signal that all three gates passed and the
//   async actuator may run. We then perform the JSON-RPC tools/call and write the wire-witness EAVT row.
//   Any other verdict (refused/unsettled/contested at tool-policy/governance/safety) is SURFACED with its
//   held FOUR value and the wire is NEVER touched.
export async function runMcpTool(root, agent, session, call, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const serverName = options.server ?? session?.name ?? "mcp";
  const policy = toolPolicyFor(call.name);

  // STEP 1 — THE SPINE GATE. runGovernedTool composes tool-policy -> Gov -> safety and writes the
  // tool-run row. For a remote name with no native actuator, a CLEARED spine returns no-actuator.
  const verdict = await runGovernedTool(root, agent, call, options);

  const cleared =
    verdict.ran === true &&
    verdict.gate === "actuator" &&
    verdict.reason === "no-actuator";

  if (!cleared) {
    // The spine REFUSED / HELD ⊥ / HELD ⊤ before any effect (or, defensively, a native actuator name was
    // routed here). The wire was never touched. Surface the held FOUR verdict — never collapsed — so the
    // agent loop can branch on it exactly as it would for any governed tool.
    return {
      ...verdict,
      server: serverName,
      tool: call.name,
      policy: policy.tool,
      ran: false,
      wired: false,
      mcpResult: null,
    };
  }

  // STEP 2 — THE WIRE. Every spine gate passed; the remote tool is admissible. NOW the JSON-RPC happens.
  if (!session || typeof session.callTool !== "function") {
    throw new Error("runMcpTool: a connected MCP session (with callTool) is required to reach the wire.");
  }

  let mcpResult;
  let wireOk = true;
  let wireError = "";
  try {
    mcpResult = await session.callTool(call.name, call.arguments ?? {});
  } catch (error) {
    wireOk = false;
    wireError = error?.message ?? String(error ?? "rpc-error");
    mcpResult = null;
  }

  // MCP marks a tool-level failure with isError:true in the result envelope; surface it without
  // collapsing — the call WAS admitted and DID reach the server, the server reported a tool error.
  const isError = wireOk && mcpResult?.isError === true;
  const value = wireOk && !isError ? "potential" : "active";
  const digest = digestOf(mcpResult);
  const calledAt = now;

  const witness = {
    server: serverName,
    tool: call.name,
    capability: policy.capability,
    sandbox: policy.sandbox,
    traceRequirement: policy.traceRequirement,
    arguments: call.arguments ?? {},
    governedTerm: verdict.term ?? "",
    spineValue: verdict.value,
    spineGate: verdict.gate,
    admissionReason: verdict.admission?.reason ?? "",
    wireOk,
    wireError,
    isError,
    digest,
    value,
    calledAt,
  };

  const ledger = recordMcpCall(root, agent, witness, options);

  return {
    ...verdict,
    server: serverName,
    tool: call.name,
    policy: policy.tool,
    ran: true,
    wired: true,
    value,
    mcpResult,
    isError,
    wireOk,
    wireError,
    mcpTerm: ledger.term,
    mcpLedger: ledger,
    witness,
  };
}

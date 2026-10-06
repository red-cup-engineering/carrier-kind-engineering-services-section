import JSNODE_JSON_DATA_0 from "../../content/openai/providers/catalog.json" with { type: "json" };
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { dispatchChatCompletionInOrder, runOpenAiCompatibleChatExchange, validateChatCompletionPacket, validateChatExchangeRecord } from "./openai-compatible-chat-completion.mjs";
import { projectChatCompletion } from "./project-chat-completion.mjs";
import { subscriptionAllowance, subscriptionDeclaration } from "../media/subscription-allowances.mjs";
import { exchangeRecorder, resolveExecutable } from "../command/exchange.mjs";
import { allowanceLedgerPath, attemptAllowance, holdAllowance, settleAllowance } from "../media/allowance-ledger.mjs";
import { runClaudePrintExchange } from "../command/claude-print.mjs";
import { runCodexExecExchange } from "../command/codex-exec.mjs";
import { runAntigravityPrintExchange } from "../command/antigravity-print.mjs";
import { runOllamaChatExchange, exchangeOllamaAssistantMessage } from "../ollama/ollama-exchange.mjs";

/** Providers reached other than through an OpenAI-compatible chat endpoint: local
 *  command-line agents, and Ollama's native chat. */
const COMMAND_TRANSPORTS = Object.freeze({ "antigravity-print": runAntigravityPrintExchange, "claude-print": runClaudePrintExchange, "codex-exec": runCodexExecExchange, "ollama-chat": runOllamaChatExchange });

const catalog = structuredClone(JSNODE_JSON_DATA_0);
const packageRoot = fileURLToPath(new URL("../", import.meta.url));

export function finalizeProviderExchange(record, config, root) {
  const errors = validateChatExchangeRecord(record);
  if (errors.length) throw new Error(`exchange record failed schema validation: ${errors.join("; ")}`);
  if (config.persistExchange) {
    const directory = join(root, "content/exchanges");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}

/** Provider identity and policy are data, never executable team packages. */
export function providerConfiguration(provider) {
  const row = typeof provider === "string" ? catalog.rows.find(({ providerId }) => providerId === provider) : provider;
  if (!row?.providerId || !(row.chatCompletionsUrl || COMMAND_TRANSPORTS[row.transport])) throw new Error(`unknown provider: ${typeof provider === "string" ? provider : "missing catalog row"}`);
  const family = row.providerFamily && catalog.rows.find(({ providerId }) => providerId === row.providerFamily);
  if (row.providerFamily && !family) throw new Error(`unknown provider family: ${row.providerFamily}`);
  return family ? { ...family, ...row, execution: family.execution } : row;
}

export function providerResourceRoot(row, resourceRoot) {
  if (resourceRoot) return resolve(resourceRoot);
  // Source deployments retain the existing account and evidence directories. Installed
  // deployments pass their resourceRoot explicitly; no credentials ship in this package.
  const sibling = row.execution?.team && resolve(packageRoot, "..", row.execution.team);
  return sibling && existsSync(sibling) ? sibling : resolve(process.env.XDG_STATE_HOME ?? join(process.env.HOME ?? ".", ".local/state"), "inference", row.providerFamily ?? row.providerId);
}

export function providerPacket(provider, { instruction, input, model }) {
  const row = providerConfiguration(provider), policy = row.execution ?? {};
  if (![instruction, input, model].every((value) => typeof value === "string" && value.length)) throw new Error("instruction, input, and model Marks must be nonempty text");
  let demand;
  try { demand = JSON.parse(input); } catch {
    if (policy.requireOutputAllocation) throw new Error("typed inference input must be one JSON value");
  }
  const maximum = demand?.executionBounds?.maximumOutputTokens;
  if (policy.requireOutputAllocation && (!Number.isInteger(maximum) || maximum < 1)) throw new Error(`${policy.label} maximumOutputTokens must be a positive integer supplied by the consuming work lot`);
  const contract = demand?.outputContract;
  if (policy.outputSchemaParameter) {
    if (!contract?.schema || typeof contract.schema !== "object" || Array.isArray(contract.schema)) throw new Error(`${policy.label} inference requires one customer output schema`);
    if (contract.format !== "json" && !(contract.format === "projected" && ["single-file-create", "single-source-artifact"].includes(contract.projection?.type) && typeof contract.projection?.path === "string" && contract.projection.path.length)) throw new Error(`${policy.label} inference received an unsupported output carrier`);
  }
  let supplied;
  try { supplied = JSON.parse(demand?.context?.suppliedContext); } catch { /* no conversation */ }
  const conversation = policy.conversationContext && Array.isArray(supplied?.messages)
    ? supplied.messages.filter((message) => message && ["system", "user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.length)
    : [];
  const turns = conversation.filter(({ role }) => role !== "system");
  return {
    model,
    messages: turns.length ? [{ role: "system", content: [instruction, ...conversation.filter(({ role }) => role === "system").map(({ content }) => content)].join("\n\n") }, ...turns] : [{ role: "system", content: instruction }, { role: "user", content: input }],
    ...(Number.isInteger(maximum) && maximum > 0 ? { "max-tokens": maximum } : {}),
    ...(policy.outputSchemaParameter && contract.format === "json" ? { params: { [policy.outputSchemaParameter]: contract.schema } } : {}),
  };
}

/** One kernel lease covers admission and HTTP completion; closing the pipe releases it. */
export async function withProviderCapacity(lockPath, action, { signal, wait = true } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const holder = spawn("flock", ["--exclusive", ...(wait ? [] : ["--nonblock"]), lockPath, process.execPath, "-e", 'process.stdout.write("ready\\n"); process.stdin.resume();'], { stdio: ["pipe", "pipe", "pipe"], signal });
  // Register exit first: release must also work when flock refuses before readiness.
  const closed = once(holder, "close");
  closed.catch(() => {});
  try {
    await Promise.race([once(holder.stdout, "data"), closed.then(([code]) => { throw new Error(code === 1 && !wait ? "provider concurrency bound is occupied" : `provider capacity admission failed (${code})`); })]);
    signal?.throwIfAborted();
    return await action();
  } finally {
    holder.stdin.end();
    await closed;
  }
}

export async function admitRateState({ statePath, minimumIntervalMilliseconds, now = Date.now(), wait = pause, signal } = {}) {
  if (!Number.isInteger(minimumIntervalMilliseconds) || minimumIntervalMilliseconds < 0 || minimumIntervalMilliseconds > 180000) throw new Error("minimum live exchange interval must be 0..180000 milliseconds");
  let prior = 0;
  if (existsSync(statePath)) {
    const text = readFileSync(statePath, "utf8");
    if (!/^(0|[1-9][0-9]*)\n?$/u.test(text) || !Number.isSafeInteger(Number(text.trim()))) throw new Error("provider-local rate state is malformed");
    prior = Number(text.trim());
  }
  const delayMilliseconds = Math.max(0, minimumIntervalMilliseconds - (now - prior));
  await wait(delayMilliseconds, undefined, { signal });
  const admittedAt = now + delayMilliseconds;
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${admittedAt}\n`);
  return { admittedAt, delayMilliseconds };
}

/**
 * A command provider's subscription allowance, named on its catalog row and declared with the
 * house's other subscriptions (content/allowances): organizing's allowance algebra plus
 * `kindsByModel` ([model prefix, kind], first match) and `refusedOn`, the refusal reason that says
 * the provider declined for capacity.
 */
const providerAllowance = (row) => (row.allowance ? subscriptionAllowance(row.allowance) : undefined);

/**
 * Run one exchange as a draw on the provider's allowance in the host-wide allowance ledger: held
 * (probing where the fit is unknown), attempted, then settled as a spend, a capacity refusal, or
 * void. A draw the allowance does not admit settles as a refusal and spawns nothing, so a spent
 * week stops being asked until its window frees.
 */
async function drawProviderAllowance(row, allowance, packet, env, exchange) {
  const storePath = allowanceLedgerPath(env);
  const kind = (subscriptionDeclaration(row.allowance).kindsByModel ?? []).find(([prefix]) => String(packet.model).startsWith(prefix))?.[1];
  if (!(kind in allowance.costs)) throw new Error(`allowance ${allowance.id} meters no kind for model ${packet.model}`);
  const refuse = (reason) => exchangeRecorder(packet, `${row.providerId}-allowance-draws`).refusal(`the ${allowance.id} allowance does not admit a ${kind} now (${reason})`, [`allowance-${reason}`], 0);
  const held = holdAllowance(allowance, { kind, principal: `provider:${row.providerId}`, probe: true }, { storePath });
  if (held.disposition !== "held") return refuse(held.reason ?? held.disposition);
  const attempted = attemptAllowance(allowance, held.hold.id, { storePath });
  if (attempted.disposition !== "attempted") return refuse(attempted.reason ?? attempted.disposition);
  let record;
  try { record = await exchange(); } catch (error) { settleAllowance(allowance, held.hold.id, { outcome: "void", storePath }); throw error; }
  const outcome = record.outcome === "completion" ? "spent" : record.refusal?.unmet?.includes(subscriptionDeclaration(row.allowance).refusedOn) ? "refused" : "void";
  const conversation = record.completion?.raw?.conversation;
  settleAllowance(allowance, held.hold.id, { outcome, storePath, ...(conversation ? { source: `${row.providerId}:${conversation}` } : {}) });
  return record;
}

/** Single provider execution surface for the host, CLI and direct calls. */
export async function runProviderExchange(provider, packet, { resourceRoot, env = process.env, request = fetch, signal, dryRun = false } = {}) {
  const row = providerConfiguration(provider), policy = row.execution ?? {};
  const command = COMMAND_TRANSPORTS[row.transport];
  if (command) {
    const resolvedPacket = [undefined, null, "", "default"].includes(packet?.model) && row.defaultModel ? { ...packet, model: row.defaultModel } : packet;
    const errors = validateChatCompletionPacket(resolvedPacket);
    if (errors.length) throw new Error(`packet is invalid:\n  - ${errors.join("\n  - ")}`);
    if (dryRun) return { ok: true, "dry-run": true, "packet-valid": true, "executable-presence": Boolean(resolveExecutable(row.executable, env)) };
    const root = providerResourceRoot(row, resourceRoot);
    const run = () => command(resolvedPacket, { executable: row.executable, env, fetchImpl: request, signal, ...(row.timeoutMs ? { timeoutMs: row.timeoutMs } : {}) });
    const allowance = providerAllowance(row);
    const exchange = allowance ? () => drawProviderAllowance(row, allowance, resolvedPacket, env, run) : run;
    const record = policy.capacityLockFile
      ? await withProviderCapacity(resolve(env[policy.capacityLockEnvVar] ?? join(root, "data", policy.capacityLockFile)), exchange, { signal, wait: policy.capacityWait !== false })
      : await exchange();
    return finalizeProviderExchange(record, policy, root);
  }
  const root = providerResourceRoot(row, resourceRoot);
  if (policy.resourceEnv && env === process.env && existsSync(join(root, "content/resources/inference-account.env"))) process.loadEnvFile(join(root, "content/resources/inference-account.env"));
  if (policy.retiredFuelEnvVar && env[policy.retiredFuelEnvVar] !== undefined) throw new Error(`${policy.retiredFuelEnvVar} is retired; cancel the durable lot explicitly`);
  const resolvedPacket = [undefined, null, ""].includes(packet?.model) && env[row.defaultModelEnvVar] ? { ...packet, model: env[row.defaultModelEnvVar] } : packet;
  const errors = validateChatCompletionPacket(resolvedPacket);
  if (errors.length) throw new Error(`packet is invalid:\n  - ${errors.join("\n  - ")}`);
  const aliases = row.apiKeyEnvVars ?? [row.apiKeyEnvVar];
  if (dryRun) return { ok: true, "dry-run": true, "packet-valid": true, "auth-presence": Object.fromEntries(aliases.filter(Boolean).map((name) => [name, Boolean(env[name])])) };
  const apiKey = aliases.map((name) => env[name]).find((value) => typeof value === "string" && value.length);
  const config = { ...row, apiKey, signal, timeoutMs: null, resourceRoot: root, env };
  if (policy.completionCarriers) config.projectCompletion = projectChatCompletion;
  const record = await runOpenAiCompatibleChatExchange(resolvedPacket, config, request);
  return finalizeProviderExchange(record, policy, root);
}

const credentialed = (row, env) => row.executable ? Boolean(resolveExecutable(row.executable, env))
  : row.auth?.mode === "none" || (row.apiKeyEnvVars ?? [row.apiKeyEnvVar]).some((name) => env[name]);

/** Providers whose credential is present, in routing order. */
export function armedProviders(env = process.env) {
  return catalog.routingPolicy.order
    .map((providerId) => catalog.rows.find((row) => row.providerId === providerId))
    .filter((row) => row?.keyed && credentialed(row, env));
}

/**
 * One completion from the engine's own catalog: each `prefer` entry ({providerId, model?})
 * first, then the routing order. A preferred provider's failure falls through to the next.
 */
export async function dispatchInOrder(packet, { prefer = [], env = process.env, request = fetch } = {}) {
  const tried = [];
  for (const { providerId, model } of prefer) {
    const row = providerConfiguration(providerId);
    if (!credentialed(row, env)) { tried.push({ providerId, outcome: "misconfigured" }); continue; }
    const exchange = await runProviderExchange(row, { ...packet, model: model ?? row.defaultModel ?? packet.model }, { env, request })
      .catch((error) => ({ outcome: "refusal", refusal: { grounds: error.message, unmet: ["exchange-error"] } }));
    if (exchange.outcome === "completion") return { ok: true, provider: providerId, tried: [...tried, { providerId, outcome: "completion" }], exchange };
    tried.push({ providerId, outcome: exchange.outcome, grounds: exchange.refusal?.grounds, unmet: exchange.refusal?.unmet });
  }
  const result = await dispatchChatCompletionInOrder({ catalog, packet }, { env, request });
  return { ...result, tried: [...tried, ...result.tried] };
}

/** Resolve the policy used by both placement and HTTP execution, including endpoint aliases. */
export function providerConfigurationForEndpoint(config) {
  const byId = catalog.rows.find(({ providerId }) => providerId === config.providerId);
  const byEndpoint = typeof config.chatCompletionsUrl === "string"
    ? catalog.rows.find((row) => row.chatCompletionsUrl === config.chatCompletionsUrl) : undefined;
  const matched = byEndpoint && (!byId || byId.chatCompletionsUrl !== config.chatCompletionsUrl || (!byId.execution && !byId.providerFamily)) ? byEndpoint : byId;
  return matched ? providerConfiguration(matched) : config;
}

/** A consuming lot may lower the provider's allocation; it cannot relax its policy. */
export function allocateProviderOutputTokens(config, requestedMaximum) {
  const maximum = providerConfigurationForEndpoint(config).execution?.maximumOutputTokens;
  return Number.isSafeInteger(maximum) && maximum > 0
    ? Number.isSafeInteger(requestedMaximum) && requestedMaximum > 0 ? Math.min(requestedMaximum, maximum) : maximum
    : requestedMaximum;
}

/** Every assistant exchange, including native tool turns, enters these same policies. */
export async function exchangeProviderAssistantMessage(body, config, request, transport) {
  const row = providerConfigurationForEndpoint(config);
  const policy = row.execution ?? {};
  // Caller credentials/endpoint/cancellation remain explicit, but known provider policy
  // cannot be disabled by a partial config or a different spelling of its identity.
  const effective = { ...row, ...config };
  const env = config.env ?? process.env, root = providerResourceRoot(row, config.resourceRoot);
  // Account-scoped endpoints name their account as {ENV_VAR}; the value stays in the environment.
  effective.chatCompletionsUrl = effective.chatCompletionsUrl.replace(/\{([A-Z][A-Z0-9_]*)\}/gu, (_, name) => {
    if (!env[name]) throw new TypeError(`${row.providerId ?? "provider"} endpoint needs ${name}`);
    return encodeURIComponent(env[name]);
  });
  if (policy.retiredFuelEnvVar && env[policy.retiredFuelEnvVar] !== undefined) throw new Error(`${policy.retiredFuelEnvVar} is retired; cancel the durable lot explicitly`);
  if (policy.resourceEnv && env === process.env && existsSync(join(root, "content/resources/inference-account.env"))) process.loadEnvFile(join(root, "content/resources/inference-account.env"));
  if (!effective.apiKey) effective.apiKey = (row.apiKeyEnvVars ?? [row.apiKeyEnvVar]).map((name) => env[name]).find((value) => typeof value === "string" && value.length);
  const bounded = { ...body };
  for (const field of row.omitRequestFields ?? []) delete bounded[field];
  if (policy.maximumOutputTokens) bounded.max_tokens = allocateProviderOutputTokens(config, body.max_tokens);
  // Fields the provider row fixes on every request (OpenRouter's provider.max_price spend limit and
  // usage.include, which makes the response carry what the call cost); a packet cannot override them.
  Object.assign(bounded, structuredClone(policy.requestFields ?? {}));
  const execute = async () => {
    if (policy.rateStateFile) await admitRateState({ statePath: join(root, "data", policy.rateStateFile), minimumIntervalMilliseconds: Number(env[policy.minimumIntervalEnvVar] ?? policy.minimumIntervalMilliseconds), signal: effective.signal });
    return (effective.transport === "ollama-chat" ? exchangeOllamaAssistantMessage : transport)(bounded, effective, request);
  };
  return policy.capacityLockFile
    ? withProviderCapacity(resolve(env[policy.capacityLockEnvVar] ?? join(root, "data", policy.capacityLockFile)), execute, { signal: effective.signal })
    : execute();
}

export async function performProviderInference(provider, marks, options = {}) {
  const row = providerConfiguration(provider);
  if (!["dry-run", "live"].includes(marks.mode)) throw new Error("inference mode Mark must be dry-run or live");
  const exchange = await runProviderExchange(row, providerPacket(row, marks), { ...options, dryRun: marks.mode === "dry-run" });
  if (marks.mode === "dry-run") return { disposition: "completion", text: "ready", usage: {} };
  if (exchange.outcome === "refusal") return { disposition: "refused", text: exchange.refusal.grounds, usage: {} };
  return { disposition: "completion", text: exchange.completion.text, usage: exchange.completion.raw?.usage ?? {} };
}

export async function executeProviderMessage(provider, message, options = {}) {
  const row = providerConfiguration(provider), policy = row.execution ?? {};
  const [{ executeTypedInferenceEffect }, { lazySettlementAccount }] = await Promise.all([
    import("@red-cup-engineering/computer-inference-engine/fabric/execute-typed-inference-effect"),
    import("@red-cup-engineering/ethereum-engineering-services-section/settlement-account-binding"),
  ]);
  const settlement = lazySettlementAccount(providerResourceRoot(row, options.resourceRoot));
  return executeTypedInferenceEffect(message, {
    providerLabel: policy.label ?? row.providerId,
    settlement: () => settlement().settlement,
    performInference: (marks) => performProviderInference(row, marks, options),
    measures(prior, performed) {
      const usage = performed.usage ?? {}, values = new Map((prior ?? []).map((measure) => [measure.dimension, measure]));
      values.set("provider-request", { dimension: "provider-request", quantity: "1", unit: policy.requestUnit ?? `${row.providerId}-api-request` });
      for (const [dimension, field] of [["input-token", "prompt_tokens"], ["output-token", "completion_tokens"]]) if (Number.isInteger(usage[field])) values.set(dimension, { dimension, quantity: String(usage[field]), unit: "token" });
      // What the provider reports this call cost, when it reports it; an unreported cost stays unmeasured.
      if ((typeof usage.cost === "number" && Number.isFinite(usage.cost) && usage.cost >= 0) || (typeof usage.cost === "string" && usage.cost.trim() !== "")) values.set("reported-cost", { dimension: "reported-cost", quantity: String(usage.cost), unit: policy.reportedCostUnit ?? `${row.providerId}-reported-cost` });
      return [...values.values()];
    },
  }, options);
}

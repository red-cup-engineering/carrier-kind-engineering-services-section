/**
 * @red-cup-engineering/app-discord-steward — the parameterized, runnable form of
 * @red-cup-engineering/organizing-with-discord.
 *
 * Give it a server name, a bot name, a bot key, and an admin username; it resolves
 * the server by name, goes online in it, and runs the autonomous steward: every
 * message/join/interaction fires a pulse grounded in the settled, budget-bounded
 * context suit (the manifold's tiered sense/memory/learning grounding, so it
 * answers from what it has seen), it measures and de-encloses the server, and it
 * holds the §12 automate/keep-human boundary — deferring conflict, care, bans, and
 * governance to the named admin.
 *
 * This module is the library binding: config typing/merge, guild-by-name
 * resolution, the OAuth2 invite URL, and a supervised run with reconnect. The bin
 * (./scripts/steward) is the actuator.
 */
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  ALL_CAPABILITIES,
  discordCapabilityGrant,
  discordRestTransport,
  resolveGuildByName,
  tendGuild,
  type Capability,
  type DiscordTransport,
  type GatewayConnection,
  type GatewayOptions,
  type GateMode,
  type MembershipService,
  type TendingGuild,
  type TendResult,
} from "@red-cup-engineering/organizing-with-discord";
import type { CostRates } from "@red-cup-engineering/organizing-with-openai-agents";
import type { OpenaiAgentInfer } from "@red-cup-engineering/organizing-with-openai-agents";

/** Everything needed to run a steward in one server. */
export type StewardConfig = Readonly<{
  /** The Discord server (guild) NAME the bot should operate in. */
  serverName: string;
  /** The bot's display name (cosmetic; used in the charter). */
  botName?: string;
  /** The bot token (key). May instead come from DISCORD_BOT_TOKEN in the env. */
  token?: string;
  /** The human admin's username — the steward defers governance/care to them. */
  adminUsername: string;
  /** What the server is for — the standing charter the steward pursues. */
  charter: string;
  /** Inference endpoint id (nvidia | groq | cerebras | openai); defaults to first present. */
  endpoint?: string;
  /** Inference model; defaults to the endpoint's default. */
  model?: string;
  /** Inference override for tests or embedded hosts; live runs normally use endpoint. */
  infer?: OpenaiAgentInfer;
  /** Granted capabilities ("appropriate permissions"); defaults to full. */
  capabilities?: readonly Capability[];
  /** The §12 automate/keep-human gate; defaults to "enforce". */
  gate?: GateMode;
  /** Data-mount root for memory; defaults to <cwd>/data. */
  dataRoot?: string;
  /** Context-suit token budget per pulse; defaults to the library default. */
  contextBudget?: number;
  /** Optional inference cost rates for pulse token/dollar reporting. */
  cost?: CostRates;
  /** The bot's application/client id — only needed to print the invite URL. */
  clientId?: string;
  /** Transport override (e.g. an in-memory guild for a token-free dry run). */
  transport?: DiscordTransport;
  /** Gateway override for tests or embedded hosts; live runs normally use Discord. */
  gateway?: (options: GatewayOptions) => GatewayConnection;
  /** Optional host-provided membership service for checkout tools. */
  membership?: MembershipService;
  /** Optional admin channel where human-only recommendations are posted. */
  adminChannelId?: string;
  /** Optional Discord user id to mention in the admin channel. */
  adminUserId?: string;
}>;

/** Merge config from a JSON file, the environment, and explicit overrides
 *  (overrides win, then env, then file). Returns a validated StewardConfig. */
export async function loadConfig(
  options: Readonly<{ file?: string; overrides?: Partial<StewardConfig> }> = {},
): Promise<StewardConfig> {
  const fromFile = options.file === undefined ? {} : await readConfigFile(options.file);
  const env = process.env;
  const cost = costRatesFromEnv(env);
  const fromEnv: Partial<StewardConfig> = {
    ...(env["DISCORD_SERVER_NAME"] === undefined ? {} : { serverName: env["DISCORD_SERVER_NAME"] }),
    ...(env["DISCORD_BOT_NAME"] === undefined ? {} : { botName: env["DISCORD_BOT_NAME"] }),
    ...(env["DISCORD_BOT_TOKEN"] === undefined ? {} : { token: env["DISCORD_BOT_TOKEN"] }),
    ...(env["DISCORD_TOKEN"] === undefined ? {} : { token: env["DISCORD_TOKEN"] }),
    ...(env["DISCORD_ADMIN"] === undefined ? {} : { adminUsername: env["DISCORD_ADMIN"] }),
    ...(env["DISCORD_CLIENT_ID"] === undefined ? {} : { clientId: env["DISCORD_CLIENT_ID"] }),
    ...(env["DISCORD_ADMIN_CHANNEL_ID"] === undefined ? {} : { adminChannelId: env["DISCORD_ADMIN_CHANNEL_ID"] }),
    ...(env["DISCORD_ADMIN_USER_ID"] === undefined ? {} : { adminUserId: env["DISCORD_ADMIN_USER_ID"] }),
    ...(cost === undefined ? {} : { cost }),
  };
  const merged = { ...fromFile, ...fromEnv, ...(options.overrides ?? {}) } as Partial<StewardConfig>;

  const missing: string[] = [];
  if (!merged.serverName) missing.push("serverName");
  if (!merged.adminUsername) missing.push("adminUsername");
  if (!merged.charter) missing.push("charter");
  if (missing.length > 0) {
    throw new Error(`steward config missing: ${missing.join(", ")} (set in the config file, flags, or env)`);
  }
  return Object.freeze(merged as StewardConfig);
}

function optionalNumberEnv(env: NodeJS.ProcessEnv, name: string): number | undefined {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`steward config env ${name} must be a nonnegative number`);
  return value;
}

function costRatesFromEnv(env: NodeJS.ProcessEnv): CostRates | undefined {
  const input = optionalNumberEnv(env, "TTI_COST_DOLLARS_PER_MILLION_INPUT_TOKENS");
  const output = optionalNumberEnv(env, "TTI_COST_DOLLARS_PER_MILLION_OUTPUT_TOKENS");
  const charsPerToken = optionalNumberEnv(env, "TTI_COST_CHARS_PER_TOKEN");
  if (input === undefined && output === undefined && charsPerToken === undefined) return undefined;
  return {
    ...(input === undefined ? {} : { dollarsPerMillionInputTokens: input }),
    ...(output === undefined ? {} : { dollarsPerMillionOutputTokens: output }),
    ...(charsPerToken === undefined ? {} : { charsPerToken }),
  };
}

async function readConfigFile(file: string): Promise<Partial<StewardConfig>> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    throw new Error(`steward: cannot read config file ${file}`);
  }
  try {
    return JSON.parse(raw) as Partial<StewardConfig>;
  } catch {
    throw new Error(`steward: config file ${file} is not valid JSON`);
  }
}

// ── invite URL ────────────────────────────────────────────────────────────────
/** Discord permission bits each capability needs, so the invite asks for exactly
 *  the permissions the granted capabilities require — no more. */
const CAPABILITY_PERMISSIONS: Readonly<Record<Capability, readonly bigint[]>> = Object.freeze({
  read: [1n << 10n, 1n << 16n], // VIEW_CHANNEL, READ_MESSAGE_HISTORY
  message: [1n << 11n, 1n << 6n], // SEND_MESSAGES, ADD_REACTIONS
  "manage-messages": [1n << 13n], // MANAGE_MESSAGES
  "manage-channels": [1n << 4n], // MANAGE_CHANNELS
  "manage-roles": [1n << 28n], // MANAGE_ROLES
  "manage-personas": [1n << 29n], // MANAGE_WEBHOOKS
  "manage-commands": [], // applications.commands scope, no extra bit
  "manage-memberships": [], // checkout tooling; role fulfillment uses manage-roles when granted
  moderate: [1n << 1n, 1n << 2n, 1n << 40n], // KICK_MEMBERS, BAN_MEMBERS, MODERATE_MEMBERS
  measure: [1n << 10n, 1n << 16n], // VIEW_CHANNEL, READ_MESSAGE_HISTORY
});

/** The OR'd permission bitfield for a set of capabilities, as Discord wants it. */
export function permissionsFor(capabilities: readonly Capability[]): string {
  const grant = discordCapabilityGrant({ capabilities: [...capabilities] });
  let bits = 0n;
  for (const cap of grant.capabilities) for (const bit of CAPABILITY_PERMISSIONS[cap] ?? []) bits |= bit;
  return bits.toString();
}

/** The OAuth2 URL that invites this bot into a server with exactly the
 *  permissions its capabilities need. The human admin opens it once. */
export function inviteUrl(clientId: string, capabilities: readonly Capability[] = ALL_CAPABILITIES): string {
  const permissions = permissionsFor(capabilities);
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&permissions=${permissions}&scope=bot+applications.commands`;
}

// ── running ───────────────────────────────────────────────────────────────────
function charterWithAdmin(config: StewardConfig): string {
  const name = config.botName ?? "the steward";
  return (
    `You are ${name}, the steward of this server. ${config.charter}\n\n` +
    `The human admin is @${config.adminUsername}: defer every matter the §12 boundary ` +
    `reserves for people — conflict mediation, care, bans and their appeals, crisis ` +
    `decisions, and governance — to them via recommend_to_moderators, never acting on ` +
    `such things yourself.`
  );
}

/** A running steward. */
export interface RunningSteward {
  /** The resolved guild id the steward operates. */
  readonly guildId: string;
  stop(): void;
}

/** Hooks for observing a running steward. */
export type StewardHooks = Readonly<{
  onReady?: (selfUserId: string) => void;
  onPulse?: (result: TendResult) => void;
  onInfo?: (message: string) => void;
  onError?: (error: Error) => void;
}>;

/**
 * Resolve the server by name and run the steward in it, supervised: if the
 * gateway drops, it reconnects with backoff until stopped. The bot token is taken
 * from config.token (placed into the env so the transport and gateway resolve it)
 * or from the ambient env. Throws if the server name cannot be resolved.
 */
export async function runSteward(config: StewardConfig, hooks: StewardHooks = {}): Promise<RunningSteward> {
  if (config.transport === undefined && config.token !== undefined && config.token.length > 0) {
    process.env["DISCORD_BOT_TOKEN"] = config.token;
  }
  const transport = config.transport ?? discordRestTransport({});
  const guild = await resolveGuildByName(transport, config.serverName);
  if (guild === null) {
    const known = (await transport.listMyGuilds()).map((g) => g.name);
    throw new Error(
      `steward: could not resolve server "${config.serverName}" — the bot is in: ` +
      `${known.length ? known.join(", ") : "(no servers; invite it first)"}`,
    );
  }
  hooks.onInfo?.(`resolved "${config.serverName}" → guild ${guild.id} (${guild.approximateMemberCount ?? "?"} members)`);

  const capabilities = config.capabilities ?? ALL_CAPABILITIES;
  let current: TendingGuild | null = null;
  let stopped = false;
  let backoff = 1000;
  let generation = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const start = (): void => {
    if (stopped) return;
    const runGeneration = ++generation;
    current = tendGuild(
      {
        guildId: guild.id,
        charter: charterWithAdmin(config),
        capabilities,
        gate: config.gate ?? "enforce",
        transport,
        ...(config.endpoint === undefined ? {} : { endpoint: config.endpoint }),
        ...(config.model === undefined ? {} : { model: config.model }),
        ...(config.infer === undefined ? {} : { infer: config.infer }),
        ...(config.dataRoot === undefined ? {} : { root: config.dataRoot }),
        ...(config.contextBudget === undefined ? {} : { contextBudget: config.contextBudget }),
        ...(config.cost === undefined ? {} : { cost: config.cost }),
        ...(config.membership === undefined ? {} : { membership: config.membership }),
        ...(config.adminChannelId === undefined ? {} : { adminChannelId: config.adminChannelId }),
        ...(config.adminUserId === undefined ? {} : { adminUserId: config.adminUserId }),
        ...(config.gateway === undefined ? {} : { gateway: config.gateway }),
      },
      {
        onReady: (id) => { backoff = 1000; hooks.onReady?.(id); },
        ...(hooks.onPulse === undefined ? {} : { onPulse: hooks.onPulse }),
        onError: (error) => {
          hooks.onError?.(error);
          // a gateway close/reconnect ask → supervise with backoff.
          if (!stopped && /clos|reconnect|re-identify|socket/i.test(error.message)) {
            if (runGeneration !== generation) return;
            if (reconnectTimer !== null) return;
            current?.close();
            const delay = Math.min(backoff, 30000);
            backoff = Math.min(backoff * 2, 30000);
            hooks.onInfo?.(`gateway dropped; reconnecting in ${Math.round(delay / 1000)}s`);
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              start();
            }, delay);
          }
        },
      },
    );
  };
  start();

  return {
    guildId: guild.id,
    stop() {
      stopped = true;
      generation += 1;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      current?.close();
    },
  };
}

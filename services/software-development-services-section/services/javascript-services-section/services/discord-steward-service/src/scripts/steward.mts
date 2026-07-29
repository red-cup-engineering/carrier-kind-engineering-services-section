#!/usr/bin/env node
/**
 * discord-steward — run an autonomous steward in a named Discord server.
 *
 *   discord-steward run     [--config steward.config.json] [--server "My Server"]
 *                           [--bot Name] [--admin username] [--endpoint id] [--model m]
 *                           [--data ./data]            # go online and tend the server
 *   discord-steward invite  --client-id <app id> [--config f] [--capabilities a,b]
 *                                                       # print the OAuth2 invite URL
 *   discord-steward check   [--config f]                # validate config + key presence
 *
 * The bot token comes from --config / DISCORD_BOT_TOKEN. The inference key comes
 * from the ambient env (NVIDIA / Groq / Cerebras / OpenAI). This is the process
 * boundary; the library stays pure of it.
 */
import process from "node:process";
import { availableEndpoints } from "@emsenn/organizing-with-openai-agents";
import { ALL_CAPABILITIES, botTokenProjection, type Capability, type GateMode } from "@emsenn/organizing-with-discord";
import { inviteUrl, loadConfig, runSteward, type StewardConfig } from "../index.mjs";

const VALUE = new Set(["--config", "--server", "--bot", "--admin", "--charter", "--endpoint", "--model", "--data", "--client-id", "--capabilities", "--gate"]);
const BOOL = new Set(["--help", "-h"]);

function usage(code: number): never {
  process.stderr.write(
    "usage:\n" +
    "  discord-steward run    [--config f] [--server N] [--bot N] [--admin U] [--endpoint id] [--model m] [--data dir]\n" +
    "  discord-steward invite --client-id <app id> [--config f] [--capabilities a,b]\n" +
    "  discord-steward check  [--config f]\n",
  );
  process.exit(code);
}

function parse(argv: readonly string[]): { command: string; options: Record<string, string>; bools: Set<string> } {
  const [command, ...rest] = argv;
  const options: Record<string, string> = {};
  const bools = new Set<string>();
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (BOOL.has(arg)) { bools.add(arg); continue; }
    if (VALUE.has(arg)) {
      const value = rest[++i];
      if (value === undefined) { process.stderr.write(`flag ${arg} needs a value\n`); usage(2); }
      options[arg] = value; continue;
    }
    process.stderr.write(`unknown argument: ${arg}\n`); usage(2);
  }
  return { command: command ?? "", options, bools };
}

function overridesFrom(o: Record<string, string>): Partial<StewardConfig> {
  return {
    ...(o["--server"] === undefined ? {} : { serverName: o["--server"] }),
    ...(o["--bot"] === undefined ? {} : { botName: o["--bot"] }),
    ...(o["--admin"] === undefined ? {} : { adminUsername: o["--admin"] }),
    ...(o["--charter"] === undefined ? {} : { charter: o["--charter"] }),
    ...(o["--endpoint"] === undefined ? {} : { endpoint: o["--endpoint"] }),
    ...(o["--model"] === undefined ? {} : { model: o["--model"] }),
    ...(o["--data"] === undefined ? {} : { dataRoot: o["--data"] }),
    ...(o["--client-id"] === undefined ? {} : { clientId: o["--client-id"] }),
    ...(o["--gate"] === undefined ? {} : { gate: o["--gate"] as GateMode }),
    ...(o["--capabilities"] === undefined ? {} : { capabilities: o["--capabilities"].split(",").map((s) => s.trim()) as Capability[] }),
  };
}

async function load(o: Record<string, string>): Promise<StewardConfig> {
  return loadConfig({ ...(o["--config"] === undefined ? {} : { file: o["--config"] }), overrides: overridesFrom(o) });
}

async function cmdRun(o: Record<string, string>): Promise<number> {
  const config = await load(o);
  if (!botTokenProjection().present && (config.token === undefined || config.token.length === 0)) {
    process.stderr.write("discord-steward: no bot token (set token in config or DISCORD_BOT_TOKEN)\n");
    return 1;
  }
  process.stderr.write(`starting steward "${config.botName ?? "steward"}" in server "${config.serverName}" — ctrl-c to stop\n`);
  const steward = await runSteward(config, {
    onInfo: (m) => process.stderr.write(`· ${m}\n`),
    onReady: (id) => process.stderr.write(`online as user ${id}\n`),
    onPulse: (r) => process.stdout.write(`pulse · ${r.event.type} → ${r.run.stop}: ${r.run.summary ?? ""}\n`),
    onError: (e) => process.stderr.write(`! ${e.message}\n`),
  });
  process.on("SIGINT", () => { steward.stop(); process.stderr.write("\nstopped\n"); process.exit(0); });
  return -1; // stay alive
}

async function cmdInvite(o: Record<string, string>): Promise<number> {
  const clientId = o["--client-id"] ?? process.env["DISCORD_CLIENT_ID"];
  if (clientId === undefined) { process.stderr.write("discord-steward invite: --client-id <application id> is required\n"); return 2; }
  let caps: readonly Capability[] = ALL_CAPABILITIES;
  if (o["--capabilities"] !== undefined) {
    caps = o["--capabilities"].split(",").map((s) => s.trim()).filter((s) => s.length > 0) as Capability[];
  } else if (o["--config"] !== undefined) {
    const config = await load(o).catch(() => null);
    if (config?.capabilities !== undefined) caps = config.capabilities;
  }
  process.stdout.write(inviteUrl(clientId, caps) + "\n");
  process.stderr.write(
    "\nOpen this URL as the server admin to add the bot. It requests exactly the\n" +
    "permissions the granted capabilities need. Also enable the MESSAGE CONTENT and\n" +
    "SERVER MEMBERS privileged intents on the bot's application page.\n",
  );
  return 0;
}

async function cmdCheck(o: Record<string, string>): Promise<number> {
  const config = await load(o).catch((e: unknown) => { process.stderr.write(`config: ${(e as Error).message}\n`); return null; });
  if (config === null) return 1;
  const token = config.token ?? (botTokenProjection().present ? "(env)" : undefined);
  process.stdout.write(`server: ${config.serverName}\nbot: ${config.botName ?? "(unnamed)"}\nadmin: @${config.adminUsername}\n`);
  process.stdout.write(`bot token: ${token === undefined ? "ABSENT — set token or DISCORD_BOT_TOKEN" : "present"}\n`);
  process.stdout.write(`gate: ${config.gate ?? "enforce"}   capabilities: ${(config.capabilities ?? ALL_CAPABILITIES).join(", ")}\n`);
  process.stdout.write("inference endpoints:\n");
  for (const e of availableEndpoints()) {
    process.stdout.write(`  ${e.apiKey.present ? "✓" : "·"} ${e.endpoint}\n`);
  }
  const anyKey = availableEndpoints().some((e) => e.apiKey.present);
  if (!anyKey) process.stdout.write("  ! no inference key present (set NVIDIA_API_KEY / GROQ_API_KEY / CEREBRAS_API_KEY / OPENAI_API_KEY)\n");
  return 0;
}

async function main(): Promise<number> {
  const { command, options, bools } = parse(process.argv.slice(2));
  if (bools.has("--help") || bools.has("-h") || command === "" || command === "help") usage(command === "" ? 1 : 0);
  switch (command) {
    case "run": return await cmdRun(options);
    case "invite": return await cmdInvite(options);
    case "check": return await cmdCheck(options);
    default: process.stderr.write(`unknown command: ${command}\n`); usage(2);
  }
}

main().then((code) => { if (code >= 0) process.exit(code); }).catch((error) => {
  process.stderr.write(`discord-steward: ${(error as Error).message}\n`);
  process.exit(1);
});

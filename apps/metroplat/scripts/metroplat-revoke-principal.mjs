#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { readPrincipalsFile, writePrincipalsFile } from "@red-cup-engineering/computer-web-server/admission/principals";
import { metroplatAuthorizationStore } from "./metroplat-admit-principal.mjs";

function usage() {
  return "usage: revoke-principal.mjs --client-id <id> | --email <email> | --hive <account> | --username <username> [--state-dir <dir>]\n"
    + "METROPLAT_ALLOWED_EMAIL is a bootstrap principal set in the environment; this script cannot revoke it.\n";
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

/**
 * Revoke one principal: a machine client is withdrawn from the authorization server (its tokens
 * stop working at once); an email, Hive or password principal is marked revoked in
 * principals.json, and its sessions stop at their next request.
 * @param {{ stateDir: string, clientId?: string, email?: string, hive?: string, username?: string }} params
 */
export async function revokePrincipal({ stateDir, clientId, email, hive, username, issuer }) {
  if (clientId !== undefined) {
    await metroplatAuthorizationStore(stateDir, issuer ?? process.env.PUBLIC_BASE_URL).revokeClient(clientId);
    return { kind: "client", clientId };
  }
  const principals = readPrincipalsFile(stateDir);
  const wanted = (entry) => (email !== undefined ? entry.kind === "email" && entry.email === email.trim().toLowerCase()
    : hive !== undefined ? entry.kind === "hive" && entry.account === hive.trim().toLowerCase()
      : entry.kind === "human" && entry.username === username?.trim().toLowerCase());
  const entry = principals.find((candidate) => wanted(candidate) && !candidate.revoked);
  if (!entry) throw new RangeError(`no admitted principal found for ${email ?? hive ?? username}`);
  entry.revoked = true;
  entry.revokedAt = new Date().toISOString();
  writePrincipalsFile(stateDir, principals);
  return entry;
}

async function main({ argv, stdout }) {
  const args = parseArgs(argv);
  const stateDir = args["state-dir"] ?? process.env.METROPLAT_WEB_STATE_DIR;
  if (!stateDir) throw new TypeError(`METROPLAT_WEB_STATE_DIR or --state-dir is required\n${usage()}`);
  if (!args["client-id"] && !args.email && !args.hive && !args.username) throw new TypeError(usage());
  const entry = await revokePrincipal({ stateDir, clientId: args["client-id"], email: args.email, hive: args.hive, username: args.username, issuer: args.issuer ?? process.env.PUBLIC_BASE_URL });
  stdout.write(`Revoked ${entry.kind} principal ${entry.clientId ?? entry.email ?? entry.account ?? entry.username}.\n`);
}

await runMain(main, {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error instanceof Error ? error.message : String(error)}\n`,
  exitCode: 1,
});

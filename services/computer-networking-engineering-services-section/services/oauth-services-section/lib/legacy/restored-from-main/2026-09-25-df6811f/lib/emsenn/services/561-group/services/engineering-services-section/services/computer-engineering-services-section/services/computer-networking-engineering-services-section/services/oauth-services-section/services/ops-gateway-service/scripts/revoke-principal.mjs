#!/usr/bin/env node

import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { readPrincipalsFile, writePrincipalsFile } from "../src/principal-registry.mjs";

function usage() {
  return "usage: revoke-principal.mjs --client-id <id> [--state-dir <dir>]\n"
    + "       revoke-principal.mjs --email <email> [--state-dir <dir>]\n"
    + "Note: OPS_MCP_ALLOWED_EMAIL is a separate bootstrap principal set in the\n"
    + "environment; this script cannot revoke it.\n";
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

/**
 * Mark one principals.json entry revoked in place. A revoked client
 * immediately fails client_credentials issuance and future bearer-guard
 * lookups against its already-issued tokens.
 *
 * @param {{ stateDir: string, clientId?: string, email?: string }} params
 * @returns {Record<string, unknown>} the revoked entry
 * @throws {RangeError} when no matching, still-live entry exists
 */
export function revokePrincipal({ stateDir, clientId, email }) {
  const principals = readPrincipalsFile(stateDir);
  const entry = principals.find((candidate) => (
    clientId ? candidate.kind === "client" && candidate.clientId === clientId
      : candidate.kind === "email" && candidate.email === email?.trim().toLowerCase()
  ) && !candidate.revoked);
  if (!entry) throw new RangeError(`no admitted principal found for ${clientId ? `client_id ${clientId}` : `email ${email}`}`);
  entry.revoked = true;
  entry.revokedAt = new Date().toISOString();
  writePrincipalsFile(stateDir, principals);
  return entry;
}

async function main({ argv, stdout }) {
  const args = parseArgs(argv);
  const stateDir = args["state-dir"] ?? process.env.OPS_MCP_STATE_DIR;
  if (!stateDir) throw new TypeError(`OPS_MCP_STATE_DIR or --state-dir is required\n${usage()}`);
  if (!args["client-id"] && !args.email) throw new TypeError(usage());
  const entry = revokePrincipal({ stateDir, clientId: args["client-id"], email: args.email });
  stdout.write(`Revoked ${entry.kind} principal ${entry.clientId ?? entry.email}.\n`);
}

await runMain(main, {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error instanceof Error ? error.message : String(error)}\n`,
  exitCode: 1,
});

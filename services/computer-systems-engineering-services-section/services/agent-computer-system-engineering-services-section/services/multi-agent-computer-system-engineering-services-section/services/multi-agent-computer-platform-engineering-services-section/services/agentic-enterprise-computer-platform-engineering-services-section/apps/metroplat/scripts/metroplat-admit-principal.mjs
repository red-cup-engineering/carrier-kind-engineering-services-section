#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { hashPrincipalSecret, normalizeHumanUsername, readPrincipalsFile, validateHumanPassword, writePrincipalsFile } from "@red-cup-engineering/computer-web-server/admission/principals";
import { createAuthorizationServer, createJsonFileGrantStore } from "@red-cup-engineering/oauth-services-section/authorization-server";

/** The site's authorization server over its state, for issuing machine clients from the command line. */
export function metroplatAuthorizationStore(stateDir, issuer, { grantStoreProfile } = {}) {
  if (!issuer) throw new TypeError("PUBLIC_BASE_URL or --issuer is required for machine clients");
  const store = createJsonFileGrantStore(join(stateDir, "oauth"), { profile: grantStoreProfile });
  if (grantStoreProfile !== undefined && store.profile !== grantStoreProfile) throw new TypeError("requested OAuth grant custody profile is unavailable");
  return createAuthorizationServer({ issuer, resources: [`${issuer.replace(/\/$/u, "")}/mcp`], store, authenticate: () => undefined, loginUrl: () => "/sign-in" });
}

function usage() {
  return "usage: admit-principal.mjs --actor <actor:urn> [--state-dir <dir>] [--client-name <name>] [--secret-file <path>] [--grant-store-profile <profile>]\n"
    + "       admit-principal.mjs --email <email> [--state-dir <dir>]\n"
    + "       admit-principal.mjs --hive <hive-account> [--state-dir <dir>]\n"
    + "       admit-principal.mjs --username <username> --password-stdin [--replace] [--state-dir <dir>]\n";
}

function parseArgs(argv) {
  const args = {};
  const flags = new Set(["--password-stdin", "--replace"]);
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    if (flags.has(key)) {
      args[key.slice(2)] = true;
      continue;
    }
    args[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

/**
 * Admit a principal: an email address (Google), a Hive account (Keychain), or a person with a
 * username and password, into principals.json; or a machine client acting as an `actor:` URN,
 * into the authorization server, whose secret is returned once and stored only as a hash.
 *
 * @param {{ stateDir: string, actor?: string, clientName?: string, email?: string, hive?: string, username?: string, password?: string, replace?: boolean, secret?: string }} params
 */
export async function admitPrincipal({ stateDir, actor, clientName, email, hive, username, password, replace = false, secret, issuer, grantStoreProfile }) {
  const principals = readPrincipalsFile(stateDir);
  if (username !== undefined) {
    const normalized = normalizeHumanUsername(username);
    const existingIndex = principals.findIndex((entry) => entry?.kind === "human" && entry.username === normalized);
    if (existingIndex >= 0 && !replace) throw new TypeError(`human principal ${normalized} already exists; pass --replace with a new password to replace it`);
    validateHumanPassword(password);
    const { secretSalt, secretHash } = hashPrincipalSecret(password);
    const record = { kind: "human", username: normalized, secretSalt, secretHash, createdAt: existingIndex >= 0 ? principals[existingIndex].createdAt : new Date().toISOString() };
    if (existingIndex >= 0) principals[existingIndex] = record;
    else principals.push(record);
    writePrincipalsFile(stateDir, principals);
    return { kind: "human", username: normalized };
  }
  if (hive) {
    const normalized = hive.trim().toLowerCase();
    if (!principals.some((entry) => entry.kind === "hive" && entry.account === normalized)) {
      principals.push({ kind: "hive", account: normalized, createdAt: new Date().toISOString() });
      writePrincipalsFile(stateDir, principals);
    }
    return { kind: "hive", account: normalized };
  }
  if (email) {
    const normalized = email.trim().toLowerCase();
    if (!principals.some((entry) => entry.kind === "email" && entry.email === normalized)) {
      principals.push({ kind: "email", email: normalized, createdAt: new Date().toISOString() });
      writePrincipalsFile(stateDir, principals);
    }
    return { kind: "email", email: normalized };
  }
  if (!actor) throw new TypeError("--actor, --email, --hive, or --username is required");
  if (!actor.startsWith("actor:")) throw new TypeError("a machine client acts as an actor: URN");
  const issued = await metroplatAuthorizationStore(stateDir, issuer ?? process.env.PUBLIC_BASE_URL, { grantStoreProfile }).registerMachineClient({ name: clientName ?? actor, subject: actor, ...(secret === undefined ? {} : { secret }) });
  return { kind: "client", clientId: issued.client_id, clientSecret: issued.client_secret, actor };
}

async function main({ argv, stdout }) {
  const args = parseArgs(argv);
  const stateDir = args["state-dir"] ?? process.env.METROPLAT_WEB_STATE_DIR;
  if (!stateDir) throw new TypeError(`METROPLAT_WEB_STATE_DIR or --state-dir is required\n${usage()}`);
  const passwordStdin = Object.hasOwn(args, "password-stdin");
  if (passwordStdin && args.username === undefined) throw new TypeError("--password-stdin requires --username");
  if (args.username !== undefined && !passwordStdin) throw new TypeError("--username requires --password-stdin; passwords are never accepted in arguments or files");
  if (args.replace !== undefined && args.username === undefined) throw new TypeError("--replace is only valid with --username");
  const secretFile = args["secret-file"];
  if (passwordStdin && secretFile) throw new TypeError("--password-stdin cannot be combined with --secret-file");
  const secret = secretFile ? readFileSync(secretFile, "utf-8").trim() : undefined;
  if (secretFile && !secret) throw new TypeError(`--secret-file ${secretFile} is empty`);
  const passwordInput = passwordStdin ? readFileSync(0, "utf-8").replace(/\r?\n$/, "") : undefined;
  const result = await admitPrincipal({ stateDir, actor: args.actor, clientName: args["client-name"], email: args.email, hive: args.hive, username: args.username, password: passwordInput, replace: args.replace !== undefined, secret, issuer: args.issuer ?? process.env.PUBLIC_BASE_URL, grantStoreProfile: args["grant-store-profile"] ?? process.env.OAUTH_GRANT_STORE_PROFILE });
  if (result.kind === "client") {
    stdout.write(`Admitted machine client ${result.clientId} for ${result.actor}.\n`);
    stdout.write(
      secretFile
        ? `client_secret read from ${secretFile} (not printed here).\n`
        : `client_secret (shown once, store it now): ${result.clientSecret}\n`,
    );
  } else if (result.kind === "hive") {
    stdout.write(`Admitted Hive principal ${result.account}.\n`);
  } else if (result.kind === "human") {
    stdout.write(`Admitted password principal ${result.username}.\n`);
  } else {
    stdout.write(`Admitted email principal ${result.email}.\n`);
  }
}

await runMain(main, {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error instanceof Error ? error.message : String(error)}\n`,
  exitCode: 1,
});

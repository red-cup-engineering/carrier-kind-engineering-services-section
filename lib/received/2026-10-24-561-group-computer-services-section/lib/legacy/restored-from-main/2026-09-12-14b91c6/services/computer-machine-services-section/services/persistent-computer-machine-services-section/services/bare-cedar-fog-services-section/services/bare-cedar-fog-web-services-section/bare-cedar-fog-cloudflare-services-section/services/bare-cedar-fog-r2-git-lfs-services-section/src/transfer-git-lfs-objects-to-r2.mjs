#!/usr/bin/env node
// git-lfs standalone transfer agent for this laptop's asset bucket. git-lfs
// spawns this and speaks line-delimited JSON over stdin/stdout, so stdio is
// inherited straight through to lfs-s3 and nothing may be written to stdout
// here. Credentials reach lfs-s3 through the environment rather than argv so
// key material never appears in a process listing.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "content/configs/git-lfs-object-custody.json",
);

export function readEnvFile(path) {
  const found = {};
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return found;
  }
  for (const line of text.split("\n")) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    found[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return found;
}

// Separated from invocation so tests can assert the binding without holding
// credentials: the returned env is keyed but the caller supplies the values.
export function custodyInvocation(config, secrets) {
  const missing = Object.entries(config.credentialNames)
    .filter(([, name]) => !secrets[name])
    .map(([, name]) => name);
  if (missing.length) {
    throw new Error(`missing credential(s) in .env: ${missing.join(", ")}`);
  }
  const accountId = secrets[config.credentialNames.accountId];
  const endpoint = config.endpointTemplate.replace("{accountId}", accountId);
  const args = [
    `-bucket=${config.bucket}`,
    `-endpoint=${endpoint}`,
    `-region=${config.region}`,
    `-compression=${config.compression}`,
    `-delete_other_versions=${config.deleteOtherVersions}`,
  ];
  if (config.usePathStyle) args.push("-use_path_style");
  if (config.rootPath) args.push(`-root_path=${config.rootPath}`);
  return {
    args,
    env: {
      AWS_ACCESS_KEY_ID: secrets[config.credentialNames.accessKeyId],
      AWS_SECRET_ACCESS_KEY: secrets[config.credentialNames.secretAccessKey],
      AWS_REGION: config.region,
      AWS_ENDPOINT_URL_S3: endpoint,
    },
  };
}

// git-lfs invokes the agent with whatever environment the calling git has, and
// a Go-installed binary is often outside it, so the location is resolved here
// rather than assumed to be on PATH.
export function resolveAgentBinary(name, env = process.env) {
  if (isAbsolute(name)) return name;
  const candidates = [
    env.GOBIN && join(env.GOBIN, name),
    env.GOPATH && join(env.GOPATH, "bin", name),
    join(homedir(), "go", "bin", name),
    ...(env.PATH ?? "").split(":").filter(Boolean).map((entry) => join(entry, name)),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? name;
}

export function repositoryRoot() {
  const found = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return found.status === 0 ? found.stdout.trim() : process.cwd();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const config = JSON.parse(readFileSync(CONFIG, "utf8"));
  const secrets = readEnvFile(join(repositoryRoot(), ".env"));
  const { args, env } = custodyInvocation(config, secrets);
  const binary = resolveAgentBinary(config.transferAgentBinary ?? "lfs-s3");
  const result = spawnSync(binary, [...args, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  process.exit(result.status ?? 1);
}

/**
 * Subject/capability option resolution shared by every MetroPlat process
 * boundary (the `metroplat` CLI dispatcher and the `metroplat-mcp` stdio
 * server): the same `--subject`/`--capabilities`/`--claude-session-root`/
 * `--codex-session-root`/`--instance`/`--fern`/`--operations-root` flags and
 * `METROPLAT_MCP_SUBJECT`/`METROPLAT_MCP_CAPABILITIES`/
 * `METROPLAT_CLAUDE_SESSION_ROOT`/`METROPLAT_CODEX_SESSION_ROOT`/
 * `METROPLAT_INSTANCE`/`METROPLAT_FERN`/`METROPLAT_OPERATIONS_ROOT` environment names, parsed
 * once so no process boundary drifts from another.
 */
import { isAbsolute, resolve } from "node:path";
import { processEnvValue } from "@red-cup-engineering/node-process-services-section/environment";

const CAPABILITY_VERB = /^[A-Za-z0-9][A-Za-z0-9_-]*$/u;

/** Trim `value`, treating an empty result as absent. */
export function nonempty(value) {
  const normalized = value?.trim();
  return normalized === undefined || normalized === "" ? undefined : normalized;
}

function flagValue(args, flag) {
  let value;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== flag && !arg.startsWith(`${flag}=`)) continue;
    if (value !== undefined) throw new TypeError(`metroplat: ${flag} must be supplied once`);
    const next = arg === flag ? nonempty(args[index + 1]) : nonempty(arg.slice(flag.length + 1));
    if (next === undefined || (arg === flag && next.startsWith("--"))) {
      throw new TypeError(`metroplat: ${flag} requires a non-empty value`);
    }
    value = next;
    if (arg === flag) index += 1;
  }
  return value;
}

function capabilityVerbs(value) {
  if (value === undefined) return Object.freeze([]);
  const verbs = value.split(",").map((item) => item.trim());
  if (verbs.length === 0 || verbs.some((verb) => !CAPABILITY_VERB.test(verb))) {
    throw new TypeError("metroplat: requested capabilities must be a comma-separated list of operation verbs");
  }
  if (new Set(verbs).size !== verbs.length) {
    throw new TypeError("metroplat: requested capabilities must not repeat operation verbs");
  }
  return Object.freeze(verbs);
}

/**
 * Resolve the actor and requested capability verbs for one MetroPlat process
 * boundary. `--subject` and `METROPLAT_MCP_SUBJECT` outrank `defaultSubject`
 * in that order; every caller supplies its own default (the MCP server
 * defaults to "claude", the CLI dispatcher to "anonymous") rather than the
 * resolver picking one.
 */
export function resolveInfographProcessOptions(
  args,
  defaultSubject,
  env,
  cwd = process.cwd(),
) {
  const subject = flagValue(args, "--subject") ?? nonempty(processEnvValue("METROPLAT_MCP_SUBJECT", env)) ?? defaultSubject;
  const claudeSessionRoot = flagValue(args, "--claude-session-root") ?? nonempty(processEnvValue("METROPLAT_CLAUDE_SESSION_ROOT", env));
  const codexSessionRoot = flagValue(args, "--codex-session-root") ?? nonempty(processEnvValue("METROPLAT_CODEX_SESSION_ROOT", env));
  const instance = flagValue(args, "--instance") ?? nonempty(processEnvValue("METROPLAT_INSTANCE", env));
  const fern = flagValue(args, "--fern") ?? nonempty(processEnvValue("METROPLAT_FERN", env));
  const operationsRoot = flagValue(args, "--operations-root") ?? nonempty(processEnvValue("METROPLAT_OPERATIONS_ROOT", env));
  const firmPoolRoot = flagValue(args, "--firm-pool-root") ?? nonempty(processEnvValue("METROPLAT_FIRM_POOL_ROOT", env));
  const providerDelegationAuthorityAnchor = flagValue(args, "--provider-delegation-authority-anchor") ?? nonempty(processEnvValue("METROPLAT_PROVIDER_DELEGATION_AUTHORITY_ANCHOR", env));
  if ((fern === undefined) !== (operationsRoot === undefined)) {
    throw new TypeError("metroplat: --fern and --operations-root must be supplied together");
  }
  if (firmPoolRoot !== undefined && !isAbsolute(firmPoolRoot)) {
    throw new TypeError("metroplat: --firm-pool-root must be an absolute local path");
  }
  if (providerDelegationAuthorityAnchor !== undefined && !isAbsolute(providerDelegationAuthorityAnchor)) {
    throw new TypeError("metroplat: --provider-delegation-authority-anchor must be an absolute local path");
  }
  const requestedCapabilityVerbs = capabilityVerbs(
    flagValue(args, "--capabilities") ?? nonempty(processEnvValue("METROPLAT_MCP_CAPABILITIES", env)),
  );
  return Object.freeze({
    subject,
    requestedCapabilityVerbs,
    ...(claudeSessionRoot === undefined ? {} : { claudeSessionRoot: resolve(cwd, claudeSessionRoot) }),
    ...(codexSessionRoot === undefined ? {} : { codexSessionRoot: resolve(cwd, codexSessionRoot) }),
    ...(instance === undefined ? {} : { instance: resolve(cwd, instance) }),
    ...(fern === undefined ? {} : { fern: resolve(cwd, fern) }),
    ...(operationsRoot === undefined ? {} : { operationsRoot: resolve(cwd, operationsRoot) }),
    ...(firmPoolRoot === undefined ? {} : { firmPoolRoot }),
    ...(providerDelegationAuthorityAnchor === undefined ? {} : { providerDelegationAuthorityAnchor }),
  });
}

/** The MetroPlat process-boundary flags a domain dispatcher never sees. */
export const INFOGRAPH_PROCESS_OPTION_FLAGS = Object.freeze([
  "--subject",
  "--capabilities",
  "--claude-session-root",
  "--codex-session-root",
  "--instance",
  "--fern",
  "--operations-root",
  "--firm-pool-root",
  "--provider-delegation-authority-anchor",
]);

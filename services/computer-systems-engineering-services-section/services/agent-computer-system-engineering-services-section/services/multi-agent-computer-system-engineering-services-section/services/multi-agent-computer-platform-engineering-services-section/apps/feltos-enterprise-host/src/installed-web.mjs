import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WORK_PEER_PRESENCES } from "./instance-config.mjs";

const SPECIFIER = /^@[^/]+\/[^/]+(?:\/[A-Za-z0-9._-]+)*$/u;
const EXPORT = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

/** The FeltOS host admits network and companion declarations; MetroPlat admits only ERP operations and applications. */
export async function installedEnterpriseWeb(hostPath) {
  const host = JSON.parse(await readFile(hostPath, "utf8"));
  if (host.version !== 1 || host.hostKind !== "feltos.enterprise-host") {
    throw new TypeError("FeltOS enterprise host declaration must identify version 1 and hostKind");
  }
  const unsupportedHost = Object.keys(host).filter((key) => !["version", "hostKind", "instance", "web", "harness"].includes(key));
  // `harness` is this host's policy for the agent harnesses it projects (claude-harness-project):
  // `deny`, the commands its sessions may never run, replacing the projection's default.
  if (host.harness !== undefined && (host.harness === null || typeof host.harness !== "object" || Array.isArray(host.harness)
    || Object.keys(host.harness).some((key) => !["deny", "because"].includes(key))
    || (host.harness.deny !== undefined && (!Array.isArray(host.harness.deny) || host.harness.deny.some((entry) => typeof entry !== "string"))))) {
    throw new TypeError("FeltOS enterprise host harness declares only deny (an array of permission rules) and because");
  }
  if (unsupportedHost.length > 0) throw new TypeError(`FeltOS enterprise host declaration has unsupported fields: ${unsupportedHost.join(", ")}`);
  if (typeof host.instance !== "string" || !host.instance || isAbsolute(host.instance)) {
    throw new TypeError("FeltOS enterprise host must point to a relative MetroPlat instance declaration");
  }
  const instancePath = resolve(dirname(hostPath), host.instance);
  const require = createRequire(hostPath);
  if (host.web === null || typeof host.web !== "object" || Array.isArray(host.web)) {
    throw new TypeError("FeltOS enterprise host web declaration must be an object");
  }
  const web = host.web;
  const unsupportedWeb = Object.keys(web).filter((key) => !["instructions", "cookiePrefix", "defaultPaths", "environmentAliases", "networkSources", "companions", "workPeerActor", "workPeers", "workPeerHealth", "peeringOffice", "workPeerPresence", "workPeerSuspicionSeconds", "deliverWorkToPeer", "presence", "peerPresences"].includes(key));
  if (unsupportedWeb.length > 0) throw new TypeError(`Enterprise host web declaration has unsupported fields: ${unsupportedWeb.join(", ")}`);
  // A health contract describes an already participating peer; it never admits a work peer or grant.
  // Validate before resolving network factories, so an invalid declaration cannot start their work.
  if (web.workPeerHealth !== undefined && !Array.isArray(web.workPeerHealth)) {
    throw new TypeError("Enterprise host web workPeerHealth must be an array");
  }
  const healthActors = new Set();
  for (const contract of web.workPeerHealth ?? []) {
    if (contract === null || typeof contract !== "object" || Array.isArray(contract)
      || Object.keys(contract).some((key) => !["actor", "kind", "service"].includes(key))
      || contract.kind !== "metroplat-supervised-health"
      || typeof contract.service !== "string" || contract.service.trim() === "") {
      throw new TypeError("Enterprise host web workPeerHealth entries declare only actor, kind metroplat-supervised-health, and a nonempty service");
    }
    let actor;
    try { actor = typeof contract.actor === "string" ? new URL(contract.actor) : undefined; } catch {}
    if (actor?.protocol !== "https:" || actor.username || actor.password || actor.search || actor.hash
      || !/^\/actors\/[a-z0-9][a-z0-9._-]*$/u.test(actor.pathname) || actor.href !== contract.actor) {
      throw new TypeError("Enterprise host web workPeerHealth actor must be a canonical HTTPS instance actor without credentials, query, or fragment");
    }
    if (healthActors.has(actor.href)) throw new TypeError("Enterprise host web workPeerHealth must name unique actors");
    healthActors.add(actor.href);
  }
  if (web.workPeerPresence !== undefined && !WORK_PEER_PRESENCES.includes(web.workPeerPresence)) {
    throw new TypeError(`Enterprise host web workPeerPresence must be one of ${WORK_PEER_PRESENCES.join(", ")}`);
  }
  if (web.presence !== undefined && !WORK_PEER_PRESENCES.includes(web.presence)) {
    throw new TypeError(`Enterprise host web presence must be one of ${WORK_PEER_PRESENCES.join(", ")}`);
  }
  if (web.deliverWorkToPeer !== undefined && typeof web.deliverWorkToPeer !== "boolean") {
    throw new TypeError("Enterprise host web deliverWorkToPeer must be a boolean");
  }
  if (web.defaultPaths !== undefined && (web.defaultPaths === null || typeof web.defaultPaths !== "object" || Array.isArray(web.defaultPaths)
    || Object.keys(web.defaultPaths).some((key) => !["dataRoot", "agencyRoot", "ledgerJournal"].includes(key)))) {
    throw new TypeError("Enterprise host web defaultPaths must name dataRoot, agencyRoot, or ledgerJournal");
  }
  if (web.environmentAliases !== undefined && (web.environmentAliases === null || typeof web.environmentAliases !== "object"
    || Array.isArray(web.environmentAliases) || Object.entries(web.environmentAliases).some(([name, alias]) =>
      !/^METROPLAT_[A-Z0-9_]+$/u.test(name) || !/^[A-Z][A-Z0-9_]*$/u.test(alias)))) {
    throw new TypeError("Enterprise host web environmentAliases must map METROPLAT names to environment variable names");
  }
  const installWebExports = async (entries, kind) => {
    if (entries !== undefined && !Array.isArray(entries)) throw new TypeError(`Enterprise host ${kind} must be an array`);
    const seen = new Set();
    const installed = [];
    for (const entry of entries ?? []) {
      if (typeof entry?.module !== "string" || !SPECIFIER.test(entry.module)
        || typeof entry.export !== "string" || !EXPORT.test(entry.export)
        || seen.has(`${entry.module}#${entry.export}`)) {
        throw new TypeError(`Enterprise host ${kind} must name unique installed package exports`);
      }
      seen.add(`${entry.module}#${entry.export}`);
      const imported = await import(pathToFileURL(require.resolve(entry.module)).href);
      const factory = imported[entry.export];
      if (typeof factory !== "function") throw new TypeError(`${entry.module} does not export ${entry.export}`);
      installed.push(Object.freeze({ ...entry, factory }));
    }
    return Object.freeze(installed);
  };
  const networkSources = await installWebExports(web.networkSources, "web network sources");
  const companions = await installWebExports(web.companions, "web companions");
  return Object.freeze({ ...web, hostPath, instancePath, networkSources, companions });
}

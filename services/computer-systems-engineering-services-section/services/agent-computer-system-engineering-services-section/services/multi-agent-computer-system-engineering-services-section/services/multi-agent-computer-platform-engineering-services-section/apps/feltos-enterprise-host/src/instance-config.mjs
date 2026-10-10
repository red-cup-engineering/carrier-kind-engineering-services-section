import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

/**
 * How present a work peer is. A continuous peer answers whenever it is asked, so a delivery it does
 * not take has failed. A known-intermittent peer (a colony in an ephemeral cloud environment, say) is
 * away as a matter of course, so a delivery that could not reach it is held, not failed.
 */
export const WORK_PEER_PRESENCES = Object.freeze(["continuous", "known-intermittent"]);

const present = (value) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const required = (value, name) => {
  const result = present(value);
  if (result === undefined) throw new TypeError(`${name} is required`);
  return result;
};

export function repositoryRoot(from) {
  for (let directory = resolve(from); directory !== dirname(directory); directory = dirname(directory)) {
    if (existsSync(join(directory, "pnpm-workspace.yaml"))) return directory;
  }
  throw new Error("no pnpm-workspace.yaml above the MetroPlat instance");
}

export function publicOrigin(value, { requireTls = true } = {}) {
  const url = new URL(required(value, "PUBLIC_BASE_URL"));
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new TypeError("PUBLIC_BASE_URL must be one origin without credentials, path, query, or fragment");
  }
  if (requireTls && url.protocol !== "https:") throw new TypeError("PUBLIC_BASE_URL must use https");
  return url.origin;
}

/**
 * Google sign-in is all-or-none, as ActivityPub is. A node with no Google client still admits its
 * password, Hive and machine principals: a colony whose origin no Google client has registered
 * (one that lives in an ephemeral cloud environment, say) is not thereby unable to start.
 */
function googleSignIn(environment) {
  const clientId = present(environment.GOOGLE_CLIENT_ID);
  const clientSecret = present(environment.GOOGLE_CLIENT_SECRET);
  if (clientId === undefined && clientSecret === undefined) return undefined;
  const missing = [["GOOGLE_CLIENT_ID", clientId], ["GOOGLE_CLIENT_SECRET", clientSecret]]
    .filter(([, value]) => value === undefined).map(([name]) => name);
  if (missing.length) throw new TypeError(`Google sign-in configuration is all-or-none; missing ${missing.join(", ")}`);
  return Object.freeze({ clientId, clientSecret });
}

const AP_KEYS = ["ACTIVITYPUB_ORIGIN", "ACTIVITYPUB_IDENTIFIER", "ACTIVITYPUB_ACTOR_NAME", "ACTIVITYPUB_ACTOR_SUMMARY", "ACTIVITYPUB_KEYS_PATH"];
function activityPub(environment, stateDir, identity) {
  if (!Object.keys(environment).some((name) => name.startsWith("ACTIVITYPUB_"))) return undefined;
  const nodeHost = present(environment.ACTIVITYPUB_NODE_HOST);
  if (nodeHost !== undefined) {
    return Object.freeze({
      origin: required(environment.ACTIVITYPUB_ORIGIN, "ACTIVITYPUB_ORIGIN"),
      nodeHost,
      ...(present(environment.ACTIVITYPUB_INSTANCE_ACTOR_IDENTIFIER) === undefined ? {} : {
        instanceActor: Object.freeze({
          identifier: present(environment.ACTIVITYPUB_INSTANCE_ACTOR_IDENTIFIER),
          actorName: identity.title,
          summary: identity.title,
        }),
      }),
      keysDirectory: resolve(present(environment.ACTIVITYPUB_KEYS_DIRECTORY) ?? join(stateDir, "activitypub-keys")),
      statePath: resolve(present(environment.ACTIVITYPUB_SQLITE_PATH) ?? join(stateDir, "activitypub.sqlite")),
    });
  }
  const missing = AP_KEYS.filter((name) => present(environment[name]) === undefined);
  if (missing.length) throw new TypeError(`ActivityPub configuration is all-or-none; missing ${missing.join(", ")}`);
  return Object.freeze({
    origin: present(environment.ACTIVITYPUB_ORIGIN),
    identifier: present(environment.ACTIVITYPUB_IDENTIFIER),
    actorName: present(environment.ACTIVITYPUB_ACTOR_NAME),
    summary: present(environment.ACTIVITYPUB_ACTOR_SUMMARY),
    keyPath: resolve(environment.ACTIVITYPUB_KEYS_PATH),
    statePath: resolve(present(environment.ACTIVITYPUB_SQLITE_PATH) ?? join(stateDir, "activitypub.sqlite")),
  });
}

// The separate listener is a deployment boundary, not another AP provider or instance.
function activityPubProjection(environment, host, port, activityPubConfig, origin) {
  const value = present(environment.ACTIVITYPUB_PROJECTION_PORT);
  if (value === undefined) return undefined;
  if (!/^[0-9]+$/u.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 65_535) {
    throw new TypeError("ACTIVITYPUB_PROJECTION_PORT must be an integer from 1 to 65535");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError("PORT must be an integer from 1 to 65535 when an ActivityPub projection is configured");
  }
  if (Number(value) === port) throw new TypeError("ACTIVITYPUB_PROJECTION_PORT must differ from PORT");
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new TypeError("HOST must be numeric loopback when an ActivityPub projection is configured");
  }
  if (activityPubConfig === undefined || publicOrigin(activityPubConfig.origin) !== origin) {
    throw new TypeError("An ActivityPub projection requires ACTIVITYPUB_ORIGIN to match PUBLIC_BASE_URL using HTTPS");
  }
  return Object.freeze({ host: "127.0.0.1", port: Number(value) });
}

function defaultPath(repository, value, name) {
  if (typeof value !== "string" || !value || isAbsolute(value) || value.split(/[\\/]/u).includes("..")) {
    throw new TypeError(`MetroPlat web ${name} must be a repository-relative path`);
  }
  return resolve(repository, value);
}

const WORK_MOVES = Object.freeze(["opening", "telling", "decision", "forward", "refusal"]);

/**
 * The peers this node is configured with, as the grants its peering office admits to each: an
 * instance actor and the work moves the pair agrees (all of them unless named). These are admitted
 * into the node's capability-assertions feed at start and authority is read from there; nothing
 * here is compared with a sender. The single `METROPLAT_WORK_PEER_ACTOR` (deployed under the alias
 * `GROUP_PEER_ACTOR`) is read only as such a declaration, so a node migrating from it admits its
 * peer's grants; once they are admitted the setting can be removed from the environment.
 */
function workPeersDeclared(web, legacyActor, origin, activityPubConfig) {
  if (web.workPeers !== undefined && !Array.isArray(web.workPeers)) throw new TypeError("Enterprise host web workPeers must be an array");
  const declared = [...(web.workPeers ?? []), ...[legacyActor ?? web.workPeerActor].filter((actor) => actor !== undefined).map((actor) => ({ actor }))];
  if (web.peeringOffice !== undefined && (typeof web.peeringOffice !== "string" || web.peeringOffice.trim() === "")) {
    throw new TypeError("Enterprise host web peeringOffice must name the office that holds peering authority");
  }
  const peers = new Map();
  for (const entry of declared) {
    const peer = new URL(typeof entry?.actor === "string" ? entry.actor : "invalid:");
    if (peer.protocol !== "https:" || peer.username || peer.password || peer.search || peer.hash
      || !/^\/actors\/[a-z0-9][a-z0-9._-]*$/u.test(peer.pathname) || peer.origin === origin
      || activityPubConfig?.instanceActor?.identifier === undefined) {
      throw new TypeError("a work peer requires a different HTTPS instance actor and a local instance actor");
    }
    const moves = entry.moves ?? WORK_MOVES;
    if (!Array.isArray(moves) || moves.length === 0 || moves.some((move) => !WORK_MOVES.includes(move))) {
      throw new TypeError(`work peer ${peer.href} moves must name some of ${WORK_MOVES.join(", ")}`);
    }
    peers.set(peer.href, [...new Set([...(peers.get(peer.href) ?? []), ...moves])]);
  }
  return Object.freeze([...peers].map(([actor, moves]) => Object.freeze({ actor, moves: Object.freeze(moves) })));
}

/** The process consumes deployment settings and admitted instance data. No organization path or tool is built in. */
export function enterpriseWebConfig(installed, instancePath, environment = process.env, { requireTls = true } = {}) {
  const setting = (name) => present(environment[name] ?? environment[installed.web.environmentAliases?.[name]]);
  // A release is a commit. What the node is declared to be (its agency, the derivations it opens
  // work from) comes from the tree it was installed from; the working tree is where its tools work
  // and where its data root still keeps settled state.
  const released = repositoryRoot(dirname(instancePath));
  const repository = resolve(setting("METROPLAT_REPOSITORY_ROOT") ?? released);
  const origin = publicOrigin(environment.PUBLIC_BASE_URL ?? installed.identity.origin, { requireTls });
  if (installed.identity.origin && origin !== new URL(installed.identity.origin).origin) {
    throw new TypeError("MetroPlat instance origin differs from PUBLIC_BASE_URL");
  }
  const stateDir = resolve(required(setting("METROPLAT_WEB_STATE_DIR"), "METROPLAT_WEB_STATE_DIR"));
  const google = googleSignIn(environment);
  const defaults = installed.web.defaultPaths ?? {};
  const pathSetting = (key, fallback, base = repository) => {
    const value = setting(key);
    return value === undefined ? (fallback === undefined ? undefined : defaultPath(base, fallback, key)) : resolve(value);
  };
  const dataRoot = pathSetting("METROPLAT_DATA_ROOT", defaults.dataRoot);
  if (dataRoot === undefined) throw new TypeError("METROPLAT_DATA_ROOT or instance web.defaultPaths.dataRoot is required");
  const agencyRoot = pathSetting("METROPLAT_AGENCY_ROOT", defaults.agencyRoot, released);
  // Governing acts on that agency are settled state of this node, never edits to a tree.
  const agencyActs = resolve(setting("AGENCY_ACTS_LOG") ?? join(stateDir, "agency", "acts.jsonl"));
  const ledgerJournal = pathSetting("METROPLAT_LEDGER_JOURNAL", defaults.ledgerJournal);
  let upstreams = [];
  const upstreamJson = present(setting("METROPLAT_MCP_UPSTREAMS"));
  if (upstreamJson !== undefined) {
    upstreams = JSON.parse(upstreamJson);
    if (!Array.isArray(upstreams)) throw new TypeError("METROPLAT_MCP_UPSTREAMS must be a JSON array");
  }
  const activityPubConfig = activityPub(environment, stateDir, installed.identity);
  const host = present(environment.HOST) ?? "127.0.0.1";
  const port = Number(present(environment.PORT) ?? "18807");
  const projection = activityPubProjection(environment, host, port, activityPubConfig, origin);
  const workPeers = workPeersDeclared(installed.web, setting("METROPLAT_WORK_PEER_ACTOR"), origin, activityPubConfig);
  const workPeerPresence = setting("METROPLAT_WORK_PEER_PRESENCE") ?? installed.web.workPeerPresence ?? "continuous";
  if (!WORK_PEER_PRESENCES.includes(workPeerPresence)) {
    throw new TypeError(`METROPLAT_WORK_PEER_PRESENCE must be one of ${WORK_PEER_PRESENCES.join(", ")}`);
  }
  const suspicionSetting = setting("METROPLAT_WORK_PEER_SUSPICION_SECONDS") ?? installed.web.workPeerSuspicionSeconds;
  const workPeerSuspicionSeconds = suspicionSetting === undefined ? undefined : Number(suspicionSetting);
  if (workPeerSuspicionSeconds !== undefined && !(Number.isInteger(workPeerSuspicionSeconds) && workPeerSuspicionSeconds > 0)) {
    throw new TypeError("METROPLAT_WORK_PEER_SUSPICION_SECONDS must be a positive whole number of seconds");
  }
  return Object.freeze({
    instance: Object.freeze({
      name: installed.identity.id,
      title: installed.identity.title,
      instructions: setting("METROPLAT_MCP_INSTRUCTIONS") ?? installed.web.instructions ?? installed.identity.title,
      manifest: resolve(instancePath),
    }),
    host,
    port,
    publicBaseUrl: origin,
    stateDir,
    sessionSecret: required(environment.SESSION_SECRET, "SESSION_SECRET"),
    allowedEmail: setting("METROPLAT_ALLOWED_EMAIL")?.toLowerCase(),
    google,
    dataDir: present(setting("METROPLAT_WEB_DATA_DIR")) === undefined ? undefined : resolve(setting("METROPLAT_WEB_DATA_DIR")),
    metroplatSubject: present(setting("METROPLAT_MCP_SUBJECT")) ?? installed.identity.id,
    metroplatCapabilities: installed.capabilities ?? Object.freeze([]),
    metroplatDataRoot: dataRoot,
    agencyRoot,
    ledgerJournal,
    repositoryRoot: repository,
    releaseRoot: released,
    agencyActs,
    upstreams: Object.freeze(upstreams),
    activityPub: activityPubConfig,
    activityPubProjection: projection,
    workPeers,
    workPeerHealth: installed.web.workPeerHealth,
    peeringOffice: installed.web.peeringOffice ?? installed.identity.id,
    ...(workPeers.length === 0 ? {} : { workPeerPresence, ...(workPeerSuspicionSeconds === undefined ? {} : { workPeerSuspicionSeconds }) }),
    deliverWorkToPeer: installed.web.deliverWorkToPeer !== false,
  });
}

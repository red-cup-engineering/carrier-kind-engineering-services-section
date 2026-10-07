import { hostedWorkIntentAdmission, hostedWorkOpening } from "./federated-work.mjs";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { activityPubApplication } from "@red-cup-engineering/activitypub-services-section/app";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { extractSenActivity, SEN_MEDIA_TYPE } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { createCapabilityPlatform } from "@red-cup-engineering/computer-system-platform/capability-lifecycle";
import { startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { inheritedListenFd, installGracefulShutdown } from "@red-cup-engineering/http-services-section/node-server";
import { federateMcpServers } from "@red-cup-engineering/mcp-engineering-services-section/federation";
import { createMcpClient, mcpInProcessTransport } from "@red-cup-engineering/mcp-engineering-services-section/client";
import { appendArrivalAtRoot } from "@red-cup-engineering/computer-system-engine/rpc/arrival-store";
import { reconcileDeclaredSchedules, runClockHeartbeat } from "@red-cup-engineering/organizing/work/recurring";
import { parseEnvFileText } from "@red-cup-engineering/key-management-services-section/env-file";
import { openMetroplatMcp } from "@red-cup-engineering/metroplat/mcp-host";
import { installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";
import { systemNodeFromProcessEnvironment, systemNodeKeyFromProcessEnvironment, systemNodeResource, systemSettlementFeedGrants, systemSettlementPeering, settlementExchangeResponse } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { mergeSettlementTransfer, settlementHoldings } from "@red-cup-engineering/computer-system-engine/journal/exchange";
import { createEnterpriseEntrance } from "./entrance.mjs";
import { activityPubActorsAtHost, createActivityPubNodeArrivalHandler } from "./activitypub-node.mjs";
import { enterpriseWebConfig } from "./instance-config.mjs";
import { installedEnterpriseWeb } from "./installed-web.mjs";
import { enterpriseOperationRuntime } from "./enterprise-runtime.mjs";
import { EnterpriseExecutionWorker } from "./enterprise-execution.mjs";
import { linkLiveModules } from "./probe-link.mjs";

function admitArrival(arrival, { dataRoot, origin, identifier, instanceId }) {
  if (arrival.jsonLd?.object?.mediaType !== SEN_MEDIA_TYPE) return undefined;
  const recipient = new URL(`/actors/${encodeURIComponent(identifier)}`, origin).href;
  const projection = extractSenActivity(arrival.jsonLd, { expectedActor: arrival.jsonLd.actor, expectedRecipient: recipient });
  return appendArrivalAtRoot(dataRoot, projection.cloudEvent, { rootName: instanceId });
}

export function metroplatEnvironment(config) {
  return {
    METROPLAT_DATA_ROOT: config.metroplatDataRoot,
    METROPLAT_REPOSITORY_ROOT: config.repositoryRoot,
    CODE_KNOWLEDGE_REPOSITORY_ROOT: config.repositoryRoot,
    METROPLAT_INSTANCE: config.instance.manifest,
    METROPLAT_AGENCY_ROOT: config.agencyRoot,
    AGENCY_ACTS_LOG: config.agencyActs,
    METROPLAT_LEDGER_JOURNAL: config.ledgerJournal,
    METROPLAT_MCP_SUBJECT: config.metroplatSubject,
    METROPLAT_MCP_CAPABILITIES: config.metroplatCapabilities.join(","),
    METROPLAT_MCP_GATEWAY_SUBJECTS: "1",
  };
}

/**
 * Whether this process boots a release candidate as its probe (METROPLAT_PROBE=1): the release tool
 * starts the candidate tree with scratch state on a side port and asks it whether it is ready
 * before anything is promoted. A probe runs no clock (no schedules, jobs or heartbeat), sends
 * nothing outward (no ActivityPub delivery, no remote upstreams, no companions on shared ports),
 * listens on METROPLAT_PROBE_LISTEN instead of the inherited socket, and realizes every operation
 * family before it reports, so /healthz says which loaded and which failed.
 */
export function probeOf(environment) {
  if (environment.METROPLAT_PROBE?.trim() !== "1") return undefined;
  const listen = environment.METROPLAT_PROBE_LISTEN?.trim() ?? "";
  const match = /^(?<host>[^:\s]+):(?<port>\d{1,5})$/u.exec(listen);
  if (match === null) throw new TypeError("METROPLAT_PROBE=1 needs METROPLAT_PROBE_LISTEN as host:port");
  return Object.freeze({ host: match.groups.host, port: Number(match.groups.port) });
}

/** Load every operation family the surface declares and report the exact admitted verb set. */
export async function realizedFamilies(surface) {
  const failed = [];
  let realized = 0;
  const verbs = [];
  const seen = new Set();
  for (const operation of surface?.operations ?? []) {
    if (typeof operation?.verb === "string" && operation.verb.length > 0 && !seen.has(operation.verb)) {
      seen.add(operation.verb);
      verbs.push(operation.verb);
    }
    if (typeof operation?.realize !== "function") continue;
    try { await operation.realize(); realized += 1; }
    catch (error) { failed.push(Object.freeze({ verb: operation.verb, error: error instanceof Error ? error.message : String(error) })); }
  }
  return Object.freeze({
    realized,
    verbs: Object.freeze(verbs),
    failed: Object.freeze(failed),
  });
}

function clockConfiguration(environment, declaredClock) {
  const subject = environment.FELTOS_CLOCK_SUBJECT?.trim();
  const interval = environment.FELTOS_CLOCK_INTERVAL_MS?.trim();
  if (!subject && !interval) return declaredClock;
  if (!subject || !interval) throw new TypeError("FELTOS_CLOCK_SUBJECT and FELTOS_CLOCK_INTERVAL_MS must be configured together");
  const intervalMs = Number(interval);
  if (!Number.isInteger(intervalMs) || intervalMs < 1) throw new RangeError("FELTOS_CLOCK_INTERVAL_MS must be a positive integer");
  return Object.freeze({ subject, intervalMs });
}

async function startCompanion(companion, environment) {
  const file = environment[companion.environmentFileKey]?.trim();
  if (!file) return Object.freeze({ skipped: true, close: async () => undefined });
  const settings = parseEnvFileText(readFileSync(file, "utf8"));
  const app = await companion.factory(settings);
  const service = await startNativeApplication(app, {
    host: settings.HOST ?? "127.0.0.1",
    port: Number(settings.PORT ?? companion.port),
  });
  process.stderr.write(`[feltos-enterprise-host] companion ${companion.module} on ${settings.HOST ?? "127.0.0.1"}:${service.port}\n`);
  return service;
}

function swappableEntrance(initial, health) {
  let current = initial;
  const resources = [health, ...(initial.resources ?? []).filter((resource) => resource.match !== "/healthz")];
  const middlewares = [...(initial.middlewares ?? [])];
  const upgrades = [...(initial.upgrades ?? [])];
  const application = {
    ...initial,
    resources,
    middlewares,
    upgrades,
    onRequest: (context) => current.onRequest?.(context),
    onResponse: (context) => current.onResponse?.(context),
    onError: (error, context) => current.onError?.(error, context),
  };
  const install = (next) => {
    current = next;
    resources.splice(0, resources.length, health, ...(next.resources ?? []).filter((resource) => resource.match !== "/healthz"));
    middlewares.splice(0, middlewares.length, ...(next.middlewares ?? []));
    upgrades.splice(0, upgrades.length, ...(next.upgrades ?? []));
  };
  return Object.freeze({ app: application, install, reset: () => install(initial) });
}

function baseUpstreams(metroplat, config) {
  const client = createMcpClient({
    transport: mcpInProcessTransport(metroplat.handle),
    clientInfo: { name: config.instance.name, version: "1.0.0" },
  });
  return [{
    prefix: "metroplat",
    description: `MetroPlat: ${config.instance.title}. Enter as your character with world-connect, then speak commands with world-command: your first turn tells what awaits your move and journal lists it, quests lists the work where you stand (quests unclaimed, the work no one is seated for), quest <handle> reads one, any arena move is a verb on a handle (accept <handle>, promise <handle>, decline <handle> <reason>), post <request|aim|report|...> <words> opens a thread about where you stand, and every turn ends with what was said around you.`,
    client,
    principalMeta: "metroplat/subject",
    sessionMeta: "metroplat/session",
    only: ["world-connect", "world-command", "harness-hook-event-admit", "operations"],
  }];
}

async function activityPubProvider(config, environment) {
  if (config.activityPub === undefined) return undefined;
  if (config.activityPub.nodeHost === undefined) {
    return createLocalActivityPubProvider({
      environment,
      ...config.activityPub,
      onActivity: (arrival) => admitArrival(arrival, {
        dataRoot: config.metroplatDataRoot,
        origin: config.activityPub.origin,
        identifier: config.activityPub.identifier,
        instanceId: config.instance.name,
      }),
    });
  }
  const actors = activityPubActorsAtHost({
    agencyRoot: config.agencyRoot,
    host: config.activityPub.nodeHost,
    keysDirectory: config.activityPub.keysDirectory,
    instanceActor: config.activityPub.instanceActor,
  });
  let activityPub;
  const onActivity = createActivityPubNodeArrivalHandler({
    dataRoot: config.metroplatDataRoot,
    rootName: config.instance.name,
    origin: config.activityPub.origin,
    actors,
    workPeerActor: config.workPeerActor,
    agencyRoot: config.agencyRoot,
    host: config.activityPub.nodeHost ?? config.instance.name,
  });
  activityPub = await createLocalActivityPubProvider({ environment, ...config.activityPub, actors, onActivity });
  return activityPub;
}

// Stop ingress before provider storage/queues. Always release the federation even if
// another close fails; callers and the platform own this one composite lifetime.
async function closeFederation({ activityPubProjection, activityPub, federation, queueAbort, queueWorker }) {
  const failures = [];
  for (const close of [
    () => activityPubProjection?.close(),
    async () => { queueAbort?.abort(); await queueWorker; },
    () => activityPub?.close(),
    () => federation.close(),
  ]) {
    try { await close(); }
    catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, "enterprise federation release failed");
}

/** Compose one already-admitted instance as a supervised capability platform. */
const FEDERATION_HEALTH_MS = 2_000;

export function createEnterpriseServicePlatform({
  installed,
  config,
  environment,
  rootRoutes = [],
  services = {},
} = {}) {
  const openHost = services.openMetroplatMcp ?? openMetroplatMcp;
  const federate = services.federateMcpServers ?? federateMcpServers;
  const entranceFactory = services.createEnterpriseEntrance ?? createEnterpriseEntrance;
  const startApplication = services.startNativeApplication ?? startNativeApplication;
  const companionFactory = services.startCompanion ?? startCompanion;
  const createActivityPub = services.activityPubProvider ?? activityPubProvider;
  let platform;
  let runtime;
  const executionWorker = new EnterpriseExecutionWorker({ hostPath: installed.web.hostPath, environment,
    openWork: (opening) => runtime.openWork(opening) });
  runtime = enterpriseOperationRuntime({
    installed, config, environment,
    activityPubProvider: () => platform.capabilities().federation?.activityPub?.provider,
    executeIsolatedWork: (request) => executionWorker.execute(request),
  });
  const schedules = runtime.schedules;
  const probe = probeOf(environment);
  let families;
  // A probe never runs the execution worker or the carriers, so it links them: the worker's own
  // module graph, and every carrier entry point (probe-link.mjs). A failure is a failed family.
  const probeLinks = services.probeLinks ?? (async () => {
    const carriers = await linkLiveModules();
    const failed = [...carriers.failed];
    try { await executionWorker.link(); }
    catch (error) { failed.push(Object.freeze({ verb: "link:enterprise-execution-worker", error: error instanceof Error ? error.message : String(error) })); }
    return Object.freeze({ linked: carriers.linked, failed: Object.freeze(failed) });
  });
  // Declared work implies a running clock. Its account is the already-admitted
  // instance identity; explicit deployment overrides still require both fields.
  // A probe runs none of it: the live node it stands beside owns the clock.
  const configuredClock = probe !== undefined ? undefined : clockConfiguration(environment, schedules.length === 0 ? undefined
    : Object.freeze({ subject: installed.identity.id, intervalMs: 30_000 }));
  const clockStateRoot = path.join(config.stateDir, "clock");
  let entrance;
  let bootstrapFederation;

  const health = {
    id: "metroplat.supervised-health",
    match: "/healthz",
    methods: ["GET"],
    produces: ["application/json"],
    handler: async () => {
      const report = platform.status();
      const federation = platform.capabilities().federation?.federation;
      let availability;
      // A node's health is its own: a peer it federates with (a laptop booting, say) is reported, never
      // waited on. Unbounded, this wait hung /healthz for five minutes and rolled back a Cold Red Gate
      // release (2026-10-05).
      if (typeof federation?.availability === "function") {
        let timer;
        try {
          availability = await Promise.race([federation.availability(), new Promise((resolve) => {
            timer = setTimeout(() => resolve({ error: `federated peers did not answer within ${FEDERATION_HEALTH_MS} ms` }), FEDERATION_HEALTH_MS);
          })]);
        }
        catch (error) { availability = { error: error instanceof Error ? error.message : String(error) }; }
        finally { clearTimeout(timer); }
      }
      // A probe whose families did not all load and link is not ready, whatever the supervisor says.
      const unloaded = probe !== undefined && (families === undefined || families.failed.length > 0);
      const ok = !unloaded && (report.state === "ready" || report.state === "degraded");
      return Response.json({
        ok,
        service: config.instance.name,
        workPeerActor: config.workPeerActor ?? null,
        release: environment.GUIX_MACHINE_RELEASE_ID ?? null,
        artifact: environment.GUIX_MACHINE_ARTIFACT ?? null,
        deployment: (() => {
          if (!environment.GUIX_MACHINE_DEPLOYMENT_STATUS) return null;
          try {
            const value=JSON.parse(readFileSync(environment.GUIX_MACHINE_DEPLOYMENT_STATUS,'utf8'));
            return Object.fromEntries(['outcome','machine','revision','repository','run','stage','at','reason','storePath','previous','retained'].filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
          } catch {return null}
        })(),
        sources: (() => {
          if (!environment.GUIX_MACHINE_ARTIFACT) return null;
          try {
            const metadata=JSON.parse(readFileSync(path.join(environment.GUIX_MACHINE_ARTIFACT,'.metadata','sources.json'),'utf8'));
            return metadata.repositories.map(({repository,commit})=>({repository,commit,url:`https://github.com/${repository}/commit/${commit}`}));
          } catch { return null; }
        })(),
        state: unloaded ? "unready" : report.state,
        phases: report.providers,
        ...(probe === undefined ? {} : { probe: true, families }),
        ...(availability === undefined ? {} : { federation: availability }),
      }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
    },
  };

  const providers = [{
    name: "metroplat-host",
    // Opening MetroPlat reads the whole instance and induces its surface: 10-25 s on a loaded laptop,
    // 70 s seen. The deadline only catches a hung start; at the 10 s default it failed every start
    // under load, and each restart paid the same cost again (some 80 restarts on 2026-09-30).
    startMs: 180_000,
    start: async () => {
      if (probe === undefined) reconcileDeclaredSchedules(runtime.binding, installed.identity.id, schedules);
      const host = await openHost({
        dataRoot: config.metroplatDataRoot, clockStateRoot, environment,
        instancePath: config.instance.manifest, moduleBasePath: installed.web.hostPath,
        operationSources: runtime.operationSources,
        createWorkOptions: runtime.createWorkOptions,
      });
      if (probe !== undefined) {
        // METROPLAT_PROBE_REALIZE=0 boots the surface only, as the live node does: families load on first call.
        const surface = await host.operationSurface();
        const realized = environment.METROPLAT_PROBE_REALIZE?.trim() === "0" ? { realized: 0, failed: [] } : await realizedFamilies(surface);
        const linked = await probeLinks();
        families = Object.freeze({
          realized: realized.realized,
          verbs: realized.verbs,
          linked: linked.linked,
          failed: Object.freeze([...realized.failed, ...linked.failed]),
        });
      }
      return host;
    },
  }, {
    name: "entrance",
    start: async (capabilities) => {
      bootstrapFederation = await federate(baseUpstreams(capabilities["metroplat-host"], config), {
        clientInfo: { name: config.instance.name, version: "1.0.0" },
      });
      const initial = entranceFactory(config, {
        federation: bootstrapFederation,
        sessionCookiePrefix: installed.web.cookiePrefix ?? "metroplat",
        applications: installed.applications,
        rootRoutes,
      });
      entrance = swappableEntrance(initial.app, health);
      return entrance;
    },
    close: () => bootstrapFederation.close(),
  }, {
    name: "http-listener",
    // Under socket activation the unit's .socket holds HOST:PORT across restarts; requests that
    // arrive while this node opens wait in its backlog and are answered once it listens.
    start: (capabilities) => {
      if (probe !== undefined) return startApplication(capabilities.entrance.app, probe);
      const fd = inheritedListenFd(environment);
      return startApplication(capabilities.entrance.app, fd === undefined ? { host: config.host, port: config.port } : { fd });
    },
    close: (running) => running.close(),
  }, ...(probe !== undefined ? [] : installed.web.companions).map((companion, index) => ({
    name: `companion:${companion.module ?? index}`,
    optional: true,
    startMs: companion.startMs,
    stopMs: companion.stopMs,
    retryMs: companion.retryMs,
    retryMaxMs: companion.retryMaxMs,
    start: () => companionFactory(companion, environment),
    close: (service) => service.close(),
  })), {
    name: "federation",
    optional: true,
    start: async (capabilities) => {
      const upstreams = baseUpstreams(capabilities["metroplat-host"], config);
      for (const source of installed.web.networkSources) {
        const supplied = await source.factory({ config, environment, configuration: source.configuration ?? {} });
        if (!Array.isArray(supplied)) throw new TypeError(`${source.module}#${source.export} must supply upstream descriptors`);
        upstreams.push(...supplied);
      }
      const federation = await federate([...upstreams, ...(probe === undefined ? config.upstreams : [])], {
        clientInfo: { name: config.instance.name, version: "1.0.0" },
      });
      for (const { prefix, reason } of federation.unavailable ?? []) {
        process.stderr.write(`[feltos-enterprise-host] ${prefix} unavailable: ${reason}\n`);
      }
      let activityPub;
      let activityPubProjection;
      const queueAbort = new AbortController();
      let queueWorker;
      try {
        activityPub = probe === undefined ? await createActivityPub(config, environment) : undefined;
        if (config.activityPubProjection !== undefined && probe === undefined) {
          // Same provider, finite canonical routes, separate loopback ingress.
          // Binding precedes installation, so a failed bind cannot leave stale
          // provider routes in the full entrance while supervision retries.
          activityPubProjection = await startApplication(
            activityPubApplication(activityPub?.provider), config.activityPubProjection,
          );
        }
        const full = entranceFactory(config, {
          federation,
          activityPubProvider: activityPub?.provider,
          sessionCookiePrefix: installed.web.cookiePrefix ?? "metroplat",
          applications: installed.applications,
          rootRoutes,
        });
        entrance.install(full.app);
        if (activityPub) queueWorker = activityPub.provider.federation.startQueue(undefined, { signal: queueAbort.signal })
          .catch((error) => {
            if (!queueAbort.signal.aborted) process.stderr.write(`[feltos-enterprise-host] ActivityPub queue stopped: ${error?.message ?? error}\n`);
          });
        return Object.freeze({ federation, activityPub, activityPubProjection, queueAbort, queueWorker });
      } catch (error) {
        entrance.reset();
        try { await closeFederation({ activityPubProjection, activityPub, federation }); }
        catch (cleanup) { throw new AggregateError([error, cleanup], "enterprise federation startup failed"); }
        throw error;
      }
    },
    close: async (capability) => {
      entrance.reset();
      await closeFederation(capability);
    },
  }, ...(configuredClock === undefined ? [] : [{
    name: "enterprise-execution-worker",
    optional: true,
    start: () => executionWorker,
    close: () => executionWorker.close(),
  }]), ...(configuredClock === undefined ? [] : [{
    name: "work-clock",
    start: (capabilities) => {
      const abort = new AbortController();
      const run = runClockHeartbeat(() => capabilities["metroplat-host"].operationSurface(), {
        ...configuredClock,
        dataRoot: config.metroplatDataRoot,
        clockStateRoot,
        rootName: installed.identity.id,
        signal: abort.signal,
        onObstruction: (result) => process.stderr.write(`[feltos-enterprise-host] clock tick was not admitted: ${result.stderr.trim()}\n`),
      }).catch((error) => process.stderr.write(`[feltos-enterprise-host] clock stopped: ${error instanceof Error ? error.message : String(error)}\n`));
      return Object.freeze({ close: async () => { abort.abort(); await run; } });
    },
    close: (clock) => clock.close(),
  }])];

  platform = createCapabilityPlatform({ id: `metroplat:${config.instance.name}`, providers });
  return platform;
}

/** One FeltOS host executable interprets its own host declaration and the selected MetroPlat instance. */
export async function serveEnterpriseInstance({ hostPath, environment = process.env, requireTls = true, shutdown = {} } = {}) {
  if (typeof hostPath !== "string" || !hostPath) throw new TypeError("FELTOS_ENTERPRISE_HOST is required");
  const web = await installedEnterpriseWeb(hostPath);
  const instancePath = web.instancePath;
  const metroplat = await installedMetroplatInstance(instancePath, null, {}, hostPath);
  const installed = { ...metroplat, web };
  const config = enterpriseWebConfig(installed, instancePath, environment, { requireTls });
  const node = systemNodeFromProcessEnvironment(environment);
  const nodeKey = systemNodeKeyFromProcessEnvironment(environment);
  if (node !== undefined && node.origin !== config.publicBaseUrl) throw new TypeError("System node origin differs from the instance origin");
  if (node !== undefined && nodeKey === undefined) throw new TypeError("A federating System node requires SYSTEM_NODE_KEY");
  const peering = node === undefined ? undefined : systemSettlementPeering(node, nodeKey);
  const settlementGrants = node === undefined ? undefined : systemSettlementFeedGrants(environment, node);
  const rootRoutes = node === undefined ? [] : [systemNodeResource(node)];
  if (peering !== undefined) for (const pathname of ["/settlement/holdings", "/settlement/transfer"]) {
    rootRoutes.push({
      id: `system${pathname.replaceAll("/", ".")}`,
      match: pathname,
      methods: ["POST"],
      produces: ["application/json"],
      handler: async (ctx) => {
        const answer = await settlementExchangeResponse(ctx.req, {
          verify: peering.verify,
          feedLabelsFor: settlementGrants.labelsFor,
          holdings: (date, feedLabels) => settlementHoldings(config.metroplatDataRoot, date, { feedLabels }),
          merge: (transfer, feedLabels) => mergeSettlementTransfer(config.metroplatDataRoot, transfer, { feedLabels }),
        });
        return Response.json(answer.value, { status: answer.status });
      },
    });
  }
  await mkdir(config.stateDir, { recursive: true, mode: 0o700 });
  const projected = metroplatEnvironment(config);
  Object.assign(environment, Object.fromEntries(Object.entries(projected).filter(([, value]) => value !== undefined)));
  const platform = createEnterpriseServicePlatform({ installed, config, environment, rootRoutes });
  const capabilities = await platform.start();
  const running = capabilities["http-listener"];
  const lifecycle = {
    ...running,
    app: capabilities.entrance.app,
    platform,
    close: () => platform.close(),
  };
  lifecycle.shutdown = installGracefulShutdown(lifecycle, shutdown);
  process.stderr.write(`[feltos-enterprise-host] ${config.instance.name} on ${config.host}:${running.port}; state ${platform.state()}\n`);
  return Object.freeze(lifecycle);
}

import { toWebRequest } from "@red-cup-engineering/http-services-section/web-bridge";

/** Return the finite public route set owned by one ActivityPub provider. */
export function activityPubRouteManifest(providerOrIdentifier) {
  const identifiers = activityPubIdentifiers(providerOrIdentifier);
  const routes = [
    exact("activitypub.webfinger", "/.well-known/webfinger"),
    exact("activitypub.nodeinfo-discovery", "/.well-known/nodeinfo"),
    exact("activitypub.nodeinfo", "/nodeinfo/2.1"),
    exact("activitypub.shared-inbox", "/inbox"),
  ];
  routes.push(Object.freeze({id:'activitypub.retained-activity',route:'/activities/:activityId',kind:'segment',prefix:'/activities/'}));
  if(providerOrIdentifier?.routeCapabilities?.dynamicActors===true)routes.push(Object.freeze({id:'activitypub.actor-namespace',route:'/actors/:identifier/*',kind:'pattern',pattern:/^\/actors\/[^/]+(?:\/(?:inbox|outbox|followers|posts\/[^/]+))?$/u}));
  if(providerOrIdentifier?.routeCapabilities?.programmeBytes===true)routes.push(Object.freeze({id:'activitypub.programme-bytes',route:'/.well-known/ni/sha-256/:digest',kind:'pattern',pattern:/^\/\.well-known\/ni\/sha-256\/[A-Za-z0-9_-]{43}$/u}));
  if(providerOrIdentifier?.routeCapabilities?.actorPrograms===true)routes.push(Object.freeze({id:'activitypub.actor-programs',route:'/actors/:identifier/programs.json',kind:'pattern',pattern:/^\/actors\/[^/]+\/programs\.json$/u}));
  if(providerOrIdentifier?.routeCapabilities?.actorAgentCards===true)routes.push(Object.freeze({id:'activitypub.actor-agent-card',route:'/actors/:identifier/agent-card.json',kind:'pattern',pattern:/^\/actors\/[^/]+\/agent-card\.json$/u}));
  for (const identifier of identifiers) {
    const actor = `/actors/${encodeURIComponent(identifier)}`;
    const suffix = identifiers.length === 1 ? "" : `.${identifier}`;
    routes.push(
      exact(`activitypub.actor${suffix}`, actor),
      exact(`activitypub.actor-inbox${suffix}`, `${actor}/inbox`),
      exact(`activitypub.actor-outbox${suffix}`, `${actor}/outbox`),
    );
    if (typeof providerOrIdentifier === "object" && providerOrIdentifier?.routeCapabilities?.followers === true) {
      routes.push(exact(`activitypub.actor-followers${suffix}`, `${actor}/followers`));
    }
    routes.push(Object.freeze({ id: `activitypub.actor-post${suffix}`, route: `${actor}/posts/:postId`, kind: "segment", prefix: `${actor}/posts/` }));
  }
  return Object.freeze(routes);
}

/** Test whether a Request, URL, absolute URL, or path belongs to this provider. */
export function matchesActivityPubRequest(input, providerOrIdentifier) {
  const pathname = requestPathname(input);
  for (const entry of activityPubRouteManifest(providerOrIdentifier)) {
    if(entry.kind==='pattern'&&entry.pattern.test(pathname))return true;
    if (entry.kind === "exact" && pathname === entry.route) return true;
    if (entry.kind === "segment" && pathname.startsWith(entry.prefix)) {
      const remainder = pathname.slice(entry.prefix.length);
      if (remainder.length > 0 && !remainder.includes("/")) return true;
    }
  }
  return false;
}

/** Adapt provider.fetch to the current HTTP App contract with visible routes. */
export function activityPubApplication(provider) {
  if (!provider || typeof provider !== "object" || typeof provider.fetch !== "function") {
    throw new TypeError("ActivityPub application requires a provider with fetch(request)");
  }
  const handler = async (context) => provider.fetch(toWebRequest(context.req, context));
  const resources = activityPubRouteManifest(provider).map((entry) => Object.freeze({
    id: entry.id,
    name: `ActivityPub ${entry.id.slice("activitypub.".length)}`,
    route: entry.route,
    match: entry.kind === "pattern"?entry.pattern:entry.kind === "exact" ? entry.route : new RegExp(`^${escapeRegExp(entry.prefix)}[^/]+$`),
    // Fedify retains OPTIONS and method-admission behavior.
    handler,
  }));
  return Object.freeze({ resources: Object.freeze(resources) });
}

function exact(id, path) { return Object.freeze({ id, route: path, kind: "exact" }); }

function activityPubIdentifier(value) {
  const identifier = typeof value === "string" ? value : value?.identifier;
  if (typeof identifier !== "string" || identifier.trim() === "" || identifier.includes("/")) {
    throw new TypeError("ActivityPub route ownership requires one actor identifier segment");
  }
  return identifier;
}

function activityPubIdentifiers(value) {
  if (typeof value === "object" && Array.isArray(value?.identifiers)) {
    return Object.freeze(value.identifiers.map(activityPubIdentifier));
  }
  return Object.freeze([activityPubIdentifier(value)]);
}

function requestPathname(input) {
  if (input instanceof Request) return new URL(input.url).pathname;
  if (input instanceof URL) return input.pathname;
  if (typeof input !== "string") throw new TypeError("ActivityPub route match requires a Request, URL, or path string");
  return input.startsWith("/") ? new URL(input, "https://activitypub.invalid").pathname : new URL(input).pathname;
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

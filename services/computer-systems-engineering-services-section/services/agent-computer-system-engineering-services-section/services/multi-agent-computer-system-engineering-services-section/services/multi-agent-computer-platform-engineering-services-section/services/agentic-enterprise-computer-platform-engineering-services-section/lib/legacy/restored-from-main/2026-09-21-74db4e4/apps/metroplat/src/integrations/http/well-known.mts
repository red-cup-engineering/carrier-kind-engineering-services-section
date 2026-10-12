
import type { App, Handler, Resource } from "./app-surface.mts";
import type { Repr } from "./representation.mts";

export type WellKnownEntry = {
  name: string;
  handler?: Handler;
  repr?: Repr | ((pathRemainder: string, ctx: Parameters<Handler>[0]) => Repr | Promise<Repr>);
  methods?: readonly string[];
  produces?: readonly string[];
  prefix?: boolean;
};

export type WellKnownOptions = {
  basePath?: string;
};

const WELL_KNOWN_TOKEN = /^[A-Za-z0-9._~-]+$/;

function assertWellKnownName(name: string): void {
  if (!WELL_KNOWN_TOKEN.test(name) || name === "." || name === "..") {
    throw new TypeError(`invalid well-known name: ${name}`);
  }
}

function wellKnownBase(basePath: string | undefined): string {
  if (!basePath) return "/.well-known";
  const trimmed = basePath.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function wellKnownExactPath(basePath: string, name: string): string {
  return `${basePath}/${name}`;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wellKnownPrefixRegex(path: string): RegExp {
  return new RegExp(`^${escapeRegex(path)}(?:/(?<remainder>.*))?$`);
}

function wellKnownEntryHandler(entry: WellKnownEntry): Handler {
  if (entry.handler) return entry.handler;
  if (!entry.repr) throw new TypeError(`well-known entry ${entry.name} needs a handler or repr`);
  const representation = entry.repr;
  return async (ctx) => {
    const remainder = ctx.params.remainder ?? "";
    return typeof representation === "function" ? await representation(remainder, ctx) : representation;
  };
}

export function wellKnown(entries: readonly WellKnownEntry[], opts: WellKnownOptions = {}): App {
  const basePath = wellKnownBase(opts.basePath);
  const resources: Resource[] = entries.map((entry) => {
    assertWellKnownName(entry.name);
    const path = wellKnownExactPath(basePath, entry.name);
    const resource: Resource = {
      match: entry.prefix ? wellKnownPrefixRegex(path) : path,
      methods: entry.methods ?? ["GET", "HEAD"],
      handler: wellKnownEntryHandler(entry),
    };
    if (entry.produces) resource.produces = entry.produces;
    return resource;
  });

  return { resources };
}

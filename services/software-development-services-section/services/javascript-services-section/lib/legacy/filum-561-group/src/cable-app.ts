// cable-app.ts — mount filum's newswire cable on web transport.
//
// The cable's FORMING (wires, sheath, surfaces, store, production kit) lives in
// @red-cup-engineering/producing-content/organizing-a-newscable, web-free. This file is the thin transport
// mount, parallel to koios's surface.ts: it injects filum's theme as the HTML
// document shell (the `render` seam the forming leaves open) and wraps the
// cable's `handle` in a single web App catch-all, routed by Host upstream.

import { Buffer } from "node:buffer";
import type { App } from "@red-cup-engineering/http-server";
import { render } from "@red-cup-engineering/organizing-with-the-web/theming";
import {
  createNewscable,
  readNewscableSiteConfig,
  aggregateWires,
  type Newscable,
  type RenderDocument,
} from "@red-cup-engineering/producing-content/organizing-a-newscable";

import { filumTheme } from "./theme.ts";

/** The injected document shell: filum's theme owns every HTML surface. */
const renderDocument: RenderDocument = (title, content, options) =>
  render(filumTheme, content, {
    title,
    ...(options.description === undefined ? {} : { description: options.description }),
    ...(options.canonical === undefined ? {} : { canonical: options.canonical }),
    ...(options.siteName === undefined ? {} : { siteName: options.siteName }),
    ...(options.links === undefined ? {} : { links: options.links }),
  });

/** Build the cable App straight from a site config document: read the config,
 *  aggregate the wires it declares, assemble the cable, expose it as an App.
 *  filum's theme themes every wire's HTML surfaces and the sheath index. */
export async function createCableAppFromConfig(
  configPath: string,
  onSkip: (message: string) => void = () => {},
): Promise<App> {
  const config = await readNewscableSiteConfig(configPath);
  const wires = aggregateWires(configPath, config, onSkip, renderDocument);
  return createNewscableApp(createNewscable({
    name: config.name,
    title: config.title,
    description: config.description,
    domain: config.domain,
    routing: config.routing,
    ...(config.routingPrefix === undefined ? {} : { routingPrefix: config.routingPrefix }),
    wires,
    render: renderDocument,
  }));
}

/** Build the cable's App: the cable as its handler, routed by Host upstream. */
export function createNewscableApp(cable: Newscable): App {
  return {
    resources: [
      {
        match: () => ({}),
        methods: ["GET", "HEAD"],
        handler: async (ctx) => {
          const host = ctx.req.headers.host ?? cable.domain;
          const surface = await cable.handle(host, ctx.url.pathname);
          ctx.res.writeHead(surface.status, {
            ...surface.headers,
            "content-length": String(Buffer.byteLength(surface.body)),
          });
          ctx.res.end((ctx.req.method ?? "GET") === "HEAD" ? undefined : surface.body);
        },
      },
    ],
  };
}

// filum.561.group — this box's newswire cable. createApp builds the cable from
// its newscable.config.json and exposes it as an App; operations-manifold mounts it by Host.
// No port, no listener, no process.

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { App } from "@red-cup-engineering/http-server";
import { createCableAppFromConfig } from "./cable-app.ts";

export function createApp(): Promise<App> {
  const configPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "newscable.config.json");
  return createCableAppFromConfig(configPath);
}

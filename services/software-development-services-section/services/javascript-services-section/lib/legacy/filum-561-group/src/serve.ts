#!/usr/bin/env node
// serve — start filum's cable on a listener for ad-hoc runs.
//
// Production mounts the cable by Host through `createApp` (operations-manifold); this script
// is the standalone equivalent of the old `newscable serve`. Twelve-factor:
// the systemd unit owns PORT/HOST; 0 means an ephemeral port.

import process from "node:process";
import { start, installGracefulShutdown } from "@emsenn/http-server";
import { createApp } from "./index.ts";

const envPort = process.env["PORT"] ? Number(process.env["PORT"]) : undefined;
const port = envPort !== undefined && Number.isSafeInteger(envPort) ? envPort : 0;
const host = process.env["HOST"] ?? "127.0.0.1";
const result = await start(await createApp(), { host, port });
installGracefulShutdown(result);
process.stdout.write(`filum cable listening at http://${host}:${result.port}/\n`);

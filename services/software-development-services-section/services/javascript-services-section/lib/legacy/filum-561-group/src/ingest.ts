#!/usr/bin/env node
// ingest — fetch this cable's syndication sources into the wire stores.
//
// Reads filum's newscable.config.json and ingests every wire that carries
// `sources` (the collapse-* wires) into `store/<name>`, via the web-free cable
// kit. Append-only and idempotent. The computed wires
// (arithmomantia, astrologia, …) carry no sources and are skipped here; they
// are asserted by `pnpm run assert`.

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingestCableFromConfig } from "@red-cup-engineering/producing-content/organizing-a-newscable";

const configPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "newscable.config.json");
const onSkip = (message: string): void => {
  process.stderr.write(`${message}\n`);
};
const results = await ingestCableFromConfig(configPath, { onSkip });
for (const result of results) {
  process.stdout.write(
    `${result.wire}: ${result.written} written, ${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}\n`,
  );
}

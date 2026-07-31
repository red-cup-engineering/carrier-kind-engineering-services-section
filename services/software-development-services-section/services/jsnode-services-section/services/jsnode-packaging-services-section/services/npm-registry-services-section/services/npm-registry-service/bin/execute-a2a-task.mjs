#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
import { registrySnapshotProtocol } from "../src/protocol.mjs";
import { obtainRegistrySnapshot } from "../src/snapshot.mjs";

const operations = Object.freeze({ "obtain-union-package-registry-snapshot": obtainRegistrySnapshot });

export function executeA2aMessage(source, environment = process.env) {
  return executeRelationalOperationMessage(source, {
    protocol: registrySnapshotProtocol,
    operations,
    runtimeLoader: async () => Object.freeze({
      registryRoot: environment.UNION_PACKAGE_REGISTRY_ROOT ?? resolve("data/package-registry"),
      registryUrl: environment.UNION_PACKAGE_REGISTRY_URL ?? "http://bare-cedar-fog.tail61b391.ts.net:4874/",
    }),
    responseFilename: "union-package-registry-snapshot.rmn.cbor",
    unknownOperationMessage: "unknown Union package registry operation",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}

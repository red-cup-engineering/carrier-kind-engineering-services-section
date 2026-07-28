#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectCodexHarness } from "../src/projector.mjs";

const root = resolve(fileURLToPath(new URL("../../../../../../../../../../../../../../..", import.meta.url)));
const configurationPath = process.argv[2] ?? resolve(root, "lib/emsenn/services/561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/lib/actors/codex-in-vs-code/config.json");
const target = process.argv[3] ?? root;
process.stdout.write(`${JSON.stringify(projectCodexHarness({ configurationPath, target }), null, 2)}\n`);

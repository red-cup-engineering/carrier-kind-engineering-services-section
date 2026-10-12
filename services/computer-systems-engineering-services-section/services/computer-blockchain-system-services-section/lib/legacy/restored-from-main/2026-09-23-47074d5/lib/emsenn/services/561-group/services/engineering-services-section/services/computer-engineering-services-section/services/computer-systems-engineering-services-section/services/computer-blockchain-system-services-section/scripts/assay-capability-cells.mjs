#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assayBlockchainCapabilityCell, discoverBlockchainCapabilityCells } from "../src/capability-cell.mjs";

const SECTION_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const supplied = process.argv.slice(2);
const roots = supplied.length === 0 ? discoverBlockchainCapabilityCells(SECTION_ROOT) : supplied;
if (roots.length === 0) throw new Error("no declared blockchain capability-cell manifests were discovered");
const assays = roots.map((root) => assayBlockchainCapabilityCell(resolve(root)));
process.stdout.write(`${JSON.stringify({ type: "BlockchainCapabilityCellMeshAssay", assays, admitted: assays.every(({ disposition }) => disposition === "admitted") }, null, 2)}\n`);
if (assays.some(({ disposition }) => disposition !== "admitted")) process.exitCode = 2;

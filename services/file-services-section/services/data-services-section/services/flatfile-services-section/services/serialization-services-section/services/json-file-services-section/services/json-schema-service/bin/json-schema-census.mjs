#!/usr/bin/env node
import { readFileSync, readdirSync, lstatSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { canonical } from "@red-cup-engineering/json-file-codec-service";
import { censusClassified, classifyCensusEntry } from "../src/census.mts";

const value = (flag) => { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; };
const rootArg = value("--root"), outArg = value("--out"), verify = process.argv.includes("--verify");
if (!rootArg || !outArg) throw new Error("usage: json-schema-census --root ABSOLUTE_PATH --out ABSOLUTE_PATH [--verify]");
if (!rootArg.startsWith("/") || !outArg.startsWith("/")) throw new Error("root and out must be explicit absolute paths");
const root = resolve(rootArg), out = resolve(outArg), entries = [];
function walk(dir) { for (const name of readdirSync(dir)) { if (name === ".git" || name === "node_modules" || name === ".venv" || name === ".pnpm-store" || name === ".tmp" || name === "dist" || name === "runtime-images") continue; const path = resolve(dir, name); if (path === out) continue; let info; try { info = lstatSync(path); } catch { continue; } if (info.isSymbolicLink()) continue; if (info.isDirectory()) walk(path); else if (/\.(?:json|[cm]?[jt]s|md|rml|txt)$/.test(name)) { try { entries.push(classifyCensusEntry({ path: relative(root, path), content: readFileSync(path, "utf8") })); } catch { /* a mutable corpus may race the read; classify only observed files */ } } } }
walk(root); const result = censusClassified(entries); const bytes = `${canonical(result)}\n`;
if (verify && existsSync(out) && readFileSync(out, "utf8") !== bytes) throw new Error(`census artifact differs: ${out}`);
if (!verify) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, bytes); }
process.stdout.write(`${JSON.stringify({ out, counts: result.counts, roleCounts: result.roleCounts })}\n`);

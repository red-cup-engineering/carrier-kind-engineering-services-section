#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const git = process.env.GIT_SERVICES_BIN ?? resolve(dirname(fileURLToPath(import.meta.url)), "git-services");
const args = options(process.argv.slice(2));
if (args.help) { console.log("Usage: register-existing-git-repository.mjs --parent <worktree> --path <relative-path> [--url <remote>] [--apply]"); process.exit(0); }
if (!args.parent || !args.path) fail("--parent and --path are required");
const parent = resolve(args.parent);
const path = relativePath(args.path);
const child = resolve(parent, path);
if (run(parent, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") fail(`not a Git worktree: ${parent}`);
if (run(child, ["rev-parse", "--is-inside-work-tree"]).trim() !== "true") fail(`not an existing Git worktree: ${child}`);
if (run(child, ["status", "--porcelain=v1"]).trim() !== "") fail(`child worktree is dirty: ${child}`);
const url = args.url ?? run(child, ["remote", "get-url", "origin"]).trim();
if (!url) fail(`no origin remote; provide --url for ${child}`);
const pin = run(child, ["rev-parse", "HEAD"]).trim();
const plan = { action: "register-existing-git-repository", apply: args.apply === true, parent, path, child, url, pin };
if (!args.apply) { console.log(JSON.stringify(plan)); process.exit(0); }
run(parent, ["submodule", "add", "--force", url, path]);
run(child, ["checkout", "--detach", pin]);
run(parent, ["add", "--", ".gitmodules", path]);
console.log(JSON.stringify({ ...plan, completed: true }));

function options(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { const a = argv[i]; if (a === "--apply" || a === "--help") result[a.slice(2)] = true; else if (["--parent", "--path", "--url"].includes(a)) result[a.slice(2)] = argv[++i]; else fail(`unknown option: ${a}`); } return result; }
function relativePath(value) { if (!value || value.startsWith("/") || value.split(/[\\/]+/u).includes("..")) fail("--path must be a repository-relative path"); return value.split(sep).join("/"); }
function run(cwd, argv) { try { return execFileSync(git, argv, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (error) { fail(`git command failed in ${cwd}: ${argv.join(" ")}\n${String(error.stderr ?? error.message).trim()}`); } }
function fail(message) { process.stderr.write(`register-existing-git-repository: ${message}\n`); process.exit(2); }

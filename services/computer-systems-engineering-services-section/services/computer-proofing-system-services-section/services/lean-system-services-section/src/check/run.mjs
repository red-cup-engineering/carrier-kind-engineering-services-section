import { spawn } from "node:child_process";
import { open, readdir, readFile, stat, unlink, realpath, mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { readLeanDeclarationInspection, sourcePathForModule } from "./plan.mjs";
import { leanCheckSucceeded } from "./admission.mjs";
import { fileURLToPath } from "node:url";

import { parseLeanBuildOutput } from "../codec/build-oracle.mjs";

const lakeWrapper = fileURLToPath(new URL("../../deploy/lake", import.meta.url));
const outputLimitBytes = 4 * 1024 * 1024;
let activeRun = null;
const lockPath = path.join(process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid()}`, "lean-check.lock");

export function runningLeanCheck() { return activeRun; }

function collect(stream) {
    const chunks = [];
    let bytes = 0;
    let truncated = false;
    stream.on("data", (chunk) => {
        const value = Buffer.from(chunk);
        const remaining = outputLimitBytes - bytes;
        if (remaining > 0) chunks.push(value.subarray(0, remaining));
        bytes += value.length;
        if (bytes > outputLimitBytes) truncated = true;
    });
    return () => Object.freeze({ text: Buffer.concat(chunks).toString("utf8"), truncated });
}

function execute(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
        const stdout = collect(child.stdout);
        const stderr = collect(child.stderr);
        let settled = false;
        const finish = (result) => { if (!settled) { settled = true; resolve({ ...result, stdout: stdout(), stderr: stderr() }); } };
        child.once("error", (error) => finish({ code: null, signal: null, error }));
        child.once("close", (code, signal) => finish({ code, signal }));
    });
}

async function control(args) { return execute("systemctl", ["--user", ...args]); }
async function controlGroup(unit) {
    const shown = await control(["show", unit, "--property=ControlGroup", "--value"]);
    return shown.code === 0 ? shown.stdout.text.trim() : "";
}
async function pidsInControlGroup(controlGroupPath) {
    if (controlGroupPath === "") return [];
    const pids = [];
    for (const entry of await readdir("/proc", { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
        try {
            const cgroup = await readFile(path.join("/proc", entry.name, "cgroup"), "utf8");
            if (cgroup.split("\n").some((line) => line.endsWith(controlGroupPath) || line.includes(`${controlGroupPath}/`))) pids.push(Number(entry.name));
        } catch (error) {
            if (error?.code !== "ENOENT" && error?.code !== "EACCES") throw error;
        }
    }
    return pids.sort((left, right) => left - right);
}
function processExists(pid) {
    try { process.kill(pid, 0); return true; }
    catch (error) { return error?.code === "EPERM"; }
}
async function lockOwner() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        try { return JSON.parse(await readFile(lockPath, "utf8")); }
        catch (error) {
            if (error?.code !== "ENOENT" || attempt === 9) return null;
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
    return null;
}
async function acquireNodeLock(plan) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const handle = await open(lockPath, "wx", 0o600);
            await handle.writeFile(JSON.stringify({ id: plan.id, unit: plan.unit, pid: process.pid }));
            await handle.close();
            return Object.freeze({ acquired: true });
        } catch (error) {
            if (error?.code !== "EEXIST") throw error;
            const owner = await lockOwner();
            const ownerGroup = owner?.unit === undefined ? "" : await controlGroup(owner.unit);
            if ((Number.isInteger(owner?.pid) && processExists(owner.pid)) || (await pidsInControlGroup(ownerGroup)).length > 0) {
                return Object.freeze({ acquired: false, runningId: owner?.id ?? "unknown" });
            }
            await unlink(lockPath).catch((unlinkError) => { if (unlinkError?.code !== "ENOENT") throw unlinkError; });
        }
    }
    return Object.freeze({ acquired: false, runningId: (await lockOwner())?.id ?? "unknown" });
}
async function releaseNodeLock(id) {
    const owner = await lockOwner();
    if (owner?.id === id) await unlink(lockPath).catch((error) => { if (error?.code !== "ENOENT") throw error; });
}
async function terminateScope(unit, knownControlGroup) {
    await control(["kill", "--kill-whom=all", "--signal=KILL", unit]);
    await control(["stop", unit]);
    const controlGroupPath = knownControlGroup || await controlGroup(unit);
    let remainingPids = await pidsInControlGroup(controlGroupPath);
    for (let attempt = 0; remainingPids.length > 0 && attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        remainingPids = await pidsInControlGroup(controlGroupPath);
    }
    return Object.freeze({ unit, controlGroup: controlGroupPath || null, remainingPids: Object.freeze(remainingPids), clean: remainingPids.length === 0 });
}
async function assertLakeProject(project) {
    const projectStat = await stat(project);
    if (!projectStat.isDirectory()) throw new TypeError(`lean-check: project is not a directory: ${project}`);
    const entries = await readdir(project);
    if (!entries.some((entry) => entry === "lakefile.lean" || entry === "lakefile.toml")) throw new TypeError(`lean-check: project has no lakefile.lean or lakefile.toml: ${project}`);
}

/** Execute one plan synchronously inside one named scope under lean.slice. */
export async function runLeanCheck(plan, options = {}) {
    if (activeRun !== null) return Object.freeze({ kind: "metroplat.lean.check-result", id: plan.id, state: "refused", runningId: activeRun.id });
    const lock = await acquireNodeLock(plan);
    if (!lock.acquired) return Object.freeze({ kind: "metroplat.lean.check-result", id: plan.id, state: "refused", runningId: lock.runningId });
    activeRun = Object.freeze({ id: plan.id, unit: plan.unit, project: plan.project });
    const started = new Date().toISOString();
    let timeout;
    let timedOut = false;
    let knownControlGroup = "";
    let temporary;
    try {
        await assertLakeProject(plan.project);
        let args = plan.args;
        let command = options.lakeWrapper ?? lakeWrapper;
        let source;
        let resolvedSourcePath;
        if (plan.mode === "file") {
            const project = await realpath(plan.project);
            const file = await realpath(path.join(plan.project, plan.file));
            const relative = path.relative(project, file);
            if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new TypeError("lean-check: source symlink escapes the project");
            args = ["env", "lean", file];
            resolvedSourcePath = file;
            source = { file: plan.file, digest: createHash("sha256").update(await readFile(file)).digest("hex") };
        } else if (plan.mode === "declaration") {
            // Local source is part of a declaration check's claim. External
            // imports cannot be fingerprinted from this Lake project.
            const project = await realpath(plan.project);
            const relativeSource = sourcePathForModule(plan.module);
            const pathInProject = path.join(project, relativeSource);
            try {
                resolvedSourcePath = await realpath(pathInProject);
                const relative = path.relative(project, resolvedSourcePath);
                if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
                    throw new TypeError("lean-check: declaration source symlink escapes the project");
                source = { file: relativeSource, digest: createHash("sha256").update(await readFile(resolvedSourcePath)).digest("hex") };
            } catch (error) {
                if (error?.code !== "ENOENT") throw error;
                resolvedSourcePath = undefined;
            }
            temporary = await mkdtemp(path.join(os.tmpdir(), "lean-declaration-"));
            const file = path.join(temporary, "Inspect.lean");
            await writeFile(file, plan.program);
            command = process.execPath;
            args = [fileURLToPath(new URL("./declaration.mjs", import.meta.url)), options.lakeWrapper ?? lakeWrapper, plan.module, file];
        }
        const execution = execute("systemd-run", ["--user", "--scope", "--quiet", "--collect", `--unit=${plan.unit}`, "--slice=lean.slice", "-E", "LEAN_SLICED=1", "-E", "LEAN_NUM_THREADS=4", "--", command, ...args], { cwd: plan.project, env: { ...process.env, LEAN_SLICED: "1", LEAN_NUM_THREADS: "4" } });
        const deadline = new Promise((resolve) => { timeout = setTimeout(() => { timedOut = true; resolve(null); }, plan.timeoutMs); });
        let observing = true;
        const observation = (async () => {
            for (let attempt = 0; observing && knownControlGroup === "" && attempt < 40; attempt += 1) {
                knownControlGroup = await controlGroup(plan.unit);
                if (observing && knownControlGroup === "") await new Promise((resolve) => setTimeout(resolve, 25));
            }
        })();
        const outcome = await Promise.race([execution, deadline]);
        observing = false;
        await observation;
        if (timedOut) { await terminateScope(plan.unit, knownControlGroup); await execution; }
        if (timeout !== undefined) clearTimeout(timeout);
        const settled = outcome ?? await execution;
        const cleanup = await terminateScope(plan.unit, knownControlGroup);
        const parsed = parseLeanBuildOutput(settled.stdout.text, settled.stderr.text);
        let sourceChanged = false;
        if (source !== undefined) {
            try {
                const finalPath = await realpath(path.join(plan.project, source.file));
                sourceChanged = finalPath !== resolvedSourcePath ||
                    createHash("sha256").update(await readFile(finalPath)).digest("hex") !== source.digest;
            } catch { sourceChanged = true; }
        }
        const outputTruncated = settled.stdout.truncated || settled.stderr.truncated;
        const succeeded = leanCheckSucceeded({
            timedOut, exitCode: settled.code, signal: settled.signal,
            spawnError: settled.error, compilerErrors: parsed.errors,
            outputTruncated, scopeClean: cleanup.clean, sourceChanged,
        });
        // Never surface axioms/dependencies from a run that fails final admission.
        let inspection;
        if (plan.mode === "declaration" && succeeded)
            inspection = readLeanDeclarationInspection(settled.stdout.text, plan.declaration);
        return Object.freeze({ kind: "metroplat.lean.check-result", id: plan.id,
            state: timedOut ? "timed-out" : succeeded ? "succeeded" : "failed",
            project: plan.project, mode: plan.mode ?? "build", ...(plan.targets === undefined ? {} : { targets: plan.targets }),
            ...(source === undefined ? {} : { source, sourceChanged }),
            ...(plan.program === undefined ? {} : { program: plan.program, module: plan.module, declaration: plan.declaration }),
            ...(inspection === undefined ? {} : { inspection }), unit: plan.unit, started, ended: new Date().toISOString(), timeoutMs: plan.timeoutMs,
            exitCode: settled.code, signal: settled.signal, stdout: settled.stdout.text, stderr: settled.stderr.text,
            outputTruncated, ...parsed, cleanup });
    } finally {
        if (timeout !== undefined) clearTimeout(timeout);
        await terminateScope(plan.unit, knownControlGroup).catch(() => undefined);
        if (temporary !== undefined) await rm(temporary, { recursive: true, force: true });
        if (activeRun?.id === plan.id) activeRun = null;
        await releaseNodeLock(plan.id);
    }
}

import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { cpus, freemem, loadavg, totalmem } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function inside(root, requested) {
  if (typeof requested !== "string" || requested.length === 0 || isAbsolute(requested)) {
    throw new TypeError("repository path must be a nonempty relative path");
  }
  const target = resolve(root, requested);
  const displacement = relative(root, target);
  if (displacement === "" || displacement.startsWith("..") || isAbsolute(displacement)) {
    throw new TypeError("repository path must name a file beneath the admitted root");
  }
  return { target, displacement };
}

export const REPOSITORY_OBSERVATION_TOOLS = Object.freeze([
  {
    type: "function",
    function: {
      name: "search_repository",
      description: "Search text beneath the admitted repository root. Returns a bounded list of matching file paths; content requires a separate bounded read.",
      parameters: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 2, maxLength: 160 }, path: { type: "string", default: "." }, maximumMatches: { type: "integer", minimum: 1, maximum: 80, default: 40 } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "find_repository_paths",
      description: "Find files whose path name contains one literal fragment beneath the admitted repository root. Returns bounded paths only.",
      parameters: { type: "object", required: ["fragment"], properties: { fragment: { type: "string", minLength: 2, maxLength: 80 }, path: { type: "string", default: "." }, maximumPaths: { type: "integer", minimum: 1, maximum: 80, default: 40 } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_repository_file",
      description: "Read a bounded line interval from one text file beneath the admitted repository root.",
      parameters: { type: "object", required: ["path"], properties: { path: { type: "string" }, startLine: { type: "integer", minimum: 1, default: 1 }, maximumLines: { type: "integer", minimum: 1, maximum: 240, default: 120 } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "observe_machine_territory",
      description: "Observe CPU count, load, total/free RAM, and current process resource usage without mutating the machine.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
]);

export function createRepositoryObservationHandlers({ root, rg = "rg" } = {}) {
  const repositoryRoot = resolve(root ?? process.cwd());
  return Object.freeze({
    async search_repository({ query, path = ".", maximumMatches = 40 } = {}) {
      if (typeof query !== "string" || query.length < 2 || query.length > 160) throw new TypeError("search query must contain 2 through 160 characters");
      if (!Number.isInteger(maximumMatches) || maximumMatches < 1 || maximumMatches > 80) throw new TypeError("maximumMatches must be an integer from 1 through 80");
      const target = path === "." ? repositoryRoot : inside(repositoryRoot, path).target;
      try { await access(target); }
      catch {
        return Object.freeze({ type: "RepositorySearchRefusal", reason: "path-not-found", requestedPath: path, suggestedPath: ".", prohibitedEffectsPerformed: false });
      }
      try {
        const { stdout } = await execFileAsync(rg, ["-l", "--color", "never", "--glob", "!**/node_modules/**", "--glob", "!**/.git/**", "--glob", "!**/data/storage/**", "--max-count", "1", "--", query, target], { maxBuffer: 4 * 1024 * 1024, timeout: 20_000 });
        const paths = stdout.split("\n").filter(Boolean).slice(0, maximumMatches).map((entry) => relative(repositoryRoot, entry));
        return Object.freeze({ type: "RepositorySearchObservation", query, path: relative(repositoryRoot, target) || ".", paths });
      } catch (error) {
        if (error.code === 1) return Object.freeze({ type: "RepositorySearchObservation", query, path: relative(repositoryRoot, target) || ".", paths: [] });
        throw error;
      }
    },
    async find_repository_paths({ fragment, path = ".", maximumPaths = 40 } = {}) {
      if (typeof fragment !== "string" || fragment.length < 2 || fragment.length > 80 || fragment.includes("/")) throw new TypeError("path fragment must contain 2 through 80 non-separator characters");
      if (!Number.isInteger(maximumPaths) || maximumPaths < 1 || maximumPaths > 80) throw new TypeError("maximumPaths must be an integer from 1 through 80");
      const target = path === "." ? repositoryRoot : inside(repositoryRoot, path).target;
      try { await access(target); }
      catch { return Object.freeze({ type: "RepositoryPathRefusal", reason: "path-not-found", requestedPath: path, suggestedPath: ".", prohibitedEffectsPerformed: false }); }
      const { stdout } = await execFileAsync("find", [target, "-type", "f", "-iname", `*${fragment}*`], { maxBuffer: 4 * 1024 * 1024, timeout: 20_000 });
      const paths = stdout.split("\n").filter(Boolean).map((entry) => relative(repositoryRoot, entry)).filter((entry) => !entry.includes("/node_modules/") && !entry.includes("/.git/") && !entry.includes("/data/storage/")).slice(0, maximumPaths);
      return Object.freeze({ type: "RepositoryPathObservation", fragment, path: relative(repositoryRoot, target) || ".", paths });
    },
    async read_repository_file({ path, startLine = 1, maximumLines = 120 } = {}) {
      if (!Number.isInteger(startLine) || startLine < 1) throw new TypeError("startLine must be a positive integer");
      if (!Number.isInteger(maximumLines) || maximumLines < 1 || maximumLines > 240) throw new TypeError("maximumLines must be an integer from 1 through 240");
      const { target, displacement } = inside(repositoryRoot, path);
      const source = await readFile(target, "utf8");
      const lines = source.split("\n");
      return Object.freeze({ type: "RepositoryFileObservation", path: displacement, startLine, endLine: Math.min(lines.length, startLine + maximumLines - 1), totalLines: lines.length, text: lines.slice(startLine - 1, startLine - 1 + maximumLines).join("\n") });
    },
    async observe_machine_territory() {
      const usage = process.resourceUsage();
      return Object.freeze({ type: "MachineTerritoryObservation", cpuCount: cpus().length, loadAverage: loadavg(), totalMemoryBytes: totalmem(), freeMemoryBytes: freemem(), process: { userCpuMicroseconds: usage.userCPUTime, systemCpuMicroseconds: usage.systemCPUTime, peakRssBytes: usage.maxRSS * 1024 } });
    },
  });
}

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SKIP_DIRS = new Set([".git", ".hg", ".svn", "node_modules", "dist", ".next", ".turbo", ".tmp", "coverage"]);

export const defaultGitExec = async (args, cwd) => {
  const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });
  return stdout;
};

export const defaultLeanExec = async (command, args, cwd) => {
  try {
    const { stdout, stderr } = await execFileAsync(command, [...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
    });
    return Object.freeze({ stdout, stderr, exitCode: 0 });
  } catch (cause) {
    const error = cause;
    return Object.freeze({
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message,
      exitCode: typeof error.code === "number" ? error.code : 1,
    });
  }
};

export function readTextFileSync(file) {
  return readFileSync(file, "utf8");
}

export async function readTextFile(file) {
  return readFile(file, "utf8");
}

export function readOptionalTextFile(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

export async function writeTextFile(file, text) {
  await writeFile(file, text, "utf8");
}

export function writeTextFileSync(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, "utf8");
}

export function fileExists(file) {
  return existsSync(file);
}

export async function canAccess(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export function directoryEntries(dir) {
  try {
    return Object.freeze(readdirSync(dir, { withFileTypes: true }).map((entry) => Object.freeze({
      name: entry.name,
      file: entry.isFile(),
      directory: entry.isDirectory(),
    })));
  } catch {
    return Object.freeze([]);
  }
}

export function readJsnodeAdmission(root, filter = {}) {
  const resolvedRoot = path.resolve(root);
  const packageJsonFiles = packageJsonFilesFromFs(resolvedRoot, filter).map((file) => Object.freeze({
    path: file,
    dir: path.dirname(file),
    relative: path.relative(resolvedRoot, file).split(path.sep).join("/"),
    text: readFileSync(file, "utf8"),
  }));
  const workspaceYamlPath = path.join(resolvedRoot, "pnpm-workspace.yaml");
  const lockYamlPath = path.join(resolvedRoot, "pnpm-lock.yaml");
  const tsconfigFiles = packageJsonFiles.flatMap((manifest) => {
    const tsconfig = path.join(manifest.dir, "tsconfig.json");
    return existsSync(tsconfig) ? [tsconfig] : [];
  });
  return Object.freeze({
    root: resolvedRoot,
    packageJsonFiles: Object.freeze(packageJsonFiles),
    ...(existsSync(workspaceYamlPath) ? { workspaceYaml: Object.freeze({ path: workspaceYamlPath, text: readFileSync(workspaceYamlPath, "utf8") }) } : {}),
    ...(existsSync(lockYamlPath) ? { lockYaml: Object.freeze({ path: lockYamlPath, text: readFileSync(lockYamlPath, "utf8") }) } : {}),
    tsconfigs: Object.freeze(tsconfigFiles.map((file) => Object.freeze({ path: file, text: readFileSync(file, "utf8") }))),
  });
}

export async function readGitStdout(root, args, exec = defaultGitExec) {
  return exec(args, path.resolve(root));
}

export async function readGitAdmission(
  root,
  options = {},
) {
  const resolvedRoot = path.resolve(root);
  const limit = options.limit ?? 50;
  const logArgs = ["log", `--max-count=${limit}`, `--pretty=format:%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e`];
  if (options.revision !== undefined && options.revision !== "") logArgs.push(options.revision);
  const exec = options.exec ?? defaultGitExec;
  const gitmodulesPath = path.join(resolvedRoot, ".gitmodules");
  return Object.freeze({
    root: resolvedRoot,
    status: await readGitStdout(resolvedRoot, ["status", "--short"], exec),
    log: await readGitStdout(resolvedRoot, logArgs, exec),
    refs: await readGitStdout(resolvedRoot, ["for-each-ref", "--format=%(objectname) %(refname)"], exec),
    remotes: await readGitStdout(resolvedRoot, ["remote", "-v"], exec),
    gitlinks: await readGitStdout(resolvedRoot, ["ls-files", "-s"], exec).catch(() => ""),
    ...(existsSync(gitmodulesPath) ? { gitmodules: Object.freeze({ path: gitmodulesPath, text: readFileSync(gitmodulesPath, "utf8") }) } : {}),
  });
}

export function readLeanAdmission(root, options = {}) {
  const resolvedRoot = path.resolve(root);
  const toolchainPath = path.join(resolvedRoot, "lean-toolchain");
  const lakefilePath = path.join(resolvedRoot, "lakefile.toml");
  const rootModulePath = path.join(resolvedRoot, "RelMath.lean");
  const declarationIndexPaths = options.declarationIndexPaths ?? ["blueprint/lean_decls"];
  const blueprintDeclsPath = declarationIndexPaths
    .map((candidate) => path.resolve(resolvedRoot, candidate))
    .find((candidate) => existsSync(candidate));
  return Object.freeze({
    root: resolvedRoot,
    ...(existsSync(toolchainPath) ? { toolchain: Object.freeze({ path: toolchainPath, text: readFileSync(toolchainPath, "utf8") }) } : {}),
    ...(existsSync(lakefilePath) ? { lakefile: Object.freeze({ path: lakefilePath, text: readFileSync(lakefilePath, "utf8") }) } : {}),
    ...(existsSync(rootModulePath) ? { rootModule: Object.freeze({ path: rootModulePath, text: readFileSync(rootModulePath, "utf8") }) } : {}),
    modules: Object.freeze(leanModuleFilesFromFs(resolvedRoot).map((file) => rawLeanModuleFile(resolvedRoot, file))),
    conformance: Object.freeze(leanConformanceFilesFromFs(resolvedRoot).map((file) => rawLeanModuleFile(resolvedRoot, file))),
    ...(blueprintDeclsPath === undefined ? {} : { blueprintLeanDecls: Object.freeze({ path: blueprintDeclsPath, text: readFileSync(blueprintDeclsPath, "utf8") }) }),
  });
}

export async function readLeanCommand(
  root,
  args = ["build"],
  command = "lake",
  exec = defaultLeanExec,
) {
  return exec(command, args, path.resolve(root));
}

export function packageJsonFilesFromFs(root, filter = {}) {
  const out = [];
  const scan = (dir, depth) => {
    if (excluded(path.relative(root, dir).split(path.sep).join("/"), filter)) return;
    if (depth > 4) return;
    const entries = directoryEntries(dir);
    if (entries.some((entry) => entry.file && entry.name === "package.json")) out.push(path.join(dir, "package.json"));
    for (const entry of entries) {
      if (!entry.directory || SKIP_DIRS.has(entry.name)) continue;
      scan(path.join(dir, entry.name), depth + 1);
    }
  };
  for (const child of ["apps", "lib", "services", "sites"]) {
    const dir = path.join(root, child);
    if (existsSync(dir)) scan(dir, 0);
  }
  if (existsSync(path.join(root, "package.json")) && !excluded("package.json", filter)) out.push(path.join(root, "package.json"));
  return Object.freeze([...new Set(out)].sort((a, b) => a.localeCompare(b)));
}

export function sourceModuleFilesFromFs(dir, filter = {}) {
  const out = [];
  const scan = (current) => {
    if (excluded(path.relative(dir, current).split(path.sep).join("/"), filter)) return;
    for (const entry of directoryEntries(current)) {
      if (entry.directory) {
        if (!SKIP_DIRS.has(entry.name)) scan(path.join(current, entry.name));
      } else if (entry.file && /\.[cm]?tsx?$/u.test(entry.name)) {
        out.push(path.join(current, entry.name));
      }
    }
  };
  const src = path.join(dir, "src");
  if (existsSync(src)) scan(src);
  return Object.freeze(out.sort((a, b) => a.localeCompare(b)));
}

export function readSourceModuleFiles(dir, root, filter = {}) {
  return Object.freeze(sourceModuleFilesFromFs(dir, filter).map((file) => Object.freeze({
    path: file,
    packageDir: dir,
    relative: path.relative(root, file).split(path.sep).join("/"),
    text: readFileSync(file, "utf8"),
  })));
}

export function declarationFilesFromFs(dir, options = {}) {
  const files = [];
  const scan = (current) => {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = path.join(current, entry);
      let stat;
      try {
        stat = statSync(file);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (options.recursive === true) scan(file);
      } else if (/\.d\.[cm]?ts$/u.test(entry)) {
        files.push(file);
      }
    }
  };
  scan(dir);
  return Object.freeze(files.sort((a, b) => a.localeCompare(b)));
}

export function leanModuleFilesFromFs(root) {
  const files = [];
  const rootModule = path.join(root, "RelMath.lean");
  if (existsSync(rootModule)) files.push(rootModule);
  const scanRoot = path.join(root, "RelMath");
  const scan = (current) => {
    for (const entry of directoryEntries(current)) {
      const file = path.join(current, entry.name);
      if (entry.directory) scan(file);
      else if (entry.file && entry.name.endsWith(".lean")) files.push(file);
    }
  };
  if (existsSync(scanRoot)) scan(scanRoot);
  return Object.freeze(files.sort((a, b) => a.localeCompare(b)));
}

export function leanConformanceFilesFromFs(root) {
  const dir = path.join(root, "conformance");
  if (!existsSync(dir)) return Object.freeze([]);
  return Object.freeze(directoryEntries(dir)
    .filter((entry) => entry.file && entry.name.endsWith(".lean"))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b)));
}

function excluded(relativePath, filter = {}) {
  return filter.exclude?.some((pattern) => relativePath === pattern || relativePath.startsWith(`${pattern}/`) || relativePath.includes(pattern)) === true;
}

function rawLeanModuleFile(root, file) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  return Object.freeze({
    path: file,
    relative,
    module: leanModuleNameFromRelative(relative),
    text: readFileSync(file, "utf8"),
  });
}

function leanModuleNameFromRelative(relative) {
  return relative
    .replace(/\.lean$/u, "")
    .replace(/\//gu, ".");
}

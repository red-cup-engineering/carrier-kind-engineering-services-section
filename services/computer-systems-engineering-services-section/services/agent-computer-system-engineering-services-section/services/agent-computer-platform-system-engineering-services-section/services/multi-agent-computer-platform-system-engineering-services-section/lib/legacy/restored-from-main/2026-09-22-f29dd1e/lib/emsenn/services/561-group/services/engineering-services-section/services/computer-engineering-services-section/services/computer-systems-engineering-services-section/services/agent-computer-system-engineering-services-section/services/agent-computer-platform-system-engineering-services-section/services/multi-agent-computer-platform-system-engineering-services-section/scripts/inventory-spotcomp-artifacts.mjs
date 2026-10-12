import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRoot = resolve(packageRoot, "../../../../../../../../../../../../..");
const includeLegacy = process.argv.includes("--include-legacy");
const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const scanRoot = resolve(rootArgument ?? defaultRoot);
const packageRelative = relative(scanRoot, packageRoot);
const exclusions = ["-g", "!node_modules/**", "-g", "!.git/**"];
if (!includeLegacy) exclusions.push("-g", "!**/lib/legacy/**");
function runRipgrep(arguments_) {
  const result = spawnSync("rg", arguments_, { cwd: scanRoot, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0 && result.status !== 1) {
    throw result.error ?? new Error(result.stderr || `rg exited ${result.status}`);
  }
  return result.stdout.split("\n").filter(Boolean).map((path) => path.replace(/^\.\//, ""));
}

function outsidePackage(path) {
  return !packageRelative || (path !== packageRelative && !path.startsWith(`${packageRelative}/`));
}

const namedPaths = runRipgrep(["--files", ...exclusions])
  .filter(outsidePackage)
  .filter((path) => /(^|\/)spotcomp(?:\/|[^/]*)/i.test(path));
const references = runRipgrep([
  "-l", "-i", "\\bspotcomp\\b",
  "-g", "*.js", "-g", "*.json", "-g", "*.jsonl", "-g", "*.md",
  "-g", "*.mjs", "-g", "*.txt", "-g", "*.yaml", "-g", "*.yml",
  ...exclusions,
  ".",
])
  .filter(outsidePackage);
console.log(JSON.stringify({ scanRoot, includeLegacy, namedPaths: namedPaths.sort(), references: references.sort() }, null, 2));

// codecs - representation and environment boundaries for computing.

import { isAbsolute, join, resolve } from "node:path";

import { fileExists, readTextFileSync } from "./admission.mjs";

function readJson(path) {
  return JSON.parse(readTextFileSync(path));
}

function resolveFrom(cwd, path) {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function candidatePaths(cwd, name) {
  return Object.freeze([
    join(cwd, `${name}.config.json`),
    join(cwd, "config", `${name}.json`),
    join(cwd, "package.json"),
  ]);
}

export function loadEnvironmentalConfiguration(options) {
  const cwd = options.cwd ?? process.cwd();
  if (options.stdinText !== undefined && options.stdinText.trim() !== "") {
    return Object.freeze({
      document: options.parse(JSON.parse(options.stdinText)),
      source: Object.freeze({ kind: "stdin", label: "stdin" }),
    });
  }
  if (options.explicitPath !== undefined) {
    const path = resolveFrom(cwd, options.explicitPath);
    return Object.freeze({
      document: options.parse(readJson(path)),
      source: Object.freeze({ kind: "explicit", path }),
    });
  }
  for (const path of candidatePaths(cwd, options.name)) {
    if (!fileExists(path)) continue;
    const document = readJson(path);
    return Object.freeze({
      document: options.parse(document),
      source: Object.freeze({ kind: path.endsWith("package.json") ? "package" : "file", path }),
    });
  }
  throw new Error(`No ${options.name} configuration found in ${cwd}`);
}

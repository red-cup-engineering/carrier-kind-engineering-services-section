import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSwarmRoot } from "./root.mjs";

const defaultsDir = fileURLToPath(new URL("../agents/", import.meta.url));

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    error.message = `Could not read ${label} agent JSON at ${path}: ${error.message}`;
    throw error;
  }
}

function validateAgent(config, source) {
  for (const field of ["name", "provider", "model"]) {
    if (!config[field] || typeof config[field] !== "string") {
      throw new Error(`Agent ${source} is missing string field "${field}".`);
    }
  }
  return config;
}

export function loadAgent(name, options = {}) {
  if (!name) throw new Error("Missing agent name.");
  const root = resolveSwarmRoot(options);
  const userPath = join(root, "agents", `${name}.json`);
  if (existsSync(userPath)) {
    return {
      ...validateAgent(readJson(userPath, "user"), userPath),
      source: "user",
      path: userPath,
      root,
    };
  }

  const defaultPath = join(defaultsDir, `${name}.json`);
  if (existsSync(defaultPath)) {
    return {
      ...validateAgent(readJson(defaultPath, "default"), defaultPath),
      source: "default",
      path: defaultPath,
      root,
    };
  }

  const defaultNames = readdirSync(defaultsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
  throw new Error(
    `Unknown agent "${name}". Add ${join(root, "agents", `${name}.json`)} or use one of: ${defaultNames.join(", ")}.`,
  );
}

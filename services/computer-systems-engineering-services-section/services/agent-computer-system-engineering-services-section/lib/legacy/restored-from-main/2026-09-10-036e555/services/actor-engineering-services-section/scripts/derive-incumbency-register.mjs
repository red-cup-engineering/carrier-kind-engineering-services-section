#!/usr/bin/env node
// derive-incumbency-register — the effect: walk a repository tree, validate every incumbency
// record found, and print the derived register as JSON. Thin: the law lives in src/actor.mjs.
import { deriveIncumbencyRegister } from "../src/actor.mjs";

export default function deriveIncumbencyRegisterScript(repoRoot, schemaPath) {
  return deriveIncumbencyRegister(schemaPath ? { repoRoot, schemaPath } : { repoRoot });
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = argValue("--repo-root");
  const schemaPath = argValue("--schema");
  if (!repoRoot) {
    console.error("usage: derive-incumbency-register.mjs --repo-root <dir> [--schema <path>]");
    process.exit(1);
  }
  console.log(JSON.stringify(deriveIncumbencyRegisterScript(repoRoot, schemaPath), null, 2));
}

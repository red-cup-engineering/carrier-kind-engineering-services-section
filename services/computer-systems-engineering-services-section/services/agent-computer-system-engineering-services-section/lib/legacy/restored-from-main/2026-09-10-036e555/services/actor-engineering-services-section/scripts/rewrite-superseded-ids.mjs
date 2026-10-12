#!/usr/bin/env node
// rewrite-superseded-ids — the effect: replace every superseded identifier a register names with
// its actor address, across a given set of files. Thin: the law lives in src/actor.mjs.
import { readActorRegister, supersessionMap, rewriteSupersededIds } from "../src/actor.mjs";

export default function rewriteSupersededIdsScript(registerPath, files, dryRun = true) {
  const map = supersessionMap(readActorRegister(registerPath));
  return rewriteSupersededIds({ files, map, dryRun });
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const registerPath = argValue("--register");
  const write = process.argv.includes("--write");
  const files = process.argv.slice(2).filter((a, i, arr) => !a.startsWith("--") && arr[i - 1] !== "--register");
  if (!registerPath || files.length === 0) {
    console.error("usage: rewrite-superseded-ids.mjs --register <path> [--write] <file...>");
    process.exit(1);
  }
  console.log(JSON.stringify(rewriteSupersededIdsScript(registerPath, files, !write), null, 2));
}

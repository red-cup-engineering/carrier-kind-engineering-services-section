#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const state = resolve(process.env.TRACE_CHAIN_STATE ?? new URL("../data/chain/eip155-5615610.json", import.meta.url).pathname);
const port = process.env.TRACE_CHAIN_PORT ?? "8561";
if (!/^[1-9][0-9]*$/u.test(port)) throw new Error("TRACE_CHAIN_PORT must be a positive decimal integer");
mkdirSync(dirname(state), {recursive: true});
const child = spawn(process.env.ANVIL_BIN ?? "anvil", [
  "--quiet", "--host", "127.0.0.1", "--port", port,
  "--chain-id", "5615610", "--hardfork", "cancun",
  "--state", state, "--state-interval", process.env.TRACE_CHAIN_STATE_INTERVAL ?? "30"
], {stdio: "inherit"});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.on("exit", (code, signal) => process.exit(signal ? 128 : (code ?? 1)));

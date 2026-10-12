#!/usr/bin/env node
import { runKdpLoginCli } from "../src/kdp-session.mjs";

await runKdpLoginCli({ args: process.argv.slice(2) });

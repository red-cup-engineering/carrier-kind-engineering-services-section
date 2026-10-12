#!/usr/bin/env node
// Read every conformance suite's golden vectors off its Lean specification and keep them beside the suite.
// `--suite <name>` reads one; `--stale` only those whose specification has moved since they were read.
// Lake runs under lean.slice through the section's wrapper.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl } from "../src/golden-vector/codec.mjs";
import { leanSpecificationAddress } from "../src/golden-vector/specification.mjs";
import { conformanceSuites, suiteLayout } from "../src/golden-vector/suites.mjs";

const lake = fileURLToPath(new URL("../deploy/lake", import.meta.url));
const flag = (name) => { const at = process.argv.indexOf(name); return at === -1 ? undefined : process.argv[at + 1]; };
const only = flag("--suite");
const staleOnly = process.argv.includes("--stale");

function run(args, cwd) {
    const result = spawnSync(lake, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0)
        throw new Error(`lake ${args.join(" ")} in ${cwd} exited ${result.status ?? result.signal}:\n${result.stdout}${result.stderr}`);
    return result.stdout;
}

for (const suite of conformanceSuites.filter((candidate) => only === undefined || candidate.name === only)) {
    const layout = suiteLayout(suite);
    const t = leanSpecificationAddress({ toolchain: layout.toolchain, roots: layout.roots, entry: layout.main, entryName: layout.entryName });
    const kept = existsSync(layout.vectors) ? decodeLeanGoldenVectorJsonl(readFileSync(layout.vectors, "utf8")) : [];
    if (staleOnly && kept.length > 0 && kept.every((row) => row.t === t)) {
        process.stdout.write(`${suite.name}: current at ${t}\n`);
        continue;
    }
    run(["build"], suite.package);
    const rows = decodeLeanGoldenVectorJsonl(run(["env", "lean", "--run", `${layout.entryName}.lean`, t], suite.package), suite.name);
    writeFileSync(layout.vectors, encodeLeanGoldenVectorJsonl(rows));
    process.stdout.write(`${suite.name}: ${rows.length} rows read off ${t}\n`);
}

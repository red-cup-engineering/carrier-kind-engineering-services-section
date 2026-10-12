#!/usr/bin/env node
// Gate a candidate commit on the house's conformance to its theory, against the commit it would
// follow: no layer finding or formal-object copy added, every Lean suite conforming, no judged
// declaration dropped (see src/conformance-gate.mjs). `--tree` is where the candidate's files are,
// ready to run; the candidate's own judge runs there.
//
//   node gate-conformance.mjs [--base <ref>] [--candidate <ref>] [--root <repository>] [--tree <dir>] [--json]
//
// In a release's verify step the commits and repository come from RELEASE_BASE_COMMIT,
// RELEASE_COMMIT and RELEASE_REPOSITORY, and the tree is the working directory, the materialized
// release. The verdict prints as JSON (`--json`) or as a report whose last lines are the counts and
// every new finding, since a refusal carries the tail of what its gate printed. Exits 1 when the
// candidate is refused.
import { resolve } from "node:path";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";
import { gateConformance } from "../src/conformance-gate.mjs";

const args = process.argv.slice(2);
const base = argument("--base", args) ?? process.env.RELEASE_BASE_COMMIT;
const candidate = argument("--candidate", args) ?? process.env.RELEASE_COMMIT;
if (base === undefined || candidate === undefined) {
    process.stderr.write("usage: gate-conformance [--base <ref>] [--candidate <ref>] [--root <repository>] [--tree <dir>] [--json]\n");
    process.exit(64);
}
const root = resolve(argument("--root", args) ?? process.env.RELEASE_REPOSITORY ?? process.cwd());
const verdict = gateConformance({ root, base, candidate, tree: resolve(argument("--tree", args) ?? process.cwd()) });

/** The report, ending with what a refusal must show: the counts, then each new finding and reason. */
function report(verdict) {
    const { layers, copies, judge } = verdict;
    const lines = [`conformance gate: ${verdict.candidate} against ${verdict.base}`];
    for (const row of layers.fell)
        lines.push(`  fell     ${row.edge}  ${row.specifier}  ${row.base}->${row.candidate}`);
    for (const row of copies.fell)
        lines.push(`  fell     ${row.object} ${row.family}  ${row.base}->${row.candidate}`);
    for (const suite of judge.suites)
        lines.push(`judge: ${suite.suite} ${suite.pending ? "pending (no realization yet)" : suite.reading}, ${suite.operations} declarations, ${suite.rows} rows${suite.conforms ? "" : ", does not conform"}${suite.stale ? ", stale" : ""}`);
    lines.push(`layers (house-layers v${layers.layers.base} -> v${layers.layers.candidate}, ${layers.mode} files ${layers.audited.base}/${layers.audited.candidate}): ${layers.removed} removed, ${layers.added} added`);
    for (const row of layers.rose)
        lines.push(`  ADDED    ${row.edge}  ${row.specifier}  ${row.base}->${row.candidate}  in ${row.importers.join(", ")}`);
    lines.push(`formal-object copies (${copies.mode} files ${copies.audited.base}/${copies.audited.candidate}): ${copies.removed} removed, ${copies.added} added`);
    for (const row of copies.rose)
        lines.push(`  ADDED    ${row.object} ${row.family}  ${row.base}->${row.candidate}  in ${row.importers.join(", ")}`);
    for (const reason of verdict.reasons)
        lines.push(`  refused: ${reason}`);
    lines.push(verdict.admitted ? "conformance gate: admitted" : `conformance gate: refused (${verdict.reasons.length} reasons)`);
    return `${lines.join("\n")}\n`;
}

process.stdout.write(args.includes("--json") ? `${JSON.stringify(verdict, null, 2)}\n` : report(verdict));
process.exitCode = verdict.admitted ? 0 : 1;

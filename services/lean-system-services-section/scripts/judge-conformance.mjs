#!/usr/bin/env node
// Judge every implementation against its suite's golden vectors. Prints each operation's reading;
// `--json` prints the judgments. Exits 1 when any suite does not conform. A suite no implementation has
// registered a realization for is pending: reported as an open obligation, never failed. A suite whose specification
// has moved since its vectors were read is judged on the kept vectors and reported stale, so a revision
// of the specification that changes no result never blocks a release, and one that does is caught when
// the vectors are read again (scripts/emit-golden-vectors.mjs --stale).
import { existsSync, readFileSync } from "node:fs";
import { decodeLeanGoldenVectorJsonl } from "../src/golden-vector/codec.mjs";
import { judgeGoldenVectors } from "../src/golden-vector/judge.mjs";
import { leanSpecificationAddress } from "../src/golden-vector/specification.mjs";
import { conformanceSuites, suiteLayout, suiteRealization } from "../src/golden-vector/suites.mjs";

const json = process.argv.includes("--json");
const judgments = [];
for (const suite of conformanceSuites) {
    const layout = suiteLayout(suite);
    if (!existsSync(layout.vectors)) {
        judgments.push({ suite: suite.name, conforms: false, missing: layout.vectors });
        continue;
    }
    const rows = decodeLeanGoldenVectorJsonl(readFileSync(layout.vectors, "utf8"), suite.name);
    const current = leanSpecificationAddress({ toolchain: layout.toolchain, roots: layout.roots, entry: layout.main, entryName: layout.entryName });
    const realization = await suiteRealization(suite);
    if (realization === undefined) {
        const operations = [...new Set(rows.map((row) => row.a))].sort();
        judgments.push({ suite: suite.name, pending: true, conforms: true, rows: rows.length, operations, stale: !rows.every((row) => row.t === current), current });
        continue;
    }
    const judgment = judgeGoldenVectors(rows, realization);
    judgments.push({ suite: suite.name, ...judgment, conforms: rows.length > 0 && judgment.conforms, stale: !judgment.specification.every((t) => t === current), current });
}

if (json) process.stdout.write(`${JSON.stringify(judgments, null, 2)}\n`);
else for (const judgment of judgments) {
    if (judgment.missing !== undefined) {
        process.stderr.write(`${judgment.suite}: no golden vectors at ${judgment.missing}\n`);
        continue;
    }
    if (judgment.pending) {
        process.stdout.write(`${judgment.suite}: pending, no realization registered (${judgment.operations.length} operations, ${judgment.rows} rows)${judgment.stale ? `; stale, specification now ${judgment.current}` : ""}\n`);
        continue;
    }
    process.stdout.write(`${judgment.suite}: ${judgment.reading}${judgment.conforms ? " (conforms)" : " (does not conform)"}${judgment.stale ? `; stale, specification now ${judgment.current}` : ""}\n`);
    for (const operation of judgment.operations) {
        process.stdout.write(`  ${operation.reading.padEnd(9)} ${operation.action} ${operation.tally.pos}/${operation.rows}\n`);
        for (const disagreement of operation.disagreements.slice(0, 4))
            process.stdout.write(`    ${disagreement.e}: expected ${JSON.stringify(disagreement.expected)}, ${Object.hasOwn(disagreement, "thrown") ? `threw ${disagreement.thrown}` : `got ${JSON.stringify(disagreement.result)}`}\n`);
    }
    for (const action of judgment.unjudged) process.stdout.write(`  unjudged  ${action} (realized, no vectors)\n`);
}
if (!judgments.every((judgment) => judgment.conforms)) process.exitCode = 1;

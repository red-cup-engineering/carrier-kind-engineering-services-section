#!/usr/bin/env node
// Copy the Lean-emitted Obsmetrologia golden vectors this package realizes into test/vectors/lean/,
// byte for byte. `--check` copies nothing and exits 1 on any missing, extra or differing file.
//
//   node scripts/sync-lean-vectors.mjs           # copy
//   node scripts/sync-lean-vectors.mjs --check   # verify
//
// Source: lean-system-services-section/lib/obsmetrologia-conformance/vectors (override with
// LEAN_VECTORS_DIR). Suites copied are the ones Four.sol / Evidence.sol realize, wholly or in part:
//   four   - Reading ops + FourMix ops               (Four.sol)
//   valued - the lossless carrier with witnesses     (Evidence.Pair)
//   record - the tally carrier                       (Evidence.record / Pair bitmaps, partly)
// `pool` is deliberately NOT copied: no library here realizes split/shares/dust/settleCycle/transfer/
// solveL/solveR/degeneracy. Add 'pool' to SUITES when a pool library lands.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const SUITES = ['four', 'valued', 'record'];
const SRC = process.env.LEAN_VECTORS_DIR
  ? resolve(process.env.LEAN_VECTORS_DIR)
  : resolve(
      pkg,
      '../../../services/computer-systems-engineering-services-section/services/' +
        'computer-proofing-system-services-section/services/lean-system-services-section/' +
        'lib/obsmetrologia-conformance/vectors',
    );
const DEST = join(pkg, 'test/vectors/lean');
const check = process.argv.includes('--check');

const jsons = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);
const problems = [];
let n = 0;

for (const suite of SUITES) {
  const from = join(SRC, suite);
  const to = join(DEST, suite);
  const files = jsons(from);
  if (files.length === 0) problems.push(`source suite missing or empty: ${from}`);
  if (!check) mkdirSync(to, { recursive: true });
  for (const f of files) {
    const bytes = readFileSync(join(from, f));
    const dst = join(to, f);
    if (check) {
      if (!existsSync(dst)) problems.push(`missing: ${suite}/${f}`);
      else if (!bytes.equals(readFileSync(dst))) problems.push(`differs: ${suite}/${f}`);
    } else {
      writeFileSync(dst, bytes);
    }
    n++;
  }
  if (check) for (const f of jsons(to)) if (!files.includes(f)) problems.push(`extra (not in source): ${suite}/${f}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`sync-lean-vectors: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`sync-lean-vectors: ${n} files ${check ? 'match' : 'copied'} (${SUITES.join(', ')})`);

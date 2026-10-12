// Minimal test runner. Imports the test module and executes each
// exported function in source order. Reports per-test pass/fail and an
// aggregate at the end.

import * as tests from './test/spotcomp.test.mjs';

let pass = 0;
let fail = 0;
const failures = [];

for (const [name, fn] of Object.entries(tests)) {
  if (typeof fn !== 'function') continue;
  try {
    const result = fn();
    // Support async tests too.
    if (result && typeof result.then === 'function') {
      await result;
    }
    process.stdout.write(`  ok ${name}\n`);
    pass += 1;
  } catch (err) {
    process.stdout.write(`  FAIL ${name}\n        ${err.message}\n`);
    fail += 1;
    failures.push({ name, message: err.message });
  }
}

const total = pass + fail;
console.log(`\n${pass}/${total} tests passed.`);
if (fail > 0) {
  console.log(`${fail} failure${fail === 1 ? '' : 's'}.`);
  process.exit(1);
}

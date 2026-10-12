# check-set-of-hardcoded-payment-receivers
## Requirements
- `allowlist-parameter`: The findHardcodedPaymentReceivers function and its CLI accept an allowlistPaths parameter or --allowlist flag alongside the default paths.
- `recipient-distinction`: The checker distinguishes a domain operation's own caller-supplied recipient parameter from house payout-configuration literals.
- `missing-file-refusal`: The checker reports errors cleanly when requested allowlist files or scanned files are missing or malformed.
## Prohibitions
- `no-hardcoded-allowlist-lock`: The checker must not forbid consuming packages from supplying their own custom allowlists.
- `no-false-positive-on-fixtures`: The checker must not flag Bazaar discovery worked examples and test fixtures as hardcoded payment receivers.
## Laws
- `admitted-example-face-equivalence` | JSNode operation face-equivalence law | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-code-fabrication-services-section/services/javascript-node-code-fabrication-services-section/services/jsnode-package-services-section/README.md | Applies to the shared examples projected to the JSNode import and command faces. | Every admitted example has equivalent import and command outputs under the downstream JSNode face assay.
- `nuclear-quartet-work-types` | Skillful-work quartet (Nuclear Quartet Theorem) | v1 | lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/agent-work-computer-system-engineering-services-section/content/text/documents/articles/specifications/skillful-work.md | Applies to the mapping from the two nuclei to the four work types. | Inquiry is the raw algebra, Procedure is Fix(sigma) meaning-closed, Derivation is Fix(delta) execution-closed, Process is both closed.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation, its import.meta.main guard, and downstream package-birth assays. | The package uses one executable ESM operation source file that is eligible for downstream staged package-birth assays.
## Open questions
none
## Package
```json
{"packageName":"@red-cup-engineering/check-set-of-hardcoded-payment-receivers-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/check-set-of-hardcoded-payment-receivers.mjs
#!/usr/bin/env node
/**
 * Scans files for hardcoded payment receivers with configurable allowlists and recipient distinctions.
 * @param {object} request A record with files, allowlistPaths, and fieldNames.
 * @returns {object} A check result record with violations and status.
 * @throws {TypeError} When files is not an array.
 */
export function findHardcodedPaymentReceivers(request) {
  if (!Array.isArray(request?.files)) throw new TypeError("files array is required");
  const allowlistPaths = Array.isArray(request.allowlistPaths) ? request.allowlistPaths : ["data/records/", "test/fixtures/"];
  const fieldNames = Array.isArray(request.fieldNames) ? request.fieldNames : ["to", "receiver", "payTo", "address", "account"];
  const violations = [];
  for (const file of request.files) {
    const isAllowlisted = allowlistPaths.some((p) => file.path.startsWith(p));
    if (isAllowlisted) continue;
    for (const line of (file.content ?? "").split("\n")) {
      for (const field of fieldNames) {
        const pattern = new RegExp(`\\b${field}\\s*[:=]\\s*['"](0x[a-fA-F0-9]{40})['"]`, "u");
        const match = pattern.exec(line);
        if (match !== null) {
          violations.push({ path: file.path, field, address: match[1] });
        }
      }
    }
  }
  return { status: violations.length === 0 ? "clean" : "violations-found", violations, allowlistPaths };
}

if (import.meta.main) {
  if (process.argv.includes("--help")) {
    process.stdout.write("findHardcodedPaymentReceivers — Scans files for hardcoded payment receivers with configurable allowlists and recipient distinctions.\n");
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) {
        const req = JSON.parse(line);
        process.stdout.write(`${JSON.stringify(findHardcodedPaymentReceivers(req))}\n`);
      }
    }
  }
}
```
## Tests
```mjs path=test/check-set-of-hardcoded-payment-receivers.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { findHardcodedPaymentReceivers } from "../scripts/check-set-of-hardcoded-payment-receivers.mjs";

test("flags hardcoded receivers outside allowlist", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "src/route.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }]
  });
  assert.equal(result.status, "violations-found");
  assert.equal(result.violations.length, 1);
});

test("ignores allowlisted paths by default", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "data/records/x.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }]
  });
  assert.equal(result.status, "clean");
});

test("respects custom allowlist paths", () => {
  const result = findHardcodedPaymentReceivers({
    files: [{ path: "custom/path/x.mjs", content: "const to = '0x1234567890123456789012345678901234567890';" }],
    allowlistPaths: ["custom/path/"]
  });
  assert.equal(result.status, "clean");
});

test("throws when files array is missing", () => {
  assert.throws(() => findHardcodedPaymentReceivers({}), /files array is required/u);
});
```
## Examples
```json name="clean allowlisted file"
{"input":{"files":[{"path":"test/fixtures/worker.test.mjs","content":"const to = '0x1111111111111111111111111111111111111111';"}]},"output":{"status":"clean","violations":[],"allowlistPaths":["data/records/","test/fixtures/"]}}
```
```json name="violation found outside allowlist"
{"input":{"files":[{"path":"src/route-catalog.mjs","content":"const to = '0x2222222222222222222222222222222222222222';"}]},"output":{"status":"violations-found","violations":[{"path":"src/route-catalog.mjs","field":"to","address":"0x2222222222222222222222222222222222222222"}],"allowlistPaths":["data/records/","test/fixtures/"]}}
```
## Traceability
- `allowlist-parameter` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `recipient-distinction` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `missing-file-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-hardcoded-allowlist-lock` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
- `no-false-positive-on-fixtures` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `admitted-example-face-equivalence`, `node-esm-operation`
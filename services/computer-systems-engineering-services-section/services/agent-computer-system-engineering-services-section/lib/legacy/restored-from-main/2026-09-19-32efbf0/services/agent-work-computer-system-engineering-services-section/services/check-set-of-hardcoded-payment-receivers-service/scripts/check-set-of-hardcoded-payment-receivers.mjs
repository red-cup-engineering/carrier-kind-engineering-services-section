#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";
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
  const result = await runJavascriptNodeOperation({ name: "check-set-of-hardcoded-payment-receivers", description: "Scans files for hardcoded payment receivers with configurable allowlists and recipient distinctions.", operation: findHardcodedPaymentReceivers }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

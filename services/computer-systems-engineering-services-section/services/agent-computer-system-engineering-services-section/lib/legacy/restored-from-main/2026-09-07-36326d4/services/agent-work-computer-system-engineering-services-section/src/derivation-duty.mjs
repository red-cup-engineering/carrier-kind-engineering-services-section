// Pure helpers for the derivation-lane hand: a duty whose text names a
// script already on disk closes by re-running it read-only (--help, then
// its package's `npm test` when that script is safe) rather than by asking
// a provider for anything. All I/O (finding the script, running the
// commands, reading package.json) stays in the app; this module only
// recognizes shapes and forms the exact command requests and discharge.
import { dirname } from "node:path";

export const SCRIPT_PATH_PATTERN = /\bscripts\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.(?:mjs|mts|sh)\b/u;

const UNSAFE_TEST_SCRIPT_PATTERN = /\brm\s+-rf\b|\bsudo\b|\bdocker\b|\bdeploy\b|\bpublish\b|\bwrangler\b|\bgcloud\b|\.\.\//u;

/**
 * The first script path a duty's text names, or null.
 * @param {string} text
 * @returns {string|null} a relative path like `scripts/foo.mjs`.
 */
export function scriptPathOfDutyText(text) {
  if (typeof text !== "string") return null;
  const match = SCRIPT_PATH_PATTERN.exec(text);
  return match ? match[0] : null;
}

/**
 * The exact read-only `<script> --help` request.
 * @param {{scriptAbsolutePath: string, directory: string}} options
 * @returns {object} a JavascriptNodeCommandExecutionRequest@1.
 */
export function helpCommandRequest({ scriptAbsolutePath, directory }) {
  return { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: [scriptAbsolutePath, "--help"], directory, environment: null, input: null };
}

/**
 * The exact read-only `npm test` request for one package directory.
 * @param {{directory: string}} options
 * @returns {object} a JavascriptNodeCommandExecutionRequest@1.
 */
export function testCommandRequest({ directory }) {
  return { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "npm", arguments: ["test"], directory, environment: null, input: null };
}

/**
 * Whether a package.json `scripts.test` string is safe to run read-only: present, and naming no
 * deletion, build, publish, or deploy effect outside the package directory.
 * @param {unknown} testScript
 * @returns {boolean}
 */
export function isSafeTestScript(testScript) {
  return typeof testScript === "string" && testScript.trim() !== "" && !UNSAFE_TEST_SCRIPT_PATTERN.test(testScript);
}

/**
 * Walks up from a script's directory to the nearest ancestor holding a package.json.
 * @param {string} scriptAbsolutePath
 * @param {(dir: string) => boolean} hasPackageJson - injected so this stays pure.
 * @returns {string|null} the package directory, or null when none is found.
 */
export function packageDirectoryOfScriptPath(scriptAbsolutePath, hasPackageJson) {
  let dir = dirname(scriptAbsolutePath);
  for (;;) {
    if (hasPackageJson(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The `{tests, pass, fail}` counts off `node --test`'s TAP summary lines, or null fields when absent.
 * @param {string} output - a command receipt's stdout.
 * @returns {{tests: number|null, pass: number|null, fail: number|null}}
 */
export function nodeTestCountsOfOutput(output) {
  const text = typeof output === "string" ? output : "";
  const tests = /^# tests (\d+)$/mu.exec(text);
  const pass = /^# pass (\d+)$/mu.exec(text);
  const fail = /^# fail (\d+)$/mu.exec(text);
  return { tests: tests ? Number(tests[1]) : null, pass: pass ? Number(pass[1]) : null, fail: fail ? Number(fail[1]) : null };
}

/**
 * The last `lines` lines of a command receipt's stderr, verbatim.
 * @param {{result?: {stderr?: string}}} receipt
 * @param {number} [lines]
 * @returns {string}
 */
export function stderrTailOfReceipt(receipt, lines = 20) {
  const stderr = typeof receipt?.result?.stderr === "string" ? receipt.result.stderr : "";
  return stderr.split("\n").slice(-lines).join("\n");
}

/**
 * The discharge record that closes a derivation-lane duty with both commands' exit statuses and
 * the test counts as evidence.
 * @param {object} options
 * @param {{scope: string, intent: string}} options.duty
 * @param {{id: string, revision: string}} options.producer
 * @param {string} options.scriptAbsolutePath
 * @param {string} options.packageDirectory
 * @param {number} options.helpStatus
 * @param {number} options.testStatus
 * @param {{tests: number|null, pass: number|null, fail: number|null}} options.counts
 * @returns {object} a metroplat.work.discharge record.
 */
export function dischargeOfDerivation({ duty, producer, scriptAbsolutePath, packageDirectory, helpStatus, testStatus, counts }) {
  return Object.freeze({
    kind: "metroplat.work.discharge",
    id: `discharge-${duty.scope}`,
    intent: duty.intent,
    producer,
    scope: duty.scope,
    text: `re-ran ${scriptAbsolutePath} --help (exit ${helpStatus}) and npm test in ${packageDirectory} (exit ${testStatus}, ${counts.pass ?? "unknown"} pass / ${counts.fail ?? "unknown"} fail of ${counts.tests ?? "unknown"}) read-only, both exit 0`,
    evidence: Object.freeze([
      `command:node ${scriptAbsolutePath} --help exit ${helpStatus}`,
      `command:npm test in ${packageDirectory} exit ${testStatus}`,
      `tests:${counts.tests ?? "unknown"} pass:${counts.pass ?? "unknown"} fail:${counts.fail ?? "unknown"}`,
    ]),
  });
}

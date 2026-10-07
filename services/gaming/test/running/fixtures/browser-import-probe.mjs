/**
 * browser-import-probe.mjs — run as a fresh child process by replay.browser-import.test.mts.
 * Registers block-node-crypto-loader.mjs (argv[2]) as a module-customization hook, then
 * imports the target module (argv[3]) under it. On success, also calls the target's
 * `hashPosition` (if exported) against a fixed value and prints the resulting digest, so the
 * caller can assert the fallback isn't just "didn't throw" but produces the right bytes.
 *
 * Prints `IMPORT_OK <digest-or-none>` and exits 0 on success; on failure the import rejection
 * propagates, Node prints it to stderr, and the process exits non-zero — exactly the signal
 * the test asserts on.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const [, , hookPath, targetPath] = process.argv;
register(pathToFileURL(hookPath).href);

const mod = await import(pathToFileURL(targetPath).href);
const digest = typeof mod.hashPosition === 'function' ? mod.hashPosition({ a: 1, b: [1, 2, 3], c: 'x' }) : 'none';
console.log(`IMPORT_OK ${digest}`);

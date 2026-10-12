// fiber-registry.mjs — the language fibers this package reaches through
// @lenticule-science/panini, the composing app over the communicating
// engine and the house fibers (linguistics custody); panini pins the fiber
// packages, this package pins panini. Checked 2026-09-02: none of the five
// published fibers (english 0.1.7, lakota 0.1.4, latin 0.1.4, mandarin
// 0.1.2, tokipona 0.1.4) nor communicating 0.0.6 exports a proposition ->
// surface-text generator; their exports read FROM text, so through this
// registry a fiber JUDGES a candidate rendering. A structure -> surface
// English realizer does exist as revival inventory, unpublished:
// linguistics-services-section/lib/legacy/2026-07-03-communicating-in-english/src/realizing/realize.mts
// (realizeClause over the same communicating algebra). Reviving it onto
// the published english fiber is the candidate-text source for English;
// until then candidates come from outside (see render-claim-in-language.mjs).

import { load, FIBERS } from "@lenticule-science/panini";

const FIBER_PACKAGES = FIBERS;

export const FIBER_NAMES = Object.freeze(Object.keys(FIBER_PACKAGES));

export class UnknownFiberError extends Error {
  constructor(name) {
    super(`unknown language fiber ${JSON.stringify(name)}; known fibers: ${FIBER_NAMES.join(", ")}`);
    this.name = "UnknownFiberError";
    this.fiber = name;
  }
}

// Read the fiber package's exact installed version from its own
// package.json, never hand-copied, so a re-pin cannot drift the receipt.
async function packageVersion(packageName) {
  const manifestUrl = import.meta.resolve(`${packageName}/package.json`);
  const { default: manifest } = await import(manifestUrl, { with: { type: "json" } });
  return manifest.version;
}

/** Load one language fiber: its exact package name, installed version, and a
 * CompiledBundle ready for `read`/`grammaticality`. Never produces surface
 * text — see the module-header survey finding. */
export async function loadFiber(name) {
  const packageName = FIBER_PACKAGES[name];
  if (packageName === undefined) throw new UnknownFiberError(name);
  const [bundle, version] = await Promise.all([load(name), packageVersion(packageName)]);
  return Object.freeze({ fiber: name, packageName, version, bundle });
}

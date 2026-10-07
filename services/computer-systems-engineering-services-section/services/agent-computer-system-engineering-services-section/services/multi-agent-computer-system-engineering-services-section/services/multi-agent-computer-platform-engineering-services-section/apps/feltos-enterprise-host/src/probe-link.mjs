import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * What a boot probe must LINK although it does not run it. A probe runs no clock, so the live
 * node's execution worker and its carriers (codex, claude-code, antigravity, the inference
 * receiver and their shared workspace layer) are never started under it; an ESM link error in any
 * of them (a missing named export) used to pass the probe and crash the live node at startup.
 * The probe imports each entry point here and reports each that fails to link as a failed family
 * (`link:<specifier>`), which /healthz carries and the probe's reading refuses.
 */

const HARNESS = "@red-cup-engineering/agent-harness-computer-system-engineering-services-section";
/** The harness package's export subpaths that are carrier code: the registry the live path imports from. */
const CARRIER_SUBPATH = /^\.\/(?:carrier|codex|claude-code|antigravity)\//u;
/** Imports the live path makes lazily, inside functions a probe never calls, named by the package that makes them. */
const LAZY_IMPORTS = Object.freeze([
  Object.freeze({ from: HARNESS, specifiers: Object.freeze([
    "@red-cup-engineering/computer-inference-engine/dispatch/direct-endpoint-provider",
    "@red-cup-engineering/computer-inference-engine/openai/tool-agent",
    "@red-cup-engineering/computer-code-development-engine/git/operations",
  ]) }),
]);

function packageJsonOf(specifier, require) {
  let directory = dirname(require.resolve(specifier));
  for (;;) {
    const candidate = join(directory, "package.json");
    if (existsSync(candidate) && JSON.parse(readFileSync(candidate, "utf8")).name === HARNESS) return candidate;
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`no ${HARNESS} package.json above ${specifier}`);
    directory = parent;
  }
}

/** The module URLs a probe links: every carrier export of the harness package, and the lazy imports the carriers make. */
export function liveLinkTargets({ hostRequire = createRequire(import.meta.url) } = {}) {
  const manifestPath = packageJsonOf(`${HARNESS}/carrier/workspace`, hostRequire);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const harnessRequire = createRequire(manifestPath);
  const targets = [];
  for (const subpath of Object.keys(manifest.exports ?? {}).filter((key) => CARRIER_SUBPATH.test(key))) {
    const specifier = `${HARNESS}/${subpath.slice(2)}`;
    targets.push(Object.freeze({ specifier, url: pathToFileURL(harnessRequire.resolve(specifier)).href }));
  }
  for (const { specifiers } of LAZY_IMPORTS) {
    for (const specifier of specifiers) targets.push(Object.freeze({ specifier, url: pathToFileURL(harnessRequire.resolve(specifier)).href }));
  }
  return Object.freeze(targets);
}

/** Import (link and evaluate) each target; return the failures as failed families. */
export async function linkLiveModules({ targets = liveLinkTargets(), load = (url) => import(url) } = {}) {
  const failed = [];
  let linked = 0;
  for (const { specifier, url } of targets) {
    try { await load(url); linked += 1; }
    catch (error) { failed.push(Object.freeze({ verb: `link:${specifier}`, error: error instanceof Error ? error.message : String(error) })); }
  }
  return Object.freeze({ linked, failed: Object.freeze(failed), modules: Object.freeze(targets.map((target) => target.specifier)) });
}

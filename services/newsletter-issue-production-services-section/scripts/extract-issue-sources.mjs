/**
 * @module extract-issue-sources
 * The effect: read one or more Markdown carrier files' frontmatter
 * `references:` blocks (the shape predication-literature-review-long-
 * covid-mechanisms.md uses) and merge them into one CSL-JSON pool keyed
 * by citekey, for an issue's `references` field.
 */

import { readFileSync } from "node:fs";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";

/**
 * Harvest one carrier's frontmatter `references` block into a
 * citekey-keyed CSL-JSON record; `{}` when the carrier has none.
 * @param {string} markdownText
 * @returns {Readonly<Record<string, object>>}
 * @throws {TypeError} when frontmatter.references is present but not an object
 */
export function extractReferencesFromCarrier(markdownText) {
  const { frontmatter } = readMarkdownFrontmatter(markdownText, { absentFrontmatter: "empty" });
  const references = frontmatter.references;
  if (references === undefined) return Object.freeze({});
  if (references === null || typeof references !== "object" || Array.isArray(references)) {
    throw new TypeError("extractReferencesFromCarrier: frontmatter.references must be an object");
  }
  return Object.freeze({ ...references });
}

/**
 * Harvest and merge the `references` frontmatter blocks of several carrier
 * files into one CSL-JSON pool keyed by citekey.
 * @param {string[]} carrierPaths
 * @param {{readFileImpl?: (path: string) => string}} [options]
 * @returns {Readonly<Record<string, object>>}
 * @throws {TypeError} when two carriers disagree on the same citekey's item
 */
export function extractIssueSources(carrierPaths, { readFileImpl = (path) => readFileSync(path, "utf8") } = {}) {
  const pool = {};
  for (const path of carrierPaths) {
    const references = extractReferencesFromCarrier(readFileImpl(path));
    for (const [key, item] of Object.entries(references)) {
      if (key in pool && JSON.stringify(pool[key]) !== JSON.stringify(item)) {
        throw new TypeError(`extractIssueSources: citekey "${key}" conflicts between carriers (last seen in ${path})`);
      }
      pool[key] = item;
    }
  }
  return Object.freeze(pool);
}

/**
 * CLI entry: `<carrier.md> [carrier.md...]`, prints the merged pool.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Readonly<Record<string, object>>}
 * @throws {Error} when no carrier paths are given
 */
export function runExtractIssueSources(argv) {
  if (argv.length === 0) throw new Error("usage: extract-issue-sources.mjs <carrier.md> [carrier.md...]");
  return extractIssueSources(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(runExtractIssueSources(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

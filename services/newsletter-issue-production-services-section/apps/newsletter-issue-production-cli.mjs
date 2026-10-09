#!/usr/bin/env node
/**
 * @module newsletter-issue-production-cli
 * The composed face: one CLI dispatching to compose-issue and
 * extract-issue-sources.
 */

import { runComposeIssue } from "../scripts/compose-issue.mjs";
import { runExtractIssueSources } from "../scripts/extract-issue-sources.mjs";

const USAGE = `usage: newsletter-issue-production-cli <command> [args...]
  compose <issue.json> <out-dir> <feed-link> [pubDate] [format]
  extract-sources <carrier.md> [carrier.md...]`;

/**
 * Dispatch one CLI invocation to its script.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {object} the JSON-serializable result to print
 * @throws {Error} on an unknown or malformed command
 */
export function runNewsletterIssueProductionCli(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case "compose": {
      const result = runComposeIssue(rest);
      return { valid: result.report.valid, files: result.files };
    }
    case "extract-sources":
      return runExtractIssueSources(rest);
    default:
      throw new Error(USAGE);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(JSON.stringify(runNewsletterIssueProductionCli(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

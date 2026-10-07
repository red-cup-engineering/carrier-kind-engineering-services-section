/**
 * @module compose-issue
 * The effect: read one issue JSON file, validate it, and write all three
 * renderings — Markdown, paste-ready HTML, and an RSS/Atom feed-item
 * fragment — into an output directory.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { validateIssue, renderMarkdown, renderPasteHtml, renderFeedItem } from "../src/newsletter-issue.mjs";

/**
 * Compose one issue's three renderings, writing them to
 * `<outDir>/issue.md`, `<outDir>/issue.paste.html`, and
 * `<outDir>/issue.feed-item.<rss|atom>.xml`.
 * @param {object} issue - a newsletter-issue object (see src/newsletter-issue.mjs)
 * @param {string} outDir
 * @param {{link: string, guid?: string, pubDate?: Date|string, format?: "rss"|"atom"}} feedOptions
 * @returns {{report: object, files: {markdown: string, pasteHtml: string, feedItem: string}}}
 * @throws {TypeError} when issue fails validateIssue, or feedOptions.link is missing
 */
export function composeIssue(issue, outDir, feedOptions) {
  const report = validateIssue(issue);
  if (!report.valid) {
    const messages = report.findings.filter((entry) => entry.severity === "error").map((entry) => entry.message);
    throw new TypeError(`composeIssue: invalid issue — ${messages.join("; ")}`);
  }
  mkdirSync(outDir, { recursive: true });
  const markdown = renderMarkdown(issue);
  const pasteHtml = renderPasteHtml(issue);
  const feedItem = renderFeedItem(issue, feedOptions);
  const files = {
    markdown: join(outDir, "issue.md"),
    pasteHtml: join(outDir, "issue.paste.html"),
    feedItem: join(outDir, `issue.feed-item.${feedOptions.format === "atom" ? "atom" : "rss"}.xml`),
  };
  writeFileSync(files.markdown, markdown, "utf8");
  writeFileSync(files.pasteHtml, pasteHtml, "utf8");
  writeFileSync(files.feedItem, feedItem, "utf8");
  return { report, files };
}

/**
 * CLI entry: `<issue.json> <out-dir> <feed-link> [pubDate] [format]`.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {ReturnType<typeof composeIssue>}
 * @throws {Error} when required arguments are missing
 */
export function runComposeIssue(argv) {
  const [issuePath, outDir, link, pubDate, format] = argv;
  if (!issuePath || !outDir || !link) {
    throw new Error("usage: compose-issue.mjs <issue.json> <out-dir> <feed-link> [pubDate] [format]");
  }
  const issue = JSON.parse(readFileSync(issuePath, "utf8"));
  return composeIssue(issue, outDir, { link, pubDate, format });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = runComposeIssue(process.argv.slice(2));
    console.log(JSON.stringify({ valid: result.report.valid, files: result.files }, null, 2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

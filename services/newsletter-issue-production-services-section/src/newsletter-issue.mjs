import { renderMarkdownInlineHtml } from "@red-cup-engineering/markdown-engineering-services-section/render-markdown-inline-html";
import { readMarkdownSource, projectMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
/**
 * @module newsletter-issue
 * Platform-neutral newsletter-issue semantics: an issue is `{title, dek,
 * sections: [{heading, "body-markdown", sources}], references}` — CSL-JSON
 * keyed by citekey. See README for the paste-ready hand-roll rationale.
 */

/**
 * The CSL-JSON `type` vocabulary (CSL 1.0 spec) for validating
 * `references` entries — an external standard, not house vocabulary.
 * @type {ReadonlySet<string>}
 */
const CSL_TYPES = new Set([
  "article-journal", "article-magazine", "article-newspaper", "book", "chapter",
  "paper-conference", "report", "webpage", "thesis", "manuscript", "dataset",
  "entry-encyclopedia", "entry-dictionary", "post", "post-weblog", "speech",
  "document", "broadcast", "interview", "legislation", "patent", "review",
  "software", "standard", "figure", "graphic", "map", "song", "motion_picture",
]);

/**
 * @param {unknown} value
 * @returns {value is Readonly<Record<string, unknown>>}
 */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string} true for a string with non-whitespace content
 */
function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isFictionIssue(issue) {
  return isRecord(issue) && ("canon" in issue || "serial" in issue || "episode" in issue || "access" in issue);
}

/**
 * @param {string} rule
 * @param {"error"|"warning"} severity
 * @param {string} message
 * @param {Record<string, unknown>} [extra]
 * @returns {Readonly<{rule: string, severity: string, message: string}>}
 */
function finding(rule, severity, message, extra = {}) {
  return Object.freeze({ rule, severity, message, ...extra });
}

/**
 * Validate one newsletter issue: its top-level shape, each section, every
 * `sources` citekey's resolution against `references`, and each reference
 * item's CSL-JSON minimum shape (`id` matching its own key, a member of
 * the CSL `type` vocabulary, a non-empty `title`).
 * @param {unknown} issue
 * @returns {Readonly<{kind: string, valid: boolean, findings: ReadonlyArray<object>}>}
 * @throws {TypeError} when issue is not an object
 */
export function validateFictionIssue(issue) {
  if (!isRecord(issue)) throw new TypeError("validateFictionIssue requires an issue object");
  const findings = [];
  for (const field of ["canon", "serial", "title", "body", "next"]) {
    if (!nonEmptyString(issue[field])) findings.push(finding(`${field}-required`, "error", `issue.${field} must be a non-empty string`));
  }
  if (!Number.isInteger(issue.episode) || issue.episode < 1) findings.push(finding("episode-required", "error", "issue.episode must be a positive integer"));
  if (typeof issue.previously !== "string") findings.push(finding("previously-required", "error", "issue.previously must be a string"));
  else if (issue.episode > 1 && issue.previously.trim() === "") findings.push(finding("previously-empty", "error", "issue.previously must recap an episode after the first"));
  if (issue.access !== "free" && issue.access !== "paid") findings.push(finding("access-invalid", "error", 'issue.access must be "free" or "paid"'));
  return Object.freeze({
    kind: "red-cup-engineering.fiction-newsletter-issue.validation-report",
    valid: findings.every((entry) => entry.severity !== "error"),
    findings: Object.freeze(findings),
  });
}

export function validateIssue(issue) {
  if (!isRecord(issue)) throw new TypeError("validateIssue requires an issue object");
  if (isFictionIssue(issue)) return validateFictionIssue(issue);
  const findings = [];

  if (!nonEmptyString(issue.title)) findings.push(finding("title-required", "error", "issue.title must be a non-empty string"));
  if (typeof issue.dek !== "string") findings.push(finding("dek-required", "error", "issue.dek must be a string"));
  else if (issue.dek.trim() === "") findings.push(finding("dek-empty", "warning", "issue.dek is empty"));

  const references = isRecord(issue.references) ? issue.references : null;
  if (references === null) findings.push(finding("references-required", "error", "issue.references must be a citekey-keyed object"));

  const citedKeys = new Set();
  if (!Array.isArray(issue.sections) || issue.sections.length === 0) {
    findings.push(finding("sections-required", "error", "issue.sections must be a non-empty array"));
  } else {
    issue.sections.forEach((section, index) => {
      const path = `sections[${index}]`;
      if (!isRecord(section)) { findings.push(finding("section-shape", "error", `${path} must be an object`, { path })); return; }
      if (!nonEmptyString(section.heading)) findings.push(finding("section-heading-required", "error", `${path}.heading must be a non-empty string`, { path }));
      if (!nonEmptyString(section["body-markdown"])) findings.push(finding("section-body-required", "error", `${path}."body-markdown" must be a non-empty string`, { path }));
      const sources = section.sources;
      if (sources !== undefined) {
        if (!Array.isArray(sources) || sources.some((key) => typeof key !== "string")) {
          findings.push(finding("section-sources-shape", "error", `${path}.sources must be a string array`, { path }));
        } else {
          for (const key of sources) {
            citedKeys.add(key);
            if (references !== null && !(key in references)) {
              findings.push(finding("unresolved-source", "error", `${path}.sources cites "${key}", absent from issue.references`, { path, citekey: key }));
            }
          }
        }
      }
    });
  }

  if (references !== null) {
    for (const [key, item] of Object.entries(references)) {
      const path = `references.${key}`;
      if (!isRecord(item)) { findings.push(finding("reference-shape", "error", `${path} must be an object`, { path })); continue; }
      if (item.id !== key) findings.push(finding("reference-id-mismatch", "error", `${path}.id ("${item.id}") must equal its own key ("${key}")`, { path }));
      if (!nonEmptyString(item.type) || !CSL_TYPES.has(item.type)) findings.push(finding("reference-type-invalid", "error", `${path}.type must be a CSL-JSON type`, { path }));
      if (!nonEmptyString(item.title)) findings.push(finding("reference-title-required", "error", `${path}.title must be a non-empty string`, { path }));
      if (!citedKeys.has(key)) findings.push(finding("unused-reference", "warning", `${path} is never cited by any section.sources`, { path, citekey: key }));
    }
  }

  return Object.freeze({
    kind: "red-cup-engineering.newsletter-issue.validation-report",
    valid: findings.every((entry) => entry.severity !== "error"),
    findings: Object.freeze(findings),
  });
}

/**
 * Throw with every error-severity validateIssue finding when invalid; a
 * no-op (returns the report) otherwise — the gate the three render
 * functions share so none of them renders an unvalidated issue.
 * @param {unknown} issue
 * @param {string} fnName - caller name, for the thrown message
 * @returns {ReturnType<typeof validateIssue>}
 * @throws {TypeError} when issue fails validation
 */
function assertValidIssue(issue, fnName) {
  const report = validateIssue(issue);
  if (!report.valid) {
    const messages = report.findings.filter((entry) => entry.severity === "error").map((entry) => entry.message);
    throw new TypeError(`${fnName}: invalid issue — ${messages.join("; ")}`);
  }
  return report;
}

/**
 * @param {{literal?: string, given?: string, family?: string}} name
 * @returns {string|undefined}
 */
function authorName(name) {
  if (nonEmptyString(name?.literal)) return name.literal.trim();
  const parts = [name?.given, name?.family].filter(nonEmptyString).map((part) => part.trim());
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * @param {ReadonlyArray<unknown>} [authors]
 * @returns {string|undefined} authors joined "A, B & C"
 */
function authorsList(authors) {
  if (!Array.isArray(authors)) return undefined;
  const names = authors.map((entry) => (isRecord(entry) ? authorName(entry) : undefined)).filter(nonEmptyString);
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

/**
 * @param {{"date-parts"?: ReadonlyArray<ReadonlyArray<number>>}} [issued]
 * @returns {string|undefined}
 */
function issuedYear(issued) {
  const year = issued?.["date-parts"]?.[0]?.[0];
  return Number.isInteger(year) ? String(year) : undefined;
}

/**
 * The URL a citation should link to: the item's own `URL`, else a
 * `https://doi.org/` link built from its `DOI`, else undefined.
 * @param {Readonly<Record<string, unknown>>} item - a CSL-JSON item
 * @returns {string|undefined}
 */
export function citationUrl(item) {
  if (nonEmptyString(item?.URL)) return item.URL.trim();
  if (nonEmptyString(item?.DOI)) return `https://doi.org/${item.DOI.trim()}`;
  return undefined;
}

/**
 * Format one CSL-JSON item as a plain-text citation line: authors (year).
 * Title. Container, volume(issue), pages. URL — every part omitted, never
 * emitted empty, when the item lacks it.
 * @param {Readonly<Record<string, unknown>>} item - a CSL-JSON item
 * @returns {string}
 * @throws {TypeError} when item is not an object
 */
export function formatCitation(item) {
  if (!isRecord(item)) throw new TypeError("formatCitation requires a CSL-JSON item");
  const parts = [];
  const authors = authorsList(item.author);
  const year = issuedYear(item.issued);
  if (authors !== undefined) parts.push(year !== undefined ? `${authors} (${year}).` : `${authors}.`);
  else if (year !== undefined) parts.push(`(${year}).`);
  if (nonEmptyString(item.title)) parts.push(`${item.title.trim()}.`);
  if (nonEmptyString(item["container-title"])) {
    let container = item["container-title"].trim();
    if (nonEmptyString(item.volume)) {
      container += `, ${item.volume.trim()}`;
      if (nonEmptyString(item.issue)) container += `(${item.issue.trim()})`;
    }
    if (nonEmptyString(item.page)) container += `, ${item.page.trim()}`;
    parts.push(`${container}.`);
  }
  const url = citationUrl(item);
  if (url !== undefined) parts.push(url);
  return parts.join(" ");
}

/**
 * Render one validated issue to clean Markdown: a title H1, an italic dek,
 * each section as an H2 with its body-markdown verbatim and a linked
 * "Sources" line, and a trailing "## References" list in citekey order.
 * @param {unknown} issue
 * @returns {string}
 * @throws {TypeError} when issue fails validateIssue
 */
export function renderMarkdown(issue) {
  assertValidIssue(issue, "renderMarkdown");
  if (isFictionIssue(issue)) {
    const lines = [`# ${issue.serial.trim()} — ${issue.episode}. ${issue.title.trim()}`];
    if (issue.previously.trim()) lines.push("", `**Previously:** ${issue.previously.trim()}`);
    lines.push("", issue.body.trim(), "", "---", "", `**Next:** ${issue.next.trim()}`, "", `**Access:** ${issue.access}`);
    return `${lines.join("\n")}\n`;
  }
  const lines = [`# ${issue.title.trim()}`];
  if (issue.dek.trim() !== "") lines.push("", `_${issue.dek.trim()}_`);

  for (const section of issue.sections) {
    lines.push("", `## ${section.heading.trim()}`, "", section["body-markdown"].trim());
    const sourceLinks = (section.sources ?? []).map((key) => {
      const url = citationUrl(issue.references[key]);
      return url === undefined ? `[${key}]` : `[${key}](${url})`;
    });
    if (sourceLinks.length > 0) lines.push("", `**Sources:** ${sourceLinks.join(", ")}`);
  }

  const referenceKeys = Object.keys(issue.references);
  if (referenceKeys.length > 0) {
    lines.push("", "## References", "");
    for (const key of referenceKeys) lines.push(`- ${formatCitation(issue.references[key])}`);
  }
  return `${lines.join("\n")}\n`;
}

const HTML_ESCAPES = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" });

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value.replace(/[&<>"]/gu, (char) => HTML_ESCAPES[char]);
}

// The paste carrier admits only these inline effects. Unsupported Markdown
// remains escaped source text; the shared renderer owns recognition and links.
function renderInlineSubset(text) {
  return renderMarkdownInlineHtml(text, { allowedFeatures: ["markdown-link", "strong", "em", "strong-em"] });
}

/**
 * Bounded block-level subset renderer for the paste-ready HTML profile:
 * blank-line-separated paragraphs, `## `/`### ` heading lines, and
 * consecutive `> `-prefixed lines as one blockquote. Any other heading
 * depth fails the heading pattern and falls through to an escaped
 * paragraph — never an h1 or deeper heading, by construction.
 * @param {string} markdown
 * @returns {string} HTML built only from h2/h3/p/blockquote/a/strong/em
 */
function renderBlockSubsetHtml(markdown) {
  const normalized = markdown.replace(/\r\n?/gu, "\n").trim();
  if (normalized === "") return "";
  const source = readMarkdownSource(normalized, { frontmatter: false });
  const headings = new Map(projectMarkdownStructure(source).headings.map((heading) => [heading.line, heading]));
  const blocks = normalized.split(/\n{2,}/u);
  let offset = 0;
  return blocks.map((block) => {
    const start = normalized.indexOf(block, offset);
    const line = normalized.slice(0, start).split("\n").length;
    offset = start + block.length;
    const lines = block.split("\n");
    const heading = headings.get(line);
    if (heading && [2, 3].includes(heading.level) && lines.length === heading.declarationEndLine - heading.line + 1) {
      return `<h${heading.level}>${renderInlineSubset(heading.title)}</h${heading.level}>`;
    }
    if (lines.every((line) => /^>\s?/u.test(line))) {
      const inner = lines.map((line) => line.replace(/^>\s?/u, "")).join(" ").trim();
      return `<blockquote><p>${renderInlineSubset(inner)}</p></blockquote>`;
    }
    return `<p>${renderInlineSubset(lines.join(" ").trim())}</p>`;
  }).join("\n");
}

/**
 * Render one validated issue to paste-ready HTML: only h2, h3, p,
 * blockquote, a, strong, and em ever appear — what a rich-text editor
 * such as Substack's accepts on paste. No title/h1: the target editor
 * supplies its own title field. The dek (non-empty) opens as an italic
 * paragraph, each section is an H2 plus its body-markdown run through the
 * bounded subset renderer and a linked "Sources" paragraph, and a
 * trailing "References" H2 lists every reference, in citekey order.
 * @param {unknown} issue
 * @returns {string}
 * @throws {TypeError} when issue fails validateIssue
 */
export function renderPasteHtml(issue) {
  assertValidIssue(issue, "renderPasteHtml");
  if (isFictionIssue(issue)) {
    const parts = [];
    if (issue.previously.trim()) parts.push(`<p><strong>Previously:</strong> ${renderInlineSubset(issue.previously.trim())}</p>`);
    parts.push(renderBlockSubsetHtml(issue.body));
    parts.push(`<p><strong>Next:</strong> ${renderInlineSubset(issue.next.trim())}</p>`);
    parts.push(`<p><strong>Access:</strong> ${escapeHtml(issue.access)}</p>`);
    return parts.filter(Boolean).join("\n");
  }
  const parts = [];
  if (issue.dek.trim() !== "") parts.push(`<p><em>${renderInlineSubset(issue.dek.trim())}</em></p>`);

  for (const section of issue.sections) {
    parts.push(`<h2>${renderInlineSubset(section.heading.trim())}</h2>`);
    parts.push(renderBlockSubsetHtml(section["body-markdown"]));
    const sourceLinks = (section.sources ?? []).map((key) => {
      const url = citationUrl(issue.references[key]);
      const label = escapeHtml(key);
      return url === undefined ? label : `<a href="${escapeHtml(url)}">${label}</a>`;
    });
    if (sourceLinks.length > 0) parts.push(`<p><strong>Sources:</strong> ${sourceLinks.join(", ")}</p>`);
  }

  const referenceKeys = Object.keys(issue.references);
  if (referenceKeys.length > 0) {
    parts.push("<h2>References</h2>");
    for (const key of referenceKeys) {
      const item = issue.references[key];
      const url = citationUrl(item);
      const citation = escapeHtml(formatCitation(item));
      parts.push(url === undefined ? `<p>${citation}</p>` : `<p>${citation} <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`);
    }
  }
  return parts.filter((part) => part !== "").join("\n");
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXmlText(value) {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXmlAttr(value) {
  return escapeXmlText(value).replace(/"/gu, "&quot;");
}

/**
 * @param {string} value
 * @returns {string} value safe to place inside a CDATA section
 */
function wrapCdata(value) {
  return value.replace(/\]\]>/gu, "]]]]><![CDATA[>");
}

/**
 * Render one validated issue to a single RSS `<item>` or Atom `<entry>`
 * fragment (not a whole feed) — content is renderPasteHtml(issue), carried
 * in a CDATA section.
 * @param {unknown} issue
 * @param {{link: string, guid?: string, pubDate?: Date|string, format?: "rss"|"atom"}} options
 * @returns {string}
 * @throws {TypeError} when issue fails validateIssue, or link/pubDate/format are malformed
 */
export function renderFeedItem(issue, { link, guid, pubDate, format = "rss" } = {}) {
  assertValidIssue(issue, "renderFeedItem");
  if (!nonEmptyString(link)) throw new TypeError("renderFeedItem requires options.link");
  if (format !== "rss" && format !== "atom") throw new TypeError('renderFeedItem requires options.format to be "rss" or "atom"');
  const resolvedGuid = nonEmptyString(guid) ? guid.trim() : link.trim();
  const date = pubDate instanceof Date ? pubDate : new Date(nonEmptyString(pubDate) ? pubDate : Date.now());
  if (Number.isNaN(date.getTime())) throw new TypeError("renderFeedItem requires a valid options.pubDate");

  const displayTitle = isFictionIssue(issue) ? `${issue.serial.trim()} — ${issue.episode}. ${issue.title.trim()}` : issue.title.trim();
  const title = escapeXmlText(displayTitle);
  const html = wrapCdata(renderPasteHtml(issue));
  if (format === "rss") {
    return [
      "<item>",
      `  <title>${title}</title>`,
      `  <link>${escapeXmlText(link.trim())}</link>`,
      `  <guid isPermaLink="false">${escapeXmlText(resolvedGuid)}</guid>`,
      `  <pubDate>${date.toUTCString()}</pubDate>`,
      `  <description><![CDATA[${html}]]></description>`,
      "</item>",
    ].join("\n");
  }
  return [
    "<entry>",
    `  <title>${title}</title>`,
    `  <link href="${escapeXmlAttr(link.trim())}" />`,
    `  <id>${escapeXmlText(resolvedGuid)}</id>`,
    `  <updated>${date.toISOString()}</updated>`,
    `  <summary type="html"><![CDATA[${html}]]></summary>`,
    "</entry>",
  ].join("\n");
}

import { createHash } from "node:crypto";
import { projectMarkdownStructure, readMarkdownSource } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_MASTHEAD_LINES = 20;
const MONTHS = "january february march april may june july august september october november december".split(" ");
const FIELD = /^(?:\*\*([A-Za-z][A-Za-z -]{0,24}):\*\*|\*\*([A-Za-z][A-Za-z -]{0,24})\*\*:|([A-Za-z][A-Za-z -]{0,24}):)[ \t]+(.+)$/u;
const CONTEXT = new Set(["date", "prepared for", "prepared by", "author", "scope", "to", "from", "subject", "re", "status"]);

function calendarDay(value) {
  let iso = /^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : undefined;
  if (!iso) {
    const monthFirst = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/u.exec(value);
    const dayFirst = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/u.exec(value);
    if (!monthFirst && !dayFirst) return undefined;
    const day = monthFirst?.[2] ?? dayFirst[1];
    const month = MONTHS.indexOf((monthFirst?.[1] ?? dayFirst[2]).toLowerCase()) + 1;
    const year = monthFirst?.[3] ?? dayFirst[3];
    if (month === 0) return undefined;
    iso = year + "-" + String(month).padStart(2, "0") + "-" + day.padStart(2, "0");
  }
  const date = Date.parse(iso + "T00:00:00Z");
  return Number.isFinite(date) && new Date(date).toISOString().slice(0,10) === iso ? iso : undefined;
}

/** Read calendar-day statements in the document's own introductory masthead.
 * This is evidence to review, not an inference about when a note was first
 * written. No path, other frontmatter fields, citations, body paragraphs or
 * last-modified information are used. The receipt never carries raw prose.
 */
export function observeNoteMastheadDate(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_BYTES)
    throw new TypeError("masthead observation requires at most four MiB of original UTF-8 note bytes");
  const sourceRevision = "sha256:" + createHash("sha256").update(bytes).digest("hex");
  const source = readMarkdownSource(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  const start = source.bodyStartLine;
  const end = Math.min(source.lines.length, start + MAX_MASTHEAD_LINES - 1);
  const { headings } = projectMarkdownStructure(source);
  let line = start;
  while (line <= end && !source.lines[line-1].trim()) line++;
  const heading = headings.find(item=>item.startLine === line);
  if (heading) line = heading.declarationEndLine + 1;
  const evidence = [];
  let unresolved = false;
  for (; line <= end; line++) {
    const row = source.lines[line-1];
    if (!row.trim()) continue;
    // Indented code, fenced samples, lists and later prose are not fields.
    if (/^(?:\t| {4})/u.test(row)) break;
    const parsed = FIELD.exec(row.trim());
    if (!parsed || !CONTEXT.has((parsed[1] ?? parsed[2] ?? parsed[3]).toLowerCase())) break;
    if ((parsed[1] ?? parsed[2] ?? parsed[3]).toLowerCase() !== "date") continue;
    const date = calendarDay(parsed[4].trim());
    if (!date) unresolved = true;
    else evidence.push(Object.freeze({ line, date }));
  }
  const days = new Set(evidence.map(entry=>entry.date));
  const status = days.size > 1 ? "conflicting-document-dates"
    : unresolved ? "unresolved-document-date"
    : days.size === 1 ? "document-date-observed"
    : "no-supported-masthead-date";
  return Object.freeze({ sourceRevision, status, evidence:Object.freeze(evidence) });
}

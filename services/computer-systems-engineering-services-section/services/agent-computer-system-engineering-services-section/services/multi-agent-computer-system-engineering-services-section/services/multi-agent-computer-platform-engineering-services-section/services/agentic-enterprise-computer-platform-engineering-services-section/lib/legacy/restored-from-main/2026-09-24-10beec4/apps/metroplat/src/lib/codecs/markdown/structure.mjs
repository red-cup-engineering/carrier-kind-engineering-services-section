/**
 * formats/markdown/structure - line-addressable markdown document structure.
 *
 * This is a pure readout over one markdown text. It gives agents stable,
 * 1-based file coordinates for frontmatter, body, headings, and heading
 * sections, so markdown edits can target MetroPlat's own operations instead
 * of ad hoc shell line tools.
 */
import { } from "./document.mjs";

function documentLines(text) {
  const normalized = text.replace(/\r\n?/gu, "\n");
  if (normalized === "") return Object.freeze([]);
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return Object.freeze(lines);
}

function openingFrontmatterFormat(line) {
  const first = line.replace(/^\uFEFF/u, "").trim();
  if (first === "---") return "yaml";
  if (first === "+++") return "toml";
  return null;
}

function frontmatterRange(lines) {
  const format = lines[0] === undefined ? null : openingFrontmatterFormat(lines[0]);
  if (format === null) return null;
  const closing = format === "yaml" ? "---" : "+++";
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === closing) {
      const endLine = index + 1;
      return Object.freeze({
        format,
        startLine: 1,
        endLine,
        contentStartLine: 2,
        contentEndLine: Math.max(1, endLine - 1),
      });
    }
  }
  return null;
}

function fenceStateAfter(line, state) {
  const match = line.match(/^[ \t]*(`{3,}|~{3,})/u);
  if (match === null) return state;
  const marker = match[1][0];
  const length = match[1].length;
  if (state === null) return Object.freeze({ marker, length });
  if (state.marker === marker && length >= state.length) return null;
  return state;
}

function headingTitle(line) {
  const match = line.match(/^(#{1,6})(?:[ \t]+|$)(.*)$/u);
  if (match === null) return null;
  const level = match[1].length;
  const title = match[2].replace(/[ \t]+#+[ \t]*$/u, "").trim();
  return Object.freeze({ level, title });
}

function headingPath(
  stack,
  level,
  title,
) {
  return Object.freeze([
    ...stack.filter((entry) => entry.level < level).map((entry) => entry.title),
    title,
  ]);
}

export function markdownStructure(text) {
  const lines = documentLines(text);
  const frontmatter = frontmatterRange(lines);
  const bodyStartLine = frontmatter === null ? 1 : frontmatter.endLine + 1;
  const bodyEndLine = lines.length;
  const headings = [];
  const stack = [];
  let codeFence = null;

  for (let index = Math.max(0, bodyStartLine - 1); index < lines.length; index += 1) {
    const line = lines[index];
    const nextFence = fenceStateAfter(line, codeFence);
    if (codeFence !== null || nextFence !== null) {
      codeFence = nextFence;
      continue;
    }
    const heading = headingTitle(line);
    if (heading === null) continue;
    while (stack.length > 0 && stack.at(-1).level >= heading.level) stack.pop();
    const entry = Object.freeze({
      kind: "metroplat.markdown.heading",
      level: heading.level,
      title: heading.title,
      line: index + 1,
      startLine: index + 1,
      endLine: lines.length,
      bodyStartLine: index + 2,
      path: headingPath(stack, heading.level, heading.title),
    });
    headings.push(entry);
    stack.push(entry);
  }

  const settled = headings.map((heading, index) => {
    let endLine = lines.length;
    for (let next = index + 1; next < headings.length; next += 1) {
      if (headings[next].level <= heading.level) {
        endLine = headings[next].line - 1;
        break;
      }
    }
    return Object.freeze({ ...heading, endLine });
  });

  return Object.freeze({
    kind: "metroplat.markdown.structure",
    lines: lines.length,
    frontmatter,
    bodyStartLine,
    bodyEndLine,
    headings: Object.freeze(settled),
  });
}

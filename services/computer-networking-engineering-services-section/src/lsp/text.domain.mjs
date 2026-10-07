/**
 * @packageDocumentation
 *
 * Pure LSP position, range, and text-edit algebra.
 *
 * @metroplatSubject lsp
 */

export function positionAt(text, offset) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return Object.freeze({ line, character });
}

export function offsetAt(text, position) {
  let line = 0;
  let character = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (line === position.line && character === position.character) return i;
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return text.length;
}

export function rangeOfOffset(text, offset, length) {
  return Object.freeze({
    start: positionAt(text, offset),
    end: positionAt(text, offset + length),
  });
}

function editOffsets(text, edit) {
  const start = offsetAt(text, edit.range.start);
  const end = offsetAt(text, edit.range.end);
  if (end < start) throw new TypeError("lsp text edit: range end precedes start");
  return Object.freeze({ start, end, edit });
}

export function applyLspTextEdits(text, edits) {
  const ordered = edits.map((edit) => editOffsets(text, edit))
    .sort((left, right) => right.start - left.start);
  let nextBoundary = text.length;
  let next = text;
  for (const entry of ordered) {
    if (entry.end > nextBoundary) throw new TypeError("lsp text edit: overlapping ranges are not supported");
    next = `${next.slice(0, entry.start)}${entry.edit.newText}${next.slice(entry.end)}`;
    nextBoundary = entry.start;
  }
  return Object.freeze({
    kind: "metroplat.lsp.text-edit-application",
    edits: edits.length,
    changed: next !== text,
    beforeBytes: Buffer.byteLength(text, "utf8"),
    afterBytes: Buffer.byteLength(next, "utf8"),
    text: next,
  });
}

export function rangeOfNeedle(text, needle) {
  const quoted = JSON.stringify(needle);
  const offset = text.indexOf(quoted);
  return rangeOfOffset(text, Math.max(0, offset), offset < 0 ? 0 : quoted.length);
}

export function zeroRange() {
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: 0 }),
  });
}

export function lineRange(text, oneBasedLine) {
  const start = offsetAt(text, Object.freeze({ line: Math.max(0, oneBasedLine - 1), character: 0 }));
  const newline = text.indexOf("\n", start);
  const end = newline < 0 ? text.length : newline;
  return rangeOfOffset(text, start, end - start);
}

export function lineSpanRange(text, startLine, endLine) {
  const start = offsetAt(text, Object.freeze({ line: Math.max(0, startLine - 1), character: 0 }));
  const end = offsetAt(text, Object.freeze({ line: Math.max(startLine, endLine), character: 0 }));
  return Object.freeze({ start: positionAt(text, start), end: positionAt(text, end) });
}

export function fullDocumentRange(text) {
  return rangeOfOffset(text, 0, text.length);
}

export function rangesEqual(left, right) {
  return left.start.line === right.start.line
    && left.start.character === right.start.character
    && left.end.line === right.end.line
    && left.end.character === right.end.character;
}

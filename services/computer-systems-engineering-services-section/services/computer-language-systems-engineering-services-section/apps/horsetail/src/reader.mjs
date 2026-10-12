// reader.mjs — the Horsetail reader: tokenize and parse s-expressions into Forms.
// Atoms: point literals (t f ⊥ ⊤), numbers, strings, symbols.
// Structure: (…) cells, quote shorthands ' ` , ,@.

import { sym, pointLit, cell, num, str } from "./types.mjs";
import { T, F, BOT, TOP, potential, glyph } from "./value.mjs";

// ── reader state ──────────────────────────────────────────────────────────────

export class ReadError extends Error {
 pos;
  constructor(message, pos) {
    super(`${message} (at position ${pos})`);
    this.name = "ReadError";
    this.pos = pos;
  }
}

// ── low-level helpers ─────────────────────────────────────────────────────────

const DELIMITERS = new Set(["(", ")", " ", "\t", "\n", "\r", ";", '"', "'", "`", ","]);

function skip(r) {
  while (r.pos < r.src.length) {
    const ch = r.src[r.pos];
    if (ch === ";") {
      while (r.pos < r.src.length && r.src[r.pos] !== "\n") r.pos++;
    } else if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      r.pos++;
    } else {
      break;
    }
  }
}

function next(r) {
  const ch = r.src[r.pos];
  if (ch === undefined) throw new ReadError("Unexpected end of input", r.pos);
  r.pos++;
  return ch;
}

// ── atom parsing ──────────────────────────────────────────────────────────────

function readString(r) {
  next(r); // consume opening "
  let s = "";
  while (true) {
    const ch = next(r);
    if (ch === '"') return str(s);
    if (ch === "\\") {
      const esc = next(r);
      switch (esc) {
        case "n": s += "\n"; break;
        case "t": s += "\t"; break;
        case "r": s += "\r"; break;
        case '"': s += '"'; break;
        case "\\": s += "\\"; break;
        default: s += esc;
      }
    } else {
      s += ch;
    }
  }
}

function readAtom(r) {
  let s = "";
  while (r.pos < r.src.length) {
    const ch = r.src[r.pos];
    if (ch === undefined || DELIMITERS.has(ch)) break;
    s += ch;
    r.pos++;
  }

  if (s === "t") return pointLit(T);
  if (s === "f") return pointLit(F);
  if (s === "bot" || s === "⊥" || s === "bottom") return pointLit(BOT);
  if (s === "top" || s === "⊤") return pointLit(TOP);
  if (s === "true") return pointLit(potential(true));
  if (s === "false") return pointLit(potential(false));

  const n = Number(s);
  if (s !== "" && !isNaN(n) && s !== "." && !/^[+-]$/.test(s)) return { kind: "num", value: n };

  return sym(s);
}

// ── form parsing ──────────────────────────────────────────────────────────────

function readForm(r) {
  skip(r);
  if (r.pos >= r.src.length) return undefined;

  const ch = r.src[r.pos];

  if (ch === "(") {
    r.pos++;
    const items = [];
    while (true) {
      skip(r);
      if (r.pos >= r.src.length) throw new ReadError("Unclosed '('", r.pos);
      if (r.src[r.pos] === ")") { r.pos++; break; }
      const f = readForm(r);
      if (f !== undefined) items.push(f);
    }
    return cell(items);
  }

  if (ch === ")") throw new ReadError("Unexpected ')'", r.pos);

  if (ch === '"') return readString(r);

  if (ch === "'") {
    r.pos++;
    const f = readForm(r);
    if (f === undefined) throw new ReadError("Expected form after '", r.pos);
    return cell([sym("quote"), f]);
  }

  if (ch === "`") {
    r.pos++;
    const f = readForm(r);
    if (f === undefined) throw new ReadError("Expected form after `", r.pos);
    return cell([sym("quasiquote"), f]);
  }

  if (ch === ",") {
    r.pos++;
    if (r.src[r.pos] === "@") {
      r.pos++;
      const f = readForm(r);
      if (f === undefined) throw new ReadError("Expected form after ,@", r.pos);
      return cell([sym("unquote-splice"), f]);
    }
    const f = readForm(r);
    if (f === undefined) throw new ReadError("Expected form after ,", r.pos);
    return cell([sym("unquote"), f]);
  }

  return readAtom(r);
}

// ── public API ────────────────────────────────────────────────────────────────

/** Parse the first form from src. Throws ReadError if src is empty or malformed. */
export function read(src) {
  const r = { src, pos: 0 };
  const f = readForm(r);
  if (f === undefined) throw new ReadError("Empty input", 0);
  return f;
}

/** Parse all top-level forms from src (a program). */
export function readAll(src) {
  const r = { src, pos: 0 };
  const forms = [];
  while (r.pos < r.src.length) {
    skip(r);
    if (r.pos >= r.src.length) break;
    const f = readForm(r);
    if (f !== undefined) forms.push(f);
  }
  return forms;
}

/** Convert a Form back to its s-expression string (round-trips with read). */
export function write(form) {
  switch (form.kind) {
    case "num": return String(form.value);
    case "str": return `"${form.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t")}"`;
    case "point-lit": return glyph(form.value);
    case "sym": return form.name;
    case "cell": {
      if (form.items.length === 2) {
        const head = form.items[0];
        const arg = form.items[1];
        if (head?.kind === "sym" && arg !== undefined) {
          if (head.name === "quote") return `'${write(arg)}`;
          if (head.name === "quasiquote") return `\`${write(arg)}`;
          if (head.name === "unquote") return `,${write(arg)}`;
          if (head.name === "unquote-splice") return `,@${write(arg)}`;
        }
      }
      return `(${form.items.map(write).join(" ")})`;
    }
  }
}

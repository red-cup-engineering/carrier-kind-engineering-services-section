/**
 * Pure parsing and assembly algebra for the Obsmetrologia theorem-existence
 * and axiom-profile die. No I/O: callers spawn `lake env lean` and pass the
 * captured text in here.
 */

const NO_AXIOMS_RE = /'([^']+)' does not depend on any axioms/;
const WITH_AXIOMS_RE = /'([^']+)' depends on axioms:\s*\[([^\]]*)\]/;
const UNKNOWN_RE = /Unknown (?:constant|identifier)\s*[`']([^`']+)[`']/;

/**
 * Parse one line of `lake env lean` output produced by `#print axioms`.
 *
 * @param {string} line - A single line of combined stdout/stderr.
 * @returns {{theorem: string, exists: boolean, axioms: string[]|null}|null}
 *   Parsed row fragment, or null when the line matches none of the three
 *   known Lean output shapes (no-axioms, axiom-list, unknown-identifier).
 */
export function parseAxiomAuditLine(line) {
  const noAxioms = NO_AXIOMS_RE.exec(line);
  if (noAxioms) {
    return { theorem: noAxioms[1], exists: true, axioms: [] };
  }
  const withAxioms = WITH_AXIOMS_RE.exec(line);
  if (withAxioms) {
    const axioms = withAxioms[2]
      .split(",")
      .map((axiom) => axiom.trim())
      .filter(Boolean);
    return { theorem: withAxioms[1], exists: true, axioms };
  }
  const unknown = UNKNOWN_RE.exec(line);
  if (unknown) {
    return { theorem: unknown[1], exists: false, axioms: null };
  }
  return null;
}

/**
 * Rejoin a `depends on axioms: [...]` line Lean's pretty-printer wrapped
 * across lines (a long name pushes the closing `]` past terminal width).
 *
 * @param {string[]} rawLines
 * @returns {string[]}
 */
function rejoinWrappedAxiomLines(rawLines) {
  const lines = [];
  for (const line of rawLines) {
    const prev = lines.length > 0 ? lines[lines.length - 1] : undefined;
    if (prev !== undefined && prev.includes("depends on axioms:") && !prev.includes("]")) {
      lines[lines.length - 1] = `${prev} ${line.trim()}`;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/**
 * Parse the full combined stdout/stderr of a `lake env lean` scratch-file
 * run into one row per requested theorem name. Matching is by the quoted
 * or backtick-quoted identifier Lean itself prints, not by line order, so
 * output order need not match request order. Wrapped axiom-list lines are
 * rejoined first (`rejoinWrappedAxiomLines`).
 *
 * @param {string} output - Combined stdout+stderr text.
 * @param {string[]} requestedNames - Fully-qualified theorem names requested, in order.
 * @returns {Array<{theorem: string, exists: boolean|null, axioms: string[]|null, rawLine?: string}>}
 *   One row per requested name, in request order. A name with no matching
 *   output line gets `exists: null, axioms: null` (never guessed).
 */
export function parseAxiomAuditOutput(output, requestedNames) {
  const lines = rejoinWrappedAxiomLines(String(output).split(/\r?\n/));
  const byName = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseAxiomAuditLine(line);
    if (parsed && !byName.has(parsed.theorem)) {
      byName.set(parsed.theorem, { ...parsed, rawLine: line });
    }
  }
  return requestedNames.map((name) => {
    const found = byName.get(name);
    if (found) {
      const row = { theorem: name, exists: found.exists, axioms: found.axioms };
      return row;
    }
    return { theorem: name, exists: null, axioms: null, rawLine: null };
  });
}

/**
 * Build the text of a scratch .lean file that imports one module and runs
 * `#print axioms` on each requested theorem name.
 *
 * @param {{importModule?: string, theoremNames: string[]}} options
 * @returns {string} Lean 4 source text.
 * @throws {TypeError} When `theoremNames` is empty or not an array.
 */
export function buildScratchLeanSource({ importModule = "Obsmetrologia", theoremNames }) {
  if (!Array.isArray(theoremNames) || theoremNames.length === 0) {
    throw new TypeError("theorem-audit-theorem-names-required");
  }
  const printLines = theoremNames.map((name) => `#print axioms ${name}`).join("\n");
  return `import ${importModule}\n\n${printLines}\n`;
}

/**
 * The last dot-separated segment of a fully-qualified Lean name.
 *
 * @param {string} fullName - e.g. "Obsmetrologia.Computing.HoareProgram.preserves_post".
 * @returns {string} e.g. "preserves_post".
 */
export function shortName(fullName) {
  const segments = String(fullName).split(".");
  return segments[segments.length - 1];
}

/**
 * Whether a Lean source text declares `theorem <shortName>` or
 * `def <shortName>` at the start of a line (ignoring leading whitespace).
 *
 * @param {string} sourceText - Full text of a .lean file.
 * @param {string} fullName - Fully-qualified theorem name; only its last segment is matched.
 * @returns {boolean}
 */
export function sourceDeclaresName(sourceText, fullName) {
  const escaped = shortName(fullName).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const re = new RegExp(`^\\s*(?:theorem|def)\\s+${escaped}\\b`, "mu");
  return re.test(String(sourceText));
}

/**
 * Assemble the final theorem-audit report document.
 *
 * @param {{checkedAt: string, packageRoot: string, rows: Array<object>}} options
 * @returns {{kind: "obsmetrologia.theorem-audit", checkedAt: string, packageRoot: string, rows: Array<object>, summary: {requested: number, existing: number, missing: number, withAxioms: number}}}
 */
export function assembleTheoremAuditReport({ checkedAt, packageRoot, rows }) {
  const requested = rows.length;
  const existing = rows.filter((row) => row.exists === true).length;
  const missing = rows.filter((row) => row.exists === false).length;
  const withAxioms = rows.filter((row) => Array.isArray(row.axioms) && row.axioms.length > 0).length;
  return {
    kind: "obsmetrologia.theorem-audit",
    checkedAt,
    packageRoot,
    rows,
    summary: { requested, existing, missing, withAxioms },
  };
}

/**
 * Whether every row in a completed audit exists, i.e. the die's exit-0 condition.
 *
 * @param {Array<{exists: boolean|null}>} rows
 * @returns {boolean}
 */
export function allTheoremsExist(rows) {
  return rows.length > 0 && rows.every((row) => row.exists === true);
}

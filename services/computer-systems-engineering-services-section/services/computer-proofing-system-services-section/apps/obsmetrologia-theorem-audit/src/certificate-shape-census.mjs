/**
 * Pure parsing and aggregation algebra for the whole-library Obsmetrologia
 * certificate-shape census. No I/O: callers run
 * `scripts/census-set-of-certificate-shapes.lean` via `lake env lean` and
 * pass the captured stdout to `parseShapeRows`, and separately read every
 * `.lean` file under `Obsmetrologia/` (as `{path, text}` pairs, e.g. via
 * `readLeanFiles` in `scripts/census-set-of-module-strata.mjs`) and pass
 * them to the `scan*` static-scan functions — a pure-JS text scan, no Lean
 * run needed for that half.
 *
 * This census classifies every house theorem's proof by SHAPE, never by
 * truth, in service of the owner's charge that the library's proofs "take
 * shortcuts and don't build up": tables restated as theorems, models
 * trivialized so the theorem is free, evocative names over finite checks,
 * `Unit`-typed carriers standing in for cohomology, Bool tables over
 * enumerations standing in for regime facts. Every number this module
 * produces is a shape signal for human review, never a verdict — see
 * `CERTIFICATE_SHAPE_READING`.
 */
import { ownerModuleOf } from "./module-strata-census.mjs";

const THEOREMS_PREFIX = "#theorems\t";
const KINDS_PREFIX = "#kinds\t";
const STATIC_PREFIX = "#static\t";

/** `proofHead` values the Lean census treats as "the proof certifies itself trivially". */
export const SELF_CERTIFYING_HEADS = new Set(["rfl", "decide", "rfl-bundle", "decide-bundle"]);

/** Defensive caps on record-embedded lists — real corpus counts run well under these; the
 * caps only guard against pathological growth, never against the caller-visible totals
 * (`count`/`total` fields are always exact, uncapped). */
const SELF_CERTIFYING_TOP_CAP = 40;
const UNUSED_HYPOTHESES_CAP = 100;
const PROP_BUNDLE_CAP = 500;
const STATIC_LIST_CAP = 300;

/**
 * Parse the Lean census program's stdout: header lines `#theorems\t<n>` and
 * `#kinds\t<proofHead>\t<count>` (both informational, recomputed from rows
 * below), then one 7-field tab-separated row per house theorem. Any other
 * line beginning with `#` (e.g. `#excluded-auto-generated\t<count>`) is a
 * header this parser does not itself consume and is skipped generically,
 * never mistaken for a theorem row.
 *
 * @param {string} text - Combined stdout of `census-set-of-certificate-shapes.lean`.
 * @returns {{rows: Array<{
 *   name: string,
 *   module: string,
 *   proofHead: string,
 *   locality: "same-module"|"crosses-module"|"no-house-constants",
 *   hypothesisCount: number,
 *   unusedHypotheses: number,
 *   propBundle: boolean,
 * }>}}
 */
export function parseShapeRows(text) {
  const lines = String(text).split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith(THEOREMS_PREFIX) || line.startsWith(KINDS_PREFIX)) continue;
    if (line.startsWith("#")) continue;
    const fields = line.split("\t");
    if (fields.length < 7) continue;
    const [name, module, proofHead, locality, hypothesisCount, unusedHypotheses, propBundle] = fields;
    rows.push({
      name,
      module,
      proofHead,
      locality,
      hypothesisCount: Number(hypothesisCount),
      unusedHypotheses: Number(unusedHypotheses),
      propBundle: propBundle === "true",
    });
  }
  return { rows };
}

/**
 * Whether a parsed row is a "self-certifying table" candidate: its
 * statement stays inside its own module AND its proof head is one that
 * settles by computation/reflexivity rather than by argument.
 *
 * @param {{locality: string, proofHead: string}} row
 * @returns {boolean}
 */
export function isSelfCertifying(row) {
  return row.locality === "same-module" && SELF_CERTIFYING_HEADS.has(row.proofHead);
}

// --- static scan: pure text, no Lean run --------------------------------

/**
 * Strip Lean block comments (`/- ... -/`, nestable) and line comments
 * (`--` to end of line) from source text, replacing their content with
 * nothing while preserving every newline — so line numbers computed
 * against the result still match the original file, and a "structure"/
 * "def" mentioned only in prose can never be mistaken for a declaration.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripLeanComments(text) {
  const source = String(text);
  const n = source.length;
  let result = "";
  let blockDepth = 0;
  let i = 0;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (blockDepth > 0) {
      if (ch === "/" && next === "-") {
        blockDepth += 1;
        i += 2;
        continue;
      }
      if (ch === "-" && next === "/") {
        blockDepth -= 1;
        i += 2;
        continue;
      }
      if (ch === "\n") result += "\n";
      i += 1;
      continue;
    }
    if (ch === "/" && next === "-") {
      blockDepth = 1;
      i += 2;
      continue;
    }
    if (ch === "-" && next === "-") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    result += ch;
    i += 1;
  }
  return result;
}

/**
 * The 1-indexed line number of a character offset into `text`.
 *
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function lineOf(text, index) {
  let count = 1;
  for (let i = 0; i < index; i += 1) if (text[i] === "\n") count += 1;
  return count;
}

// The signature (name to `: Type :=`) is held to one line — a def's parameter list is never
// scanned across lines here — so this can never walk past the def's own declaration into the
// next one; only the value itself may cross a single newline (`def Foo : Type :=\n  Unit`).
const UNIT_TYPE_DEF_RE = /^[ \t]*def\s+([A-Za-z_][A-Za-z0-9_'!?]*)[^\n]*?:\s*Type\s*:=[ \t]*\n?[ \t]*(Unit|PUnit)\b/gm;

/**
 * Static finding: `def X ... : Type := Unit` (or `PUnit`) — a carrier
 * trivialized to the one-element type, standing in for whatever structure
 * (cohomology group, etc.) it was meant to carry.
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Array<{kind: "unit-type", file: string, line: number, name: string}>}
 */
export function scanUnitTypeDefs(files) {
  const findings = [];
  for (const { path, text } of files) {
    const stripped = stripLeanComments(text);
    for (const match of stripped.matchAll(UNIT_TYPE_DEF_RE)) {
      findings.push({ kind: "unit-type", file: path, line: lineOf(stripped, match.index), name: match[1] });
    }
  }
  return findings;
}

const STRUCTURE_RE = /^[ \t]*structure\s+([A-Za-z_][A-Za-z0-9_'!?]*(?:\.[A-Za-z_][A-Za-z0-9_'!?]*)*)/gm;

/**
 * Whether a structure header (the text immediately following its name, up
 * to end of input) declares an explicit `: Prop` result sort — found as the
 * first bracket-depth-zero `:` (not `:=`) before `where`/`extends` closes
 * the header. Depth-tracking over `(){}[]` means a `: Prop`-typed
 * *parameter* (e.g. `(approaches : CLehmerSide → Prop)`) is never mistaken
 * for the structure's own sort.
 *
 * @param {string} headerText
 * @returns {boolean}
 */
export function structureHeaderIsProp(headerText) {
  let depth = 0;
  for (let i = 0; i < headerText.length; i += 1) {
    const ch = headerText[i];
    if (ch === "(" || ch === "{" || ch === "[") {
      depth += 1;
      continue;
    }
    if (ch === ")" || ch === "}" || ch === "]") {
      depth -= 1;
      continue;
    }
    if (depth > 0) continue;
    if (headerText.startsWith(":=", i)) return false;
    if (/^where\b/.test(headerText.slice(i))) return false;
    if (/^extends\b/.test(headerText.slice(i))) return false;
    if (ch === ":") return /^\s*Prop\b/.test(headerText.slice(i + 1));
  }
  return false;
}

/**
 * Static finding: a house `structure ... : Prop` — a bundle of previously
 * proved facts, restated as a structure (`propBundle` in the dynamic rows
 * flags theorems that conclude one of these).
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Array<{kind: "prop-structure", file: string, line: number, name: string}>}
 */
export function scanPropStructures(files) {
  const findings = [];
  for (const { path, text } of files) {
    const stripped = stripLeanComments(text);
    for (const match of stripped.matchAll(STRUCTURE_RE)) {
      const headerStart = match.index + match[0].length;
      const header = stripped.slice(headerStart, headerStart + 3000);
      if (structureHeaderIsProp(header)) {
        findings.push({ kind: "prop-structure", file: path, line: lineOf(stripped, match.index), name: match[1] });
      }
    }
  }
  return findings;
}

const BOOL_TABLE_RE =
  /^[ \t]*def\s+([A-Za-z_][A-Za-z0-9_'!?]*)\s*:\s*[A-Za-z_][A-Za-z0-9_'!?.]*\s*→\s*Bool[ \t]*\n(?:[ \t]*\|[^\n]*\n?)+/gm;

/**
 * Static finding: `def X : <Enum> → Bool` decided by an equation-style `|`
 * case table — a regime/status fact reduced to a hand-written Bool lookup
 * over an enumeration, rather than derived.
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Array<{kind: "bool-table", file: string, line: number, name: string}>}
 */
export function scanBoolTables(files) {
  const findings = [];
  for (const { path, text } of files) {
    const stripped = stripLeanComments(text);
    for (const match of stripped.matchAll(BOOL_TABLE_RE)) {
      findings.push({ kind: "bool-table", file: path, line: lineOf(stripped, match.index), name: match[1] });
    }
  }
  return findings;
}

const DECL_START_RE = /^\s*(?:@\[[^\]]*\]\s*)?(theorem|lemma)\s+([A-Za-z_][A-Za-z0-9_'!?.]*)/;
const OTHER_DECL_START_RE = /^\s*(?:@\[[^\]]*\]\s*)?(def|abbrev|instance|structure|inductive|class)\b/;
const RFL_PROOF_RE = /:=\s*rfl\s*$/;

/**
 * Static finding: a `theorem`/`lemma` whose proof, however many lines its
 * signature spans, closes with exactly `:= rfl` — restating something
 * already true by computation rather than proving it. Tracked per line: a
 * declaration-start line sets the "current theorem" name; the next `def`/
 * `abbrev`/`instance`/`structure`/`inductive`/`class` start clears it; the
 * first line under a theorem/lemma matching `:= rfl` at end-of-line records
 * one finding and clears the name (at most one per declaration). Pragmatic,
 * not a parser: a `have h := rfl` deep inside a longer tactic proof can
 * still register here, which is why this is a shape signal, not a verdict.
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Array<{kind: "rfl-theorem", file: string, line: number, name: string}>}
 */
export function scanRflTheorems(files) {
  const findings = [];
  for (const { path, text } of files) {
    const stripped = stripLeanComments(text);
    const lines = stripped.split("\n");
    let currentName = null;
    for (let i = 0; i < lines.length; i += 1) {
      const declMatch = DECL_START_RE.exec(lines[i]);
      if (declMatch) {
        currentName = declMatch[2];
      } else if (OTHER_DECL_START_RE.test(lines[i])) {
        currentName = null;
      }
      if (currentName && RFL_PROOF_RE.test(lines[i])) {
        findings.push({ kind: "rfl-theorem", file: path, line: i + 1, name: currentName });
        currentName = null;
      }
    }
  }
  return findings;
}

/**
 * Sort key shared by every static finding: kind, then file, then line, then name.
 *
 * @param {{kind: string, file: string, line: number, name: string}} a
 * @param {{kind: string, file: string, line: number, name: string}} b
 * @returns {number}
 */
function compareFindings(a, b) {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Run every static scanner over the same file set and return one sorted
 * findings array (the union `scanUnitTypeDefs` ∪ `scanPropStructures` ∪
 * `scanBoolTables` ∪ `scanRflTheorems`).
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Array<{kind: string, file: string, line: number, name: string}>}
 */
export function scanStaticFindings(files) {
  return [
    ...scanUnitTypeDefs(files),
    ...scanPropStructures(files),
    ...scanBoolTables(files),
    ...scanRflTheorems(files),
  ].sort(compareFindings);
}

/**
 * Render static findings as the `#static\t<kind>\t<file>:<line>\t<name>`
 * rows appended after the Lean program's own rows in the combined TSV.
 *
 * @param {Array<{kind: string, file: string, line: number, name: string}>} findings
 * @returns {string}
 */
export function formatStaticRows(findings) {
  return findings.map((f) => `${STATIC_PREFIX}${f.kind}\t${f.file}:${f.line}\t${f.name}`).join("\n");
}

/**
 * Parse `#static\t<kind>\t<file>:<line>\t<name>` rows back out of combined
 * census text (the counterpart to `formatStaticRows`, for round-tripping a
 * written rows TSV).
 *
 * @param {string} text
 * @returns {Array<{kind: string, file: string, line: number, name: string}>}
 */
export function parseStaticRows(text) {
  const findings = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.startsWith(STATIC_PREFIX)) continue;
    const [, kind, fileLine, name] = line.split("\t");
    const lastColon = fileLine.lastIndexOf(":");
    const file = fileLine.slice(0, lastColon);
    const lineNumber = Number(fileLine.slice(lastColon + 1));
    findings.push({ kind, file, line: lineNumber, name });
  }
  return findings;
}

// --- aggregation ----------------------------------------------------------

/**
 * Cap a sorted array for record embedding while keeping the true count
 * separately.
 *
 * @template T
 * @param {T[]} list
 * @param {number} cap
 * @returns {{count: number, list: T[], truncated: boolean}}
 */
function capped(list, cap) {
  return { count: list.length, list: list.slice(0, cap), truncated: list.length > cap };
}

/**
 * Aggregate a parsed certificate-shape census: proofHead distribution
 * overall and per module, locality distribution, the self-certifying-table
 * signal (overall, per module, and a top-40 sample sorted by module then
 * name), the unused-hypothesis theorems (capped at 100), the propBundle
 * theorems, and the static scan grouped by kind (with a per-module count
 * for the `rfl-theorem` kind specifically, per the owner's charge).
 *
 * @param {Array<{name: string, module: string, proofHead: string, locality: string, hypothesisCount: number, unusedHypotheses: number, propBundle: boolean}>} rows
 * @param {Array<{kind: string, file: string, line: number, name: string}>} staticFindings
 * @returns {object}
 */
export function summarizeShapes(rows, staticFindings = []) {
  const proofHeadDistribution = {};
  const proofHeadByModule = {};
  const localityDistribution = {};
  const selfCertifyingRows = [];
  const unusedRows = [];
  const propBundleRows = [];

  for (const row of rows) {
    proofHeadDistribution[row.proofHead] = (proofHeadDistribution[row.proofHead] ?? 0) + 1;
    const moduleHeads = proofHeadByModule[row.module] ?? (proofHeadByModule[row.module] = {});
    moduleHeads[row.proofHead] = (moduleHeads[row.proofHead] ?? 0) + 1;
    localityDistribution[row.locality] = (localityDistribution[row.locality] ?? 0) + 1;
    if (isSelfCertifying(row)) selfCertifyingRows.push(row);
    if (row.unusedHypotheses > 0) unusedRows.push(row);
    if (row.propBundle) propBundleRows.push(row);
  }

  const byModuleAndName = (a, b) =>
    a.module !== b.module ? (a.module < b.module ? -1 : 1) : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

  selfCertifyingRows.sort(byModuleAndName);
  const selfCertifyingByModule = {};
  for (const row of selfCertifyingRows) {
    selfCertifyingByModule[row.module] = (selfCertifyingByModule[row.module] ?? 0) + 1;
  }
  const selfCertifyingTop = selfCertifyingRows
    .slice(0, SELF_CERTIFYING_TOP_CAP)
    .map(({ name, module, proofHead }) => ({ name, module, proofHead }));

  unusedRows.sort((a, b) => b.unusedHypotheses - a.unusedHypotheses || (a.name < b.name ? -1 : 1));
  const unusedHypothesesCapped = capped(
    unusedRows.map(({ name, module, hypothesisCount, unusedHypotheses }) => ({
      name,
      module,
      hypothesisCount,
      unusedHypotheses,
    })),
    UNUSED_HYPOTHESES_CAP,
  );

  propBundleRows.sort(byModuleAndName);
  const propBundleCapped = capped(
    propBundleRows.map(({ name, module }) => ({ name, module })),
    PROP_BUNDLE_CAP,
  );

  const staticByKind = {};
  for (const finding of staticFindings) staticByKind[finding.kind] = (staticByKind[finding.kind] ?? 0) + 1;
  const staticOfKind = (kind) => staticFindings.filter((f) => f.kind === kind);
  const rflTheoremsByModule = {};
  for (const finding of staticOfKind("rfl-theorem")) {
    const moduleName = ownerModuleOf(finding.file) ?? finding.file;
    rflTheoremsByModule[moduleName] = (rflTheoremsByModule[moduleName] ?? 0) + 1;
  }

  return {
    theorems: rows.length,
    proofHeadDistribution,
    proofHeadByModule,
    localityDistribution,
    selfCertifying: {
      total: selfCertifyingRows.length,
      byModule: selfCertifyingByModule,
      top: selfCertifyingTop,
    },
    unusedHypotheses: unusedHypothesesCapped,
    propBundle: propBundleCapped,
    static: {
      total: staticFindings.length,
      byKind: staticByKind,
      unitTypeDefs: capped(staticOfKind("unit-type"), STATIC_LIST_CAP),
      propStructures: capped(staticOfKind("prop-structure"), STATIC_LIST_CAP),
      boolTables: capped(staticOfKind("bool-table"), STATIC_LIST_CAP),
      rflTheorems: capped(staticOfKind("rfl-theorem"), STATIC_LIST_CAP),
      rflTheoremsByModule,
    },
  };
}

/**
 * The reading this census supports, as prose for the record's `reading`
 * field. Deliberately plain that every figure here is a shape signal for
 * human review, never a verdict.
 */
export const CERTIFICATE_SHAPE_READING =
  "This census classifies every house theorem's certificate by SHAPE, never by truth. proofHead " +
  "is what heads the proof term after stripping leading lambdas/mdata: rfl (the Eq.refl/rfl/HEq.refl/" +
  "Iff.rfl family), decide (an of_decide_eq_true-headed decidability proof), rfl-bundle/decide-bundle " +
  "(an anonymous-constructor bundle, e.g. ⟨rfl, rfl⟩, whose every explicit field classifies " +
  "uniformly as one of those), or other. locality is same-module/crosses-module/no-house-constants: " +
  "whether every house constant occurring in the theorem's TYPE shares its own module. hypothesisCount/" +
  "unusedHypotheses flag leading Pi binders the proof's own value never mentions (the vacuous-hypothesis " +
  "signal). propBundle flags a conclusion whose head constant is a house structure ... : Prop, i.e. a " +
  "bundle of previously proved facts restated as one theorem. The 'self-certifying table' signal " +
  "(locality=same-module and proofHead in {rfl, decide, rfl-bundle, decide-bundle}) and the static " +
  "scan's unit-type (`def X ... : Type := Unit`/`PUnit`), Prop-structure, Bool-table (`<Enum> → Bool` " +
  "case tables), and rfl-theorem findings name candidates for the owner's charge that this library's " +
  "proofs take shortcuts and don't build up: tables restated as theorems, models trivialized so the " +
  "theorem is free, evocative names over finite checks, Unit-typed carriers standing in for cohomology, " +
  "Bool tables over enumerations standing in for regime facts. EVERY NUMBER HERE IS A SHAPE SIGNAL FOR " +
  "HUMAN REVIEW, NOT A VERDICT: a same-module rfl proof can be a genuine one-line fact about a real " +
  "model, and an other-headed proof can still be a shortcut this census has no way to see.";

/**
 * Assemble the final certificate-shape census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource?: string,
 *   rows: Array<object>,
 *   staticFindings: Array<object>,
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaCertificateShapeCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   leanSourcePath: string,
 *   leanSource: string|undefined,
 *   reading: string,
 *   summary: ReturnType<typeof summarizeShapes>,
 * }}
 */
export function assembleCertificateShapeRecord({
  checkedAt,
  packageRoot,
  leanSourcePath,
  leanSource,
  rows,
  staticFindings,
}) {
  return {
    type: "ObsmetrologiaCertificateShapeCensus",
    checkedAt,
    packageRoot,
    leanSourcePath,
    leanSource,
    reading: CERTIFICATE_SHAPE_READING,
    summary: summarizeShapes(rows, staticFindings),
  };
}

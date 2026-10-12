/**
 * Pure parsing, Lean-source generation, and classification algebra for the
 * whole-blueprint Obsmetrologia `\lean{...}` pointer census. No I/O:
 * callers read every `.tex` file under `docs/blueprint/src/` and pass
 * `{path, text}` pairs to `extractAllPointers`, run the scratch Lean
 * program `buildBlueprintScratchLeanSource` builds via `lake env lean` in
 * a temp dir (never inside the Lean package), and pass the captured
 * stdout to `parseBlueprintLeanOutput`.
 */

/**
 * The `leanblueprint`-style environments a `\lean{...}` pointer can live
 * in, as observed across the whole blueprint source: `\begin{theorem}`,
 * `\begin{proposition}`, `\begin{definition}`, `\begin{lemma}`,
 * `\begin{corollary}`, `\begin{remark}`, `\begin{example}`. Every pointer
 * in the corpus falls inside one of these (checked by hand against a
 * whole-source scan before writing this); a pointer that somehow lands
 * outside all of them still gets a row, with `envType: null` and
 * `status: "none"`.
 */
export const THEOREM_LIKE_ENVIRONMENTS = ["theorem", "proposition", "definition", "lemma", "corollary", "remark", "example"];

/** The owner's ruling (2026-09-03, carried in `identification-key-census.mjs` too): the only identification this library is meant to spend is `Quot.sound`. */
export const OWNER_LAW_AXIOM = "Quot.sound";

const SORRY_AXIOM = "sorryAx";

// ---------------------------------------------------------------------------
// LaTeX pointer extraction
// ---------------------------------------------------------------------------

/**
 * Strip LaTeX line comments: from the first unescaped `%` (not preceded by
 * `\`) to end of line. A line that is entirely a comment strips to empty,
 * not removed -- character offsets into the rest of the text are
 * preserved, which is what lets position-based label/environment lookups
 * below stay correct.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripLatexComments(text) {
  return String(text)
    .split("\n")
    .map((line) => {
      let out = "";
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === "%" && (index === 0 || line[index - 1] !== "\\")) break;
        out += line[index];
      }
      return out;
    })
    .join("\n");
}

/**
 * Find every theorem-like environment span in a comment-stripped text.
 * Environments are assumed not to nest (true of the whole blueprint
 * corpus at the time this was written).
 *
 * @param {string} text - Comment-stripped file text.
 * @returns {Array<{env: string, start: number, end: number, body: string}>}
 */
function findEnvironmentSpans(text) {
  const alternation = THEOREM_LIKE_ENVIRONMENTS.join("|");
  const re = new RegExp(`\\\\begin\\{(${alternation})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`, "g");
  const spans = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    spans.push({ env: match[1], start: match.index, end: match.index + match[0].length, body: match[2] });
  }
  return spans;
}

/**
 * Find every `\label{...}` in a comment-stripped text, in document order.
 *
 * @param {string} text - Comment-stripped file text.
 * @returns {Array<{name: string, index: number}>}
 */
function findLabels(text) {
  const re = /\\label\{([^}]*)\}/g;
  const labels = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    labels.push({ name: match[1], index: match.index });
  }
  return labels;
}

/**
 * The name of the nearest `\label{...}` at or before a character
 * position -- the node label a `\lean{...}` pointer at that position
 * belongs to. `labels` must be in ascending `index` order (as
 * `findLabels` returns them).
 *
 * @param {Array<{name: string, index: number}>} labels
 * @param {number} position
 * @returns {string|null} `null` when no label precedes the position.
 */
function nearestPrecedingLabel(labels, position) {
  let found = null;
  for (const label of labels) {
    if (label.index > position) break;
    found = label;
  }
  return found ? found.name : null;
}

/**
 * The status tag inside one environment's body: `"leanok"` if
 * `\leanok` appears, else `"notready"` if `\notready` appears, else
 * `"none"`. The blueprint source never carries both in one environment;
 * `\leanok` wins if it somehow did.
 *
 * @param {string} body
 * @returns {"leanok"|"notready"|"none"}
 */
function statusWithinSpan(body) {
  if (/\\leanok\b/.test(body)) return "leanok";
  if (/\\notready\b/.test(body)) return "notready";
  return "none";
}

/**
 * Extract every `\lean{...}` pointer from one blueprint `.tex` file: its
 * comma-split, trimmed name list, its enclosing environment's type and
 * status tag, and its node label (the nearest preceding `\label{...}`).
 *
 * @param {{path: string, text: string}} file - `path` is used verbatim as `chapterFile`.
 * @returns {Array<{chapterFile: string, label: string|null, envType: string|null, status: "leanok"|"notready"|"none", names: string[]}>}
 */
export function extractBlueprintPointers({ path, text }) {
  const stripped = stripLatexComments(text);
  const spans = findEnvironmentSpans(stripped);
  const labels = findLabels(stripped);
  const pointers = [];
  const leanRe = /\\lean\{([^}]*)\}/g;
  let match;
  while ((match = leanRe.exec(stripped)) !== null) {
    const position = match.index;
    const names = match[1]
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    const span = spans.find((candidate) => position >= candidate.start && position < candidate.end);
    pointers.push({
      chapterFile: path,
      label: nearestPrecedingLabel(labels, position),
      envType: span ? span.env : null,
      status: span ? statusWithinSpan(span.body) : "none",
      names,
    });
  }
  return pointers;
}

/**
 * Extract every `\lean{...}` pointer across a whole set of blueprint
 * files, in file order.
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {ReturnType<typeof extractBlueprintPointers>}
 */
export function extractAllPointers(files) {
  return files.flatMap((file) => extractBlueprintPointers(file));
}

/**
 * Flatten pointers into one row per individual name -- a pointer listing
 * several comma-separated names contributes one row per name, all
 * sharing that pointer's label/envType/status/chapterFile.
 *
 * @param {ReturnType<typeof extractAllPointers>} pointers
 * @returns {Array<{chapterFile: string, label: string|null, envType: string|null, status: "leanok"|"notready"|"none", name: string}>}
 */
export function flattenPointerRows(pointers) {
  const rows = [];
  for (const pointer of pointers) {
    for (const name of pointer.names) {
      rows.push({
        chapterFile: pointer.chapterFile,
        label: pointer.label,
        envType: pointer.envType,
        status: pointer.status,
        name,
      });
    }
  }
  return rows;
}

/**
 * The distinct names named by a set of rows, sorted -- the query the
 * scratch Lean program is built for (each name is checked once no matter
 * how many pointers cite it).
 *
 * @param {Array<{name: string}>} rows
 * @returns {string[]}
 */
export function uniquePointerNames(rows) {
  return [...new Set(rows.map((row) => row.name))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Scratch Lean program
// ---------------------------------------------------------------------------

/**
 * Build the text of a scratch .lean file that imports one module and, for
 * each given name, prints a tab-separated row:
 * `name\texists(yes/no)\tkind\taxioms(comma-joined)\tsorry(true/false)`
 * -- `kind`, `axioms`, and `sorry` fields are empty when the name does
 * not exist. `kind` is one of `theorem`, `def`, `abbrev`, `structure`,
 * `inductive`, `instance`, `other`: an instance or an abbrev is first a
 * `def` at the `ConstantInfo` level, refined by `Lean.Meta.isInstanceCore`
 * / `Lean.getReducibilityStatusCore`; a structure is first an `inductive`
 * type, refined by `Lean.getStructureInfo?`.
 *
 * @param {{names: string[], importModule?: string}} options
 * @returns {string} Lean 4 source text.
 * @throws {TypeError} When `names` is empty or not an array.
 */
export function buildBlueprintScratchLeanSource({ names, importModule = "Obsmetrologia" }) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new TypeError("blueprint-pointer-census-names-required");
  }
  const nameLiterals = names.map((name) => `\`${name}`).join(",\n  ");
  return `import Lean
import ${importModule}
open Lean Elab Command

def pointerNames : List Name := [
  ${nameLiterals}
]

def kindStr (env : Environment) (n : Name) (ci : ConstantInfo) : String :=
  match ci with
  | .thmInfo _ => "theorem"
  | .defnInfo _ =>
    if Lean.Meta.isInstanceCore env n then "instance"
    else if Lean.getReducibilityStatusCore env n == Lean.ReducibilityStatus.reducible then "abbrev"
    else "def"
  | .inductInfo _ => if (Lean.getStructureInfo? env n).isSome then "structure" else "inductive"
  | _ => "other"

#eval show CommandElabM Unit from do
  let env ← getEnv
  for n in pointerNames do
    match env.find? n with
    | none => IO.println s!"{n}\\tno\\t\\t\\t"
    | some ci =>
      let axs ← liftCoreM (collectAxioms n)
      let axNames := (axs.map toString).toList
      let hasSorry := axNames.contains "${SORRY_AXIOM}"
      IO.println s!"{n}\\tyes\\t{kindStr env n ci}\\t{String.intercalate "," axNames}\\t{hasSorry}"
`;
}

/**
 * Parse the scratch Lean program's stdout into a lookup by name.
 *
 * @param {string} stdout
 * @returns {Map<string, {name: string, exists: boolean, kind: string|null, axioms: string[], sorry: boolean}>}
 */
export function parseBlueprintLeanOutput(stdout) {
  const byName = new Map();
  for (const line of String(stdout).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = line.split("\t");
    const name = fields[0];
    const existsField = fields[1];
    if (existsField !== "yes" && existsField !== "no") continue;
    const exists = existsField === "yes";
    const kind = exists && fields[2] ? fields[2] : null;
    const axiomsField = exists ? fields[3] ?? "" : "";
    const axioms = axiomsField === "" ? [] : axiomsField.split(",");
    const sorry = exists && fields[4] === "true";
    byName.set(name, { name, exists, kind, axioms, sorry });
  }
  return byName;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify one pointer-name row against its Lean lookup into zero or more
 * finding keys. Findings are not mutually exclusive except where noted:
 *
 * - `leanok-missing`: `\leanok` names a declaration that does not exist.
 * - `leanok-def`: `\leanok` resolves, but to a def/structure/inductive/
 *   abbrev/instance, not a theorem. Reported, not judged -- a def can
 *   genuinely witness a claim (e.g. a decision procedure); the mismatch
 *   is a category signal for a human to read, nothing more.
 * - `leanok-sorry`: `\leanok` resolves to a declaration whose axioms
 *   include `sorryAx`.
 * - `leanok-outside-law`: `\leanok` resolves to a declaration whose
 *   axioms include something other than `Quot.sound` and other than
 *   `sorryAx` -- `sorryAx` is `leanok-sorry`'s to report, so a row never
 *   carries both (mirrors `profileOf` in `theorem-census.mjs`: sorry
 *   dominates and takes precedence over any other axiom finding).
 * - `notready-proved`: `\notready` resolves to a theorem with no
 *   `sorryAx` in its axioms -- a candidate for promotion to `\leanok`.
 * - `untagged`: the pointer carries neither `\leanok` nor `\notready`.
 *
 * A `\leanok` pointer resolving to a sorry-free theorem depending on
 * nothing but `Quot.sound` (or nothing at all) gets no finding -- the
 * paper's expected settled state. Likewise a `\notready` pointer that
 * does not yet resolve to a proved theorem gets none.
 *
 * @param {{status: "leanok"|"notready"|"none"}} row
 * @param {{exists: boolean, kind: string|null, axioms: string[], sorry: boolean}|undefined} leanInfo
 * @returns {string[]}
 */
export function classifyRow(row, leanInfo) {
  const info = leanInfo ?? { exists: false, kind: null, axioms: [], sorry: false };
  const findings = [];
  if (row.status === "leanok") {
    if (!info.exists) {
      findings.push("leanok-missing");
      return findings;
    }
    if (info.kind !== "theorem") findings.push("leanok-def");
    if (info.sorry) {
      findings.push("leanok-sorry");
    } else if (info.axioms.some((axiom) => axiom !== OWNER_LAW_AXIOM && axiom !== SORRY_AXIOM)) {
      findings.push("leanok-outside-law");
    }
  } else if (row.status === "notready") {
    if (info.exists && info.kind === "theorem" && !info.sorry) {
      findings.push("notready-proved");
    }
  } else {
    findings.push("untagged");
  }
  return findings;
}

/**
 * Attach each row's Lean lookup fields and classification findings.
 *
 * @param {ReturnType<typeof flattenPointerRows>} rows
 * @param {ReturnType<typeof parseBlueprintLeanOutput>} leanByName
 * @returns {Array<{chapterFile: string, label: string|null, envType: string|null, status: string, name: string, exists: boolean, kind: string|null, axioms: string[], sorry: boolean, findings: string[]}>}
 */
export function classifyRows(rows, leanByName) {
  return rows.map((row) => {
    const info = leanByName.get(row.name);
    return {
      ...row,
      exists: info ? info.exists : false,
      kind: info ? info.kind : null,
      axioms: info ? info.axioms : [],
      sorry: info ? info.sorry : false,
      findings: classifyRow(row, info),
    };
  });
}

// ---------------------------------------------------------------------------
// Aggregation and rendering
// ---------------------------------------------------------------------------

/**
 * Aggregate classified rows: pointer/name totals, the status-tag
 * breakdown, finding counts, and a per-chapter breakdown of the same.
 *
 * @param {{pointers: Array<object>, rows: ReturnType<typeof classifyRows>}} options
 * @returns {{
 *   totalPointers: number,
 *   totalNames: number,
 *   statusCounts: {leanok: number, notready: number, none: number},
 *   findingCounts: Record<string, number>,
 *   byChapter: Record<string, {rows: number, leanok: number, notready: number, none: number, findingCounts: Record<string, number>}>,
 * }}
 */
export function summarizePointerCensus({ pointers, rows }) {
  const statusCounts = { leanok: 0, notready: 0, none: 0 };
  const findingCounts = {};
  const byChapter = {};
  for (const row of rows) {
    statusCounts[row.status] += 1;
    const chapter = byChapter[row.chapterFile] ?? (byChapter[row.chapterFile] = {
      rows: 0,
      leanok: 0,
      notready: 0,
      none: 0,
      findingCounts: {},
    });
    chapter.rows += 1;
    chapter[row.status] += 1;
    for (const finding of row.findings) {
      findingCounts[finding] = (findingCounts[finding] ?? 0) + 1;
      chapter.findingCounts[finding] = (chapter.findingCounts[finding] ?? 0) + 1;
    }
  }
  return {
    totalPointers: pointers.length,
    totalNames: rows.length,
    statusCounts,
    findingCounts,
    byChapter,
  };
}

const TSV_COLUMNS = ["chapterFile", "label", "envType", "status", "name", "exists", "kind", "axioms", "sorry", "findings"];

/**
 * Render classified rows as TSV text, header first.
 *
 * @param {ReturnType<typeof classifyRows>} rows
 * @returns {string}
 */
export function renderPointerRowsTsv(rows) {
  const lines = [TSV_COLUMNS.join("\t")];
  for (const row of rows) {
    lines.push(
      [
        row.chapterFile,
        row.label ?? "",
        row.envType ?? "",
        row.status,
        row.name,
        row.exists ? "yes" : "no",
        row.kind ?? "",
        row.axioms.join(","),
        row.sorry ? "true" : "false",
        row.findings.join(","),
      ].join("\t"),
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * The classification discipline this census applies, as prose for the
 * record's `reading` field.
 */
export const BLUEPRINT_POINTER_READING =
  "Every \\lean{...} pointer in the blueprint source names one or more Obsmetrologia declarations " +
  "and lives inside a theorem-like environment carrying a status tag: \\leanok claims the pointer " +
  "is settled by a genuine, sorry-free proof; \\notready marks a frontier claim awaiting " +
  "formalization; no tag is untagged. This census checks each name against the live, built Lean " +
  "environment and classifies the result into finding classes. leanok-missing: the \\leanok " +
  "pointer names a declaration that does not exist -- a broken or renamed pointer, claiming " +
  "settlement for nothing. leanok-def: the \\leanok pointer resolves to a def, structure, " +
  "inductive, abbrev, or instance rather than a theorem -- reported, not judged: a def can " +
  "genuinely witness a claim (e.g. a decision procedure), but the kind mismatch is a category " +
  "signal worth a human's read, not a verdict. leanok-sorry: the \\leanok pointer's declaration " +
  "depends on the sorryAx axiom -- claimed settled, not actually proved. leanok-outside-law: the " +
  "\\leanok pointer's declaration depends on an axiom other than Quot.sound and other than sorryAx " +
  "(sorryAx is leanok-sorry's to report, so a row never carries both) -- the owner's law for this " +
  "library is that the only identification spent is Quot.sound, so propext or Classical.choice " +
  "here means the claim rests on more than the law allows. notready-proved: the \\notready pointer " +
  "nonetheless resolves to a theorem with no sorry in its axiom list -- a candidate for promotion " +
  "to \\leanok, the blueprint prose lagging the Lean work already done. untagged: the pointer " +
  "carries neither \\leanok nor \\notready. A \\leanok pointer resolving to a sorry-free theorem " +
  "depending on nothing but Quot.sound gets no finding -- the paper's expected settled state; " +
  "likewise a \\notready pointer not yet resolving to a proved theorem gets none.";

/**
 * Assemble the final blueprint-pointer census record document.
 *
 * @param {{
 *   checkedAt: string,
 *   packageRoot: string,
 *   blueprintSourceRoot: string,
 *   leanSourcePath: string,
 *   pointers: Array<object>,
 *   rows: ReturnType<typeof classifyRows>,
 * }} options
 * @returns {{
 *   type: "ObsmetrologiaBlueprintPointerCensus",
 *   checkedAt: string,
 *   packageRoot: string,
 *   blueprintSourceRoot: string,
 *   leanSourcePath: string,
 *   reading: string,
 *   summary: ReturnType<typeof summarizePointerCensus>,
 * }}
 */
export function assemblePointerCensusRecord({ checkedAt, packageRoot, blueprintSourceRoot, leanSourcePath, pointers, rows }) {
  return {
    type: "ObsmetrologiaBlueprintPointerCensus",
    checkedAt,
    packageRoot,
    blueprintSourceRoot,
    leanSourcePath,
    reading: BLUEPRINT_POINTER_READING,
    summary: summarizePointerCensus({ pointers, rows }),
  };
}

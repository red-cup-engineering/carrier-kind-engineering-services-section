/**
 * Pure algebra of the Obsmetrologia proof line: one proof work order (a JSON
 * object under content/work-orders/) translated into the language-neutral
 * artifact-fabrication specification candidate the admission service admits,
 * the Blueprint node it seats, the Lean axiom program that prices it, and the
 * readings of the gates' outputs. No I/O: the scripts read and run, this
 * module only transforms.
 * @module proof-work-order
 */

/** The `type` a proof work order declares. */
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
export const PROOF_WORK_ORDER_TYPE = "ObsmetrologiaProofWorkOrder";

/** The three projections every proof work order realizes. */
export const PROJECTION_IDS = Object.freeze(["lean-module", "blueprint-node", "verso-verse"]);

/** The four acceptance obligations every proof work order is assayed against. */
export const OBLIGATION_IDS = Object.freeze(["module-builds", "axiom-budget", "blueprint-chart", "manual-builds"]);

/**
 * The Obsmetrologia axiom law (owner-ruled 2026-09-21): the library admits
 * no axioms outside this set for any named declaration. `propext`,
 * `Classical.choice`, and every axiom besides `Quot.sound` are outside the
 * law, whether or not a work order tries to budget them.
 */
export const ALLOWED_AXIOMS = Object.freeze(["Quot.sound"]);

/**
 * Axioms no work-order budget may admit. A work order realizes a proof, and a
 * `sorry` marks where a proof is still to come, so `sorryAx` can state a
 * frontier theorem in the library but can never realize an order. Kept distinct from
 * {@link ALLOWED_AXIOMS} — a forbidden axiom fails as `FORBIDDEN_AXIOM`,
 * everything else outside the law fails as `AXIOM_OUTSIDE_LAW` — so callers
 * that only ever cared about `sorryAx` keep working unchanged.
 */
export const FORBIDDEN_AXIOMS = Object.freeze(["sorryAx"]);

const ID = /^[a-z][a-z0-9-]*$/u;
const LABEL = /^[a-z]+:[a-z0-9-]+$/u;

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function requireText(value, path) {
  if (typeof value !== "string" || value.length === 0) fail("INVALID_TEXT", `${path} must be nonempty text`);
  return value;
}

function requireId(value, path) {
  if (typeof value !== "string" || !ID.test(value)) fail("INVALID_ID", `${path} must be a lowercase hyphenated identifier`);
  return value;
}

function requireClauses(value, path, { required }) {
  if (!Array.isArray(value) || (required && value.length === 0)) fail("MISSING_CLAUSES", `${path} must be ${required ? "a nonempty" : "an"} array`);
  const seen = new Set();
  for (const [index, clause] of value.entries()) {
    requireId(clause?.id, `${path}[${index}].id`);
    requireText(clause?.statement, `${path}[${index}].statement`);
    if (seen.has(clause.id)) fail("DUPLICATE_CLAUSE_ID", `${path} repeats ${clause.id}`);
    seen.add(clause.id);
  }
  return value;
}

function requireNode(node, path, { headline }) {
  if (typeof node?.label !== "string" || !LABEL.test(node.label)) fail("INVALID_LABEL", `${path}.label must be a blueprint label such as thm:name`);
  requireText(node.title, `${path}.title`);
  requireText(node.statement, `${path}.statement`);
  if (!Array.isArray(node.uses ?? [])) fail("INVALID_USES", `${path}.uses must be an array of labels`);
  for (const [index, used] of (node.uses ?? []).entries()) {
    if (typeof used !== "string" || !LABEL.test(used)) fail("INVALID_LABEL", `${path}.uses[${index}] must be a blueprint label`);
  }
  if (headline !== undefined && node.lean !== undefined) fail("UNEXPECTED_FIELD", `${path}.lean is the order's headline, not a node field`);
  return node;
}

/**
 * Parse and validate one proof work order from its JSON text.
 *
 * @param {string} text - The work order file's text.
 * @returns {object} The validated order (the parsed object, unchanged).
 * @throws {Error} With a `code` naming the first violated rule.
 */
export function parseProofWorkOrder(text) {
  let order;
  try {
    order = JSON.parse(text);
  } catch (error) {
    fail("INVALID_JSON", error.message);
  }
  if (order?.type !== PROOF_WORK_ORDER_TYPE || order.version !== 1) fail("INVALID_ORDER", `order must be ${PROOF_WORK_ORDER_TYPE}@1`);
  requireId(order.id, "id");
  requireText(order.title, "title");
  requireText(order.module, "module");
  if (!order.module.startsWith("Obsmetrologia.")) fail("INVALID_MODULE", "module must be an Obsmetrologia.* module");
  requireText(order.headline, "headline");
  if (!order.headline.startsWith("Obsmetrologia.")) fail("INVALID_HEADLINE", "headline must be an Obsmetrologia.* declaration");
  if (!Array.isArray(order.declarations) || order.declarations.length === 0) fail("MISSING_DECLARATIONS", "declarations must be a nonempty array");
  for (const [index, name] of order.declarations.entries()) {
    requireText(name, `declarations[${index}]`);
    // Namespaces and module names differ in Lean; that a declaration lives in THIS module is the
    // chart gate's reading (chartFindings: declaration-not-in-module), not a name-prefix rule.
    if (!name.startsWith("Obsmetrologia.")) fail("INVALID_DECLARATION", `declarations[${index}] must be an Obsmetrologia.* declaration`);
  }
  if (!order.declarations.includes(order.headline)) fail("HEADLINE_NOT_DECLARED", "headline must be listed among the declarations");
  if (!Array.isArray(order.axiomBudget)) fail("INVALID_AXIOM_BUDGET", "axiomBudget must be an array of axiom names");
  for (const axiom of order.axiomBudget) {
    requireText(axiom, "axiomBudget[]");
    if (FORBIDDEN_AXIOMS.includes(axiom)) fail("FORBIDDEN_AXIOM", `${axiom} may never be within budget`);
    if (!ALLOWED_AXIOMS.includes(axiom)) fail("AXIOM_OUTSIDE_LAW", `${axiom} is outside the Obsmetrologia axiom law (owner-ruled 2026-09-21): only ${ALLOWED_AXIOMS.join(", ")} may ever be budgeted`);
  }
  requireClauses(order.requirements, "requirements", { required: true });
  requireClauses(order.prohibitions ?? [], "prohibitions", { required: false });
  if (!Array.isArray(order.openQuestions ?? [])) fail("INVALID_OPEN_QUESTIONS", "openQuestions must be an array");
  for (const [index, question] of (order.openQuestions ?? []).entries()) {
    requireId(question?.id, `openQuestions[${index}].id`);
    requireText(question?.question, `openQuestions[${index}].question`);
    if (typeof question?.blocking !== "boolean") fail("INVALID_OPEN_QUESTION", `openQuestions[${index}].blocking must be a boolean`);
  }
  if (!Array.isArray(order.corpus) || order.corpus.length === 0) fail("MISSING_CORPUS", "corpus must name at least one carrier the order is grounded in");
  if (!Array.isArray(order.references ?? [])) fail("INVALID_REFERENCES", "references must be an array");
  const blueprint = order.blueprint;
  if (!blueprint || typeof blueprint !== "object") fail("MISSING_BLUEPRINT", "blueprint must be an object");
  requireId(blueprint.chapter, "blueprint.chapter");
  requireText(blueprint.chapterFile, "blueprint.chapterFile");
  if (!/^[0-9]{2}-[a-z0-9-]+$/u.test(blueprint.chapterFile)) fail("INVALID_CHAPTER_FILE", "blueprint.chapterFile must be the owning chapter's NN-name");
  if (!/^[0-9]{2}-[a-z0-9-]+$/u.test(blueprint.file ?? "")) fail("INVALID_NODE_FILE", "blueprint.file must be NN-name");
  requireText(blueprint.section, "blueprint.section");
  requireNode(blueprint, "blueprint", { headline: order.headline });
  if (!Array.isArray(blueprint.frontier ?? [])) fail("INVALID_FRONTIER", "blueprint.frontier must be an array of nodes");
  const labels = new Set([blueprint.label]);
  for (const [index, node] of (blueprint.frontier ?? []).entries()) {
    requireNode(node, `blueprint.frontier[${index}]`, {});
    if (labels.has(node.label)) fail("DUPLICATE_LABEL", `blueprint repeats ${node.label}`);
    labels.add(node.label);
  }
  if (typeof order.verse?.module !== "string" || !order.verse.module.startsWith("ObsmetrologiaManual.")) fail("INVALID_VERSE", "verse.module must be an ObsmetrologiaManual.* module");
  return order;
}

/**
 * The Lean source path of a module, relative to the Lean package root.
 * @param {string} module - e.g. "Obsmetrologia.AperiodicOrder.Tiling.Witness.HatMetatile".
 * @returns {string}
 */
export function leanModulePath(module) {
  return `${module.replaceAll(".", "/")}.lean`;
}

/**
 * The Verso verse path of a manual module, relative to the Lean package root.
 * @param {string} module - e.g. "ObsmetrologiaManual.BookVII.HatMonotile".
 * @returns {string}
 */
export function versePath(module) {
  return `docs/verso/${module.replaceAll(".", "/")}.lean`;
}

/**
 * The Blueprint node file path of an order, relative to the Lean package root.
 * @param {{chapter: string, file: string}} blueprint
 * @returns {string}
 */
export function blueprintNodePath(blueprint) {
  return `docs/blueprint/src/chapters/${blueprint.chapter}/${blueprint.file}.tex`;
}

/**
 * The owning chapter file path, relative to the Lean package root.
 * @param {{chapterFile: string}} blueprint
 * @returns {string}
 */
export function blueprintChapterPath(blueprint) {
  return `docs/blueprint/src/chapters/${blueprint.chapterFile}.tex`;
}

/**
 * The `\input` line the chapter file must carry for the node file.
 * @param {{chapter: string, file: string}} blueprint
 * @returns {string}
 */
export function blueprintInputLine(blueprint) {
  return `\\input{chapters/${blueprint.chapter}/${blueprint.file}}`;
}

/**
 * The `sha256:<hex>` digest the admission service binds evidence to.
 * @param {Uint8Array|string} bytes
 * @returns {string}
 */
export function digestOf(bytes) {
  return sha256Digest(bytes);
}

/**
 * Translate a validated order into the admission service's candidate: the
 * order file is the source, its clauses are the requirements and
 * prohibitions, and the line's fixed constraints, projections, and
 * obligations are attached with a complete trace from every clause. The
 * `axiom-discipline` constraint cites the Obsmetrologia axiom law
 * (owner-ruled 2026-09-21, {@link ALLOWED_AXIOMS}), not the order's own
 * `axiomBudget` — `parseProofWorkOrder` already refuses any order whose
 * budget strays outside the law, so this constraint states the law itself.
 *
 * @param {object} order - A `parseProofWorkOrder` result.
 * @param {{locator: string, digest: string, lineCount: number, toolchain: string}} source
 *   The order file's repo-relative locator, its `sha256:` digest, its line count, and the
 *   pinned Lean toolchain (the `lean-toolchain` file's text).
 * @returns {object} An `ArtifactFabricationSpecificationCandidate@1`.
 */
export function candidateOfProofWorkOrder(order, { locator, digest, lineCount, toolchain }) {
  const span = { type: "ArtifactFabricationSourceSpan", startLine: 1, endLine: Math.max(1, lineCount) };
  const budget = order.axiomBudget.length === 0 ? "no axioms" : order.axiomBudget.join(", ");
  const constraints = [
    { type: "ArtifactFabricationConstraint", version: 1, id: "axiom-discipline", kind: "law", authority: "Obsmetrologia axiom law (owner ruling)", revision: "2026-09-21", locator: "lib/emsenn/services/561-group/services/science-services-section/services/information-science-services-section/services/math-services-section/services/obsmetrological-services-section/content/text/documents/articles/notes/2026/09/21/2026-09-21-note-on-the-axiom-law-spine-lineage-and-the-light-cone.md", applicability: "lean-module", statement: "collectAxioms of every named declaration is a subset of {Quot.sound}; propext, Classical.choice and sorryAx are never within budget.", sourceSpan: span },
    { type: "ArtifactFabricationConstraint", version: 1, id: "lean-toolchain", kind: "standard", authority: "Lean 4 (leanprover/lean4)", revision: toolchain.trim(), locator: "lib/obsmetrologia/lean-toolchain", applicability: "lean-module, verso-verse", statement: "The module and the verse elaborate under the pinned toolchain with no dependency beyond Lean core.", sourceSpan: span },
    { type: "ArtifactFabricationConstraint", version: 1, id: "leanblueprint-node", kind: "standard", authority: "leanblueprint (plasTeX plugin)", revision: "plastex.cfg plugins plastexdepgraph plastexshowmore leanblueprint", locator: "lib/obsmetrologia/docs/blueprint/src/plastex.cfg", applicability: "blueprint-node", statement: "A claim node is a theorem environment carrying \\label, \\lean, \\uses, and exactly one of \\leanok or \\notready; it is \\notready until a realization receipt binds this order's digest.", sourceSpan: span },
    { type: "ArtifactFabricationConstraint", version: 1, id: "verse-cites-module", kind: "operational", authority: "ObsmetrologiaManual (docs/verso)", revision: "docs/verso/lakefile.toml", locator: "lib/obsmetrologia/docs/verso/lakefile.toml", applicability: "verso-verse", statement: "The verse imports the module and cites its declarations by docstring, so the manual build type-checks the prose against the proof.", sourceSpan: span },
  ];
  const projections = [
    { type: "ArtifactFabricationProjection", version: 1, id: "lean-module", target: "obsmetrologia-lean-module", configuration: { module: order.module, path: leanModulePath(order.module), headline: order.headline, declarations: order.declarations, axiomBudget: order.axiomBudget }, sourceSpan: span },
    { type: "ArtifactFabricationProjection", version: 1, id: "blueprint-node", target: "lean-blueprint-node", configuration: { chapter: order.blueprint.chapter, chapterFile: order.blueprint.chapterFile, file: order.blueprint.file, label: order.blueprint.label, path: blueprintNodePath(order.blueprint), frontier: (order.blueprint.frontier ?? []).map((node) => node.label) }, sourceSpan: span },
    { type: "ArtifactFabricationProjection", version: 1, id: "verso-verse", target: "obsmetrologia-manual-verse", configuration: { module: order.verse.module, path: versePath(order.verse.module) }, sourceSpan: span },
  ];
  const acceptanceObligations = [
    { type: "ArtifactFabricationAcceptanceObligation", version: 1, id: "module-builds", kind: "test", statement: `lake build ${order.module} exits 0.`, sourceSpan: span },
    { type: "ArtifactFabricationAcceptanceObligation", version: 1, id: "axiom-budget", kind: "assay", statement: `collectAxioms over every named declaration is within the budget (${budget}) and every named declaration exists.`, sourceSpan: span },
    { type: "ArtifactFabricationAcceptanceObligation", version: 1, id: "blueprint-chart", kind: "assay", statement: `The blueprint chart holds node ${order.blueprint.label} referencing ${order.headline}, every named declaration is cataloged, and the node has no unmatched Lean reference.`, sourceSpan: span },
    { type: "ArtifactFabricationAcceptanceObligation", version: 1, id: "manual-builds", kind: "test", statement: `lake build in docs/verso exits 0 with ${order.verse.module} importing ${order.module}.`, sourceSpan: span },
  ];
  const clauses = [
    ...order.requirements.map((clause) => ({ type: "ArtifactFabricationRequirement", version: 1, id: clause.id, statement: clause.statement, sourceSpan: span })),
  ];
  const prohibitions = (order.prohibitions ?? []).map((clause) => ({ type: "ArtifactFabricationProhibition", version: 1, id: clause.id, statement: clause.statement, sourceSpan: span }));
  const traceability = [...clauses, ...prohibitions].map((clause) => ({
    type: "ArtifactFabricationTrace", version: 1, requirementId: clause.id,
    constraintIds: constraints.map(({ id }) => id),
    projectionIds: projections.map(({ id }) => id),
    acceptanceObligationIds: acceptanceObligations.map(({ id }) => id),
  }));
  return {
    type: "ArtifactFabricationSpecificationCandidate",
    version: 1,
    source: {
      type: "ArtifactFabricationSource", version: 1,
      identity: { type: "ArtifactFabricationSourceIdentity", id: order.id },
      provenance: { type: "ArtifactFabricationSourceProvenance", locator, digest, sourceSpan: span },
    },
    artifact: { type: "FabricatedArtifactIdentity", version: 1, id: order.id, kind: "obsmetrologia-proof" },
    requirements: clauses,
    prohibitions,
    openQuestions: (order.openQuestions ?? []).map((question) => ({ type: "ArtifactFabricationOpenQuestion", version: 1, id: question.id, question: question.question, blocking: question.blocking, sourceSpan: span })),
    constraints,
    projections,
    acceptanceObligations,
    traceability,
  };
}

function renderNode({ title, label, lean, status, uses, statement }) {
  const mark = status === "settled" ? "\\leanok" : "\\notready";
  const leanPart = lean === undefined ? "" : `\\lean{${lean}}`;
  const usesPart = uses.length === 0 ? "" : `\\uses{${uses.join(", ")}}`;
  return `\\begin{theorem}[${title}]\\label{${label}}${leanPart}${mark}${usesPart}\n${statement.trim()}\n\\end{theorem}\n`;
}

/**
 * Render the order's Blueprint node file: the section heading, the headline
 * node (`\notready` until settled, `\leanok` once a receipt binds the order),
 * and every frontier node the order seats beside it, always `\notready` —
 * except the frontier nodes another order has promoted to its own headline,
 * which that order's node file now carries.
 *
 * @param {object} order - A `parseProofWorkOrder` result.
 * @param {{status: "frontier"|"settled", promoted?: string[]}} options
 * @returns {string} The LaTeX text of the node file.
 */
export function renderBlueprintNode(order, { status, promoted = [] }) {
  if (status !== "frontier" && status !== "settled") fail("INVALID_STATUS", "status must be frontier or settled");
  const { blueprint } = order;
  const parts = [`\\section{${blueprint.section}}\n`];
  parts.push(renderNode({ title: blueprint.title, label: blueprint.label, lean: order.headline, status, uses: blueprint.uses ?? [], statement: blueprint.statement }));
  for (const node of blueprint.frontier ?? []) {
    if (promoted.includes(node.label)) continue;
    parts.push(renderNode({ title: node.title, label: node.label, status: "frontier", uses: node.uses ?? [], statement: node.statement }));
  }
  return parts.join("\n");
}

/**
 * The labels among an order's frontier nodes that another order has taken as
 * its own headline label: promoted out of this order's node file.
 *
 * @param {object} order - A `parseProofWorkOrder` result.
 * @param {object[]} orders - Every parsed order of the section, this one included or not.
 * @returns {string[]} In the order's own frontier order.
 */
export function promotedFrontierLabels(order, orders) {
  const headlines = new Set(orders.filter((other) => other.id !== order.id).map((other) => other.blueprint.label));
  return (order.blueprint.frontier ?? []).map((node) => node.label).filter((label) => headlines.has(label));
}

/**
 * The orders whose frontier seats this order's headline label: the orders
 * this one was drafted from, whose node files must drop the promoted node.
 *
 * @param {object} order - A `parseProofWorkOrder` result.
 * @param {object[]} orders - Every parsed order of the section.
 * @returns {object[]}
 */
export function parentOrdersOf(order, orders) {
  return orders.filter((other) => other.id !== order.id && (other.blueprint.frontier ?? []).some((node) => node.label === order.blueprint.label));
}

/**
 * Read a node file's headline status back off its text: `settled` when the
 * theorem carrying the label is marked `\leanok`, `frontier` otherwise.
 *
 * @param {string} nodeFileText
 * @param {string} label
 * @returns {"frontier"|"settled"}
 */
export function headlineStatusOf(nodeFileText, label) {
  const line = nodeFileText.split(/\r?\n/u).find((candidate) => candidate.includes(`\\label{${label}}`));
  return line !== undefined && line.includes("\\leanok") ? "settled" : "frontier";
}

/**
 * The next `NN` for a node file in a chapter directory, from the names already there.
 *
 * @param {string[]} names - File names in the chapter directory (`NN-name.tex`).
 * @returns {string} Two-digit, zero-padded.
 */
export function nextNodeFileNumber(names) {
  const numbers = names.map((name) => /^([0-9]{2})-[a-z0-9-]+\.tex$/u.exec(name)).filter(Boolean).map((match) => Number(match[1]));
  return String(numbers.length === 0 ? 1 : Math.max(...numbers) + 1).padStart(2, "0");
}

/**
 * Draft the order that promotes one red frontier node to a headline — the
 * pre-blueprint step. The draft carries everything the seeding order and the
 * node already settle (the blueprint seat, the axiom budget, the corpus and
 * references) and leaves empty what only the proof can settle (module,
 * headline, declarations, requirements, verse); `parseProofWorkOrder`
 * refuses the draft until those are filled.
 *
 * @param {{orders: object[], label: string, nodeFileNumber: string}} options
 *   Every parsed order of the section, the frontier label (`thm:name`), and the
 *   `NN` the new node file takes in its chapter directory.
 * @returns {{draft: object, seededBy: string}}
 * @throws {Error} `FRONTIER_NOT_SEATED` when no order seats the label as a frontier node;
 *   `ALREADY_PROMOTED` when an order already holds it as headline.
 */
export function draftOrderOfFrontier({ orders, label, nodeFileNumber }) {
  if (typeof label !== "string" || !LABEL.test(label)) fail("INVALID_LABEL", "label must be a blueprint label such as thm:name");
  const holder = orders.find((order) => order.blueprint.label === label);
  if (holder !== undefined) fail("ALREADY_PROMOTED", `${label} is already the headline of ${holder.id}`);
  const parent = orders.find((order) => (order.blueprint.frontier ?? []).some((node) => node.label === label));
  if (parent === undefined) fail("FRONTIER_NOT_SEATED", `no order seats ${label} as a frontier node`);
  const node = parent.blueprint.frontier.find((candidate) => candidate.label === label);
  const id = label.slice(label.indexOf(":") + 1);
  if (!/^[0-9]{2}$/u.test(nodeFileNumber)) fail("INVALID_NODE_FILE", "nodeFileNumber must be NN");
  const statement = node.statement.replace(/^\s*\\emph\{Open frontier\.\}\s*/u, "");
  const draft = {
    type: PROOF_WORK_ORDER_TYPE,
    version: 1,
    id,
    title: "",
    module: "",
    headline: "",
    declarations: [],
    axiomBudget: [...parent.axiomBudget],
    requirements: [],
    prohibitions: [],
    openQuestions: [],
    corpus: [...parent.corpus],
    references: [...(parent.references ?? [])],
    frontierOf: parent.id,
    blueprint: {
      chapter: parent.blueprint.chapter,
      chapterFile: parent.blueprint.chapterFile,
      file: `${nodeFileNumber}-${id}`,
      section: "",
      label,
      title: node.title,
      statement,
      uses: [...(node.uses ?? [])],
      frontier: [],
    },
    verse: { module: "" },
  };
  return { draft, seededBy: parent.id };
}

/**
 * Ensure a chapter file inputs the node file: returns the chapter text with
 * the `\input` line appended when absent, unchanged otherwise.
 *
 * @param {string} chapterText
 * @param {{chapter: string, file: string}} blueprint
 * @returns {{text: string, changed: boolean}}
 */
export function seatInChapter(chapterText, blueprint) {
  const line = blueprintInputLine(blueprint);
  if (chapterText.split(/\r?\n/u).some((candidate) => candidate.trim() === line)) return { text: chapterText, changed: false };
  const base = chapterText.endsWith("\n") ? chapterText : `${chapterText}\n`;
  return { text: `${base}${line}\n`, changed: true };
}

/**
 * The Lean meta program that prints `name\taxioms` for every declaration the
 * order names (the same row shape as `census-set-of-theorem-axioms.lean`), so
 * one `lake env lean` run prices the whole order.
 *
 * @param {object} order
 * @returns {string} Lean source text.
 */
export function axiomCensusProgram(order) {
  const names = order.declarations.map((name) => `\`${name}`).join(", ");
  return [
    "import Lean",
    `import ${order.module}`,
    "open Lean Elab Command in",
    "#eval show CommandElabM Unit from do",
    `  for n in [${names}] do`,
    "    let axs ← liftCoreM (collectAxioms n)",
    "    IO.println s!\"{n}\\t{String.intercalate \",\" (axs.map toString).toList}\"",
    "",
  ].join("\n");
}

/**
 * Read an axiom census (rows of `{name, axioms}`) against the order's budget
 * and, belt and braces, against the Obsmetrologia axiom law itself
 * ({@link ALLOWED_AXIOMS}) — a declaration is flagged `axiom-outside-law`
 * even when its own order's `axiomBudget` (wrongly) admits the axiom, since
 * `parseProofWorkOrder` is not the only path an order can reach this check
 * from (a historical order predating the law, for one).
 *
 * @param {Array<{name: string, axioms: string[]}>} rows
 * @param {object} order
 * @returns {Array<{code: string, declaration: string, axioms?: string[]}>} Empty when within budget and law.
 */
export function axiomBudgetFindings(rows, order) {
  const byName = new Map(rows.map((row) => [row.name, row]));
  const findings = [];
  for (const declaration of order.declarations) {
    const row = byName.get(declaration);
    if (row === undefined) {
      findings.push({ code: "declaration-missing", declaration });
      continue;
    }
    const outsideBudget = row.axioms.filter((axiom) => !order.axiomBudget.includes(axiom));
    if (outsideBudget.length > 0) findings.push({ code: "axiom-outside-budget", declaration, axioms: outsideBudget });
    const outsideLaw = row.axioms.filter((axiom) => !ALLOWED_AXIOMS.includes(axiom));
    if (outsideLaw.length > 0) findings.push({ code: "axiom-outside-law", declaration, axioms: outsideLaw });
  }
  return findings;
}

/**
 * Read a Lean/Blueprint workspace chart (lean-blueprint-chart-service's
 * `readLeanWorkspace`) against the order: the headline node exists and
 * references the headline, every frontier node exists, every named
 * declaration is cataloged in the order's own module, and the headline node
 * has no unmatched Lean reference.
 *
 * @param {{texWorkspaceRead: {blueprintClaimGraph: {nodes: Array<object>}}, declarationCatalog: {entries: Array<{name: string, module: string}>}}} chart
 * @param {Array<{code: string, nodeId?: string}>} weldFindings - `blueprintLeanWeldFindings(graph, catalog)`.
 * @param {object} order
 * @returns {Array<{code: string, label?: string, declaration?: string, message?: string}>}
 */
export function chartFindings(chart, weldFindings, order) {
  const nodes = new Map(chart.texWorkspaceRead.blueprintClaimGraph.nodes.map((node) => [node.id, node]));
  const catalog = new Map(chart.declarationCatalog.entries.map((entry) => [entry.name, entry]));
  const findings = [];
  const headline = nodes.get(order.blueprint.label);
  if (headline === undefined) findings.push({ code: "node-missing", label: order.blueprint.label });
  else if (!headline.leanDeclarations.includes(order.headline)) findings.push({ code: "headline-not-referenced", label: order.blueprint.label, declaration: order.headline });
  for (const node of order.blueprint.frontier ?? []) {
    if (!nodes.has(node.label)) findings.push({ code: "node-missing", label: node.label });
  }
  for (const declaration of order.declarations) {
    const entry = catalog.get(declaration);
    if (entry === undefined) findings.push({ code: "declaration-not-cataloged", declaration });
    else if (entry.module !== order.module) findings.push({ code: "declaration-not-in-module", declaration, module: entry.module });
  }
  for (const finding of weldFindings) {
    // `red-settled` on the headline node is the line's own pre-settlement state: the node stays
    // \notready until the receipt this audit produces licenses realize-blueprint-node --receipt.
    if (finding.nodeId === order.blueprint.label && finding.code !== "red-settled") findings.push({ code: finding.code, label: finding.nodeId, message: finding.message });
  }
  return findings;
}

/**
 * The realization receipt candidate binding one piece of evidence per
 * projection and per obligation to the admitted specification.
 *
 * @param {{artifact: {id: string}, specificationDigest: string}} specification - The admitted specification.
 * @param {{projections: Record<string, {locator: string, digest: string}>, obligations: Record<string, {locator: string, digest: string}>}} evidence
 * @returns {object} An `ArtifactFabricationRealizationReceiptCandidate@1`.
 */
export function receiptCandidateOf(specification, evidence) {
  const item = (locator, digest) => ({ type: "ArtifactFabricationEvidence", locator, digest });
  return {
    type: "ArtifactFabricationRealizationReceiptCandidate", version: 1,
    artifactId: specification.artifact.id,
    specificationDigest: specification.specificationDigest,
    realizations: PROJECTION_IDS.map((projectionId) => ({ type: "ArtifactFabricationRealizationEvidence", version: 1, projectionId, evidence: item(evidence.projections[projectionId].locator, evidence.projections[projectionId].digest) })),
    acceptances: OBLIGATION_IDS.map((acceptanceObligationId) => ({ type: "ArtifactFabricationRealizationEvidence", version: 1, acceptanceObligationId, evidence: item(evidence.obligations[acceptanceObligationId].locator, evidence.obligations[acceptanceObligationId].digest) })),
  };
}

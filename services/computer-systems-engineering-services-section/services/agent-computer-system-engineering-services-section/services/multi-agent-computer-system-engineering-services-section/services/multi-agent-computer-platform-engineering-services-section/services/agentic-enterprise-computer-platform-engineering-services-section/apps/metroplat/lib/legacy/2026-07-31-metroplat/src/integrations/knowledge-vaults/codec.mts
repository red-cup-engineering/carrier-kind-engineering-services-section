/**
 * integrations/knowledge-vaults/src/codec — Diataxis as a derived read over markdown text.
 *
 * Diataxis (tutorial/how-to/explanation/reference) is an external documentation
 * taxonomy, not a RelMath object: the mapping from a mode name to the package's
 * FOUR charge value is a designed correspondence between two representations,
 * and the coverage read is a boundary computation over admitted document text —
 * both are codec concerns (a codec IS a mapping between representations), never
 * material law. This module previously lived under
 * `core/calculus/predicating/positing/`, then under
 * `src/core/codecs/markdown/diataxis/`; it now lives alongside the rest of the
 * knowledge-vault integration's documentation-facing code.
 *
 * The mode/charge/duality mapping is unchanged from its prior home:
 *
 * - tutorial   -> package `contested` (both sides: shows and tells)
 * - how-to     -> package `unknown` (no evidence carried)
 * - explanation -> package `held` (truth side present)
 * - reference  -> package `denied` (falsity side present)
 *
 * What is new here is `diataxisModeOfText`: the prior realization asserted a
 * document's mode as hand-curated, editorial data for four specific files,
 * with a comment claiming purpose "cannot be inferred from headings alone."
 * That claim was never tested against this package's own text-reading
 * capability (`src/integrations/knowledge-vaults/wikilinks`) and does not hold: Diataxis's own
 * literature gives structural distinguishing questions (is this
 * learning-oriented / task-oriented / understanding-oriented /
 * information-oriented), several of which leave real structural traces in
 * markdown (ordered steps, code-block density, table density, goal framing).
 * `diataxisModeOfText` reads those traces as real evidence. It is a heuristic,
 * documented as one — Diataxis mode is a purpose judgment, so a structural
 * reader will sometimes be wrong — but it is evidence read from the actual
 * document, not asserted about it from outside.
 */
import {
  asChargeValue,
  chargeValue,
  conflateValue,
  gauge,
  negateValue,
} from "../../lib/values/index.mts";
import type { ChargeValue, ChargeValueName } from "../../lib/values/index.mts";

// ── mode / charge / duality (relocated verbatim from core/calculus/predicating/positing/diataxis.mts) ──

/** The four Diataxis mode names, using the package's public spelling. */
export type DiataxisModeName = "tutorial" | "how-to" | "explanation" | "reference";

/** A Diataxis mode read over the package's FOUR charge value. */
export interface DiataxisMode {
  readonly kind: "diataxis.mode";
  readonly name: DiataxisModeName;
  readonly charge: ChargeValue;
  readonly application: boolean;
  readonly cognition: boolean;
}

/** A duality edge between two Diataxis modes. */
export interface DiataxisDualityEdge {
  readonly kind: "diataxis.duality-edge";
  readonly duality: "lookup" | "doing" | "antipode";
  readonly from: DiataxisMode;
  readonly to: DiataxisMode;
}

/** The finite Diataxis read carried by FOUR. */
export interface DiataxisReading {
  readonly kind: "diataxis.reading";
  readonly modes: readonly DiataxisMode[];
  readonly lookupDual: readonly DiataxisDualityEdge[];
  readonly doingDual: readonly DiataxisDualityEdge[];
  readonly antipode: readonly DiataxisDualityEdge[];
}

/** All Diataxis mode names. */
export const diataxisModeNames: readonly DiataxisModeName[] =
  Object.freeze(["tutorial", "how-to", "explanation", "reference"] as const satisfies readonly DiataxisModeName[]);

const chargeByMode = {
  tutorial: "contested",
  "how-to": "unknown",
  explanation: "held",
  reference: "denied",
} as const satisfies Record<DiataxisModeName, ChargeValueName>;

const modeByCharge = {
  contested: "tutorial",
  unknown: "how-to",
  held: "explanation",
  denied: "reference",
} as const satisfies Record<ChargeValueName, DiataxisModeName>;

/** Whether a string names a Diataxis mode. */
export function isDiataxisModeName(value: string): value is DiataxisModeName {
  return (diataxisModeNames as readonly string[]).includes(value);
}

/** Coerce a string to a Diataxis mode name, or throw. */
export function asDiataxisModeName(value: string): DiataxisModeName {
  if (!isDiataxisModeName(value)) {
    throw new TypeError(`not a Diataxis mode name: ${JSON.stringify(value)} (expected one of ${diataxisModeNames.join(", ")})`);
  }
  return value;
}

const modeNameOf = (mode: DiataxisMode | DiataxisModeName): DiataxisModeName =>
  typeof mode === "string" ? asDiataxisModeName(mode) : mode.name;

/** Construct a Diataxis mode and its package charge reading. */
export function diataxisMode(name: DiataxisModeName): DiataxisMode {
  const charge = chargeValue(chargeByMode[name]);
  return Object.freeze({
    kind: "diataxis.mode" as const,
    name,
    charge,
    application: charge.coordinates[0].name === "present",
    cognition: charge.coordinates[1].name === "present",
  });
}

/** All four Diataxis modes. */
export const diataxisModes: readonly DiataxisMode[] = Object.freeze(diataxisModeNames.map(diataxisMode));

/** The name of a Diataxis mode. */
export const diataxisModeName = (mode: DiataxisMode): DiataxisModeName => mode.name;

/** Read the package FOUR charge value carried by a Diataxis mode. */
export function chargeValueOfDiataxisMode(mode: DiataxisMode | DiataxisModeName): ChargeValue {
  return chargeValue(chargeByMode[modeNameOf(mode)]);
}

/** Read the Diataxis mode corresponding to a package FOUR charge value. */
export function diataxisModeOfCharge(value: ChargeValue | ChargeValueName): DiataxisMode {
  return diataxisMode(modeByCharge[asChargeValue(value).name]);
}

/** Whether a Diataxis mode is application-facing. */
export function diataxisApplication(mode: DiataxisMode | DiataxisModeName): boolean {
  return chargeValueOfDiataxisMode(mode).coordinates[0].name === "present";
}

/** Whether a Diataxis mode is cognition-facing. */
export function diataxisCognition(mode: DiataxisMode | DiataxisModeName): boolean {
  return chargeValueOfDiataxisMode(mode).coordinates[1].name === "present";
}

/** Lookup duality: tutorial <-> reference, with how-to and explanation fixed. */
export function diataxisLookupDual(mode: DiataxisMode | DiataxisModeName): DiataxisMode {
  return diataxisModeOfCharge(conflateValue(chargeValueOfDiataxisMode(mode)));
}

/** Doing duality: how-to <-> explanation, with tutorial and reference fixed. */
export function diataxisDoingDual(mode: DiataxisMode | DiataxisModeName): DiataxisMode {
  return diataxisModeOfCharge(negateValue(chargeValueOfDiataxisMode(mode)));
}

/** The composite diagonal duality on the Diataxis four. */
export function diataxisAntipode(mode: DiataxisMode | DiataxisModeName): DiataxisMode {
  return diataxisModeOfCharge(gauge("double", chargeValueOfDiataxisMode(mode)));
}

const dualityEdge = (
  duality: DiataxisDualityEdge["duality"],
  from: DiataxisMode,
  to: DiataxisMode,
): DiataxisDualityEdge => Object.freeze({
  kind: "diataxis.duality-edge" as const,
  duality,
  from,
  to,
});

/** The finite Diataxis reading carried by the package FOUR charge square: all
 * four modes plus the three transported diagonal edge sets. */
export function diataxisReading(): DiataxisReading {
  const modes = diataxisModes;
  return Object.freeze({
    kind: "diataxis.reading" as const,
    modes,
    lookupDual: Object.freeze(modes.map((mode) => dualityEdge("lookup", mode, diataxisLookupDual(mode)))),
    doingDual: Object.freeze(modes.map((mode) => dualityEdge("doing", mode, diataxisDoingDual(mode)))),
    antipode: Object.freeze(modes.map((mode) => dualityEdge("antipode", mode, diataxisAntipode(mode)))),
  });
}

// ── mode-of-text: the real read this codec exists to do ─────────────────────

/** Structural evidence extracted from a markdown document body, the fibers a
 * mode classification is read from. */
export interface DiataxisTextEvidence {
  readonly kind: "diataxis.text-evidence";
  readonly orderedStepLines: number;
  readonly codeBlockCount: number;
  readonly tableRowCount: number;
  readonly proseLineCount: number;
  readonly totalLineCount: number;
  readonly hasGoalFraming: boolean;
}

const ORDERED_STEP_LINE = /^\s*\d+[.)]\s+\S/mu;
const CODE_FENCE = /^```/mu;
const TABLE_ROW = /^\s*\|.*\|\s*$/mu;
const GOAL_FRAMING = /\b(by the end of this|you will (?:learn|be able to)|in this tutorial|the goal of this)\b/iu;

function countMatches(pattern: RegExp, text: string): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return (text.match(new RegExp(pattern.source, flags)) ?? []).length;
}

/** Read structural evidence from a markdown document body (frontmatter already stripped). */
export function diataxisTextEvidence(body: string): DiataxisTextEvidence {
  const lines = body.split(/\r?\n/u);
  const orderedStepLines = countMatches(ORDERED_STEP_LINE, body);
  const codeBlockCount = Math.floor(countMatches(CODE_FENCE, body) / 2);
  const tableRowCount = countMatches(TABLE_ROW, body);
  const structuralLines = orderedStepLines + tableRowCount;
  const proseLineCount = lines.filter((line) => line.trim().length > 0).length - structuralLines;
  return Object.freeze({
    kind: "diataxis.text-evidence" as const,
    orderedStepLines,
    codeBlockCount,
    tableRowCount,
    proseLineCount: Math.max(0, proseLineCount),
    totalLineCount: lines.length,
    hasGoalFraming: GOAL_FRAMING.test(body),
  });
}

/**
 * Read a Diataxis mode from a markdown document's actual body text.
 *
 * This is a structural heuristic over Diataxis's own distinguishing
 * questions, not a definitive classifier — Diataxis mode is fundamentally a
 * purpose judgment, and a document can be structurally ambiguous. Priority,
 * read from real evidence:
 *
 * 1. Explicit `mode` frontmatter, if the caller supplies one — an authored
 *    override always wins over inference.
 * 2. Goal-framing language ("by the end of this...") combined with ordered
 *    steps: learning-oriented -> tutorial.
 * 3. Ordered steps without goal framing: task-oriented -> how-to.
 * 4. Table/code-block density at or above prose density: information-oriented
 *    -> reference.
 * 5. Otherwise: understanding-oriented -> explanation (the prose default).
 */
export function diataxisModeOfText(body: string, explicitMode?: string): DiataxisModeName {
  if (explicitMode !== undefined && isDiataxisModeName(explicitMode)) return explicitMode;
  const evidence = diataxisTextEvidence(body);
  if (evidence.orderedStepLines > 0 && evidence.hasGoalFraming) return "tutorial";
  if (evidence.orderedStepLines > 0) return "how-to";
  if (evidence.codeBlockCount + evidence.tableRowCount >= evidence.proseLineCount) return "reference";
  return "explanation";
}

// ── coverage surface / read (relocated from core/calculus/predicating/positing/diataxis-coverage.mts) ──

/** A documentation locus whose local fiber is one Diataxis mode. */
export interface DiataxisCoverageItem {
  readonly kind: "diataxis.coverage.item";
  readonly id: string;
  readonly mode: DiataxisModeName;
  readonly title?: string;
  readonly source?: string;
}

/** Admitted documentation material for a Diataxis coverage read. */
export interface DiataxisCoverageSurface {
  readonly kind: "diataxis.coverage.surface";
  readonly id: string;
  readonly items: readonly DiataxisCoverageItem[];
  readonly requiredModes?: readonly DiataxisModeName[];
}

/** Per-mode occupation read, transported through the package FOUR charge value. */
export interface DiataxisCoverageModeRead {
  readonly kind: "diataxis.coverage.mode-classification";
  readonly mode: DiataxisModeName;
  readonly charge: ChargeValueName;
  readonly application: boolean;
  readonly cognition: boolean;
  readonly count: number;
  readonly loci: readonly string[];
}

/** Diagonal or off-diagonal coverage face. */
export interface DiataxisCoverageFaceRead {
  readonly kind: "diataxis.coverage.face-read";
  readonly face: "diagonal" | "off-diagonal";
  readonly modes: readonly DiataxisModeName[];
  readonly count: number;
  readonly complete: boolean;
  readonly missing: readonly DiataxisModeName[];
  readonly loci: readonly string[];
}

/** Witness that all required Diataxis fibers are occupied. */
export interface DiataxisCoverageWitness {
  readonly kind: "diataxis.coverage:witness";
  readonly surface: string;
  readonly requiredModes: readonly DiataxisModeName[];
  readonly itemCount: number;
  readonly diagonalComplete: boolean;
  readonly offDiagonalComplete: boolean;
}

/** Obstruction naming the missing Diataxis fibers. */
export interface DiataxisCoverageObstruction {
  readonly kind: "diataxis.coverage-obstruction";
  readonly surface: string;
  readonly requiredModes: readonly DiataxisModeName[];
  readonly missingModes: readonly DiataxisModeName[];
  readonly diagonalComplete: boolean;
  readonly offDiagonalComplete: boolean;
}

/** Finite coverage read for one admitted documentation surface. */
export interface DiataxisCoverageClassification {
  readonly kind: "diataxis.coverage.classification";
  readonly surface: string;
  readonly itemCount: number;
  readonly requiredModes: readonly DiataxisModeName[];
  readonly coveredModes: readonly DiataxisModeName[];
  readonly missingModes: readonly DiataxisModeName[];
  readonly modes: readonly DiataxisCoverageModeRead[];
  readonly diagonal: DiataxisCoverageFaceRead;
  readonly offDiagonal: DiataxisCoverageFaceRead;
  readonly judgment: DiataxisCoverageWitness | DiataxisCoverageObstruction;
}

const diagonalModes: readonly DiataxisModeName[] = Object.freeze(["tutorial", "reference"] as const);
const offDiagonalModes: readonly DiataxisModeName[] = Object.freeze(["how-to", "explanation"] as const);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function normalizeModes(modes: readonly DiataxisModeName[] | undefined): readonly DiataxisModeName[] {
  const source = modes ?? diataxisModeNames;
  const seen = new Set<DiataxisModeName>();
  const out: DiataxisModeName[] = [];
  for (const mode of source) {
    const normalized = asDiataxisModeName(mode);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return Object.freeze(out);
}

/** Construct one documentation locus for a coverage surface. */
export function diataxisCoverageItem(
  mode: DiataxisModeName,
  id: string,
  options: { readonly title?: string; readonly source?: string } = {},
): DiataxisCoverageItem {
  const item = {
    kind: "diataxis.coverage.item" as const,
    id: nonempty(id, "diataxisCoverageItem.id"),
    mode: asDiataxisModeName(mode),
    ...(options.title === undefined ? {} : { title: nonempty(options.title, "diataxisCoverageItem.title") }),
    ...(options.source === undefined ? {} : { source: nonempty(options.source, "diataxisCoverageItem.source") }),
  };
  return Object.freeze(item);
}

/** Admit a finite documentation surface as Diataxis coverage material. */
export function diataxisCoverageSurface(
  id: string,
  items: readonly DiataxisCoverageItem[],
  options: { readonly requiredModes?: readonly DiataxisModeName[] } = {},
): DiataxisCoverageSurface {
  if (!Array.isArray(items)) throw new TypeError("diataxisCoverageSurface.items: expected an array");
  return Object.freeze({
    kind: "diataxis.coverage.surface" as const,
    id: nonempty(id, "diataxisCoverageSurface.id"),
    items: Object.freeze(items.map((item) => diataxisCoverageItem(item.mode, item.id, item))),
    requiredModes: normalizeModes(options.requiredModes),
  });
}

function readMode(mode: DiataxisModeName, items: readonly DiataxisCoverageItem[]): DiataxisCoverageModeRead {
  const loci = Object.freeze(items.filter((item) => item.mode === mode).map((item) => item.id));
  return Object.freeze({
    kind: "diataxis.coverage.mode-classification" as const,
    mode,
    charge: chargeValueOfDiataxisMode(mode).name,
    application: diataxisApplication(mode),
    cognition: diataxisCognition(mode),
    count: loci.length,
    loci,
  });
}

function readFace(
  face: DiataxisCoverageFaceRead["face"],
  modes: readonly DiataxisModeName[],
  modeReads: readonly DiataxisCoverageModeRead[],
): DiataxisCoverageFaceRead {
  const selected = modeReads.filter((read) => modes.includes(read.mode));
  const missing = Object.freeze(selected.filter((read) => read.count === 0).map((read) => read.mode));
  return Object.freeze({
    kind: "diataxis.coverage.face-read" as const,
    face,
    modes: Object.freeze([...modes]),
    count: selected.reduce((total, read) => total + read.count, 0),
    complete: missing.length === 0,
    missing,
    loci: Object.freeze(selected.flatMap((read) => read.loci)),
  });
}

/** Read Diataxis coverage over admitted documentation loci. */
export function diataxisCoverageClassification(surface: DiataxisCoverageSurface): DiataxisCoverageClassification {
  if (surface.kind !== "diataxis.coverage.surface") {
    throw new TypeError("diataxisCoverageClassification: expected a diataxis.coverage.surface object");
  }
  const requiredModes = normalizeModes(surface.requiredModes);
  const items = surface.items.map((item) => diataxisCoverageItem(item.mode, item.id, item));
  const modes = Object.freeze(requiredModes.map((mode) => readMode(mode, items)));
  const coveredModes = Object.freeze(modes.filter((read) => read.count > 0).map((read) => read.mode));
  const missingModes = Object.freeze(modes.filter((read) => read.count === 0).map((read) => read.mode));
  const diagonal = readFace("diagonal", diagonalModes.filter((mode) => requiredModes.includes(mode)), modes);
  const offDiagonal = readFace("off-diagonal", offDiagonalModes.filter((mode) => requiredModes.includes(mode)), modes);
  const judgment = missingModes.length === 0
    ? Object.freeze({
      kind: "diataxis.coverage:witness" as const,
      surface: surface.id,
      requiredModes,
      itemCount: items.length,
      diagonalComplete: diagonal.complete,
      offDiagonalComplete: offDiagonal.complete,
    })
    : Object.freeze({
      kind: "diataxis.coverage-obstruction" as const,
      surface: surface.id,
      requiredModes,
      missingModes,
      diagonalComplete: diagonal.complete,
      offDiagonalComplete: offDiagonal.complete,
    });
  return Object.freeze({
    kind: "diataxis.coverage.classification" as const,
    surface: surface.id,
    itemCount: items.length,
    requiredModes,
    coveredModes,
    missingModes,
    modes,
    diagonal,
    offDiagonal,
    judgment,
  });
}

/**
 * Read Diataxis coverage over real markdown documents: each document's mode
 * is read from its own body text (`diataxisModeOfText`), not asserted.
 */
export function diataxisCoverageOfDocuments(
  id: string,
  documents: readonly { readonly path: string; readonly body: string; readonly title?: string; readonly explicitMode?: string }[],
  options: { readonly requiredModes?: readonly DiataxisModeName[] } = {},
): DiataxisCoverageClassification {
  const items = documents.map((doc) =>
    diataxisCoverageItem(diataxisModeOfText(doc.body, doc.explicitMode), doc.path, {
      source: doc.path,
      ...(doc.title === undefined ? {} : { title: doc.title }),
    }));
  return diataxisCoverageClassification(diataxisCoverageSurface(id, items, options));
}

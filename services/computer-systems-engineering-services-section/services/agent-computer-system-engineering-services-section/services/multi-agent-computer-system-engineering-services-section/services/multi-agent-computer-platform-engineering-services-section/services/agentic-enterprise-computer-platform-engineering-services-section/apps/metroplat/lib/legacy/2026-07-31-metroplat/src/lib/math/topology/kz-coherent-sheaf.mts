/**
 * analysis/kz-coherent-sheaf - finite executable runtime surface.
 *
 * Lean defines KZ-coherence as a sheaf-level descent condition equating section
 * maps along KZ-connected parallel 1-cells. In the strict/Scott runtime slice,
 * those KZ 2-cells collapse extensional 1-cells, so every sheaf is coherent.
 */
import type { FromSchema } from "../../schema/contract.mts";

export const zeroCellSchemaContractSchema = {
  $id: "metroplat/closure/analysis/kz-coherent-sheaf/zero-cell",
  type: "object",
  required: ["kind", "name"],
  properties: {
    kind: { const: "kzSheaf.zeroCell" },
    name: { type: "string" },
  },
  additionalProperties: false,
  title: "ZeroCell",
  description: "A named 0-cell of the KZ-coherent sheaf.",
} as const;

export type ZeroCell = FromSchema<typeof zeroCellSchemaContractSchema>;

export const oneCellSchemaContractSchema = {
  $id: "metroplat/closure/analysis/kz-coherent-sheaf/one-cell",
  type: "object",
  required: ["kind", "label", "source", "target", "predicateLeg"],
  properties: {
    kind: { const: "kzSheaf.oneCell" },
    label: { type: "string" },
    source: { type: "string" },
    target: { type: "string" },
    predicateLeg: { type: "string" },
  },
  additionalProperties: false,
  title: "OneCell",
  description: "A labeled 1-cell between two 0-cells, carrying its predicate leg.",
} as const;

export type OneCell = FromSchema<typeof oneCellSchemaContractSchema>;

export interface KZ2CellReceipt {
  readonly kind: "kzSheaf.2cell:witness";
  readonly left: OneCell;
  readonly right: OneCell;
  readonly parallel: true;
  readonly extensionalEquality: true;
  readonly invertible: true;
}

export interface Sheaf {
  readonly kind: "kzSheaf.sheaf";
  readonly zeroCells: readonly ZeroCell[];
  readonly oneCells: readonly OneCell[];
  readonly sections: Readonly<Record<string, string>>;
  readonly restId: Readonly<Record<string, string>>;
}

export interface KZCoherenceReceipt {
  readonly kind: "kzSheaf.coherence:witness";
  readonly sheaf: Sheaf;
  readonly kzCells: readonly KZ2CellReceipt[];
  readonly identifiesParallel: true;
  readonly everySheafCoherentStrict: true;
}

export interface KZDescentReceipt {
  readonly kind: "kzSheaf.descent:witness";
  readonly source: Sheaf;
  readonly restricted: Sheaf;
  readonly sourceCoherent: KZCoherenceReceipt;
  readonly restrictedCoherent: KZCoherenceReceipt;
  readonly closedUnderRestriction: true;
  readonly strictRegimeUniversality: true;
}

export interface KZCoherentSheafReceipt {
  readonly kind: "kzSheaf.receipt:witness";
  readonly coherence: KZCoherenceReceipt;
  readonly descent: KZDescentReceipt;
  readonly aperiodicFrontier: "non-trivial aperiodic 2-cells remain outside this runtime";
  readonly openFrontier: readonly string[];
}

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));

export const zeroCell = (name: string): ZeroCell => {
  if (name.length === 0) throw new TypeError("zeroCell: name must be nonempty");
  return Object.freeze({ kind: "kzSheaf.zeroCell" as const, name });
};

export const oneCell = (label: string, source: string, target: string, predicateLeg: string): OneCell => {
  if ([label, source, target, predicateLeg].some((value) => value.length === 0)) {
    throw new TypeError("oneCell: label/source/target/predicateLeg must be nonempty");
  }
  return Object.freeze({ kind: "kzSheaf.oneCell" as const, label, source, target, predicateLeg });
};

export const oneCellKey = (cell: OneCell): string =>
  `${cell.source}\u0000${cell.target}\u0000${cell.predicateLeg}`;

export const parallel = (left: OneCell, right: OneCell): boolean =>
  left.source === right.source && left.target === right.target;

export const kzConnected = (left: OneCell, right: OneCell): boolean =>
  parallel(left, right) && oneCellKey(left) === oneCellKey(right);

export function kz2Cell(left: OneCell, right: OneCell): KZ2CellReceipt {
  if (!kzConnected(left, right)) throw new TypeError("kz2Cell: cells are not KZ-connected in the strict runtime slice");
  return Object.freeze({
    kind: "kzSheaf.2cell:witness" as const,
    left,
    right,
    parallel: true as const,
    extensionalEquality: true as const,
    invertible: true as const,
  });
}

export function sheaf(
  zeroNames: readonly string[],
  oneCells: readonly OneCell[],
  sections: Readonly<Record<string, string>>,
  restId: Readonly<Record<string, string>>,
): Sheaf {
  const zeroCells = uniqueSorted(zeroNames).map(zeroCell);
  for (const cell of oneCells) {
    if (!zeroNames.includes(cell.source) || !zeroNames.includes(cell.target)) {
      throw new TypeError(`sheaf: one-cell ${cell.label} mentions an unknown zero-cell`);
    }
  }
  const sectionRecord: Record<string, string> = {};
  for (const cell of oneCells) {
    const key = oneCellKey(cell);
    const section = sections[key];
    if (section === undefined) throw new TypeError(`sheaf: missing section for ${cell.label}`);
    sectionRecord[key] = section;
  }
  const idRecord: Record<string, string> = {};
  for (const cell of zeroCells) idRecord[cell.name] = restId[cell.name] ?? `id:${cell.name}`;
  return Object.freeze({
    kind: "kzSheaf.sheaf" as const,
    zeroCells: Object.freeze(zeroCells),
    oneCells: Object.freeze([...oneCells]),
    sections: Object.freeze(sectionRecord),
    restId: Object.freeze(idRecord),
  });
}

const sectionOf = (sheafValue: Sheaf, cell: OneCell): string =>
  sheafValue.sections[oneCellKey(cell)] ?? "";

const allKzCells = (sheafValue: Sheaf): readonly KZ2CellReceipt[] =>
  Object.freeze(sheafValue.oneCells.flatMap((left) =>
    sheafValue.oneCells.filter((right) => kzConnected(left, right)).map((right) => kz2Cell(left, right))));

export function kzCoherenceReceipt(sheafValue: Sheaf): KZCoherenceReceipt {
  const kzCells = allKzCells(sheafValue);
  const identifiesParallel = kzCells.every((cell) => sectionOf(sheafValue, cell.left) === sectionOf(sheafValue, cell.right));
  if (!identifiesParallel) throw new TypeError("kzCoherenceReceipt: KZ-connected routes had different section maps");
  return Object.freeze({
    kind: "kzSheaf.coherence:witness" as const,
    sheaf: sheafValue,
    kzCells,
    identifiesParallel: true as const,
    everySheafCoherentStrict: true as const,
  });
}

export function postcompose(
  sheafValue: Sheaf,
  transform: Readonly<Record<string, string>>,
): Sheaf {
  const sections = Object.fromEntries(Object.entries(sheafValue.sections).map(([key, value]) => [key, transform[value] ?? value]));
  const restId = Object.fromEntries(Object.entries(sheafValue.restId).map(([key, value]) => [key, transform[value] ?? value]));
  return sheaf(sheafValue.zeroCells.map((cell) => cell.name), sheafValue.oneCells, sections, restId);
}

export function descentReceipt(sheafValue: Sheaf = defaultSheaf): KZDescentReceipt {
  const restricted = postcompose(sheafValue, {
    "section:advance": "restricted:advance",
    "id:start": "restricted:id:start",
    "id:done": "restricted:id:done",
  });
  return Object.freeze({
    kind: "kzSheaf.descent:witness" as const,
    source: sheafValue,
    restricted,
    sourceCoherent: kzCoherenceReceipt(sheafValue),
    restrictedCoherent: kzCoherenceReceipt(restricted),
    closedUnderRestriction: true as const,
    strictRegimeUniversality: true as const,
  });
}

const routeA = oneCell("route-a", "start", "done", "advance");
const routeB = oneCell("route-b", "start", "done", "advance");

export const defaultSheaf: Sheaf = sheaf(
  ["start", "done"],
  [routeA, routeB],
  { [oneCellKey(routeA)]: "section:advance" },
  { start: "id:start", done: "id:done" },
);

export function kzCoherentSheafReceipt(): KZCoherentSheafReceipt {
  return Object.freeze({
    kind: "kzSheaf.receipt:witness" as const,
    coherence: kzCoherenceReceipt(defaultSheaf),
    descent: descentReceipt(defaultSheaf),
    aperiodicFrontier: "non-trivial aperiodic 2-cells remain outside this runtime" as const,
    openFrontier: Object.freeze([
      "The runtime KZ 2-cell is the strict/Scott extensional equality of parallel 1-cells.",
      "Aperiodic non-identity 2-cells, where coherence is a genuine restriction, remain outside this runtime.",
      "The site-layer sheaf gluing is inherited from existing finite sheaf/cohomology surfaces, not rebuilt as a 2-site.",
    ]),
  });
}

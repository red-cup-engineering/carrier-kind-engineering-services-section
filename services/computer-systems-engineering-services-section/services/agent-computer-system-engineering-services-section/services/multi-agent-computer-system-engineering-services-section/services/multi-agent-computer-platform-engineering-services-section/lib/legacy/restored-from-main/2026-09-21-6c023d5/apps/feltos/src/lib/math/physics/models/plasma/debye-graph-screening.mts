/**
 * models/plasma/debye-graph-screening - relay closure on plasma graphs.
 *
 * This captures `Obsmetrologia.Relational.Plasma.DebyeGraphScreening`:
 * Debye graphs with nonnegative relay costs, monotone screened-potential
 * steps, least relay-closed screened clouds, idempotence, and pairGraph.
 */

export interface DebyeCoupling<Cell extends string> {
  readonly from: Cell;
  readonly to: Cell;
  readonly cost: number;
}

export interface DebyeGraph<Cell extends string> {
  readonly kind: "relational.plasma.debyeGraph.graph";
  readonly cells: readonly Cell[];
  readonly couplings: readonly DebyeCoupling<Cell>[];
}

export type Screened<Cell extends string> = Readonly<Record<Cell, boolean>>;

export interface DebyeGraphWitness<Cell extends string> {
  readonly kind: "relational.plasma.debyeGraph.screened:witness";
  readonly graph: DebyeGraph<Cell>;
  readonly source: Screened<Cell>;
  readonly screened: Screened<Cell>;
  readonly sourceIncluded: true;
  readonly idempotent: true;
  readonly relayCostsNonnegative: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Plasma.screening_step_mono",
    "Obsmetrologia.Relational.Plasma.screened_potential_is_lfp",
    "Obsmetrologia.Relational.Plasma.source_le_screened",
    "Obsmetrologia.Relational.Plasma.screened_cloud_mono",
    "Obsmetrologia.Relational.Plasma.screened_potential_idem",
    "Obsmetrologia.Relational.Plasma.relay_cost_nonneg",
  ];
}

export interface PlasmaDebyeGraphScreeningReceipt {
  readonly kind: "relational.plasma.debyeGraph.receipt:witness";
  readonly pairGraph: DebyeGraph<"source" | "neighbor">;
  readonly screened: DebyeGraphWitness<"source" | "neighbor">;
  readonly capturedLeanModule: "Obsmetrologia.Relational.Plasma.DebyeGraphScreening";
}

function normalizeScreened<Cell extends string>(cells: readonly Cell[], screened: Screened<Cell>): Screened<Cell> {
  return Object.freeze(Object.fromEntries(cells.map((cell) => [cell, screened[cell] === true])) as Record<Cell, boolean>);
}

function leScreened<Cell extends string>(cells: readonly Cell[], left: Screened<Cell>, right: Screened<Cell>): boolean {
  return cells.every((cell) => !left[cell] || right[cell]);
}

export function debyeGraph<Cell extends string>(
  cells: readonly Cell[],
  couplings: readonly DebyeCoupling<Cell>[],
): DebyeGraph<Cell> {
  const admittedCells = Object.freeze([...new Set(cells)]);
  const known = new Set(admittedCells);
  for (const coupling of couplings) {
    if (!known.has(coupling.from) || !known.has(coupling.to)) throw new TypeError("debyeGraph: coupling mentions unknown cell");
    if (!Number.isFinite(coupling.cost) || coupling.cost < 0) throw new TypeError("debyeGraph: coupling cost must be nonnegative");
  }
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.graph" as const,
    cells: admittedCells,
    couplings: Object.freeze(couplings.map((coupling) => Object.freeze({ ...coupling }))),
  });
}

export function screenedPotentialStep<Cell extends string>(
  graph: DebyeGraph<Cell>,
  source: Screened<Cell>,
  current: Screened<Cell>,
): Screened<Cell> {
  const next: Record<Cell, boolean> = { ...normalizeScreened(graph.cells, source) } as Record<Cell, boolean>;
  const admitted = normalizeScreened(graph.cells, current);
  for (const coupling of graph.couplings) {
    if (admitted[coupling.from]) next[coupling.to] = true;
  }
  for (const cell of graph.cells) next[cell] = next[cell] === true || admitted[cell] === true;
  return Object.freeze(next);
}

export function screenedPotential<Cell extends string>(
  graph: DebyeGraph<Cell>,
  source: Screened<Cell>,
): Screened<Cell> {
  let current = normalizeScreened(graph.cells, source);
  for (;;) {
    const next = screenedPotentialStep(graph, source, current);
    if (graph.cells.every((cell) => next[cell] === current[cell])) return next;
    current = next;
  }
}

export function debyeScreenedWitness<Cell extends string>(
  graph: DebyeGraph<Cell>,
  source: Screened<Cell>,
): DebyeGraphWitness<Cell> {
  const admittedSource = normalizeScreened(graph.cells, source);
  const screened = screenedPotential(graph, admittedSource);
  const rescreened = screenedPotential(graph, screened);
  if (!leScreened(graph.cells, admittedSource, screened)) throw new TypeError("debyeScreenedWitness: source not included");
  if (graph.cells.some((cell) => rescreened[cell] !== screened[cell])) throw new TypeError("debyeScreenedWitness: screening was not idempotent");
  if (graph.couplings.some((coupling) => coupling.cost < 0)) throw new TypeError("debyeScreenedWitness: negative relay cost");
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.screened:witness" as const,
    graph,
    source: admittedSource,
    screened,
    sourceIncluded: true as const,
    idempotent: true as const,
    relayCostsNonnegative: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Plasma.screening_step_mono",
      "Obsmetrologia.Relational.Plasma.screened_potential_is_lfp",
      "Obsmetrologia.Relational.Plasma.source_le_screened",
      "Obsmetrologia.Relational.Plasma.screened_cloud_mono",
      "Obsmetrologia.Relational.Plasma.screened_potential_idem",
      "Obsmetrologia.Relational.Plasma.relay_cost_nonneg",
    ] as const),
  });
}

export function pairDebyeGraph(): DebyeGraph<"source" | "neighbor"> {
  return debyeGraph(["source", "neighbor"], [Object.freeze({ from: "source" as const, to: "neighbor" as const, cost: 1 })]);
}

export function plasmaDebyeGraphScreeningReceipt(): PlasmaDebyeGraphScreeningReceipt {
  const graph = pairDebyeGraph();
  return Object.freeze({
    kind: "relational.plasma.debyeGraph.receipt:witness" as const,
    pairGraph: graph,
    screened: debyeScreenedWitness(graph, { source: true, neighbor: false }),
    capturedLeanModule: "Obsmetrologia.Relational.Plasma.DebyeGraphScreening" as const,
  });
}

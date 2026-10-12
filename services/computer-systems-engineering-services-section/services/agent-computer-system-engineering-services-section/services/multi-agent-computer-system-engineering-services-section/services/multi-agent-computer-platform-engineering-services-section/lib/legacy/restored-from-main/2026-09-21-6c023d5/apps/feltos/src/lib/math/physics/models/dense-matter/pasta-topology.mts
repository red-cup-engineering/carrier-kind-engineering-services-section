/**
 * models/dense-matter/pasta-topology - excursion-set topology.
 *
 * This captures `Obsmetrologia.Relational.DenseMatter.PastaTopology`:
 * finite cell complexes, density-threshold excursion subcomplexes, Euler
 * characteristic, anti-monotone filtrations, and triangle morphology witnesses.
 */

export interface CellComplex<Vertex extends string | number> {
  readonly kind: "relational.denseMatter.pasta.cellComplex";
  readonly verts: readonly Vertex[];
  readonly edges: readonly (readonly [Vertex, Vertex])[];
  readonly faces: readonly (readonly [Vertex, Vertex, Vertex])[];
}

export interface ExcursionFiltrationWitness<Vertex extends string | number> {
  readonly kind: "relational.denseMatter.pasta.excursion_filtration:witness";
  readonly complex: CellComplex<Vertex>;
  readonly lowThreshold: number;
  readonly highThreshold: number;
  readonly verticesNested: true;
  readonly edgesNested: true;
  readonly facesNested: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.DenseMatter.excVerts_anti",
    "Obsmetrologia.Relational.DenseMatter.excEdges_anti",
    "Obsmetrologia.Relational.DenseMatter.excFaces_anti",
  ];
}

export interface DenseMatterPastaTopologyReceipt {
  readonly kind: "relational.denseMatter.pasta.receipt:witness";
  readonly filtration: ExcursionFiltrationWitness<0 | 1 | 2>;
  readonly filledEuler: 1;
  readonly hollowEuler: 0;
  readonly capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.PastaTopology";
}

export function cellComplex<Vertex extends string | number>(
  verts: readonly Vertex[],
  edges: readonly (readonly [Vertex, Vertex])[],
  faces: readonly (readonly [Vertex, Vertex, Vertex])[],
): CellComplex<Vertex> {
  return Object.freeze({
    kind: "relational.denseMatter.pasta.cellComplex" as const,
    verts: Object.freeze([...verts]),
    edges: Object.freeze(edges.map((edge) => Object.freeze([...edge] as [Vertex, Vertex]))),
    faces: Object.freeze(faces.map((face) => Object.freeze([...face] as [Vertex, Vertex, Vertex]))),
  });
}

export function eulerChar<Vertex extends string | number>(complex: CellComplex<Vertex>): number {
  return complex.verts.length - complex.edges.length + complex.faces.length;
}

export function excVerts<Vertex extends string | number>(complex: CellComplex<Vertex>, density: (v: Vertex) => number, threshold: number): readonly Vertex[] {
  return Object.freeze(complex.verts.filter((v) => threshold <= density(v)));
}

export function excEdges<Vertex extends string | number>(complex: CellComplex<Vertex>, density: (v: Vertex) => number, threshold: number): readonly (readonly [Vertex, Vertex])[] {
  return Object.freeze(complex.edges.filter(([a, b]) => threshold <= density(a) && threshold <= density(b)));
}

export function excFaces<Vertex extends string | number>(complex: CellComplex<Vertex>, density: (v: Vertex) => number, threshold: number): readonly (readonly [Vertex, Vertex, Vertex])[] {
  return Object.freeze(complex.faces.filter(([a, b, c]) => threshold <= density(a) && threshold <= density(b) && threshold <= density(c)));
}

export function excEuler<Vertex extends string | number>(complex: CellComplex<Vertex>, density: (v: Vertex) => number, threshold: number): number {
  return excVerts(complex, density, threshold).length - excEdges(complex, density, threshold).length + excFaces(complex, density, threshold).length;
}

function includesEvery<T>(larger: readonly T[], smaller: readonly T[], same: (a: T, b: T) => boolean): boolean {
  return smaller.every((item) => larger.some((candidate) => same(candidate, item)));
}

export function excursionFiltration<Vertex extends string | number>(
  complex: CellComplex<Vertex>,
  density: (v: Vertex) => number,
  lowThreshold: number,
  highThreshold: number,
): ExcursionFiltrationWitness<Vertex> {
  if (lowThreshold > highThreshold) throw new TypeError("excursionFiltration: expected low threshold <= high threshold");
  const lowVerts = excVerts(complex, density, lowThreshold);
  const highVerts = excVerts(complex, density, highThreshold);
  const lowEdges = excEdges(complex, density, lowThreshold);
  const highEdges = excEdges(complex, density, highThreshold);
  const lowFaces = excFaces(complex, density, lowThreshold);
  const highFaces = excFaces(complex, density, highThreshold);
  const sameTuple = <T,>(left: readonly T[], right: readonly T[]) => left.length === right.length && left.every((value, index) => value === right[index]);
  if (!includesEvery(lowVerts, highVerts, (a, b) => a === b)
    || !includesEvery(lowEdges, highEdges, sameTuple)
    || !includesEvery(lowFaces, highFaces, sameTuple)) {
    throw new TypeError("excursionFiltration: high excursion is not nested in low excursion");
  }
  return Object.freeze({
    kind: "relational.denseMatter.pasta.excursion_filtration:witness" as const,
    complex,
    lowThreshold,
    highThreshold,
    verticesNested: true as const,
    edgesNested: true as const,
    facesNested: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.DenseMatter.excVerts_anti",
      "Obsmetrologia.Relational.DenseMatter.excEdges_anti",
      "Obsmetrologia.Relational.DenseMatter.excFaces_anti",
    ] as const),
  });
}

export function filledTriangle(): CellComplex<0 | 1 | 2> {
  return cellComplex([0, 1, 2], [[0, 1], [1, 2], [0, 2]], [[0, 1, 2]]);
}

export function hollowTriangle(): CellComplex<0 | 1 | 2> {
  return cellComplex([0, 1, 2], [[0, 1], [1, 2], [0, 2]], []);
}

export function denseMatterPastaTopologyReceipt(): DenseMatterPastaTopologyReceipt {
  const density = () => 2;
  return Object.freeze({
    kind: "relational.denseMatter.pasta.receipt:witness" as const,
    filtration: excursionFiltration(filledTriangle(), density, 1, 2),
    filledEuler: eulerChar(filledTriangle()) as 1,
    hollowEuler: eulerChar(hollowTriangle()) as 0,
    capturedLeanModule: "Obsmetrologia.Relational.DenseMatter.PastaTopology" as const,
  });
}

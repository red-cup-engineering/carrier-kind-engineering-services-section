/**
 * settling/analysis/sofic — finite symbolic-dynamics witnesses.
 *
 * This is the executable shadow of `RelMath.Aperiodic.SoficShift`: an SFT is a
 * finite directed transition graph, an admissible word is a directed walk, and a
 * sofic word is the 1-block factor image of such a walk. The surface stays finite
 * and exact: it checks words, computes factor images, and carries the golden-mean
 * and Fibonacci/decorated sofic witnesses as serializable receipts.
 */
export type DirectedGraph = readonly (readonly boolean[])[];
export type Word = readonly number[];
export type FactorMap = readonly number[];
/** The complete finite directed graph without loops, read as a palette shift. */
export declare function completePaletteGraph(vertexCount: number): DirectedGraph;
export interface GraphHomWitness {
    readonly kind: "sofic.graphHom:witness";
    readonly sourceSize: number;
    readonly targetSize: number;
    readonly factor: readonly number[];
    readonly preservesEdges: true;
}
export interface GraphHomObstruction {
    readonly kind: "sofic.graphHom-obstruction";
    readonly reason: "factor-domain" | "factor-codomain" | "edge";
    readonly sourceSize: number;
    readonly targetSize: number;
    readonly factor: readonly number[];
    readonly edge?: readonly [number, number];
    readonly imageEdge?: readonly [number, number];
}
export type GraphHomJudgment = GraphHomWitness | GraphHomObstruction;
/** Check a one-block map as a finite graph hom/factor between transition graphs. */
export declare function graphHom(source: DirectedGraph, target: DirectedGraph, factor: FactorMap): GraphHomJudgment;
export declare function identityGraphHom(graph: DirectedGraph): GraphHomWitness;
export declare function composeFactorMaps(first: FactorMap, second: FactorMap): readonly number[];
export interface MapPathWitness {
    readonly kind: "sofic.graphHom.mapPath:witness";
    readonly sourceWord: readonly number[];
    readonly targetWord: readonly number[];
    readonly hom: GraphHomWitness;
    readonly sourcePath: PathWitness;
    readonly targetPath: PathWitness;
}
export interface MapPathObstruction {
    readonly kind: "sofic.graphHom.mapPath-obstruction";
    readonly reason: "hom" | "source-path" | "target-path";
    readonly sourceWord: readonly number[];
    readonly targetWord: readonly number[];
    readonly hom: GraphHomJudgment;
    readonly sourcePath: PathJudgment;
    readonly targetPath?: PathJudgment;
}
export type MapPathJudgment = MapPathWitness | MapPathObstruction;
/** Lean `GraphHom.map_path`: a graph hom carries SFT-admissible words to admissible words. */
export declare function mapPathByGraphHom(source: DirectedGraph, target: DirectedGraph, factor: FactorMap, word: Word): MapPathJudgment;
export interface PathWitness {
    readonly kind: "sofic.path:witness";
    readonly word: readonly number[];
    readonly length: number;
    readonly transitions: number;
    readonly admissible: true;
}
export interface PathObstruction {
    readonly kind: "sofic.path-obstruction";
    readonly word: readonly number[];
    readonly length: number;
    readonly transitions: number;
    readonly admissible: false;
    readonly failedAt: number;
    readonly edge: readonly [number, number];
}
export type PathJudgment = PathWitness | PathObstruction;
/** Check whether a finite word is a directed walk in the transition graph. */
export declare function path(graph: DirectedGraph, word: Word): PathJudgment;
export interface SoficImageWitness {
    readonly kind: "sofic.image:witness";
    readonly preimage: readonly number[];
    readonly image: readonly number[];
    readonly factor: readonly number[];
    readonly path: PathWitness;
}
export interface SoficImageObstruction {
    readonly kind: "sofic.image-obstruction";
    readonly reason: "path" | "factor-domain";
    readonly preimage: readonly number[];
    readonly image: readonly number[];
    readonly factor: readonly number[];
    readonly path: PathJudgment;
}
export type SoficImageJudgment = SoficImageWitness | SoficImageObstruction;
/** Compute the 1-block factor image of an admissible SFT word. */
export declare function soficImage(graph: DirectedGraph, factor: FactorMap, preimage: Word): SoficImageJudgment;
/** Golden-mean alphabet: `0 = a`, `1 = b`; the only forbidden adjacent pair is `bb`. */
export declare const goldenMeanGraph: DirectedGraph;
/** The Fibonacci substitution `a -> ab`, `b -> a`, encoded over `0=a`, `1=b`. */
export declare function fibSubstitute(word: Word): readonly number[];
export interface GoldenForbidsBBWitness {
    readonly kind: "sofic.goldenMean.forbidsBB:witness";
    readonly word: readonly number[];
    readonly path: PathObstruction;
    readonly forbiddenPair: readonly [1, 1];
}
/** The golden-mean SFT rejects every word beginning with `bb`. */
export declare function goldenForbidsBB(suffix?: Word): GoldenForbidsBBWitness;
export interface FibSubstituteGoldenWitness {
    readonly kind: "sofic.fibonacciSubstitution.golden:witness";
    readonly source: readonly number[];
    readonly substituted: readonly number[];
    readonly path: PathWitness;
}
export interface FibSubstituteGoldenObstruction {
    readonly kind: "sofic.fibonacciSubstitution.golden-obstruction";
    readonly source: readonly number[];
    readonly substituted: readonly number[];
    readonly path: PathJudgment;
}
export type FibSubstituteGoldenJudgment = FibSubstituteGoldenWitness | FibSubstituteGoldenObstruction;
/** Finite carrier for Lean `fib_substitute_golden`. */
export declare function fibSubstituteGolden(word: Word): FibSubstituteGoldenJudgment;
/** Decorated alphabet: `0=(a,0)`, `1=(b,0)`, `2=(a,1)`. */
export declare const decoratedGoldenGraph: DirectedGraph;
/** The decorated Fibonacci substitution: `a -> (a,0)(b,0)`, `b -> (a,1)`. */
export declare function decoratedFibSubstitute(word: Word): readonly number[];
/** The forgetful decoration factor `(a,0)->a`, `(b,0)->b`, `(a,1)->a`. */
export declare const forgetDecoration: FactorMap;
export interface FibDeepSoficWitness {
    readonly kind: "sofic.fibonacciSubstitution.deep:witness";
    readonly source: readonly number[];
    readonly substituted: readonly number[];
    readonly decorated: readonly number[];
    readonly sourcePath: PathWitness;
    readonly decoratedPath: PathWitness;
    readonly sofic: SoficImageWitness;
    readonly forgetsToSubstitution: true;
}
export interface FibDeepSoficObstruction {
    readonly kind: "sofic.fibonacciSubstitution.deep-obstruction";
    readonly reason: "source" | "decorated" | "factor";
    readonly source: readonly number[];
    readonly substituted: readonly number[];
    readonly decorated: readonly number[];
    readonly sourcePath: PathJudgment;
    readonly decoratedPath: PathJudgment;
    readonly sofic: SoficImageJudgment;
    readonly forgetsToSubstitution: boolean;
}
export type FibDeepSoficJudgment = FibDeepSoficWitness | FibDeepSoficObstruction;
/** Finite carrier for the decorated golden-case deep sofic cover. */
export declare function fibDeepSofic(word: Word): FibDeepSoficJudgment;
export interface ColorPullbackWitness {
    readonly kind: "sofic.localRule.colorPullback:witness";
    readonly targetColoring: GraphHomWitness;
    readonly pulledBackColoring: GraphHomWitness;
    readonly pulledBackColors: readonly number[];
    readonly fourColouringPullback: true;
}
export interface FiniteLocalRuleReceipt {
    readonly kind: "sofic.finiteLocalRule:witness";
    readonly sourceModule: "RelMath.Aperiodic.FiniteLocalRule";
    readonly theorems: readonly [
        "RelMath.Combinatorics.GraphHom.id",
        "RelMath.Combinatorics.GraphHom.comp",
        "RelMath.Combinatorics.GraphHom.map_path",
        "RelMath.Combinatorics.Colorable.pullback",
        "RelMath.Combinatorics.fourColouring_pullback",
        "RelMath.Combinatorics.ProperColoring.map_path",
        "RelMath.Aperiodic.factor_of_sft_is_sofic"
    ];
    readonly source: DirectedGraph;
    readonly target: DirectedGraph;
    readonly palette: DirectedGraph;
    readonly factor: readonly number[];
    readonly postFactor: readonly number[];
    readonly identity: GraphHomWitness;
    readonly factorHom: GraphHomWitness;
    readonly postHom: GraphHomWitness;
    readonly composedHom: GraphHomWitness;
    readonly sourceWord: readonly number[];
    readonly mappedPath: MapPathWitness;
    readonly colorPullback: ColorPullbackWitness;
    readonly properColoringPath: MapPathWitness;
    readonly factorOfSftIsSofic: SoficImageWitness;
}
/**
 * Finite carrier for `RelMath.Aperiodic.FiniteLocalRule`: graph factors compose, preserve
 * admissible words, pull colourings back, and expose every one-block SFT factor as sofic.
 */
export declare function finiteLocalRuleReceipt(): FiniteLocalRuleReceipt;

/**
 * settling/analysis/collatz — finite Collatz arithmetic shadows.
 *
 * This module mirrors the computable parts of the green Collatz-side Lean
 * files: accelerated step/orbit/parity words, affine traces, first-passage
 * coefficient crossings, 2-adic shortcut factoring, reached-set quiescence,
 * residue arithmetic, and the Padovan/Fibonacci slow-growth comparison. It
 * deliberately does not claim the two red frontier holes
 * `parentBarrierGap_holds` or `everyNonterminalHasCrossing_holds`.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
export type CollatzBranch = "E" | "O";
export declare const collatzAffineTraceSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/affine-trace";
    readonly type: "object";
    readonly required: readonly ["kind", "A", "B", "C"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.affineTrace";
        };
        readonly A: {
            readonly type: "number";
        };
        readonly B: {
            readonly type: "number";
        };
        readonly C: {
            readonly type: "number";
        };
    };
    readonly additionalProperties: false;
    readonly title: "CollatzAffineTrace";
    readonly description: "The affine trace (A, B, C) of an accelerated Collatz step word.";
};
export type CollatzAffineTrace = FromJsonSchema<typeof collatzAffineTraceSchema>;
/** The accelerated Collatz map: even `n/2`, odd `(3n+1)/2`. */
export declare function step(n: number): number;
/** The branch selected by the accelerated map. */
export declare function branch(n: number): CollatzBranch;
/** The iterate `T^k(n)`. */
export declare function orbit(seed: number, length: number): number;
/** The parity word of the first `length` accelerated steps. */
export declare function parityWord(seed: number, length: number): readonly CollatzBranch[];
/** Count the odd branches in a parity word. */
export declare function oddCount(word: readonly CollatzBranch[]): number;
export declare const identityTrace: CollatzAffineTrace;
export declare const evenTrace: CollatzAffineTrace;
export declare const oddTrace: CollatzAffineTrace;
/** Compose affine traces: `g.comp f` realizes "`f` then `g`". */
export declare function composeTrace(g: CollatzAffineTrace, f: CollatzAffineTrace): CollatzAffineTrace;
/** Advance an affine trace by one parity letter. */
export declare function traceStep(trace: CollatzAffineTrace, letter: CollatzBranch): CollatzAffineTrace;
/** Accumulate the affine trace of a finite parity word. */
export declare function traceOfWord(word: readonly CollatzBranch[]): CollatzAffineTrace;
export interface AffineTraceOrbitWitness {
    readonly kind: "collatz.affineTraceParityWord:witness";
    readonly seed: number;
    readonly length: number;
    readonly word: readonly CollatzBranch[];
    readonly trace: CollatzAffineTrace;
    readonly iterate: number;
    readonly lhs: number;
    readonly rhs: number;
    readonly holds: boolean;
    readonly coefficientContracting: boolean;
    readonly descends: boolean;
}
/** Lean `affine_trace_parityWord`: `B_w*T^k(n)=A_w*n+C_w`, as a finite witness. */
export declare function affineTraceParityWord(seed: number, length: number): AffineTraceOrbitWitness;
export interface FirstPassageWitness {
    readonly kind: "collatz.firstPassage:witness";
    readonly word: readonly CollatzBranch[];
    readonly trace: CollatzAffineTrace;
    readonly contracting: boolean;
    readonly properPrefixesNoncontracting: boolean;
    readonly last: CollatzBranch;
    readonly endsInE: boolean;
    readonly lowerPower: number;
    readonly middlePower: number;
    readonly upperPower: number;
}
export interface FirstPassageObstruction {
    readonly kind: "collatz.firstPassage-obstruction";
    readonly word: readonly CollatzBranch[];
    readonly trace: CollatzAffineTrace;
    readonly contracting: boolean;
    readonly properPrefixesNoncontracting: boolean;
    readonly reason: "empty" | "not-contracting" | "prefix-contracts";
}
export type FirstPassageJudgment = FirstPassageWitness | FirstPassageObstruction;
export declare function coefficientContracting(word: readonly CollatzBranch[]): boolean;
export declare function coefficientNoncontracting(word: readonly CollatzBranch[]): boolean;
/** Lean `FirstPassageWord`: the first prefix where `A < B`. */
export declare function firstPassageWord(word: readonly CollatzBranch[]): FirstPassageJudgment;
export interface ParentBarrierWitness {
    readonly kind: "collatz.parentBarrier:witness";
    readonly word: readonly CollatzBranch[];
    readonly trace: CollatzAffineTrace;
    readonly noncontracting: boolean;
    readonly belowNextEvenCrossing: boolean;
    readonly properPrefixesNoncontracting: boolean;
    readonly appendEFirstPassage: boolean;
    readonly D: number;
    readonly M: number;
}
export interface ParentBarrierObstruction {
    readonly kind: "collatz.parentBarrier-obstruction";
    readonly word: readonly CollatzBranch[];
    readonly trace: CollatzAffineTrace;
    readonly noncontracting: boolean;
    readonly belowNextEvenCrossing: boolean;
    readonly properPrefixesNoncontracting: boolean;
    readonly reason: "contracting" | "beyond-next-even-crossing" | "prefix-contracts";
}
export type ParentBarrierJudgment = ParentBarrierWitness | ParentBarrierObstruction;
/** Lean `ParentBarrier`: `B ≤ A < 2B`, with every proper prefix noncontracting. */
export declare function parentBarrier(word: readonly CollatzBranch[]): ParentBarrierJudgment;
export declare const twoAdicFactorWitnessSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/two-adic-factor-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "value", "exponent", "oddPart", "holds"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.twoAdicFactor:witness";
        };
        readonly value: {
            readonly type: "number";
        };
        readonly exponent: {
            readonly type: "number";
        };
        readonly oddPart: {
            readonly type: "number";
        };
        readonly holds: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "TwoAdicFactorWitness";
    readonly description: "A positive integer factored as 2^exponent * oddPart.";
};
export type TwoAdicFactorWitness = FromJsonSchema<typeof twoAdicFactorWitnessSchema>;
/** Factor a positive integer as `2^k * odd`. */
export declare function twoAdicFactor(value: number): TwoAdicFactorWitness;
export declare const shortcutOddPartWitnessSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/shortcut-odd-part-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "seed", "expanded", "value", "exponent", "oddPart", "holds", "nonemptyHalvingRun"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.shortcutOddPart:witness";
        };
        readonly seed: {
            readonly type: "number";
        };
        readonly expanded: {
            readonly type: "number";
        };
        readonly value: {
            readonly type: "number";
        };
        readonly exponent: {
            readonly type: "number";
        };
        readonly oddPart: {
            readonly type: "number";
        };
        readonly holds: {
            readonly type: "boolean";
        };
        readonly nonemptyHalvingRun: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "ShortcutOddPartWitness";
    readonly description: "For odd seed n, the factoring of 3n+1 = 2^exponent * oddPart.";
};
export type ShortcutOddPartWitness = FromJsonSchema<typeof shortcutOddPartWitnessSchema>;
/** For odd `n`, factor `3n+1 = 2^k*m` with `k ≥ 1` and odd `m`. */
export declare function shortcutOddPart(seed: number): ShortcutOddPartWitness;
/** Distinct values reached before stage `length`. */
export declare function reachedSet(seed: number, length: number): readonly number[];
export declare const reachedQuiescenceWitnessSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/reached-quiescence-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "seed", "stage", "reached", "nextReached", "quiesces", "revisitAt", "terminal"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.reachedQuiescence:witness";
        };
        readonly seed: {
            readonly type: "number";
        };
        readonly stage: {
            readonly type: "number";
        };
        readonly reached: {
            readonly type: "array";
            readonly items: {
                readonly type: "number";
            };
        };
        readonly nextReached: {
            readonly type: "array";
            readonly items: {
                readonly type: "number";
            };
        };
        readonly quiesces: {
            readonly type: "boolean";
        };
        readonly revisitAt: {
            readonly type: "number";
        };
        readonly terminal: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "ReachedQuiescenceWitness";
    readonly description: "Stage k+1 of the reached-set reaches nothing new.";
};
export type ReachedQuiescenceWitness = FromJsonSchema<typeof reachedQuiescenceWitnessSchema>;
export declare const reachedQuiescenceObstructionSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/reached-quiescence-obstruction";
    readonly type: "object";
    readonly required: readonly ["kind", "seed", "stage", "reached", "nextReached", "quiesces"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.reachedQuiescence-obstruction";
        };
        readonly seed: {
            readonly type: "number";
        };
        readonly stage: {
            readonly type: "number";
        };
        readonly reached: {
            readonly type: "array";
            readonly items: {
                readonly type: "number";
            };
        };
        readonly nextReached: {
            readonly type: "array";
            readonly items: {
                readonly type: "number";
            };
        };
        readonly quiesces: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "ReachedQuiescenceObstruction";
    readonly description: "Stage k+1 of the reached-set has not yet quiesced.";
};
export type ReachedQuiescenceObstruction = FromJsonSchema<typeof reachedQuiescenceObstructionSchema>;
export type ReachedQuiescenceJudgment = ReachedQuiescenceWitness | ReachedQuiescenceObstruction;
/** Finite reached-set quiescence: stage `k+1` reaches nothing new. */
export declare function reachedQuiescence(seed: number, stage: number): ReachedQuiescenceJudgment;
/** Membership in the two-generator semigroup `<a,b>`, searched finitely up to `x`. */
export declare function inTwoGenSemigroup(x: number, a: number, b: number): boolean;
export declare const residueCharacterizationWitnessSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/residue-characterization-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "C", "D", "M", "residue", "semigroupMember", "residueInequality", "equivalent", "gap"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.residueCharacterization:witness";
        };
        readonly C: {
            readonly type: "number";
        };
        readonly D: {
            readonly type: "number";
        };
        readonly M: {
            readonly type: "number";
        };
        readonly residue: {
            readonly type: "number";
        };
        readonly semigroupMember: {
            readonly type: "boolean";
        };
        readonly residueInequality: {
            readonly type: "boolean";
        };
        readonly equivalent: {
            readonly type: "boolean";
        };
        readonly gap: {
            readonly type: "number";
        };
    };
    readonly additionalProperties: false;
    readonly title: "ResidueCharacterizationWitness";
    readonly description: "Finite residue characterization: C is in <D,M> iff D*r <= C for coprime D,M.";
};
export type ResidueCharacterizationWitness = FromJsonSchema<typeof residueCharacterizationWitnessSchema>;
/** Finite residue characterization: `C ∈ <D,M>` iff `D*r ≤ C` for coprime `D,M`. */
export declare function residueCharacterization(C: number, D: number, M: number): ResidueCharacterizationWitness;
/** Padovan/Perrin sequence `1,1,1,2,2,3,...`. */
export declare function padovan(index: number): number;
/** Fibonacci sequence in the Lean convention `1,1,2,3,5,...`. */
export declare function fibSeq(index: number): number;
export declare const padovanLeFibWitnessSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/padovan-le-fib-witness";
    readonly type: "object";
    readonly required: readonly ["kind", "index", "padovan", "fibSeq", "holds"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.padovanLeFibSeq:witness";
        };
        readonly index: {
            readonly type: "number";
        };
        readonly padovan: {
            readonly type: "number";
        };
        readonly fibSeq: {
            readonly type: "number";
        };
        readonly holds: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "PadovanLeFibWitness";
    readonly description: "The Padovan/Perrin value at index is at most the Fibonacci value at index.";
};
export type PadovanLeFibWitness = FromJsonSchema<typeof padovanLeFibWitnessSchema>;
export interface SemigroupGapReceipt {
    readonly kind: "collatz.semigroupGap.receipt:witness";
    readonly provenTheorems: readonly [
        "nonDescent_iff_semigroup_certificate",
        "parentBarrierGap_implies_firstPassageDescent"
    ];
    readonly frontierTheorem: "parentBarrierGap_holds";
    readonly parent: ParentBarrierWitness;
    readonly residue: ResidueCharacterizationWitness;
    readonly conditionalDescent: true;
    readonly gapStatus: "frontier-sorry-in-Lean";
}
export declare const collatzContractingPrefixQuestionSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/contracting-prefix-question";
    readonly type: "object";
    readonly required: readonly ["kind", "seed"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.contractingPrefixQuestion";
        };
        readonly seed: {
            readonly type: "number";
        };
    };
    readonly additionalProperties: false;
    readonly title: "CollatzContractingPrefixQuestion";
    readonly description: "The question: does seed have a contracting parity-word prefix.";
};
export type CollatzContractingPrefixQuestion = FromJsonSchema<typeof collatzContractingPrefixQuestionSchema>;
export declare const collatzBoundedContractingPrefixQuestionSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-question";
    readonly type: "object";
    readonly required: readonly ["kind", "seed", "bound"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.boundedContractingPrefixQuestion";
        };
        readonly seed: {
            readonly type: "number";
        };
        readonly bound: {
            readonly type: "number";
        };
    };
    readonly additionalProperties: false;
    readonly title: "CollatzBoundedContractingPrefixQuestion";
    readonly description: "The question: does seed have a contracting parity-word prefix within bound.";
};
export type CollatzBoundedContractingPrefixQuestion = FromJsonSchema<typeof collatzBoundedContractingPrefixQuestionSchema>;
export interface CollatzContractingPrefixCore {
    readonly kind: "collatz.contractingPrefixCore:witness";
    readonly seed: number;
    readonly prefixLength: number;
    readonly word: readonly CollatzBranch[];
    readonly contracting: true;
    readonly leanTheorem: "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness";
}
export interface CollatzBoundedContractingPrefixCore {
    readonly kind: "collatz.boundedContractingPrefixCore:witness";
    readonly seed: number;
    readonly bound: number;
    readonly prefixLength: number;
    readonly word: readonly CollatzBranch[];
    readonly withinBound: true;
    readonly contracting: true;
    readonly leanTheorem: "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness";
}
export declare const collatzBoundedContractingPrefixObstructionSchema: {
    readonly $id: "metroplat/closure/analysis/collatz/bounded-contracting-prefix-obstruction";
    readonly type: "object";
    readonly required: readonly ["kind", "seed", "bound", "searchedLengths", "reason"];
    readonly properties: {
        readonly kind: {
            readonly const: "collatz.boundedContractingPrefixCore-obstruction";
        };
        readonly seed: {
            readonly type: "number";
        };
        readonly bound: {
            readonly type: "number";
        };
        readonly searchedLengths: {
            readonly type: "array";
            readonly items: {
                readonly type: "number";
            };
        };
        readonly reason: {
            readonly const: "not-found-within-bound";
        };
    };
    readonly additionalProperties: false;
    readonly title: "CollatzBoundedContractingPrefixObstruction";
    readonly description: "No contracting prefix was found for seed within the searched length bound.";
};
export type CollatzBoundedContractingPrefixObstruction = FromJsonSchema<typeof collatzBoundedContractingPrefixObstructionSchema>;
export type CollatzBoundedContractingPrefixJudgment = CollatzBoundedContractingPrefixCore | CollatzBoundedContractingPrefixObstruction;
export interface CollatzBarrierDecidableCoreReceipt {
    readonly kind: "collatz.barrierDecidableCore.receipt:witness";
    readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierDecidableCore";
    readonly question: CollatzContractingPrefixQuestion;
    readonly boundedQuestion: CollatzBoundedContractingPrefixQuestion;
    readonly boundedCore: CollatzBoundedContractingPrefixCore;
    readonly core: CollatzContractingPrefixCore;
    readonly finiteSearchDecidable: true;
    readonly sampleNoPositiveInfiniteBarrierStream: true;
    readonly leanTheorems: readonly [
        "Obsmetrologia.Relational.Material.collatzContractingPrefixQuestion_assertion_iff",
        "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_witness",
        "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_everyNonterminalContracts",
        "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_decidable_assertion",
        "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_decidable_assertions",
        "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixQuestion_decidable",
        "Obsmetrologia.Relational.Material.boundedCollatzContractingPrefixCore_of_no_collatzBarrierKeratinFormation_and_bound",
        "Obsmetrologia.Relational.Material.collatzBoundedContractingPrefixCore_witness",
        "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_of_no_collatzBarrierKeratinFormation_and_contractingPrefixBound",
        "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_antimatterBarrierBoundary_and_cylinderLift",
        "Obsmetrologia.Relational.Material.collatzContractingPrefixCore_of_fullSharedKappaCarrier"
    ];
}
export interface CollatzBarrierPrefixLimitWitness {
    readonly kind: "collatz.barrierPrefixLimit:witness";
    readonly stage: number;
    readonly event: number;
    readonly presentAfterStage: true;
    readonly presentInLimit: true;
    readonly leanTheorems: readonly [
        "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
        "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit"
    ];
}
export interface CollatzBarrierKeratinFormationCandidate {
    readonly kind: "collatz.barrierKeratinFormation:bounded-candidate";
    readonly seed: number;
    readonly checkedThrough: number;
    readonly positiveSeed: boolean;
    readonly checkedPrefixes: readonly {
        readonly prefixLength: number;
        readonly word: readonly CollatzBranch[];
        readonly noncontracting: boolean;
    }[];
    readonly allCheckedPrefixesNoncontracting: boolean;
    readonly actualFormationStatus: "not-claimed";
}
export interface CollatzBarrierKeratinReceipt {
    readonly kind: "collatz.barrierKeratin.receipt:witness";
    readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.CollatzBarrierKeratin";
    readonly prefixLimit: CollatzBarrierPrefixLimitWitness;
    readonly boundedCandidate: CollatzBarrierKeratinFormationCandidate;
    readonly refutingCore: CollatzBoundedContractingPrefixCore;
    readonly formationRefutedByContractingPrefix: true;
    readonly actualFormationStatus: "not-claimed";
    readonly leanTheorems: readonly [
        "Obsmetrologia.Relational.Material.runLockPrefix_collatzBarrierPrefixSeed",
        "Obsmetrologia.Relational.Material.collatzBarrierPrefix_mem_limit",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_infiniteBarrierStream",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_cylinderAvoidingBarrierStream",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_excludes_noPositiveInfiniteBarrierStream",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_of_no_contracting_prefix",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_iff_positive_no_contracting_prefix",
        "Obsmetrologia.Relational.Material.noPositiveInfiniteBarrierStream_excludes_collatzBarrierKeratinFormation",
        "Obsmetrologia.Relational.Material.parentBarrierGap_and_oneLock_excludes_collatzBarrierKeratinFormation",
        "Obsmetrologia.Relational.Material.collatzBarrierKeratinFormation_refutes_parentBarrierOneLockCollapse",
        "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_implies_not_not_contracting_prefix",
        "Obsmetrologia.Relational.Material.no_collatzBarrierKeratinFormation_iff_pointwise_not_not_contracting_prefix"
    ];
}
/** Lean `padovan_le_fibSeq`: the plastic integer shadow is bounded by Fibonacci. */
export declare function padovanLeFibSeq(index: number): PadovanLeFibWitness;
export declare function semigroupGapReceipt(word?: readonly CollatzBranch[]): SemigroupGapReceipt;
export declare function collatzContractingPrefixQuestion(seed: number): CollatzContractingPrefixQuestion;
export declare function collatzBoundedContractingPrefixQuestion(seed: number, bound: number): CollatzBoundedContractingPrefixQuestion;
export declare function collatzBoundedContractingPrefixCore(seed: number, bound: number): CollatzBoundedContractingPrefixJudgment;
export declare function collatzContractingPrefixCoreFromBounded(boundedCore: CollatzBoundedContractingPrefixCore): CollatzContractingPrefixCore;
export declare function noPositiveInfiniteBarrierStreamForFiniteSample(seeds: readonly number[], bound: number | ((seed: number) => number)): boolean;
export declare function collatzBarrierDecidableCoreReceipt(seed?: number, bound?: number): CollatzBarrierDecidableCoreReceipt;
export declare function runLockPrefixCollatzBarrierPrefixSeed(stage: number, event: number): boolean;
export declare function collatzBarrierPrefixLimit(stage: number, event?: number): CollatzBarrierPrefixLimitWitness;
export declare function collatzBarrierKeratinFormationCandidate(seed: number, checkedThrough: number): CollatzBarrierKeratinFormationCandidate;
export declare function collatzBarrierKeratinReceipt(seed?: number): CollatzBarrierKeratinReceipt;

export interface FiniteBinaryAlgebra {
    readonly kind: "algebraHierarchy.finiteBinaryAlgebra";
    readonly labels: readonly string[];
    readonly op: readonly (readonly number[])[];
}
export declare function finiteBinaryAlgebra(labels: readonly string[], op: readonly (readonly number[])[]): FiniteBinaryAlgebra;
export interface CommutativeMonoidWitness {
    readonly kind: "algebraHierarchy.commutativeMonoid:witness";
    readonly carrier: readonly string[];
    readonly one: number;
    readonly oneLabel: string;
    readonly associative: true;
    readonly leftIdentity: true;
    readonly rightIdentity: true;
    readonly commutative: true;
    readonly identityUnique: true;
}
export interface AlgebraObstruction {
    readonly kind: "algebraHierarchy.obstruction";
    readonly law: "assoc" | "leftIdentity" | "rightIdentity" | "comm" | "identityUnique" | "leftInverse" | "rightInverse" | "leftCancel" | "addAssoc" | "addComm" | "addZero" | "zeroAdd" | "mulAssoc" | "oneMul" | "mulOne" | "leftDistrib" | "rightDistrib" | "zeroMul" | "mulZero" | "addLeftNeg" | "mulComm" | "mulInvCancel" | "invZero" | "zeroNeOne";
    readonly indices?: readonly number[];
    readonly labels?: readonly string[];
    readonly left?: number | undefined;
    readonly right?: number | undefined;
}
export type CommutativeMonoidJudgment = CommutativeMonoidWitness | AlgebraObstruction;
export declare function commutativeMonoid(algebra: FiniteBinaryAlgebra, one: number): CommutativeMonoidJudgment;
export interface AbelianGroupWitness {
    readonly kind: "algebraHierarchy.abelianGroup:witness";
    readonly carrier: readonly string[];
    readonly one: number;
    readonly oneLabel: string;
    readonly associative: true;
    readonly leftIdentity: true;
    readonly rightIdentity: true;
    readonly commutative: true;
    readonly identityUnique: true;
    readonly inverses: readonly number[];
    readonly leftInverse: true;
    readonly rightInverse: true;
    readonly leftCancel: true;
}
export type AbelianGroupJudgment = AbelianGroupWitness | AlgebraObstruction;
export declare function abelianGroup(algebra: FiniteBinaryAlgebra, one: number, inverses: readonly number[]): AbelianGroupJudgment;
export interface FiniteFieldSystem {
    readonly kind: "algebraHierarchy.finiteFieldSystem";
    readonly labels: readonly string[];
    readonly add: readonly (readonly number[])[];
    readonly mul: readonly (readonly number[])[];
    readonly zero: number;
    readonly one: number;
    readonly neg: readonly number[];
    readonly inv: readonly number[];
}
export declare function finiteFieldSystem(labels: readonly string[], add: readonly (readonly number[])[], mul: readonly (readonly number[])[], zero: number, one: number, neg: readonly number[], inv: readonly number[]): FiniteFieldSystem;
export interface FieldWitness {
    readonly kind: "algebraHierarchy.field:witness";
    readonly carrier: readonly string[];
    readonly zero: number;
    readonly zeroLabel: string;
    readonly one: number;
    readonly oneLabel: string;
    readonly additiveGroup: true;
    readonly multiplicativeMonoid: true;
    readonly distributive: true;
    readonly zeroAnnihilates: true;
    readonly additiveInverses: true;
    readonly multiplicativeCommutative: true;
    readonly multiplicativeInverses: true;
    readonly invZero: true;
    readonly zeroNeOne: true;
    readonly zeroUnique: true;
}
export type FieldJudgment = FieldWitness | AlgebraObstruction;
export declare function field(fieldSystem: FiniteFieldSystem): FieldJudgment;
export declare const boolFieldSystem: FiniteFieldSystem;
export declare const kleinFourAlgebra: FiniteBinaryAlgebra;
export declare const booleanMeetMonoidAlgebra: FiniteBinaryAlgebra;
export declare const booleanJoinMonoidAlgebra: FiniteBinaryAlgebra;
export declare const booleanFuseMonoidAlgebra: FiniteBinaryAlgebra;
export interface AlgebraHierarchyReceipt {
    readonly kind: "algebraHierarchy.receipt:witness";
    readonly boolField: FieldWitness;
    readonly kleinFourGroup: AbelianGroupWitness;
    readonly meetMonoid: CommutativeMonoidWitness;
    readonly joinMonoid: CommutativeMonoidWitness;
    readonly fuseMonoid: CommutativeMonoidWitness;
    readonly orderToAlgebraCollapse: true;
}
export type AlgebraHierarchyJudgment = AlgebraHierarchyReceipt | AlgebraObstruction;
/** Concrete finite receipt for the Lean AlgebraHierarchy worked examples. */
export declare function algebraHierarchy(): AlgebraHierarchyJudgment;

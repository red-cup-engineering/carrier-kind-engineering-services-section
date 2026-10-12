/**
 * analysis/number-theory - finite executable shadows of RelMath.Order number theory.
 *
 * Lean proves factorial/Pascal/binomial, divisibility/gcd/prime, FTA, and
 * image factorization. This module keeps the Node side finite and carrier
 * shaped: concrete Nat computations and finite function tables become
 * witness/obstruction receipts without pretending to reify arbitrary functions
 * or proof terms at runtime.
 */
/** `n!`, matching `RelMath.NumberTheory.factorial`. */
export declare function factorial(n: number): number;
/** The falling-product permutation count `P(n,k)`. */
export declare function permutationCount(n: number, k: number): number;
/** `C(n,k)`, computed by Pascal's recurrence with over-choosing equal to zero. */
export declare function choose(n: number, k: number): number;
export interface PascalWitness {
    readonly kind: "numberTheory.pascal:witness";
    readonly n: number;
    readonly k: number;
    readonly chooseZero: 1;
    readonly chooseSelf: 1;
    readonly left: number;
    readonly right: number;
    readonly holds: true;
}
export interface PascalObstruction {
    readonly kind: "numberTheory.pascal-obstruction";
    readonly n: number;
    readonly k: number;
    readonly chooseZero: number;
    readonly chooseSelf: number;
    readonly left: number;
    readonly right: number;
    readonly holds: false;
}
export type PascalJudgment = PascalWitness | PascalObstruction;
/** Carrier receipt for `choose n 0 = 1`, `choose n n = 1`, and Pascal recurrence. */
export declare function pascal(n: number, k: number): PascalJudgment;
export interface BinomialWitness {
    readonly kind: "numberTheory.binomial:witness";
    readonly x: number;
    readonly y: number;
    readonly n: number;
    readonly lhs: number;
    readonly rhs: number;
    readonly terms: readonly number[];
    readonly holds: true;
}
export interface BinomialObstruction {
    readonly kind: "numberTheory.binomial-obstruction";
    readonly x: number;
    readonly y: number;
    readonly n: number;
    readonly lhs: number;
    readonly rhs: number;
    readonly terms: readonly number[];
    readonly holds: false;
}
export type BinomialJudgment = BinomialWitness | BinomialObstruction;
/** Finite Nat-semiring receipt for `(x+y)^n = Σ C(n,k)x^k y^(n-k)`. */
export declare function binomial(x: number, y: number, n: number): BinomialJudgment;
export interface DivisibilityWitness {
    readonly kind: "numberTheory.divides:witness";
    readonly divisor: number;
    readonly dividend: number;
    readonly quotient: number;
    readonly product: number;
    readonly divides: true;
}
export interface DivisibilityObstruction {
    readonly kind: "numberTheory.divides-obstruction";
    readonly divisor: number;
    readonly dividend: number;
    readonly divides: false;
}
export type DivisibilityJudgment = DivisibilityWitness | DivisibilityObstruction;
/** The finite witness for `a ∣ b := ∃ c, b = a*c`. */
export declare function divides(divisor: number, dividend: number): DivisibilityJudgment;
/** Euclid's algorithm. */
export declare function gcd(a: number, b: number): number;
export interface GcdMeetWitness {
    readonly kind: "numberTheory.gcdMeet:witness";
    readonly a: number;
    readonly b: number;
    readonly d: number;
    readonly gcd: number;
    readonly gcdDividesA: true;
    readonly gcdDividesB: true;
    readonly dDividesA: boolean;
    readonly dDividesB: boolean;
    readonly dDividesGcd: boolean;
    readonly greatestPremiseHolds: boolean;
    readonly recurrence: boolean;
    readonly holds: true;
}
export interface GcdMeetObstruction {
    readonly kind: "numberTheory.gcdMeet-obstruction";
    readonly a: number;
    readonly b: number;
    readonly d: number;
    readonly gcd: number;
    readonly gcdDividesA: boolean;
    readonly gcdDividesB: boolean;
    readonly dDividesA: boolean;
    readonly dDividesB: boolean;
    readonly dDividesGcd: boolean;
    readonly greatestPremiseHolds: boolean;
    readonly recurrence: boolean;
    readonly holds: false;
}
export type GcdMeetJudgment = GcdMeetWitness | GcdMeetObstruction;
/** Receipt for gcd dividing both arguments, greatestness for `d`, and Euclid recurrence. */
export declare function gcdMeet(a: number, b: number, d?: number): GcdMeetJudgment;
/** Trial-division primality predicate for finite Nat receipts. */
export declare function isPrime(n: number): boolean;
export interface EuclidLemmaWitness {
    readonly kind: "numberTheory.euclidLemma:witness";
    readonly p: number;
    readonly a: number;
    readonly b: number;
    readonly product: number;
    readonly prime: true;
    readonly premiseHolds: true;
    readonly dividesLeft: boolean;
    readonly dividesRight: boolean;
    readonly conclusionHolds: true;
}
export interface EuclidLemmaObstruction {
    readonly kind: "numberTheory.euclidLemma-obstruction";
    readonly reason: "prime" | "premise" | "conclusion";
    readonly p: number;
    readonly a: number;
    readonly b: number;
    readonly product: number;
    readonly prime: boolean;
    readonly premiseHolds: boolean;
    readonly dividesLeft: boolean;
    readonly dividesRight: boolean;
    readonly conclusionHolds: boolean;
}
export type EuclidLemmaJudgment = EuclidLemmaWitness | EuclidLemmaObstruction;
/** Finite witness for Euclid's lemma: prime `p` dividing `a*b` divides `a` or `b`. */
export declare function euclidLemma(p: number, a: number, b: number): EuclidLemmaJudgment;
/** Prime factors of `n`, with multiplicity, in nondecreasing order. */
export declare function primeFactors(n: number): readonly number[];
export interface PrimeFactorizationWitness {
    readonly kind: "numberTheory.primeFactorization:witness";
    readonly n: number;
    readonly factors: readonly number[];
    readonly product: number;
    readonly allPrime: true;
    readonly admissible: true;
}
export interface PrimeFactorizationObstruction {
    readonly kind: "numberTheory.primeFactorization-obstruction";
    readonly reason: "domain" | "product" | "prime";
    readonly n: number;
    readonly factors: readonly number[];
    readonly product: number;
    readonly allPrime: boolean;
    readonly admissible: boolean;
}
export type PrimeFactorizationJudgment = PrimeFactorizationWitness | PrimeFactorizationObstruction;
/** Existence half of FTA, computed for `n >= 2`. */
export declare function primeFactorization(n: number): PrimeFactorizationJudgment;
export interface PrimeFactorizationUniqueWitness {
    readonly kind: "numberTheory.primeFactorizationUnique:witness";
    readonly n: number;
    readonly left: readonly number[];
    readonly right: readonly number[];
    readonly leftProduct: number;
    readonly rightProduct: number;
    readonly leftAllPrime: true;
    readonly rightAllPrime: true;
    readonly permutation: true;
}
export interface PrimeFactorizationUniqueObstruction {
    readonly kind: "numberTheory.primeFactorizationUnique-obstruction";
    readonly reason: "left-product" | "right-product" | "left-prime" | "right-prime" | "permutation";
    readonly n: number;
    readonly left: readonly number[];
    readonly right: readonly number[];
    readonly leftProduct: number;
    readonly rightProduct: number;
    readonly leftAllPrime: boolean;
    readonly rightAllPrime: boolean;
    readonly permutation: boolean;
}
export type PrimeFactorizationUniqueJudgment = PrimeFactorizationUniqueWitness | PrimeFactorizationUniqueObstruction;
/** Uniqueness half of FTA: two prime factorizations of `n` are permutations. */
export declare function primeFactorizationUnique(n: number, left: readonly number[], right: readonly number[]): PrimeFactorizationUniqueJudgment;
export interface ImageFactorizationWitness<T> {
    readonly kind: "numberTheory.imageFactorization:witness";
    readonly outputs: readonly T[];
    readonly image: readonly T[];
    readonly corestriction: readonly number[];
    readonly reconstructed: readonly T[];
    readonly surjectiveCorestriction: true;
    readonly injectiveInclusion: true;
    readonly factors: true;
}
export interface ImageFactorizationObstruction<T> {
    readonly kind: "numberTheory.imageFactorization-obstruction";
    readonly outputs: readonly T[];
    readonly image: readonly T[];
    readonly corestriction: readonly number[];
    readonly reconstructed: readonly T[];
    readonly surjectiveCorestriction: boolean;
    readonly injectiveInclusion: boolean;
    readonly factors: boolean;
}
export type ImageFactorizationJudgment<T> = ImageFactorizationWitness<T> | ImageFactorizationObstruction<T>;
/** Finite table form of image/epi-mono factorization for a total map `A -> B`. */
export declare function imageFactorization<T>(outputs: readonly T[]): ImageFactorizationJudgment<T>;
export interface NumberTheoryCombinatoricsReceipt {
    readonly kind: "numberTheory.combinatorics:witness";
    readonly sourceModule: "RelMath.Order.NumberTheoryCombinatorics";
    readonly theorems: readonly [
        "RelMath.NumberTheory.factorial_zero",
        "RelMath.NumberTheory.factorial_succ",
        "RelMath.NumberTheory.factorial_pos",
        "RelMath.NumberTheory.perm_zero",
        "RelMath.NumberTheory.perm_succ",
        "RelMath.NumberTheory.choose_zero_right",
        "RelMath.NumberTheory.choose_zero_succ",
        "RelMath.NumberTheory.choose_succ_succ",
        "RelMath.NumberTheory.choose_eq_zero_of_lt",
        "RelMath.NumberTheory.choose_self",
        "RelMath.NumberTheory.pascal_and_binomial_theorem",
        "RelMath.NumberTheory.gcd_prime_theory"
    ];
    readonly factorialZero: 1;
    readonly factorialSucc: true;
    readonly factorialPositive: true;
    readonly permutationStep: true;
    readonly pascal: PascalWitness;
    readonly binomial: BinomialWitness;
    readonly gcdPrime: {
        readonly meet: GcdMeetWitness;
        readonly euclid: EuclidLemmaWitness;
    };
}
export declare function numberTheoryCombinatoricsReceipt(): NumberTheoryCombinatoricsReceipt;

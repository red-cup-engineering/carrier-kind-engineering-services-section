/** Causal reception, admission, and frontier judgments. */
export type CausalObstructionCode =
  | "artifact-invalid"
  | "address-collision"
  | "witness-shape"
  | "site-mismatch"
  | "reference-set-order"
  | "duplicate-reference"
  | "unsupported-attestation"
  | "dependency-limit"
  | "causal-cycle"
  | "articulation-invalid"
  | "cause-not-witness"
  | "cause-blocked"
  | "closure-limit"
  | "closure-not-admitted"
  | "closure-not-downclosed";

export interface CausalObstruction {
  readonly kind: "metroplat.causal:obstruction";
  readonly code: CausalObstructionCode;
  readonly path: string;
  readonly message: string;
  readonly relatedRefs: readonly string[];
}

export interface CausalWitness<T> {
  readonly kind: "metroplat.causal:witness";
  readonly value: T;
}

export type CausalJudgment<T> = CausalWitness<T> | CausalObstruction;

export function causalWitness<T>(value: T): CausalWitness<T> {
  return Object.freeze({ kind: "metroplat.causal:witness" as const, value });
}

export function causalObstruction(
  code: CausalObstructionCode,
  path: string,
  message: string,
  relatedRefs: readonly string[] = Object.freeze([]),
): CausalObstruction {
  return Object.freeze({
    kind: "metroplat.causal:obstruction" as const,
    code,
    path,
    message,
    relatedRefs: Object.freeze([...relatedRefs].sort()),
  });
}

export function isCausalWitness<T>(judgment: CausalJudgment<T>): judgment is CausalWitness<T> {
  return judgment.kind === "metroplat.causal:witness";
}

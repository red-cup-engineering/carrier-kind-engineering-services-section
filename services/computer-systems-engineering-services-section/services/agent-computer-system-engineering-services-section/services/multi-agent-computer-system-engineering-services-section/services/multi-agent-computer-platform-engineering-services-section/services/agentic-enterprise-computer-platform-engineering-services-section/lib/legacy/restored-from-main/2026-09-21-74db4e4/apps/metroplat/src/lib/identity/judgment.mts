/** Identity admission witnesses and obstructions. */
export type IdentityObstructionCode =
  | "source-limit"
  | "malformed-utf8"
  | "malformed-json"
  | "duplicate-key"
  | "invalid-json-value"
  | "unicode-scalar"
  | "depth-limit"
  | "node-limit"
  | "object-member-limit"
  | "array-length-limit"
  | "string-limit"
  | "key-limit"
  | "canonical-limit"
  | "reference-syntax"
  | "reference-version"
  | "canonical-profile"
  | "digest-algorithm"
  | "digest-mismatch"
  | "site-constitution"
  | "primitive-articulation";

export interface IdentityObstruction {
  readonly kind: "metroplat.identity:obstruction";
  readonly code: IdentityObstructionCode;
  readonly path: string;
  readonly message: string;
}

export interface IdentityWitness<T> {
  readonly kind: "metroplat.identity:witness";
  readonly value: T;
}

export type IdentityJudgment<T> = IdentityWitness<T> | IdentityObstruction;

export function identityWitness<T>(value: T): IdentityWitness<T> {
  return Object.freeze({ kind: "metroplat.identity:witness" as const, value });
}

export function identityObstruction(
  code: IdentityObstructionCode,
  path: string,
  message: string,
): IdentityObstruction {
  return Object.freeze({ kind: "metroplat.identity:obstruction" as const, code, path, message });
}

export function isIdentityWitness<T>(judgment: IdentityJudgment<T>): judgment is IdentityWitness<T> {
  return judgment.kind === "metroplat.identity:witness";
}

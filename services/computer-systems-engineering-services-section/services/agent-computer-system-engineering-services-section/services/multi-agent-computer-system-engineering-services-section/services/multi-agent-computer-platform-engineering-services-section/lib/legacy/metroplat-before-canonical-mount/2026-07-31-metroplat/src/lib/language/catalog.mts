/** The pure ABI for exact RMN term admission and witnessed name proposals. */
import { addressJsonValue, isIdentityWitness, type ArtifactRef, type ArtifactSource } from "../identity/index.mts";
import { schemaFrom } from "../schema/contract.mts";
import { TmSchema, TySchema, isTerm, type Tm, type Ty } from "./ast/index.mts";
import { checkTy, inferTy, isClosed } from "./check/index.mts";
import { normalize } from "./eval/index.mts";

const termContract = schemaFrom(TmSchema);
const typeContract = schemaFrom(TySchema);

export interface TermAdmissionReceipt {
  readonly kind: "metroplat.language.term-admission";
  readonly version: 1;
  readonly term: ArtifactRef;
  readonly type: Ty;
  readonly normalForm: ArtifactRef;
}

export interface AdmittedTerm {
  readonly kind: "metroplat.language.term-admission:witness";
  readonly term: ArtifactRef;
  readonly type: Ty;
  readonly normalForm: ArtifactRef;
  readonly receipt: ArtifactRef;
  readonly sources: readonly ArtifactSource[];
}

export interface TermAdmissionObstruction {
  readonly kind: "metroplat.language.term-admission:obstruction";
  readonly code: "invalid-term" | "invalid-type" | "untyped-term" | "identity-obstruction";
  readonly message: string;
}

export type TermAdmissionJudgment = AdmittedTerm | TermAdmissionObstruction;

export interface NamedTermImplementation {
  readonly name: string;
  readonly term: ArtifactRef;
  readonly closed: boolean;
  readonly inferable: boolean;
  /** Exact syntactic identity function `λx.x`; this is evidence, not a claim
   * that an identity implementation is inappropriate for every designation. */
  readonly identityFunction: boolean;
}

export interface NamedTermImplementationCollision {
  readonly term: ArtifactRef;
  readonly names: readonly string[];
}

export interface NamedTermImplementationReadout {
  readonly kind: "metroplat.language.named-term-implementations";
  readonly implementations: readonly NamedTermImplementation[];
  /** Distinct exported names carrying exactly the same RMN syntax. */
  readonly collisions: readonly NamedTermImplementationCollision[];
}

function obstruction(code: TermAdmissionObstruction["code"], message: string): TermAdmissionObstruction {
  return Object.freeze({ kind: "metroplat.language.term-admission:obstruction" as const, code, message });
}

function addressed(value: unknown): ArtifactSource | TermAdmissionObstruction {
  const result = addressJsonValue(value);
  return isIdentityWitness(result)
    ? Object.freeze({ ref: result.value.ref, canonicalText: result.value.canonical.text })
    : obstruction("identity-obstruction", `${result.code} at ${result.path}: ${result.message}`);
}

function isObstruction(value: ArtifactSource | TermAdmissionObstruction): value is TermAdmissionObstruction {
  return "kind" in value;
}

const identityFunctionText = JSON.stringify(["lam", ["var", 0]]);

/** Inspect the actual RMN values exported by a module namespace. This is a
 * source-neutral implementation comparison, not term admission and not name
 * authority: it reports exact syntax identity, closure/type evidence, and
 * names sharing one body so placeholder implementations cannot hide behind
 * distinct theorem-like exports. */
export function inspectNamedTermImplementations(
  namespace: Readonly<Record<string, unknown>>,
): NamedTermImplementationReadout {
  const implementations: NamedTermImplementation[] = [];
  for (const [name, value] of Object.entries(namespace).sort(([left], [right]) => left.localeCompare(right))) {
    if (!isTerm(value)) continue;
    const term = value;
    const artifact = addressed(Object.freeze({
      kind: "metroplat.language.term" as const,
      version: 1 as const,
      term,
    }));
    if (isObstruction(artifact)) throw new TypeError(`named term ${name}: ${artifact.message}`);
    implementations.push(Object.freeze({
      name,
      term: artifact.ref,
      closed: isClosed(term),
      inferable: inferTy([], term) !== null,
      identityFunction: JSON.stringify(term) === identityFunctionText,
    }));
  }
  const namesByTerm = new Map<ArtifactRef, string[]>();
  for (const implementation of implementations) {
    const names = namesByTerm.get(implementation.term) ?? [];
    names.push(implementation.name);
    namesByTerm.set(implementation.term, names);
  }
  return Object.freeze({
    kind: "metroplat.language.named-term-implementations" as const,
    implementations: Object.freeze(implementations),
    collisions: Object.freeze([...namesByTerm]
      .filter(([, names]) => names.length > 1)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([term, names]) => Object.freeze({ term, names: Object.freeze([...names].sort()) }))),
  });
}

/** Admit syntax plus a closed type derivation; no semantic identity is claimed. */
export function admitTerm(termValue: unknown, expectedType?: unknown): TermAdmissionJudgment {
  if (!termContract.validate(termValue)) {
    return obstruction("invalid-term", termContract.errors(termValue).join("; ") || "value is not RMN term syntax");
  }
  const term = termValue as Tm;
  let type: Ty | null;
  if (expectedType === undefined) {
    type = inferTy([], term);
  } else {
    if (!typeContract.validate(expectedType)) {
      return obstruction("invalid-type", typeContract.errors(expectedType).join("; ") || "value is not RMN type syntax");
    }
    type = expectedType as Ty;
    if (!checkTy([], term, type)) type = null;
  }
  if (type === null) return obstruction("untyped-term", "term has no closed derivation at the supplied or inferred type");

  const termArtifact = addressed(Object.freeze({
    kind: "metroplat.language.term" as const,
    version: 1 as const,
    term,
  }));
  if (isObstruction(termArtifact)) return termArtifact;
  const normalArtifact = addressed(Object.freeze({
    kind: "metroplat.language.term" as const,
    version: 1 as const,
    term: normalize(term),
  }));
  if (isObstruction(normalArtifact)) return normalArtifact;
  const receiptValue: TermAdmissionReceipt = Object.freeze({
    kind: "metroplat.language.term-admission" as const,
    version: 1 as const,
    term: termArtifact.ref,
    type,
    normalForm: normalArtifact.ref,
  });
  const receipt = addressed(receiptValue);
  if (isObstruction(receipt)) return receipt;
  const sources = new Map<ArtifactRef, ArtifactSource>([
    [termArtifact.ref, termArtifact],
    [normalArtifact.ref, normalArtifact],
    [receipt.ref, receipt],
  ]);
  return Object.freeze({
    kind: "metroplat.language.term-admission:witness" as const,
    term: termArtifact.ref,
    type,
    normalForm: normalArtifact.ref,
    receipt: receipt.ref,
    sources: Object.freeze([...sources.values()].sort((left, right) => left.ref.localeCompare(right.ref))),
  });
}

export interface TermNameProposal {
  readonly kind: "metroplat.language.term-name-proposal";
  readonly version: 1;
  readonly name: string;
  readonly term: ArtifactRef;
  readonly admission: ArtifactRef;
  readonly witness: string;
}

export interface TermCatalogDesignation {
  readonly name: string;
  readonly charge: "held" | "contested";
  readonly terms: readonly ArtifactRef[];
  readonly admissions: readonly ArtifactRef[];
  readonly proposals: readonly string[];
}

export interface TermCatalogReadout {
  readonly kind: "metroplat.language.term-catalog";
  readonly designations: readonly TermCatalogDesignation[];
}

/** Fold witnessed proposals without choosing a winner when one name is split. */
export function readTermCatalog(proposals: readonly TermNameProposal[]): TermCatalogReadout {
  const byName = new Map<string, { terms: Set<ArtifactRef>; admissions: Set<ArtifactRef>; witnesses: Set<string> }>();
  for (const proposal of proposals) {
    const entry = byName.get(proposal.name) ?? {
      terms: new Set<ArtifactRef>(),
      admissions: new Set<ArtifactRef>(),
      witnesses: new Set<string>(),
    };
    entry.terms.add(proposal.term);
    entry.admissions.add(proposal.admission);
    entry.witnesses.add(proposal.witness);
    byName.set(proposal.name, entry);
  }
  return Object.freeze({
    kind: "metroplat.language.term-catalog" as const,
    designations: Object.freeze([...byName].sort(([left], [right]) => left.localeCompare(right)).map(([name, entry]) => {
      const terms = Object.freeze([...entry.terms].sort());
      return Object.freeze({
        name,
        charge: terms.length === 1 ? "held" as const : "contested" as const,
        terms,
        admissions: Object.freeze([...entry.admissions].sort()),
        proposals: Object.freeze([...entry.witnesses].sort()),
      });
    })),
  });
}

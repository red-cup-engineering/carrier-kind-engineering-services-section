/** The pure ABI for exact SEN term admission and witnessed name proposals. */
import { addressArtifact } from "@red-cup-engineering/semiotic-eavt-services-section/identity";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { TmSchema, TySchema } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { isTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { checkTy, inferTy, isClosed } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { normalize } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";

const typeContract = schemaFrom(TySchema);
const termContract = schemaFrom(TmSchema, [typeContract]);

  

function obstruction(code, message) {
  return Object.freeze({ kind: "metroplat.language.term-admission:obstruction", code, message });
}

function addressed(value) {
  try {
    const result = addressArtifact(value);
    return Object.freeze({ ref: result.ref, canonicalText: result.canonical.text });
  } catch (error) {
    return obstruction("identity-obstruction", error.message);
  }
}

function isObstruction(value) {
  return "kind" in value;
}

const identityFunctionText = JSON.stringify(["lam", ["var", 0]]);

/** Inspect the actual SEN values exported by a module namespace. This is a
 * source-neutral implementation comparison, not term admission and not name
 * authority: it reports exact syntax identity, closure/type evidence, and
 * names sharing one body so placeholder implementations cannot hide behind
 * distinct theorem-like exports. */
export function inspectNamedTermImplementations(
  namespace,
) {
  const implementations = [];
  for (const [name, value] of Object.entries(namespace).sort(([left], [right]) => left.localeCompare(right))) {
    if (!isTerm(value)) continue;
    const term = value;
    const artifact = addressed(Object.freeze({
      kind: "metroplat.language.term",
      version: 1,
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
  const namesByTerm = new Map();
  for (const implementation of implementations) {
    const names = namesByTerm.get(implementation.term) ?? [];
    names.push(implementation.name);
    namesByTerm.set(implementation.term, names);
  }
  return Object.freeze({
    kind: "metroplat.language.named-term-implementations",
    implementations: Object.freeze(implementations),
    collisions: Object.freeze([...namesByTerm]
      .filter(([, names]) => names.length > 1)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([term, names]) => Object.freeze({ term, names: Object.freeze([...names].sort()) }))),
  });
}

/** Admit syntax plus a closed type derivation; no semantic identity is claimed. */
export function admitTerm(termValue, expectedType) {
  if (!termContract.validate(termValue)) {
    return obstruction("invalid-term", termContract.errors(termValue).join("; ") || "value is not SEN term syntax");
  }
  const term = termValue;
  let type;
  if (expectedType === undefined) {
    type = inferTy([], term);
  } else {
    if (!typeContract.validate(expectedType)) {
      return obstruction("invalid-type", typeContract.errors(expectedType).join("; ") || "value is not SEN type syntax");
    }
    type = expectedType;
    if (!checkTy([], term, type)) type = null;
  }
  if (type === null) return obstruction("untyped-term", "term has no closed derivation at the supplied or inferred type");

  const termArtifact = addressed(Object.freeze({
    kind: "metroplat.language.term",
    version: 1,
    term,
  }));
  if (isObstruction(termArtifact)) return termArtifact;
  const normalArtifact = addressed(Object.freeze({
    kind: "metroplat.language.term",
    version: 1,
    term: normalize(term),
  }));
  if (isObstruction(normalArtifact)) return normalArtifact;
  const receiptValue = Object.freeze({
    kind: "metroplat.language.term-admission",
    version: 1,
    term: termArtifact.ref,
    type,
    normalForm: normalArtifact.ref,
  });
  const receipt = addressed(receiptValue);
  if (isObstruction(receipt)) return receipt;
  const sources = new Map([
    [termArtifact.ref, termArtifact],
    [normalArtifact.ref, normalArtifact],
    [receipt.ref, receipt],
  ]);
  return Object.freeze({
    kind: "metroplat.language.term-admission:witness",
    term: termArtifact.ref,
    type,
    normalForm: normalArtifact.ref,
    receipt: receipt.ref,
    sources: Object.freeze([...sources.values()].sort((left, right) => left.ref.localeCompare(right.ref))),
  });
}

/** Fold witnessed proposals without choosing a winner when one name is split. */
export function readTermCatalog(proposals) {
  const byName = new Map();
  for (const proposal of proposals) {
    const entry = byName.get(proposal.name) ?? {
      terms: new Set(),
      admissions: new Set(),
      witnesses: new Set(),
    };
    entry.terms.add(proposal.term);
    entry.admissions.add(proposal.admission);
    entry.witnesses.add(proposal.witness);
    byName.set(proposal.name, entry);
  }
  return Object.freeze({
    kind: "metroplat.language.term-catalog",
    designations: Object.freeze([...byName].sort(([left], [right]) => left.localeCompare(right)).map(([name, entry]) => {
      const terms = Object.freeze([...entry.terms].sort());
      return Object.freeze({
        name,
        reading: terms.length === 1 ? "held" : "contested",
        terms,
        admissions: Object.freeze([...entry.admissions].sort()),
        proposals: Object.freeze([...entry.witnesses].sort()),
      });
    })),
  });
}

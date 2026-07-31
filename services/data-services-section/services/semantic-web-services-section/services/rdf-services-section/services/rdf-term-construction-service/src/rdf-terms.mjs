// rdf-terms — IRI and literal construction/validation per RDF 1.1 Concepts
// and Abstract Syntax (W3C Recommendation, 25 February 2014,
// https://www.w3.org/TR/rdf11-concepts/, sections 3.2 "IRIs" and 3.3
// "Literals"). Adapted from the RWIL RDF projection service's `iri`,
// `literal`, and `objectTerm` helpers, with the RWIL-specific RMN term
// encoding stripped out: what remains is pure term validation independent
// of any particular serialization or algebraic representation.
const LANGUAGE = /^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$/u;

function fail(message) {
  throw new Error(message);
}

// True for a value containing '<', '>', or a C0 control character through
// space (code points 0x00-0x20 inclusive) — the delimiter and control
// characters an IRI reference forbids. Written as a character-code scan
// rather than an escaped regex range so the forbidden range reads
// unambiguously in source.
function hasForbiddenIriChars(value) {
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "<" || char === ">") return true;
    if (value.charCodeAt(index) <= 0x20) return true;
  }
  return false;
}

// Validate and return an IRI string. Refuses blank-node labels (RDF 1.1
// Concepts 3.4 defines blank nodes as a disjoint term kind from IRIs), the
// delimiter/control characters an IRI reference forbids, and anything that
// does not parse as an absolute URI reference.
export function iri(value) {
  if (typeof value !== "string" || value.startsWith("_:") || hasForbiddenIriChars(value)) {
    fail(`invalid RDF IRI ${JSON.stringify(value)}`);
  }
  try {
    new URL(value);
  } catch {
    fail(`invalid RDF IRI ${JSON.stringify(value)}`);
  }
  return value;
}

// Construct an IRI term: `{ kind: "iri", value }`.
export function iriTerm(value) {
  return Object.freeze({ kind: "iri", value: iri(value) });
}

// Construct a literal term. `options.datatype` and `options.language` are
// mutually exclusive (RDF 1.1 Concepts 3.3: a literal has either a datatype
// IRI, defaulting to `xsd:string`, or — for a language-tagged string — a
// language tag, never both). A language tag is validated against the
// RFC 5646-shaped tag grammar and lowercased per RDF 1.1 Concepts 3.3's
// canonicalization note.
export function literal(value, options = {}) {
  const { datatype, language } = options;
  if (datatype !== undefined && language !== undefined) {
    fail("RDF literal cannot have both datatype and language");
  }
  const term = { kind: "literal", value: String(value) };
  if (datatype !== undefined) term.datatype = iri(datatype);
  if (language !== undefined) {
    if (!LANGUAGE.test(language)) fail(`invalid RDF language tag ${JSON.stringify(language)}`);
    term.language = language.toLowerCase();
  }
  return Object.freeze(term);
}

// Report whether a value is a well-formed term produced by `iriTerm` or
// `literal` (or an equivalently shaped plain object).
export function isTerm(term) {
  if (term === null || typeof term !== "object") return false;
  if (term.kind === "iri") {
    return typeof term.value === "string";
  }
  if (term.kind === "literal") {
    if (typeof term.value !== "string") return false;
    if (term.datatype !== undefined && term.language !== undefined) return false;
    if (term.datatype !== undefined && typeof term.datatype !== "string") return false;
    if (term.language !== undefined && typeof term.language !== "string") return false;
    return true;
  }
  return false;
}

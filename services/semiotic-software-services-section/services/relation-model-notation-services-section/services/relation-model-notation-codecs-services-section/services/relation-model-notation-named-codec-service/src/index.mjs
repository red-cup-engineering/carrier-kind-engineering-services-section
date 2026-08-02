/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation-named-codec` is the
 * named-variable surface syntax for Relation Model Notation: the src-side
 * counterpart to the grammar package's pure de-Bruijn `Tm`.
 *
 * The grammar's `Tm` addresses variables by de-Bruijn index (`["var", 0]`);
 * hand-writing anything beyond trivial nesting means manually counting
 * binder depth. `compileNamedRmn`/`parseNamedRmn` admit a named surface
 * instead — `["lam", "x", body]`, `["var", "x"]` — and compile it down to
 * the same closed kernel. `lam` is the kernel's only binder (`fold`'s
 * combining function is itself a curried `lam`/`lam` term, not a binder
 * site of its own).
 *
 * Resolving a name is an ordinary reverse scan of the open-binder scope:
 * lexical shadowing means the innermost (last-appended) binder bearing the
 * name wins, and `scope` is append-only and ordered outermost-first, so a
 * scan from the end finds exactly that binder by construction.
 *
 * Every export here is a gate in the same Hoare-triple sense the sibling
 * packages' doc comments use: `compileNamedRmn : NamedTm -> Tm`,
 * `parseNamedRmn : string -> Tm`, `namedString/namedArray/namedObject/
 * namedBool/namedGenerator : (structured input) -> NamedTm` as builders,
 * `namedOfCompiled`/`canonicalNamedRmn : Tm -> string`/`digestNamedRmn :
 * Tm -> string` as the reverse direction. This is a codec — carrier shape
 * in, `Tm` out, or the reverse — not an admission gate; `isRelationalTerm`/
 * `parseRmn`/`settleRmn` live in `@red-cup-engineering/relation-model-notation-reader`,
 * which `parseNamedRmn` composes with (inlined here as a direct
 * `isClosed`/`inferTy` check, to avoid this codec depending on the gate
 * package just to validate its own compiled output).
 *
 * Split out of metroplat's `src/lib/language/reader/index.mts` (via this
 * section's own `relation-model-notation-reader-service`, which bundled
 * the admission gate and this codec together before this split): behavior
 * preserved exactly (TypeScript type annotations dropped; JSDoc typedefs
 * substituted). `tm` and the `Tm`/`ChargeValueName`/`GeneratorName` types
 * now come from `@red-cup-engineering/relation-model-notation`;
 * `inferTy`/`isClosed` from `@red-cup-engineering/relation-model-notation-typing`;
 * `arrayTag`/`objectTag` from `@red-cup-engineering/relation-model-notation-json-codec`.
 *
 * `canonicalBytes`/`digest` (from `identity/index.mts`), `chargeValueNames`
 * (from `values/index.mts`), and `parse` (from `codecs/json/core.mts`) are
 * DELIBERATELY still imported directly from metroplat's legacy tree by
 * relative path, not from any published package — the same deliberate,
 * noted dependency the json-codec package's own port already carries.
 */
import { tm } from "@red-cup-engineering/relation-model-notation";
import { inferTy, isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import { arrayTag, objectTag } from "@red-cup-engineering/relation-model-notation-json-codec";
import { canonicalBytes, digest } from "../../../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/identity/index.mts";
import { chargeValueNames } from "../../../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/values/index.mts";
import { parse as parseJson } from "../../../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/codecs/json/core.mts";

/**
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").ChargeValueName} ChargeValueName
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").GeneratorName} GeneratorName
 */

const CHARGE_VALUE_NAMES = chargeValueNames;
const GENERATOR_NAMES = Object.freeze([
  "specialization", "converse", "subjectProjection", "objectProjection",
]);

/** Whether a compiled term is closed and well-typed — this codec's own
 *  admission check on the terms it produces, inlined so this package
 *  doesn't need a runtime dependency on the reader/admission-gate package
 *  just to validate its own output.
 * @param {Tm} term
 * @returns {boolean}
 */
function isWellTypedClosedTerm(term) {
  try {
    return isClosed(term) && inferTy([], term) !== null;
  } catch {
    return false;
  }
}

/** Named-surface mirror of `Tm`: `var`/`lam` carry a name instead of an index.
 *  `embed` splices an already-compiled *closed* term in verbatim — closed terms
 *  have no free variables, so they need no reindexing regardless of surrounding
 *  scope depth. It exists to reuse an independently-built term (e.g. a shared
 *  `natIsZeroTerm`), not to build records: the json-codec package's
 *  `objectTerm`/`arrayTerm`/`stringTerm` are themselves pure sugar over
 *  `pair`/`mark`/`star` — every one already a `NamedTm` constructor — so
 *  `namedObject`/`namedArray`/`namedString` below build the same encoding
 *  directly, over *open* (still-bound) sub-terms, with no embedding at all.
 *
 *  `bool` and `generator` are deliberately NOT tags here, unlike `charge`.
 *  `tm.bool`/`tm.generator` (the grammar package) are both `tm.mark`
 *  verbatim — `cond`'s reduction rule dispatches by calling `boolOfTerm` on
 *  its test, which recognizes only a charge-encoded mark, so a boolean has
 *  no wire identity independent of `charge` to begin with: giving it its
 *  own union tag/compiler case here would assert a distinction the kernel
 *  doesn't have. `namedBool`/`namedGenerator` below build the same
 *  `charge`/`mark` shapes directly, as plain sugar, the same way
 *  `namedString` does — not as their own compiled forms.
 * @typedef {readonly ["var", string]
 *   | readonly ["lam", string, NamedTm]
 *   | readonly ["app", NamedTm, NamedTm]
 *   | readonly ["pair", NamedTm, NamedTm]
 *   | readonly ["fst", NamedTm]
 *   | readonly ["snd", NamedTm]
 *   | readonly ["star"]
 *   | readonly ["mark", string]
 *   | readonly ["charge", string]
 *   | readonly ["negate" | "conflate" | "negConf", NamedTm]
 *   | readonly ["joinK" | "meetK" | "joinT" | "meetT" | "leK" | "leT" | "settle", NamedTm, NamedTm]
 *   | readonly ["field", string, NamedTm]
 *   | readonly ["consArray", NamedTm, NamedTm]
 *   | readonly ["reverseArray", NamedTm]
 *   | readonly ["coincide", NamedTm, NamedTm]
 *   | readonly ["cond" | "fold", NamedTm, NamedTm, NamedTm]
 *   | readonly ["embed", Tm]} NamedTm
 */

/** A `pair`/`star`-terminated cons spine, matching the json-codec's `listTerm`.
 * @param {readonly NamedTm[]} items
 * @returns {NamedTm}
 */
function namedList(items) {
  return items.reduceRight((tail, item) => ["pair", item, tail], ["star"]);
}

/** A string literal exactly as the json-codec's bridge encodes one — a
 *  canonical-JSON-quoted `mark` — matching `stringTerm`.
 * @param {string} value
 * @returns {NamedTm}
 */
export function namedString(value) {
  return ["mark", canonicalBytes(value)];
}

/** An array literal over *open* sub-terms, matching `arrayTerm`'s
 *  encoding exactly (a `mark`-tagged spine) — no `embed` needed, since the
 *  encoding is pure `pair`/`mark`/`star`.
 * @param {readonly NamedTm[]} items
 * @returns {NamedTm}
 */
export function namedArray(items) {
  return ["pair", ["mark", canonicalBytes(arrayTag)], namedList(items)];
}

/** An object literal over *open* sub-terms (keys sorted, matching
 *  `objectTerm`'s deterministic encoding) — again pure `pair`/`mark`/`star`.
 * @param {ReadonlyArray<readonly [string, NamedTm]>} entries
 * @returns {NamedTm}
 */
export function namedObject(entries) {
  const sorted = [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return ["pair", ["mark", canonicalBytes(objectTag)], namedList(sorted.map(([key, value]) => ["pair", ["mark", canonicalBytes(key)], value]))];
}

/** A boolean literal: sugar over the truth-axis `charge` shape, matching
 *  `tm.bool` exactly (`held` = true, `denied` = false) — not its own
 *  compiled form, since none exists at the kernel level.
 * @param {boolean} value
 * @returns {NamedTm}
 */
export function namedBool(value) {
  return ["charge", value ? "held" : "denied"];
}

/** One of the four relational generator marks, matching `tm.generator` — a
 *  bare validated mark, not its own compiled form (`tm.generator` is
 *  `tm.mark` verbatim).
 * @param {string} name
 * @returns {NamedTm}
 */
export function namedGenerator(name) {
  return ["mark", requireOneOf(name, GENERATOR_NAMES, "GeneratorName")];
}

/** One open binder: its position in `scope` doubles as its append-order id.
 * @typedef {{ readonly id: number, readonly name: string }} OpenBinder
 */

/** Resolve `name` to a de-Bruijn index against `scope` (outermost-first,
 *  append-only). Ordinary lexical shadowing: the innermost (last-appended)
 *  binder bearing `name` wins. Since `scope` is append-only and ordered
 *  outermost-first, "highest id" and "last match scanning from the end" are
 *  the same binder by construction — a direct reverse scan, no lattice
 *  needed.
 * @param {readonly OpenBinder[]} scope
 * @param {string} name
 * @returns {number}
 */
function resolveByFca(scope, name) {
  for (let index = scope.length - 1; index >= 0; index -= 1) {
    if (scope[index].name === name) return scope.length - 1 - index;
  }
  throw new TypeError(`compileNamedRmn: unbound variable "${name}"`);
}

function requireOneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new TypeError(`compileNamedRmn: not a ${label}: ${JSON.stringify(value)}`);
  return value;
}

function compileNamed(surface, scope) {
  switch (surface[0]) {
    case "var": return tm.var(resolveByFca(scope, surface[1]));
    case "lam": return tm.lam(compileNamed(surface[2], [...scope, { id: scope.length, name: surface[1] }]));
    case "app": return tm.app(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "pair": return tm.pair(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "fst": return tm.fst(compileNamed(surface[1], scope));
    case "snd": return tm.snd(compileNamed(surface[1], scope));
    case "star": return tm.star();
    case "mark": return tm.mark(surface[1]);
    case "charge": return tm.charge(requireOneOf(surface[1], CHARGE_VALUE_NAMES, "ChargeValueName"));
    case "negate": return tm.negate(compileNamed(surface[1], scope));
    case "conflate": return tm.conflate(compileNamed(surface[1], scope));
    case "negConf": return tm.negConf(compileNamed(surface[1], scope));
    case "joinK": return tm.joinK(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "meetK": return tm.meetK(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "joinT": return tm.joinT(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "meetT": return tm.meetT(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "leK": return tm.leK(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "leT": return tm.leT(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "settle": return tm.settle(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "field": return tm.field(surface[1], compileNamed(surface[2], scope));
    case "consArray": return tm.consArray(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "reverseArray": return tm.reverseArray(compileNamed(surface[1], scope));
    case "coincide": return tm.coincide(compileNamed(surface[1], scope), compileNamed(surface[2], scope));
    case "cond": return tm.cond(compileNamed(surface[1], scope), compileNamed(surface[2], scope), compileNamed(surface[3], scope));
    case "fold": return tm.fold(compileNamed(surface[1], scope), compileNamed(surface[2], scope), compileNamed(surface[3], scope));
    case "embed":
      if (!isClosed(surface[1])) throw new TypeError("compileNamedRmn: embedded term is not closed");
      return surface[1];
    default: throw new TypeError(`compileNamedRmn: not a recognized RMN surface form: ${JSON.stringify(surface)}`);
  }
}

/** Compile a named-surface term to the closed de-Bruijn kernel.
 * @param {NamedTm} surface
 * @returns {Tm}
 */
export function compileNamedRmn(surface) {
  return compileNamed(surface, []);
}

/** Parse named-surface RMN source text and compile it to a closed, well-typed
 *  de-Bruijn term; throws unless the result is closed and well-typed.
 * @param {string} source
 * @returns {Tm}
 */
export function parseNamedRmn(source) {
  const surface = parseJson(source);
  const term = compileNamedRmn(surface);
  if (!isWellTypedClosedTerm(term)) throw new TypeError("rmn-named: compiled term is not closed and well-typed");
  return term;
}

function namedOfCompiled(term, scope) {
  switch (term[0]) {
    case "var": {
      const name = scope[scope.length - 1 - term[1]];
      if (name === undefined) throw new TypeError(`canonical RMN: free positional variable ${term[1]}`);
      return ["var", name];
    }
    case "lam": {
      const name = `$${scope.length}`;
      return ["lam", name, namedOfCompiled(term[1], [...scope, name])];
    }
    case "app": return ["app", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope)];
    case "pair": return ["pair", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope)];
    case "fst": return ["fst", namedOfCompiled(term[1], scope)];
    case "snd": return ["snd", namedOfCompiled(term[1], scope)];
    case "star": return ["star"];
    case "mark": return CHARGE_VALUE_NAMES.includes(term[1])
      ? ["charge", term[1]]
      : ["mark", term[1]];
    case "coincide": return ["coincide", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope)];
    case "cond": return ["cond", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope), namedOfCompiled(term[3], scope)];
    case "fold": return ["fold", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope), namedOfCompiled(term[3], scope)];
  }
}

/** The primary serialized term form: canonical JSON over named references, never positional variables.
 * @param {Tm} term
 * @returns {string}
 */
export function canonicalNamedRmn(term) {
  return canonicalBytes(namedOfCompiled(term, []));
}

/** Digest of the primary serialized term form.
 * @param {Tm} term
 * @returns {string}
 */
export function digestNamedRmn(term) {
  return digest(canonicalNamedRmn(term));
}

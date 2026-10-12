/**
 * notation — Relation Model Notation (RMN)'s JSON boundary codec and named-variable
 * surface syntax: the src-side counterpart to `core/language`'s pure de-Bruijn grammar.
 *
 * products and unit whose Church-Rosser/confluence property is Lean-certified.
 * The package admits only closed, well-typed core terms at this boundary, then
 * settles them with the package evaluator. That gives the codec a concrete
 * decidable admission gate for executable JSON content. It is deliberately not
 * an arbitrary JavaScript execution boundary, and this package does not currently
 * claim a formal Lean strong-normalization proof for the evaluator's whole
 * domain extension.
 *
 * This is the gauge behind "an HTML document may carry a program and stay
 * decidable": admit `<script type="application/rmn+json">` only when the script
 * body is a closed, well-typed RMN term, and reject every other script type. The
 * document then carries its data, its markup, and its morphism — everything but
 * the interpreter itself.
 *
 * `src/core/language/ast/index.mts`'s `Tm` addresses variables by de-Bruijn index
 * (`["var", 0]`); hand-writing anything beyond trivial nesting means manually
 * counting binder depth. `compileNamedRmn`/`parseNamedRmn` below admit a named
 * surface instead — `["lam", "x", body]`, `["var", "x"]` — and compile it down
 * to the same closed kernel before it reaches `isRelationalTerm`. `lam` is the
 * kernel's only binder (`fold`'s combining function is itself a curried
 * `lam`/`lam` term, not a binder site of its own).
 *
 * Resolving a name is not an invented symbol-table lookup: each open binder is
 * admitted as a `{subject: binderId, predicate: name}` incidence cell, and the
 * candidate set of binders sharing a name is a real `extentOfIntentTerm`
 * evaluation (`core/language/stdlib/connecting/formal-concept.mts`) — the derivation
 * closure `Obsmetrologia/Calculus/Logic/FCALambekCircle.lean`'s edge (1) proves
 * is the same extensive/monotone/idempotent shape as this package's own
 * settling closure (`fca_closure_laws`; "computing formal concepts is
 * computing closures"). Ordinary lexical shadowing (innermost binder wins)
 * then picks among however many candidates FCA returns — the closure gives
 * the candidate set, nesting order picks the winner, exactly as far as the
 * mathematics goes and no further.
 */

import { evaluate, evaluateRunTerm } from "../eval/index.mts";
import { canonicalBytes, digest } from "../../identity/index.mts";
import { inferTy, isClosed } from "../check/index.mts";
import { type Tm, type ChargeValueName, type GeneratorName, tm } from "../ast/index.mts";
import { chargeValueNames } from "../../values/index.mts";
import { parse as parseJson, type JsonValue } from "../../codecs/json/core.mts";

import { extentOfIntentTerm } from "../stdlib/connecting/formal-concept.mts";
import { arrayTag, objectTag } from "./projecting/index.mts";

/** The IANA-style media type for an RMN body. */
export const RMN_JSON = "application/rmn+json; charset=utf-8";

/** Whether a value is a closed, well-typed RMN term. Plain JSON data (objects,
 *  non-tag arrays) is rejected: it is `data`, not a morphism. */
export function isRelationalTerm(value: unknown): value is Tm {
  try {
    return isClosed(value as Tm) && inferTy([], value as Tm) !== null;
  } catch {
    return false;
  }
}

/** Parse and type-check RMN source into a term; throws unless it is a closed,
 *  well-typed RMN program. */
export function parseRmn(source: string): Tm {
  const value = parseJson(source);
  if (!isRelationalTerm(value)) throw new TypeError("rmn: not a well-typed closed term");
  return value as unknown as Tm;
}

/** Settle an admitted RMN term with the package evaluator. The evaluator uses
 *  complete development and a fuel bound, so failure to settle is reported as
 *  an ordinary exception instead of escaping into host-language execution. */
export function settleRmn(term: Tm): Tm {
  return evaluate(term);
}

const RMN_SCRIPT = /<script\b[^>]*\btype\s*=\s*["']application\/rmn\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const ANY_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function safeParse(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return undefined;
  }
}

/** Extract the source bodies of every `<script type="application/rmn+json">` block. */
export function extractRelationalScripts(html: string): string[] {
  return [...html.matchAll(RMN_SCRIPT)].map((match) => (match[1] ?? "").trim());
}

/** Whether EVERY script in the document is RMN and each body is a closed,
 *  well-typed term. A single non-RMN script (JavaScript, etc.) fails the gate; a
 *  document with no scripts is trivially relational (static). */
export function htmlIsRelational(html: string): boolean {
  for (const match of html.matchAll(ANY_SCRIPT)) {
    const attrs = match[1] ?? "";
    const typeMatch = /\btype\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const type = (typeMatch?.[1] ?? "").trim().toLowerCase();
    if (type !== "application/rmn+json") return false;
    if (!isRelationalTerm(safeParse((match[2] ?? "").trim()))) return false;
  }
  return true;
}

/** Parse, type-check, and settle every RMN script in an HTML document. Throws if
 *  any script is not admitted by the RMN gate. */
export function settleRelationalHtml(html: string): Tm[] {
  if (!htmlIsRelational(html)) throw new TypeError("html: contains a non-relational (Turing) script");
  return extractRelationalScripts(html).map((source) => settleRmn(parseRmn(source)));
}

/** Whether every message exchanged in a session is an admitted RMN term. This
 *  makes an open session locally settle message-by-message even when the session
 *  itself remains open. A single non-RMN message fails the gate. Messages are the
 *  parsed values carried on the wire. */
export function sessionIsRelational(messages: readonly unknown[]): boolean {
  return messages.every(isRelationalTerm);
}

/** Settle every message of a relational session; throws if any message is not an
 *  admitted RMN term. */
export function settleRelationalSession(messages: readonly unknown[]): Tm[] {
  if (!sessionIsRelational(messages)) {
    throw new TypeError("session: contains a non-relational (Turing) message");
  }
  return messages.filter(isRelationalTerm).map(settleRmn);
}

// ── named-variable surface syntax ─────────────────────────────────────────────

const CHARGE_VALUE_NAMES: readonly ChargeValueName[] = chargeValueNames;
const GENERATOR_NAMES: readonly GeneratorName[] = Object.freeze([
  "specialization", "converse", "subjectProjection", "objectProjection",
]);

/** Named-surface mirror of `Tm`: `var`/`lam` carry a name instead of an index.
 *  `embed` splices an already-compiled *closed* term in verbatim — closed terms
 *  have no free variables, so they need no reindexing regardless of surrounding
 *  scope depth. It exists to reuse an independently-built term (e.g. a shared
 *  `natIsZeroTerm`), not to build records: `evaluators/projecting`'s
 *  `objectTerm`/`arrayTerm`/`stringTerm` are themselves pure sugar over
 *  `pair`/`mark`/`star` — every one already a `NamedTm` constructor — so
 *  `namedObject`/`namedArray`/`namedString` below build the same encoding
 *  directly, over *open* (still-bound) sub-terms, with no embedding at all.
 *
 *  `bool` and `generator` are deliberately NOT tags here, unlike `charge`.
 *  `tm.bool`/`tm.generator` (`src/core/language/ast/index.mts`) are both `tm.mark`
 *  verbatim — `cond`'s reduction rule (`evaluators/index.mts`) dispatches
 *  by calling `boolOfTerm` on its test, which recognizes only a
 *  charge-encoded mark, so a boolean has no wire identity independent of
 *  `charge` to begin with: giving it its own union tag/compiler case here
 *  would assert a distinction the kernel doesn't have. `namedBool`/
 *  `namedGenerator` below build the same `charge`/`mark` shapes directly,
 *  as plain sugar, the same way `namedString` does — not as their own
 *  compiled forms. */
export type NamedTm =
  | readonly ["var", string]
  | readonly ["lam", string, NamedTm]
  | readonly ["app", NamedTm, NamedTm]
  | readonly ["pair", NamedTm, NamedTm]
  | readonly ["fst", NamedTm]
  | readonly ["snd", NamedTm]
  | readonly ["star"]
  | readonly ["mark", string]
  | readonly ["charge", string]
  | readonly ["negate" | "conflate" | "negConf", NamedTm]
  | readonly ["joinK" | "meetK" | "joinT" | "meetT" | "leK" | "leT" | "settle", NamedTm, NamedTm]
  | readonly ["field", string, NamedTm]
  | readonly ["consArray", NamedTm, NamedTm]
  | readonly ["reverseArray", NamedTm]
  | readonly ["coincide", NamedTm, NamedTm]
  | readonly ["cond" | "fold", NamedTm, NamedTm, NamedTm]
  | readonly ["embed", Tm];

/** A `pair`/`star`-terminated cons spine, matching `projecting`'s `listTerm`. */
function namedList(items: readonly NamedTm[]): NamedTm {
  return items.reduceRight<NamedTm>((tail, item) => ["pair", item, tail], ["star"]);
}

/** A string literal exactly as `evaluators/projecting`'s bridge encodes one — a
 *  canonical-JSON-quoted `mark` — matching `stringTerm`. */
export function namedString(value: string): NamedTm {
  return ["mark", canonicalBytes(value)];
}

/** An array literal over *open* sub-terms, matching `arrayTerm`'s
 *  encoding exactly (a `mark`-tagged spine) — no `embed` needed, since the
 *  encoding is pure `pair`/`mark`/`star`. */
export function namedArray(items: readonly NamedTm[]): NamedTm {
  return ["pair", ["mark", canonicalBytes(arrayTag)], namedList(items)];
}

/** An object literal over *open* sub-terms (keys sorted, matching
 *  `objectTerm`'s deterministic encoding) — again pure `pair`/`mark`/`star`. */
export function namedObject(entries: ReadonlyArray<readonly [string, NamedTm]>): NamedTm {
  const sorted = [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return ["pair", ["mark", canonicalBytes(objectTag)], namedList(sorted.map(([key, value]) => ["pair", ["mark", canonicalBytes(key)], value]))];
}

/** A boolean literal: sugar over the truth-axis `charge` shape, matching
 *  `tm.bool` exactly (`held` = true, `denied` = false) — not its own
 *  compiled form, since none exists at the kernel level. */
export function namedBool(value: boolean): NamedTm {
  return ["charge", value ? "held" : "denied"];
}

/** One of the four relational generator marks, matching `tm.generator` — a
 *  bare validated mark, not its own compiled form (`tm.generator` is
 *  `tm.mark` verbatim). */
export function namedGenerator(name: string): NamedTm {
  return ["mark", requireOneOf(name, GENERATOR_NAMES, "GeneratorName")];
}

/** One open binder: its position in `scope` doubles as its FCA subject id. */
interface OpenBinder {
  readonly id: number;
  readonly name: string;
}

/** Resolve `name` to a de-Bruijn index against `scope` (outermost-first). The
 *  candidate set of binders bearing `name` is a real `extentOfIntentTerm`
 *  evaluation over `{subject: binderId, predicate: name}` cells; the innermost
 *  (highest id) candidate wins, ordinary lexical shadowing. */
function resolveByFca(scope: readonly OpenBinder[], name: string): number {
  if (scope.length === 0) throw new TypeError(`compileNamedRmn: unbound variable "${name}"`);
  const cells = scope.map((binder) => ({ subject: binder.id, predicate: binder.name }));
  const matches = evaluateRunTerm(extentOfIntentTerm, { cells, intent: [name] }) as number[];
  if (matches.length === 0) throw new TypeError(`compileNamedRmn: unbound variable "${name}"`);
  const innermostId = Math.max(...matches);
  const position = scope.findIndex((binder) => binder.id === innermostId);
  return scope.length - 1 - position;
}

function requireOneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new TypeError(`compileNamedRmn: not a ${label}: ${JSON.stringify(value)}`);
  return value as T;
}

function compileNamed(surface: NamedTm, scope: readonly OpenBinder[]): Tm {
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

/** Compile a named-surface term to the closed de-Bruijn kernel. */
export function compileNamedRmn(surface: NamedTm): Tm {
  return compileNamed(surface, []);
}

/** Parse named-surface RMN source text and compile it to a closed, well-typed
 *  de-Bruijn term; throws unless the result is admitted by `isRelationalTerm`. */
export function parseNamedRmn(source: string): Tm {
  const surface = parseJson(source) as unknown as NamedTm;
  const term = compileNamedRmn(surface);
  if (!isRelationalTerm(term)) throw new TypeError("rmn-named: compiled term is not closed and well-typed");
  return term;
}

function namedOfCompiled(term: Tm, scope: readonly string[]): NamedTm {
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
    case "mark": return CHARGE_VALUE_NAMES.includes(term[1] as ChargeValueName)
      ? ["charge", term[1]]
      : ["mark", term[1]];
    case "coincide": return ["coincide", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope)];
    case "cond": return ["cond", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope), namedOfCompiled(term[3], scope)];
    case "fold": return ["fold", namedOfCompiled(term[1], scope), namedOfCompiled(term[2], scope), namedOfCompiled(term[3], scope)];
  }
}

/** The primary serialized term form: canonical JSON over named references, never positional variables. */
export function canonicalNamedRmn(term: Tm): string {
  return canonicalBytes(namedOfCompiled(term, []) as unknown as JsonValue);
}

/** Digest of the primary serialized term form. */
export function digestNamedRmn(term: Tm): string {
  return digest(canonicalNamedRmn(term));
}

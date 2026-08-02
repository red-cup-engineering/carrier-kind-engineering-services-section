/**
 * notation — Relation Model Notation (RMN)'s admission gate: the closed,
 * well-typed-term decidability boundary, and its extension to HTML documents
 * and message-stream sessions.
 *
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
 * NOTE (scoping, not yet acted on): `extractRelationalScripts`/`htmlIsRelational`/
 * `settleRelationalHtml` and `sessionIsRelational`/`settleRelationalSession` are
 * application-boundary logic (how a web document or a session admits RMN
 * content), not notation — per the operator's "an RMN services section needs
 * codecs and an evaluator, nothing else," these arguably don't belong in this
 * section at all. Flagged, not moved: no established home for them was found
 * yet. `isRelationalTerm`/`parseRmn`/`settleRmn` (the bare admission gate) stay
 * here regardless, composing typing + the reducer.
 *
 * The named-variable surface syntax (`compileNamedRmn`/`parseNamedRmn`/
 * `namedString`/`namedArray`/`namedObject`/`namedBool`/`namedGenerator`/
 * `namedOfCompiled`/`canonicalNamedRmn`/`digestNamedRmn`) has moved to its own
 * package, `@red-cup-engineering/relation-model-notation-named-codec`, under
 * `relation-model-notation-codecs-services-section` — it is a codec (named
 * surface ↔ de-Bruijn `Tm`), this package is the admission gate; they were
 * bundled together before this split, which is exactly the "several functions,
 * several packages" scoping error being corrected.
 *
 * Transcribed from metroplat's `src/lib/language/reader/index.mts`, behavior
 * preserved exactly (TypeScript type annotations dropped; JSDoc typedefs
 * substituted). `evaluate` now comes from
 * `@red-cup-engineering/relation-model-notation-eval` in place of the relative
 * `../eval/index.mts`; `inferTy`/`isClosed` now come from
 * `@red-cup-engineering/relation-model-notation-typing` in place of the
 * relative `../check/index.mts`.
 *
 * `parse` (from `codecs/json/core.mts`) is DELIBERATELY still imported directly
 * from metroplat's legacy tree by relative path, not from any published
 * package — the same deliberate, noted dependency the json-codec package's own
 * port already carries on `identity`/`codecs/json`/`values` (general infra, not
 * part of the language split — this does not block deleting metroplat's
 * `lib/language` later).
 */
import { evaluate } from "@red-cup-engineering/relation-model-notation-eval";
import { inferTy, isClosed } from "@red-cup-engineering/relation-model-notation-typing";
import { parse as parseJson } from "../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/codecs/json/core.mts";

/**
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 * @typedef {import("../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/src/lib/codecs/json/core.mts").JsonValue} JsonValue
 */

/** The IANA-style media type for an RMN body. */
export const RMN_JSON = "application/rmn+json; charset=utf-8";

/** Whether a value is a closed, well-typed RMN term. Plain JSON data (objects,
 *  non-tag arrays) is rejected: it is `data`, not a morphism.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRelationalTerm(value) {
  try {
    return isClosed(value) && inferTy([], value) !== null;
  } catch {
    return false;
  }
}

/** Parse and type-check RMN source into a term; throws unless it is a closed,
 *  well-typed RMN program.
 * @param {string} source
 * @returns {Tm}
 */
export function parseRmn(source) {
  const value = parseJson(source);
  if (!isRelationalTerm(value)) throw new TypeError("rmn: not a well-typed closed term");
  return value;
}

/** Settle an admitted RMN term with the package evaluator. The evaluator uses
 *  complete development and a fuel bound, so failure to settle is reported as
 *  an ordinary exception instead of escaping into host-language execution.
 * @param {Tm} term
 * @returns {Tm}
 */
export function settleRmn(term) {
  return evaluate(term);
}

const RMN_SCRIPT = /<script\b[^>]*\btype\s*=\s*["']application\/rmn\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const ANY_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function safeParse(source) {
  try {
    return JSON.parse(source);
  } catch {
    return undefined;
  }
}

/** Extract the source bodies of every `<script type="application/rmn+json">` block.
 * @param {string} html
 * @returns {string[]}
 */
export function extractRelationalScripts(html) {
  return [...html.matchAll(RMN_SCRIPT)].map((match) => (match[1] ?? "").trim());
}

/** Whether EVERY script in the document is RMN and each body is a closed,
 *  well-typed term. A single non-RMN script (JavaScript, etc.) fails the gate; a
 *  document with no scripts is trivially relational (static).
 * @param {string} html
 * @returns {boolean}
 */
export function htmlIsRelational(html) {
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
 *  any script is not admitted by the RMN gate.
 * @param {string} html
 * @returns {Tm[]}
 */
export function settleRelationalHtml(html) {
  if (!htmlIsRelational(html)) throw new TypeError("html: contains a non-relational (Turing) script");
  return extractRelationalScripts(html).map((source) => settleRmn(parseRmn(source)));
}

/** Whether every message exchanged in a session is an admitted RMN term. This
 *  makes an open session locally settle message-by-message even when the session
 *  itself remains open. A single non-RMN message fails the gate. Messages are the
 *  parsed values carried on the wire.
 * @param {readonly unknown[]} messages
 * @returns {boolean}
 */
export function sessionIsRelational(messages) {
  return messages.every(isRelationalTerm);
}

/** Settle every message of a relational session; throws if any message is not an
 *  admitted RMN term.
 * @param {readonly unknown[]} messages
 * @returns {Tm[]}
 */
export function settleRelationalSession(messages) {
  if (!sessionIsRelational(messages)) {
    throw new TypeError("session: contains a non-relational (Turing) message");
  }
  return messages.filter(isRelationalTerm).map(settleRmn);
}

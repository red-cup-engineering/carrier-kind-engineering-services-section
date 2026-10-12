// json.mjs — JSON ↔ Horsetail bridge, per the arrays-are-programs idiom.
//
// readJson: JSON value → Form (for evaluation as code).
//   Arrays map to cells, so ["assert", "sky", "blue"] evals as (assert sky blue).
//   Strings become Sym when they contain no delimiter chars; Str otherwise.
//   true/false → t/f; null → ⊥; numbers → Num; objects → (object (k v)…).
//
// valueFromJson: JSON value → Value (data import, not code).
//   Numbers/strings → potential; arrays → seq; booleans → t/f; null → ⊥;
//   objects → seq of [key, value] pairs.
//
// valueToJson: Value → JSON-serializable value (data export).
//   ⊥ → null; t → true; f → false; ⊤ → {"__top":true};
//   scalar potential → raw value; seq → array; else → null.

import { sym, str, num, cell, pointLit } from "./types.mjs";

import {
  T, F, BOT, TOP,
  potential, seqOf, seqFrom,
  isTop, isBottom, isAffirmed, isDenied, valueOf,
} from "./value.mjs";

// ── helpers ───────────────────────────────────────────────────────────────────

// Horsetail delimiter characters — a string containing any of these cannot be
// read back as a bare symbol, so it must be quoted as a Str literal.
const SYM_UNSAFE = /[\s()"';`,]/;

function canBeSym(s) {
  return s.length > 0 && !SYM_UNSAFE.test(s);
}

// ── readJson ──────────────────────────────────────────────────────────────────

/** Convert a JSON value to a Horsetail Form suitable for evaluation as code.
 *
 * This is the arrays-are-programs idiom: a JSON array whose first element is a
 * string becomes a call cell, so
 *   `["assert", "sky", "blue"]`  evaluates as  `(assert sky blue)`.
 *
 * Conversions:
 *   null / undefined → ⊥
 *   true             → t
 *   false            → f
 *   number           → Num literal
 *   string           → Sym (if no delimiter chars) or Str
 *   array            → HCell  ([] is empty → ⊥)
 *   object           → (object (key val) …) cell
 */
export function readJson(json) {
  if (json === null || json === undefined) return pointLit(BOT);
  if (json === true)  return pointLit(T);
  if (json === false) return pointLit(F);
  if (typeof json === "number") return num(json);
  if (typeof json === "string") return canBeSym(json) ? sym(json) : str(json);
  if (Array.isArray(json)) {
    if (json.length === 0) return pointLit(BOT);
    return cell((json).map(readJson));
  }
  if (typeof json === "object") {
    const entries = Object.entries(json);
    return cell([
      sym("object"),
      ...entries.map(([k, v]) => cell([sym(k), readJson(v)])),
    ]);
  }
  return pointLit(BOT);
}

// ── valueFromJson ────────────────────────────────────────────────────────────

/** Convert a JSON value to a Value carrying it as data (not as code).
 *
 * Use this when you want to bring JSON into the KB or pass it to a function,
 * not evaluate it as a program.
 *
 *   null / undefined → ⊥
 *   true             → t
 *   false            → f
 *   number           → potential(n)
 *   string           → potential(s)
 *   array            → seq value
 *   object           → seq of [key, value] pair seqs
 */
export function valueFromJson(json) {
  if (json === null || json === undefined) return BOT;
  if (json === true)  return T;
  if (json === false) return F;
  if (typeof json === "number") return potential(json);
  if (typeof json === "string") return potential(json);
  if (Array.isArray(json)) return seqOf((json).map(valueFromJson));
  if (typeof json === "object") {
    const pairs = Object.entries(json).map(
      ([k, v]) => seqOf([potential(k), valueFromJson(v)]),
    );
    return seqOf(pairs);
  }
  return BOT;
}

// ── valueToJson ──────────────────────────────────────────────────────────────

/** Convert a Value to a JSON-serializable value.
 *
 * This is a lossy projection — evidence structure and contradiction details are
 * collapsed. For lossless round-trips, keep the Value itself.
 *
 *   ⊥                          → null
 *   ⊤                          → { "__top": true }
 *   potential(n/s/b)            → the raw scalar
 *   seq value                  → array (elements recursively converted)
 *   t (affirmed, no payload)    → true
 *   f (denied, no payload)      → false
 *   other                       → null
 */
export function valueToJson(c) {
  if (isBottom(c)) return null;
  if (isTop(c))    return { __top: true };
  const v = valueOf(c);
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  const seq = seqFrom(c);
  if (seq !== null) return seq.map(valueToJson);
  if (isAffirmed(c) && !isDenied(c)) return true;
  if (isDenied(c) && !isAffirmed(c)) return false;
  return null;
}

// ── TOP re-export (used by valueToJson sentinel) ────────────────────────────
export { TOP };

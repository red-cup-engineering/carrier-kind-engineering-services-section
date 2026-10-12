// pattern.mjs — reading-valued pattern matching over Values.
// A match returns { value: reading, bindings }.
//   potential — the pattern matched
//   active    — the pattern did not match
//   absurd    — undetermined (rare in a settled evaluator)
//   stable    — subject is held both ways and matched (branch on the contradiction)
// A ⊤-match fires the clause body combined with TOP — the contradiction is held, not discarded.
//
// Patterns:
//   _               wildcard — matches anything, binds nothing
//   ?x              binder — matches anything, binds x to the subject value
//   t f ⊥ ⊤         point-literal — matches iff subject's value bits equal it (⊤ vs ⊤ → top-match)
//   42  "s"         scalar literal — matches iff subject's value datum equals it
//   (or p…)         alternation — first potential/stable wins; absurd preferred over active
//   (and p…)        conjunction — all must match; result value is the match meet of arms
//   (? guard pat)   guarded — match pat AND guard has a positive mark (stable guard → stable-match)
//   (p1 p2 … . ?r)  sequence destructure; `. ?r` binds the remaining tail

import { isAffirmed, isTop, readingOf, seqOf, seqFrom, valueOf } from "./value.mjs";
import { truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const EMPTY_MAP = new Map();

const FAIL = { value: "active", bindings: EMPTY_MAP };
const OK = { value: "potential", bindings: EMPTY_MAP };

function mergeBindings(
  a,
  b,
) {
  const m = new Map(a);
  for (const [k, v] of b) m.set(k, v);
  return m;
}

// Match meet: a conjunction of arms is the truth meet of their readings (Belnap). A failed arm
// fails the whole; an undetermined arm beside a contradiction is false, as FOUR has it.
const meetMatchValue = truthMeetReading;

/** Match `pattern` against `subject`, returning a reading result and any captured bindings. */
export function matchForm(pattern, subject, evaluate) {
  switch (pattern.kind) {
    // _ wildcard: always matches
    case "sym":
      if (pattern.name === "_") return OK;
      // ?x binder: always matches, captures subject
      if (pattern.name.startsWith("?")) {
        return { value: "potential", bindings: new Map([[pattern.name.slice(1), subject]]) };
      }
      // Bare symbol: compare as a string literal
      return valueOf(subject) === pattern.name
        ? { value: readingOf(subject) === "stable" ? "stable" : "potential", bindings: EMPTY_MAP }
        : FAIL;

    // Value literals: compare value bits; stable vs stable → stable-match
    case "point-lit": {
      const subjectValue = readingOf(subject);
      const patternValue = readingOf(pattern.value);
      if (patternValue === subjectValue) return { value: subjectValue === "stable" ? "stable" : "potential", bindings: EMPTY_MAP };
      return FAIL;
    }

    // Number literal: match evidence payload
    case "num":
      return valueOf(subject) === pattern.value
        ? { value: readingOf(subject) === "stable" ? "stable" : "potential", bindings: EMPTY_MAP }
        : FAIL;

    // String literal: match evidence payload
    case "str":
      return valueOf(subject) === pattern.value
        ? { value: readingOf(subject) === "stable" ? "stable" : "potential", bindings: EMPTY_MAP }
        : FAIL;

    // Cell patterns: (or …), (and …), (? guard pat), sequence destructure
    case "cell": {
      const { items } = pattern;
      const head = items[0];

      // (or p1 p2 ...) — first potential/stable wins; absurd preferred over active
      if (head?.kind === "sym" && head.name === "or") {
        let best = FAIL;
        for (const p of items.slice(1)) {
          const r = matchForm(p, subject, evaluate);
          if (r.value === "potential" || r.value === "stable") return r;
          if (r.value === "absurd" && best.value === "active") best = r;
        }
        return best;
      }

      // (and p1 p2 ...) — all must match; bindings union; result is the match meet of arms
      if (head?.kind === "sym" && head.name === "and") {
        let bindings = new Map();
        let value = "potential";
        for (const p of items.slice(1)) {
          const r = matchForm(p, subject, evaluate);
          bindings = mergeBindings(bindings, r.bindings);
          value = meetMatchValue(value, r.value);
        }
        return { value, bindings };
      }

      // (? guard pattern) — match inner pat, then check guard
      if (head?.kind === "sym" && head.name === "?") {
        const [, guardForm, patForm] = items;
        if (!guardForm || !patForm) return FAIL;
        const inner = matchForm(patForm, subject, evaluate);
        if (inner.value === "active") return inner;
        const g = evaluate(guardForm, inner.bindings);
        if (isTop(g)) return { value: "stable", bindings: inner.bindings };
        if (!isAffirmed(g)) return FAIL;
        return inner;
      }

      // (p1 p2 … [. ?rest]) — sequence destructure with optional dotted-tail
      const seq = seqFrom(subject);
      if (seq === null) return FAIL;

      // Scan for a dotted-tail marker
      const dotIdx = items.findIndex(it => it.kind === "sym" && it.name === ".");
      const fixedPats = dotIdx >= 0 ? items.slice(0, dotIdx) : items;
      const restPat = dotIdx >= 0 ? items[dotIdx + 1] : undefined;

      if (dotIdx < 0 && seq.length !== items.length) return FAIL;
      if (dotIdx >= 0 && seq.length < fixedPats.length) return FAIL;

      let bindings = new Map();
      let value = "potential";
      for (let i = 0; i < fixedPats.length; i++) {
        const item = fixedPats[i];
        const elem = seq[i];
        if (!item || !elem) return FAIL;
        const r = matchForm(item, elem, evaluate);
        if (r.value === "active") return FAIL;
        bindings = mergeBindings(bindings, r.bindings);
        value = meetMatchValue(value, r.value);
      }
      if (restPat !== undefined) {
        const tail = seqOf(seq.slice(fixedPats.length));
        if (restPat.kind === "sym" && restPat.name.startsWith("?")) {
          bindings = mergeBindings(bindings, new Map([[restPat.name.slice(1), tail]]));
        }
      }
      return { value, bindings };
    }
  }
}

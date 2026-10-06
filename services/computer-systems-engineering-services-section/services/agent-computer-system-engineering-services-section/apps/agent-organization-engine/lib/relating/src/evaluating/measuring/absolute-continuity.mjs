/**
 * evaluators/measuring/absolute-continuity — support containment of two reading
 * distributions, as a composed SEN term.
 *
 * Mirrors `core/closure/analysis/evidence.mts`'s `absoluteContinuity` exactly:
 * a reading value escapes `to` if `from` has a nonzero count for it but `to`
 * has zero. Every `ReadingDistribution` always carries exactly the four
 * reading bins (built by `readingFamilies.knowledge.map(...)` on the TypeScript side), in a
 * fixed, known set — so this needs no generic zip over two independently
 * shaped lists, only four concrete lookups, one per reading name. Built
 * entirely from the existing kernel (`fold`/`coincide`/`cond`/`pair`/`fst`/
 * `snd`) plus `natIsZeroTerm`/`countTerm`, themselves already composed the
 * same way — no new `Tm` case, per AGENTS.md's closed-kernel rule.
 *
 * `field`/`consArray`/`reverseArray`/`reading` are compiled-`Tm`-only sugar
 * on `@red-cup-engineering/relation-model-notation`'s `tm` object — they
 * expand to real forms (`fold`/`pair`/`fst`/`snd`/`four`) the moment they
 * are called, so none of them is itself a named-surface tag `compileNamedSen`
 * recognizes. `namedField`/`namedConsArray`/`namedReverseArray`/`namedReading`
 * below spell out those same expansions with named binders in place of
 * `tm.var(0)`/`tm.var(1)`, so they compose inside an open surface tree.
 *
 * Authored entirely as named-surface `NamedTm` fragments, composed by ordinary
 * TypeScript functions/reduce, and compiled ONCE at the bottom via
 * `compileNamedSen` — real binder names throughout, no hand-counted de Bruijn
 * depth. Record/array construction uses `namedObject`/`namedArray`/
 * `namedString` (`codecs/text/json/sen.mts`), which are the same `pair`/
 * `mark`/`star` encoding as `objectTerm`/`arrayTerm`/`stringTerm` — there is no
 * separate "helper layer" that named-surface can't reach. `embed` splices in
 * `natIsZeroTerm`/`countTerm` (independently-built, independently-tested
 * terms reused here) and each closed `namedReading` FOUR value.
 */
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { countTerm, natIsZeroTerm } from "../counting/index.mjs";
import { compileNamedSen, namedBool } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/named-codec";
import { namedArray, namedObject, namedString } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/named-codec";
import { readingAs, readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const CHARGE_NAMES = readingFamilies.knowledge;

/**
 * Splice an already-compiled, closed {@link Tm} into a named SEN surface
 * tree via `compileNamedSen`'s `"embed"` form.
 *
 * `@red-cup-engineering/relation-model-notation/named-codec`'s published
 * `NamedTm` type is structurally `readonly [string, ...NamedPart[]]`, and
 * `NamedPart` has no case for a raw `Tm` (a compiled node such as
 * `["var", 1]` sits outside it). `compile()` interprets `"embed"`'s second
 * slot as a `Tm`, not a `NamedTm`, at runtime (it type-checks with
 * `isClosed`/`validateSenTerm`, not against `NamedPart`) — this is the one
 * typed boundary where that runtime contract crosses the published type,
 * so the cast is scoped to exactly this form rather than widening
 * `NamedPart` itself.
 *
 * @param term - a closed, already-compiled term to splice in unevaluated
 * @returns the `["embed", term]` surface node
 */
function embedTerm(term) {
  return ["embed", term];
}

/**
 * Named-surface equivalent of `tm.field(key, object)` — SEN's named grammar
 * has no `"field"` form; `field` is compiled-`Tm`-only sugar over `fold`
 * (an assoc-list search: `coincide` compares each entry's key mark, `cond`
 * picks its value, a missing key folds to `mark("null")`). This mirrors
 * that fold exactly, with real binder names in place of `field`'s de Bruijn
 * `var(0)`/`var(1)`, so it composes inside an open (uncompiled) surface tree.
 */
function namedField(key, object) {
  return ["fold",
    ["lam", "acc", ["lam", "entry",
      ["cond",
        ["coincide", ["fst", ["var", "entry"]], ["mark", JSON.stringify(key)]],
        ["snd", ["var", "entry"]],
        ["var", "acc"],
      ],
    ]],
    ["mark", JSON.stringify(null)],
    object,
  ];
}

/**
 * Named-surface equivalent of `tm.consArray(elem, array)` — likewise
 * compiled-`Tm`-only sugar (`pair(fst(array), pair(elem, snd(array)))`),
 * spelled out here so it can prepend onto an open array fragment.
 */
function namedConsArray(elem, array) {
  return ["pair", ["fst", array], ["pair", elem, ["snd", array]]];
}

/**
 * Named-surface equivalent of `tm.reverseArray(array)` — the fold-based
 * cons-reversal `tm.reverseArray` performs on already-compiled terms,
 * expressed with a named binder pair instead of `var(0)`/`var(1)`.
 */
function namedReverseArray(array) {
  return ["pair",
    ["fst", array],
    ["fold",
      ["lam", "acc", ["lam", "elem", ["pair", ["var", "elem"], ["var", "acc"]]]],
      ["star"],
      array,
    ],
  ];
}

/**
 * A closed FOUR reading value spliced into the surface tree via `embed` —
 * there is no `"reading"` named-surface form either; `tm.reading` compiles a
 * reading name straight to its distinguished mark, and that result carries no
 * free variables, so it is always safe to embed.
 *
 * `name` is one of `readingFamilies.knowledge` (this module's own, data-engine vocabulary);
 * `tm.reading` is `@red-cup-engineering/relation-model-notation`'s constructor and
 * only accepts ITS vocabulary, so this crosses the boundary with
 * `notationNameOfReadingValueName` before calling it.
 */
function namedReading(name) {
  return embedTerm(tm.reading(readingAs("extremal", name)));
}

/** A bin's reading-value name: `bin.value.name`. */
function binReadingNameOf(bin) {
  return namedField("name", namedField("value", bin));
}

/**
 * Find the bin matching `name` in `bins` by fold — every distribution always
 * has all four, so the "not found" sentinel (`star`) is unreachable on real
 * input, never a silent wrong answer.
 */
function findBinByName(bins, name) {
  return ["fold",
    ["lam", "acc", ["lam", "bin",
      ["cond",
        ["coincide", binReadingNameOf(["var", "bin"]), name],
        ["var", "bin"],
        ["var", "acc"],
      ],
    ]],
    ["star"],
    bins,
  ];
}

function binCountOf(bin) {
  return namedField("count", bin);
}

/** `!natIsZero(fromCount) && natIsZero(toCount)` via `cond`, no `and`/`not` primitive needed. */
function escapesForName(fromBins, toBins, name) {
  const fromCount = binCountOf(findBinByName(fromBins, name));
  const toCount = binCountOf(findBinByName(toBins, name));
  return ["cond",
    ["app", embedTerm(natIsZeroTerm), fromCount],
    namedBool(false),
    ["app", embedTerm(natIsZeroTerm), toCount],
  ];
}

/** The escaping reading-value names, accumulated by unrolling the fixed four —
 *  FOUR is the base object here, not a synthetic loop bound. A reading-value
 *  name is `namedReading(name)` (the reading's distinguished mark). */
function escapingNames(fromBins, toBins) {
  return namedReverseArray(CHARGE_NAMES.reduce(
    (acc, name) => ["cond", escapesForName(fromBins, toBins, namedReading(name)), namedConsArray(namedReading(name), acc), acc],
    namedArray([]),
  ));
}

/** `isEmpty(list) = natIsZero(count(list))`, reusing the existing composed `countTerm`. */
function isEmptyList(list) {
  return ["app", embedTerm(natIsZeroTerm), ["app", embedTerm(countTerm), list]];
}

/** `absoluteContinuityTerm`: `λfrom.λto.` the support-containment judgment,
 *  exactly matching `AbsoluteContinuityJudgment`'s two shapes. */
export const absoluteContinuityTerm = compileNamedSen(["lam", "from", ["lam", "to", (() => {
  const from = ["var", "from"];
  const to = ["var", "to"];
  const fromBins = namedField("bins", from);
  const toBins = namedField("bins", to);
  const escaping = escapingNames(fromBins, toBins);
  return ["cond",
    isEmptyList(escaping),
    namedObject([
      ["kind", namedString("meme-analysis.evidence.absoluteContinuity:witness")],
      ["from", from],
      ["to", to],
    ]),
    namedObject([
      ["escaping", escaping],
      ["from", from],
      ["kind", namedString("meme-analysis.evidence.absoluteContinuity-obstruction")],
      ["to", to],
    ]),
  ];
})()]]);

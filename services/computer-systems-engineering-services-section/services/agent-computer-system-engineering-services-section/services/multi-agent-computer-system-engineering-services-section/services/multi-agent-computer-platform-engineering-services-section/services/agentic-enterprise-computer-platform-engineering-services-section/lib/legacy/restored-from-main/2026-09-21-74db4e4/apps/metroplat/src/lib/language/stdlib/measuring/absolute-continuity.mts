/**
 * evaluators/measuring/absolute-continuity — support containment of two charge
 * distributions, as a composed RMN term.
 *
 * Mirrors `core/closure/analysis/evidence.mts`'s `absoluteContinuity` exactly:
 * a charge value escapes `to` if `from` has a nonzero count for it but `to`
 * has zero. Every `ChargeDistribution` always carries exactly the four
 * charge bins (built by `chargeValues.map(...)` on the TypeScript side), in a
 * fixed, known set — so this needs no generic zip over two independently
 * shaped lists, only four concrete lookups, one per charge name. Built
 * entirely from the existing kernel (`fold`/`coincide`/`cond`/`pair`/`fst`/
 * `snd`) plus `natIsZeroTerm`/`countTerm`, themselves already composed the
 * same way — no new `Tm` case, per AGENTS.md's closed-kernel rule.
 *
 * `field`/`consArray`/`reverseArray`/`charge` are compiled-`Tm`-only sugar
 * on `@red-cup-engineering/relation-model-notation`'s `tm` object — they
 * expand to real forms (`fold`/`pair`/`fst`/`snd`/`four`) the moment they
 * are called, so none of them is itself a named-surface tag `compileNamedRmn`
 * recognizes. `namedField`/`namedConsArray`/`namedReverseArray`/`namedCharge`
 * below spell out those same expansions with named binders in place of
 * `tm.var(0)`/`tm.var(1)`, so they compose inside an open surface tree.
 *
 * Authored entirely as named-surface `NamedTm` fragments, composed by ordinary
 * TypeScript functions/reduce, and compiled ONCE at the bottom via
 * `compileNamedRmn` — real binder names throughout, no hand-counted de Bruijn
 * depth. Record/array construction uses `namedObject`/`namedArray`/
 * `namedString` (`codecs/text/json/rmn.mts`), which are the same `pair`/
 * `mark`/`star` encoding as `objectTerm`/`arrayTerm`/`stringTerm` — there is no
 * separate "helper layer" that named-surface can't reach. `embed` splices in
 * `natIsZeroTerm`/`countTerm` (independently-built, independently-tested
 * terms reused here) and each closed `namedCharge` FOUR value.
 */
import { tm, type Tm } from "../../ast/index.mts";
import { chargeValueNames, type ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { countTerm, natIsZeroTerm } from "../counting/index.mts";
import { compileNamedRmn, namedBool, type NamedTm } from "@red-cup-engineering/relation-model-notation/named-codec";
import { namedArray, namedObject, namedString } from "../../reader/index.mts";

const CHARGE_NAMES = chargeValueNames;

/**
 * Splice an already-compiled, closed {@link Tm} into a named RMN surface
 * tree via `compileNamedRmn`'s `"embed"` form.
 *
 * `@red-cup-engineering/relation-model-notation/named-codec`'s published
 * `NamedTm` type is structurally `readonly [string, ...NamedPart[]]`, and
 * `NamedPart` has no case for a raw `Tm` (a compiled node such as
 * `["var", 1]` sits outside it). `compile()` interprets `"embed"`'s second
 * slot as a `Tm`, not a `NamedTm`, at runtime (it type-checks with
 * `isClosed`/`validateRmnTerm`, not against `NamedPart`) — this is the one
 * typed boundary where that runtime contract crosses the published type,
 * so the cast is scoped to exactly this form rather than widening
 * `NamedPart` itself.
 *
 * @param term - a closed, already-compiled term to splice in unevaluated
 * @returns the `["embed", term]` surface node
 */
function embedTerm(term: Tm): NamedTm {
  return ["embed", term as unknown as NamedTm];
}

/**
 * Named-surface equivalent of `tm.field(key, object)` — RMN's named grammar
 * has no `"field"` form; `field` is compiled-`Tm`-only sugar over `fold`
 * (an assoc-list search: `coincide` compares each entry's key mark, `cond`
 * picks its value, a missing key folds to `mark("null")`). This mirrors
 * that fold exactly, with real binder names in place of `field`'s de Bruijn
 * `var(0)`/`var(1)`, so it composes inside an open (uncompiled) surface tree.
 */
function namedField(key: string, object: NamedTm): NamedTm {
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
function namedConsArray(elem: NamedTm, array: NamedTm): NamedTm {
  return ["pair", ["fst", array], ["pair", elem, ["snd", array]]];
}

/**
 * Named-surface equivalent of `tm.reverseArray(array)` — the fold-based
 * cons-reversal `tm.reverseArray` performs on already-compiled terms,
 * expressed with a named binder pair instead of `var(0)`/`var(1)`.
 */
function namedReverseArray(array: NamedTm): NamedTm {
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
 * A closed FOUR charge value spliced into the surface tree via `embed` —
 * there is no `"charge"` named-surface form either; `tm.charge` compiles a
 * charge name straight to `["four", truthBit, falsityBit]`, and that result
 * carries no free variables, so it is always safe to embed.
 */
function namedCharge(name: ChargeValueName): NamedTm {
  return embedTerm(tm.charge(name));
}

/** A bin's charge-value name: `bin.value.name`. */
function binChargeNameOf(bin: NamedTm): NamedTm {
  return namedField("name", namedField("value", bin));
}

/**
 * Find the bin matching `name` in `bins` by fold — every distribution always
 * has all four, so the "not found" sentinel (`star`) is unreachable on real
 * input, never a silent wrong answer.
 */
function findBinByName(bins: NamedTm, name: NamedTm): NamedTm {
  return ["fold",
    ["lam", "acc", ["lam", "bin",
      ["cond",
        ["coincide", binChargeNameOf(["var", "bin"]), name],
        ["var", "bin"],
        ["var", "acc"],
      ],
    ]],
    ["star"],
    bins,
  ];
}

function binCountOf(bin: NamedTm): NamedTm {
  return namedField("count", bin);
}

/** `!natIsZero(fromCount) && natIsZero(toCount)` via `cond`, no `and`/`not` primitive needed. */
function escapesForName(fromBins: NamedTm, toBins: NamedTm, name: NamedTm): NamedTm {
  const fromCount = binCountOf(findBinByName(fromBins, name));
  const toCount = binCountOf(findBinByName(toBins, name));
  return ["cond",
    ["app", embedTerm(natIsZeroTerm), fromCount],
    namedBool(false),
    ["app", embedTerm(natIsZeroTerm), toCount],
  ];
}

/** The escaping charge-value names, accumulated by unrolling the fixed four —
 *  FOUR is the base object here, not a synthetic loop bound. A charge-value
 *  name is `namedCharge(name)` (a `["four", ...]` FOUR value), not a plain
 *  mark — `jsonToTerm` encodes any of the four names as a `charge` literal
 *  (`evaluators/projecting`'s `isChargeValueName` check), which is what a
 *  real bin's `value.name` field settles to on the wire; comparing against
 *  a plain mark never matched. */
function escapingNames(fromBins: NamedTm, toBins: NamedTm): NamedTm {
  return namedReverseArray(CHARGE_NAMES.reduce<NamedTm>(
    (acc, name) => ["cond", escapesForName(fromBins, toBins, namedCharge(name)), namedConsArray(namedCharge(name), acc), acc],
    namedArray([]),
  ));
}

/** `isEmpty(list) = natIsZero(count(list))`, reusing the existing composed `countTerm`. */
function isEmptyList(list: NamedTm): NamedTm {
  return ["app", embedTerm(natIsZeroTerm), ["app", embedTerm(countTerm), list]];
}

/** `absoluteContinuityTerm`: `λfrom.λto.` the support-containment judgment,
 *  exactly matching `AbsoluteContinuityJudgment`'s two shapes. */
export const absoluteContinuityTerm: Tm = compileNamedRmn(["lam", "from", ["lam", "to", (() => {
  const from: NamedTm = ["var", "from"];
  const to: NamedTm = ["var", "to"];
  const fromBins: NamedTm = namedField("bins", from);
  const toBins: NamedTm = namedField("bins", to);
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

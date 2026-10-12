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
 * entirely from the existing kernel (`fold`/`field`/`coincide`/`cond`/
 * `consArray`/`reverseArray`) plus `natIsZeroTerm`/`countTerm`, themselves
 * already composed the same way — no new `Tm` case, per AGENTS.md's
 * closed-kernel rule.
 *
 * Authored entirely as named-surface `NamedTm` fragments, composed by ordinary
 * TypeScript functions/reduce, and compiled ONCE at the bottom via
 * `compileNamedRmn` — real binder names throughout, no hand-counted de Bruijn
 * depth. Record/array construction uses `namedObject`/`namedArray`/
 * `namedString` (`codecs/text/json/rmn.mts`), which are the same `pair`/
 * `mark`/`star` encoding as `objectTerm`/`arrayTerm`/`stringTerm` — there is no
 * separate "helper layer" that named-surface can't reach. `embed` is used only
 * for `natIsZeroTerm`/`countTerm` — independently-built, independently-tested
 * terms reused here, not fresh structure.
 */
import { type Tm } from "../../ast/index.mts";
import { chargeValueNames } from "../../../values/index.mts";
import { countTerm, natIsZeroTerm } from "../counting/index.mts";
import { compileNamedRmn, namedArray, namedBool, namedObject, namedString, type NamedTm } from "../../reader/index.mts";

const CHARGE_NAMES = chargeValueNames;

/** A bin's charge-value name: `bin.value.name`. */
function binChargeNameOf(bin: NamedTm): NamedTm {
  return ["field", "name", ["field", "value", bin]];
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
  return ["field", "count", bin];
}

/** `!natIsZero(fromCount) && natIsZero(toCount)` via `cond`, no `and`/`not` primitive needed. */
function escapesForName(fromBins: NamedTm, toBins: NamedTm, name: NamedTm): NamedTm {
  const fromCount = binCountOf(findBinByName(fromBins, name));
  const toCount = binCountOf(findBinByName(toBins, name));
  return ["cond",
    ["app", ["embed", natIsZeroTerm], fromCount],
    namedBool(false),
    ["app", ["embed", natIsZeroTerm], toCount],
  ];
}

/** The escaping charge-value names, accumulated by unrolling the fixed four —
 *  FOUR is the base object here, not a synthetic loop bound. A charge-value
 *  name is `["charge", name]`, not a plain mark — `jsonToTerm` encodes any
 *  of the four names as a `charge` literal (`evaluators/projecting`'s
 *  `isChargeValueName` check), which is what a real bin's `value.name` field
 *  settles to on the wire; comparing against a plain mark never matched. */
function escapingNames(fromBins: NamedTm, toBins: NamedTm): NamedTm {
  return ["reverseArray", CHARGE_NAMES.reduce<NamedTm>(
    (acc, name) => ["cond", escapesForName(fromBins, toBins, ["charge", name]), ["consArray", ["charge", name], acc], acc],
    namedArray([]),
  )];
}

/** `isEmpty(list) = natIsZero(count(list))`, reusing the existing composed `countTerm`. */
function isEmptyList(list: NamedTm): NamedTm {
  return ["app", ["embed", natIsZeroTerm], ["app", ["embed", countTerm], list]];
}

/** `absoluteContinuityTerm`: `λfrom.λto.` the support-containment judgment,
 *  exactly matching `AbsoluteContinuityJudgment`'s two shapes. */
export const absoluteContinuityTerm: Tm = compileNamedRmn(["lam", "from", ["lam", "to", (() => {
  const from: NamedTm = ["var", "from"];
  const to: NamedTm = ["var", "to"];
  const fromBins: NamedTm = ["field", "bins", from];
  const toBins: NamedTm = ["field", "bins", to];
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

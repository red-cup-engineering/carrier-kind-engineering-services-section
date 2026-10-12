import Lean
import Obsmetrologia
open Lean Elab Command

/-!
Lean declaration inventory.

Prints every non-internal `Obsmetrologia.*` declaration name Lean itself
would treat as a real, citable declaration: theorems, defs (abbrevs are
`@[reducible] def`s, so they fall out of this for free), structures and
inductive types, and named instances -- one per line, sorted.

A house name qualifies when all of:

* it starts with `Obsmetrologia.`;
* `Lean.Meta.allowCompletion` accepts it -- this is Lean's own predicate for
  "a tactic like `exact?` may suggest this name", and already excludes
  auxiliary recursors, `noConfusion`/`noConfusionType`, matcher functions,
  and anything with an internal (`_`-led) name component;
* its `ConstantInfo` is `.thmInfo`, `.defnInfo`, or `.inductInfo` -- this
  drops constructors (`.mk`, `.utter`, ...) and recursors (`.rec`), which
  `allowCompletion` alone does not filter, and which the six requested
  categories (theorems, defs, structures, inductives, abbrevs, instances)
  do not name;
* its last name component is not one of the auto-generated lemma shapes
  `allowCompletion` misses: constructor-injectivity `inj`/`injEq`, the
  `sizeOf`/equation-lemma families `sizeOf_spec`, `sizeOf_eq_<n>`,
  `eq_def`, `eq_unfold`, `eq_<n>`, and the `match_<n>`/`proof_<n>`
  well-founded-recursion helpers.

Instances (`instance foo : ...` or the anonymous form Lean names itself via
`mkInstanceName`, always prefixed `inst`) are ordinary `.defnInfo`/`.thmInfo`
constants and so are already covered above; nothing extra is done for them.
"With real names" in the brief means exactly this: an instance survives
here because its name is a real, `allowCompletion`-visible identifier, not
some further hand-picked notion of which instances "count".

This performs no build (the caller runs it via `lake env lean` against the
already-built package, same as the other whole-library census programs
beside it) and does no I/O beyond `IO.println`.
-/

def isHouse (n : Name) : Bool := n.toString.startsWith "Obsmetrologia."

/-- The last (rightmost) string component of a name, or `""` for a
non-`.str` leaf (e.g. a `.num` component, which none of the auto-lemma
shapes below use). -/
def lastComponent : Name → String
  | .str _ s => s
  | _ => ""

/-- Whether every character of `s` is a digit or underscore, and `s` is
non-empty -- the shape of the numeric suffix `eq_<n>`, `match_<n>`, etc.
leave after their fixed prefix is stripped. -/
def isDigitsOrUnderscores (s : String) : Bool :=
  s.toList.length > 0 && s.toList.all (fun c => c.isDigit || c == '_')

/-- Whether a name's last component is one of the auto-generated
equation/injectivity/sizeOf lemma shapes that `Lean.Meta.allowCompletion`
does not blacklist. -/
def isAutoLemmaSuffix (s : String) : Bool :=
  s == "inj" || s == "injEq" || s == "sizeOf_spec" || s == "eq_def" || s == "eq_unfold"
  || (s.startsWith "eq_" && isDigitsOrUnderscores (s.drop 3 |>.toString))
  || (s.startsWith "sizeOf_eq_" && isDigitsOrUnderscores (s.drop 10 |>.toString))
  || (s.startsWith "match_" && isDigitsOrUnderscores (s.drop 6 |>.toString))
  || (s.startsWith "proof_" && isDigitsOrUnderscores (s.drop 6 |>.toString))

/-- Whether a `ConstantInfo`'s shape is one of the requested categories:
theorem, def (abbrevs included -- they are `@[reducible] def`), or an
inductive type (structures included -- `structure` is `inductive` with one
constructor). Constructors and recursors are excluded here, not by
`isAutoLemmaSuffix`. -/
def isListedKind : ConstantInfo → Bool
  | .thmInfo _ => true
  | .defnInfo _ => true
  | .inductInfo _ => true
  | _ => false

#eval show CommandElabM Unit from do
  let env ← getEnv
  let mut names : Array String := #[]
  for (n, ci) in env.constants.toList do
    if isHouse n && isListedKind ci && Lean.Meta.allowCompletion env n
        && !isAutoLemmaSuffix (lastComponent n) then
      names := names.push n.toString
  for nm in names.qsort (· < ·) do IO.println nm

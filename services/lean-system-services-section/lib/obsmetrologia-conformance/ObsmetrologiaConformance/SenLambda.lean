import Obsmetrologia.Language.Predicating.NormalOrder
import ObsmetrologiaConformance.Row

/-!
# SenLambda — golden vectors for SEN's λ fragment

SEN's core terms (`var`, `lam`, `app`, `pair`, `fst`, `snd`, `star`, de Bruijn, index `0`
innermost, unannotated `lam`) are exactly Obsmetrologia's `CurryHowardLambek.Tm`, the calculus
`church_rosser` is proved for. Every row is computed by its definitions:

* `Tm.reducts` — every one-step reduct, the root contraction first, then each subterm's from
  left to right, each term once (`mem_reducts_iff`: the list is `step`, sound and complete);
* `dev` — Takahashi's complete development;
* `Tm.normalize` — normal-order reduction under fuel. A row is given only where a normal form
  is found within the fuel, and its result is that normal form. By `normalize_unique` it is the
  term's only normal form;
* `Tm.inst` — β-substitution `t[u]`;
* `Tm.lift` — the shift of every free variable by `k`.

A term is written as SEN writes it: `["var", n]`, `["lam", t]`, `["app", t, u]`,
`["pair", t, u]`, `["fst", t]`, `["snd", t]`, `["star"]`. The terms are every term of size up to
four over the atoms `var 0`, `var 1` and `star`, every term of size five with a redex, every
tenth term of size six with a redex, and the classic combinators.
-/

namespace ObsmetrologiaConformance.SenLambda

open Obsmetrologia.Predicating.CurryHowardLambek
open Obsmetrologia.Predicating.CurryHowardLambek.Tm

/-- A term as SEN's JSON. -/
def term : Tm → Json
  | .var n => .arr [.str "var", .nat n]
  | .lam t => .arr [.str "lam", term t]
  | .app t u => .arr [.str "app", term t, term u]
  | .pair t u => .arr [.str "pair", term t, term u]
  | .fst t => .arr [.str "fst", term t]
  | .snd t => .arr [.str "snd", term t]
  | .star => .arr [.str "star"]

/-! ## Terms -/

/-- The atoms: two variables and the unit. -/
def atoms : List Tm := [.var 0, .var 1, .star]

/-- Add the terms one size larger to a table of terms by size. -/
def grow (table : List (List Tm)) : List (List Tm) :=
  let n := table.length + 1
  let ofSize (k : Nat) : List Tm := (table.drop (k - 1)).headD []
  let unary := (ofSize (n - 1)).flatMap fun t => [.lam t, .fst t, .snd t]
  let binary := (List.range (n - 2)).flatMap fun i =>
    (ofSize (i + 1)).flatMap fun a => (ofSize (n - 2 - i)).flatMap fun b => [.app a b, .pair a b]
  table ++ [if n = 1 then atoms else unary ++ binary]

/-- Every term, by size, up to size `n`. -/
def bySize (n : Nat) : List (List Tm) := (List.range n).foldl (fun t _ => grow t) []

/-- Every `k`-th element. -/
def everyNth (k : Nat) (l : List Tm) : List Tm :=
  (l.zip (List.range l.length)).filterMap fun (t, i) => if i % k = 0 then some t else none

/-- Church numerals, `λf.λx. fⁿ x`. -/
def church (n : Nat) : Tm := .lam (.lam ((List.range n).foldl (fun t _ => .app (.var 1) t) (.var 0)))

/-- `I`, `K`, `S`. -/
def idT : Tm := .lam (.var 0)
def kT : Tm := .lam (.lam (.var 1))
def sT : Tm := .lam (.lam (.lam (.app (.app (.var 2) (.var 0)) (.app (.var 1) (.var 0)))))

/-- The classic terms: combinators, numerals, projections of pairs, redexes under binders and
over free variables. -/
def classics : List Tm :=
  [ .app (.app (.app sT kT) kT) (.var 3),
    .app (.app kT (.var 2)) (.var 5),
    .app (.app (church 2) (church 2)) (.var 7),
    .app (.app (.app (church 3) idT) idT) .star,
    .fst (.pair (.app idT (.var 4)) (.app idT (.var 5))),
    .snd (.pair (.fst (.pair .star (.var 0))) (.snd (.pair (.var 1) (.app idT .star)))),
    .lam (.app (.lam (.lam (.app (.var 1) (.var 2)))) (.var 0)),
    .app (.lam (.lam (.app (.var 1) (.var 0)))) (.lam (.var 2)),
    .app (.lam (.pair (.var 0) (.lam (.var 1)))) (.app idT (.var 9)),
    .app idT (.app idT (.app idT .star)),
    .app (.lam (.app (.var 0) (.var 0))) idT,
    .lam (.lam (.app (.app kT (.var 1)) (.app idT (.var 0)))) ]

/-- The terms whose reducts, development and normal form are given. -/
def terms : List Tm :=
  let table := bySize 6
  let redexes (k : Nat) := ((table.drop (k - 1)).headD []).filter fun t => !(reducts t).isEmpty
  (table.take 4).flatMap id ++ redexes 5 ++ everyNth 10 (redexes 6) ++ classics

/-- The bodies and arguments substitution is read on. -/
def bodies : List Tm :=
  [ .var 0, .var 1, .var 2, .star, .lam (.var 0), .lam (.var 1), .lam (.var 2),
    .lam (.lam (.app (.var 2) (.var 1))), .pair (.var 0) (.lam (.app (.var 1) (.var 0))),
    .app (.var 0) (.lam (.var 0)), .fst (.lam (.lam (.pair (.var 2) (.var 3)))) ]

def arguments : List Tm := [.star, .var 0, .var 1, .lam (.var 1), .app (.var 2) (.lam (.var 0))]

/-! ## Rows -/

/-- The fuel normalization is read under. -/
def fuel : Nat := 64

/-- The golden vectors of SEN's λ fragment. -/
def rows : List Row :=
  (terms.map fun t => row ``Tm.reducts [term t] (.arr ((reducts t).map term)))
  ++ (terms.map fun t => row ``Obsmetrologia.Predicating.CurryHowardLambek.dev [term t] (term (dev t)))
  ++ (terms.filterMap fun t => (normalize fuel t).map fun u => row ``Tm.normalize [.nat fuel, term t] (term u))
  ++ (bodies.flatMap fun t => arguments.map fun u => row ``Tm.inst [term t, term u] (term (inst t u)))
  ++ ([1, 2].flatMap fun k => bodies.map fun t => row ``Tm.lift [.nat k, term t] (term (lift k t)))

end ObsmetrologiaConformance.SenLambda

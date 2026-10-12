---
title: The Two Horsetail Lineages
description: The recovered .mjs Horsetail is a Fennel; the abandoned TypeScript one on GitHub is the Scheme it was always meant to be, and it is neither smaller nor broken — it is 55 special forms, 127 passing tests, and a clean typecheck once run against its own contemporary substrate.
date-created: 2026-08-27
type: note
name: the-two-horsetail-lineages
keywords:
  - horsetail
  - lisp-dialect
  - total-typed-lisp
  - software-archaeology
  - memetic-processing-unit
---


**Occasion:** recovering Horsetail from git history, then discovering a second, later Horsetail
on GitHub and having to decide which one is the language.

---

## 1. Two lineages

| | **A — recovered from history** | **B — `emsenn/horsetail` on GitHub** |
|---|---|---|
| Form | JavaScript `.mjs` | TypeScript |
| Substrate | bilattice / Chu, now `@red-cup-engineering/metrologic` | `@561-group/memetic-processing-unit` |
| Dates | 2026-06-05 to 06-06 | 2026-06-07 to 06-08 |
| Special forms | 47 | **55** |
| Tests | 62/62 + 70/70 | **127/127** |
| Typecheck | n/a | **clean** |

B is later. `31a9e94b0bb` archived `computer/` on 06-06 "ahead of repopulating from the new
layout"; B's initial commit is 06-07. **B is that repopulation.**

## 2. The algebra is the same; only the packaging and vocabulary differ

B's charge module re-exports `present, isTop, isBottom, negate, conflate, joinKnowledge,
meetKnowledge, joinTruth, meetTruth, leqKnowledge, aggregate` from the MPU, over
`{ value: [boolean, boolean], evidence: [unknown[], unknown[]] }`. That is, to the field,
metrologic's own bilattice charge. The MPU is the same four-valued floor under different names —
where metrologic wears Belnap's (`t / f / ⊥ / ⊤`), the MPU wears `potential / active / absurd /
stable`.

So "Align Horsetail with MemeCharge" was a rename, not a re-founding. There is no theory fork here.

## 3. A is a Fennel. B is the Scheme the founding commit promised.

```text
form        A    B          form            A    B
fn          ✓    ✓          begin           ✗    ✓
lambda      ✗    ✓          when / unless   ✗    ✓
define      ✓    ✓          case            ✗    ✓
def         ✗    ✓          -> ->> -?>      ✓    ✗
let*        ✗    ✓
```

A has no `lambda`, no `begin`, no `let*`, no `when`/`unless`, and carries Clojure threading macros.
Its second test file is explicitly *"Horsetail's MEET-OR-BEAT-Fennel proof suite."*

But the founding commit `fc667672d50` says what Horsetail was supposed to be: *"the computer's
**C/Scheme-equivalent**, named in Fennel's plant genus."* The intent was Scheme; the name was Fennel;
the implementation followed the name. B corrects it — and keeps `fn` and `def` as aliases, so it
reads A's surface too.

This matters because the stated destination is Guile, and **Guile is Scheme**. Porting a Fennel to
Guile means fighting the host at every form. Porting B is close to transliteration.

## 4. B is a superset minus two

```text
A only:  as  federate
B only:  begin case def lambda let* unless when meme-charge negate write-charge
```

B has the whole OS surface — `at`, `must`, `should`, `may`, `relate`, `relate-from`, `module`,
`require`, `try`, `raise`, `k-and`, `k-or`, `affirmed?`, `denied?`, `held?`, `pending?`, `gensym`,
`macroexpand-all`, `let-values` — plus a `json` codec A has no equivalent for.

It is missing exactly the two forms that bind to OS tiles: `as` needs `principal`, `federate` needs
`distribution`. Both were mid-migration when work stopped. **Both now exist**: `principal` is
recovered and green, and `@561-group/computer` 0.0.4 ships `distribution/federate` with tests.

### A caution recorded against myself

An earlier reading of this called B "half the language, missing the entire OS surface." That was an
artifact of reading lines 111–340 of a `SPECIAL` table that runs to line 625 — 40% of the table,
reported as the whole. Sampling a range and calling it an inventory is how you lose a language.
Count the whole table.

Worse, that bad count was then used to argue that A's larger surface made it better. For a language
whose discipline is totality, a *smaller* surface is the design working, not a deficiency. The
argument would have been wrong even had the count been right.

## 5. B was never broken. It was being run against a substrate seven days newer than itself.

B does not build against the memetic packages at their HEAD (2026-06-15): `world.mpu.claimsFor is
not a function`. On 06-09, the day after B stopped, the MPU committed *"refactor mpu processing
vocabulary"* and later moved from source-exports to `dist` builds under a renamed `@emsenn/*` scope.

Checked out at their own date, everything agrees. Five of the six repositories carry the *identical*
commit message on the same day — one cross-repo save, and the moment the work stopped:

```text
horsetail                 5b2838a   2026-06-08   Save workspace cleanup
memetic-processing-unit   1808763   2026-06-08   Save workspace cleanup
memetic-memory-unit       17031bf   2026-06-08   Save workspace cleanup
proof-pathing             dcb26c3   2026-06-08   Save workspace cleanup
memetics                  8e93a55   2026-06-08   Save workspace cleanup
meme                      ddd15ea   2026-06-07   Update package metadata
```

At that snapshot every package is `@561-group/*`-scoped, `noEmit`, and exports `./src/*.ts`
directly, consumed as TypeScript source through Node's type stripping for local development and
each package's own test run. That shape does not survive publishing: Node refuses to strip types
for `.ts` files resolved under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, no
override flag), so a `.ts` package with any real, non-type-only cross-package import breaks the
moment a sibling is pinned to a registry version instead of symlinked via `file:`. Each of the six
packages in this lineage carries a `tsc` build step (`tsconfig.build.json`, run through `npm run
build`/`prepack`) that emits `.js` + `.d.ts` to `dist/` for publishing, while `.ts` sources stay in
place for development and for each package's own tests; only `dist/` ships. The
`../../scripts/package-boundary/` helper that made B look unbuildable was solving a problem later
resolved by building for publish, not by declining to build at all.

Wired that way — 11,712 lines across six packages:

```text
node --test "src/**/*.test.ts"   ->  127 tests, 127 pass, 0 fail
tsc --noEmit                     ->  clean
```

## 6. What follows

B is the lineage, and as of the same day it is the only one: it holds `@561-group/horsetail`, tsander
runs on it, and A was deleted rather than renamed, because a renamed second implementation of one
language is still two.

A's non-language tiles — `principal`, `process-runtime`, `typed-filepath-addressing-system` — moved
to `@561-group/computer` 0.0.5, alongside `distribution`. They were never Horsetail; they were
recovered beside it because its evaluator imported them.

What B still needs is two special forms, `as` and `federate`, and both bind to tiles that now exist
in computer. A's implementations of both are readable at `b0b7906b875~1`, and its `federate` ran
against real federated worlds in tsander — so the port can be diffed against a recorded result
rather than guessed. Git history is where a superseded implementation belongs; it did not need a
directory.

Open, and not decided here: whether B's totality discipline is structural (tail calls, no
non-terminating fold) or only surface-level. B returns `⊥` for absent arguments rather than failing,
and its sole evaluator `throw` is the explicit `raise` form; A does likewise, its comment reading
*"Never a host throw — ⊤ is bindable."* That is evidence of the discipline, not proof of totality.

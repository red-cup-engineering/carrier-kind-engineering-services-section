---
title: Opal as a Lisp Machine
description: Measured assessment of hosting Opal on Guile and deploying it with Guix, finding that Guix cannot orchestrate the Node runtime, that Guile's sandbox is the right fit for Opal's declared extension model, and that Guile's classical evaluator is the wrong evaluator for an inconsistent knowledge corpus.
date-created: 2026-08-27
type: note
name: opal-as-a-lisp-machine
keywords:
  - guile-scheme
  - guix-deployment
  - paraconsistent-evaluation
  - capability-sandbox
  - horsetail
---


**Assessment date:** 2026-08-27
**Occasion:** The proposal that Opal become for Guile what Emacs is for Elisp — a Lisp
machine that is also our Guix, orchestrating Node, and also the knowledge vault.
**Method:** Every capability claim below was executed on `bare-cedar-fog`, not recalled.

---

## 1. The proposal decomposes into four separable claims

The appeal of the idea is that it fuses four things into one image. They are not one
thing, they have different evidence, and they fail and succeed independently:

1. **Guix as the deployment and reproducibility layer** for the Node package mesh.
2. **Guile as Opal's extension language**, filling roadmap Phase 4.
3. **The Lisp-machine property itself** — homoiconic, image-based, live redefinition.
4. **Horsetail**, the paraconsistent settling Lisp already written here and since lost.

Assessed separately, two of these are strong and two are not.

---

## 2. Guix cannot orchestrate this Node. Measured, not estimated.

The machine has a working Guix: a running `guix-daemon`, and `guix build --dry-run hello`
resolves to a store path. So the obstacle is not that Guix is absent or broken.

The obstacle is the version ceiling:

```text
guix package -A '^node'   ->  node 10.24.1
                              node 14.19.3      <- newest available
opal/package.json         ->  "engines": { "node": ">=24" }
node --version            ->  v24.19.0
```

Guix's newest Node is **ten major versions behind** what Opal requires and what this
machine runs. Closing that gap means packaging Node 24 against Guix's full-source
bootstrap discipline, which is precisely the package family Guix has historically found
hardest, because npm's own bootstrap is circular. This is not a weekend of work and it
is not work that pays us.

A second obstacle compounds it. Opal's dependencies are declared as `file:` links with
relative paths up to eleven levels deep into the service tree. Guix's `node-build-system`
has no good story for that shape.

A third, smaller, and fixable one: `guix describe` fails here —

```text
guix describe: error: failed to determine origin
hint: Perhaps this `guix' command was not obtained with `guix pull'?
```

This is Debian's packaged Guix from 2022, never `guix pull`-ed, so it carries no channel
provenance. Reproducibility claims made from this installation would be unfounded even
if the Node problem did not exist.

**Conclusion.** Guix-for-deploying-Opal is off the table for now. What remains genuinely
available today is narrower and worth taking: `guix pull` to establish real channel
provenance, and `guix shell` to pin the *non-Node* tooling the system actually leans on —
ripgrep above all, since the entire Bare Cedar Fog census is a ripgrep invocation.

---

## 3. Guile's sandbox is the right shape for Opal's declared extension model

Opal's architecture document already commits to an extension model, in these words:

> Opal will support extensions, but not ambient-authority scripts. An extension declares
> commands, views, codecs, settings, and required capabilities in a manifest. Filesystem,
> network, process, model, credential, and mutation authorities are individually granted
> and revocable.

That is a description of `(ice-9 sandbox)`. Tested here:

```text
(eval-in-sandbox '(+ 1 2))                     ->  3
(eval-in-sandbox '(open-input-file "/etc/passwd"))
                                               ->  REFUSED: unbound-variable
(eval-in-sandbox '(let loop () (loop)) ...)    ->  REFUSED: limit-exceeded
```

Filesystem access is not restricted, it is *absent* — the binding does not exist in the
environment unless it is handed in. Authority is passed, never ambient. Non-termination
is bounded by an explicit time limit, and allocation by an explicit allocation limit.

This matters because the alternative is worse than it looks. Node has no in-process
security boundary; its `vm` module is explicitly documented as not being one. Building
Opal's Phase 4 capability model on Node means either a separate process per extension or
a security claim we could not honour. Guile hands us the boundary already built.

**This is the strongest argument in the entire proposal, and it does not depend on Guix
at all.**

---

## 4. The deepest finding: Guile's evaluator is the wrong evaluator for this corpus

This is the point that should decide the design.

The repository README describes this environment as providing *paraconsistent
transfinitely-valued data-monitoring*. That is not decoration.

The contradictions are concrete and already documented. The existing Guix notes disagree
with each other about the full-source bootstrap: the 2026-04-05 survey states it was
achieved for x86-linux in 2023, while the 2026-04-01 research note records only a 25%
binary seed in 2020. Neither is a mistake to be corrected. They are two readings, honestly
held at different times, and the pair is more informative than either.

A classical evaluator can do exactly two things with that pair: pick one, or explode.
Guile is a classical evaluator. Both of its available answers are wrong.

Horsetail's answer is the right one, and it was already built. From its introducing
commit:

> evaluator = SETTLER (eval = settle) ... ⊤ is a BINDABLE held value (asserting both
> faces -> ⊤, no explosion) ... define is append-only (re-define -> recall ⊤, both
> witnesses survive)

Both witnesses survive. The contradiction is *held*, addressable, and queryable, rather
than resolved away or fatal. For a knowledge vault over a deliberately inconsistent
corpus, that is not an exotic preference — it is the correct semantics, and it is the
semantics this repository has already committed to everywhere else.

**So: Guile is the right substrate and the wrong language.**

---

## 5. The synthesis: Horsetail hosted on Guile, beside Node

Stated plainly, the design that survives all four assessments:

```text
Node          I/O, HTTP, the ripgrep census, TUFTE browser projection
                    |  JSON action / receipt / refusal over loopback
Guile         host runtime: sandbox, modules, hygienic macros, GC
                    |
Horsetail     the language: eval = settle, bilattice charges, held ⊤
```

Why this is the right shape rather than a compromise:

- **A reader and an evaluator are the canonical thing to write in Scheme.** Horsetail's
  reader, evaluator, and stdlib are 1,968 lines of JavaScript; in Scheme that layer should
  shrink, and its `defmacro` stops being a reimplementation because Guile's hygienic macros
  are underneath it. See the measured port cost below before reading that as a small job.
- **The sandbox comes free**, and it is the sandbox Phase 4 already specified.
- **It revives our own Lisp** rather than adopting someone else's semantics.
- **The Node boundary is a process boundary, not an FFI.** This is a feature, not a
  concession: Opal's architecture document already requires that "the kernel is
  independently hosted," and already speaks a JSON action/receipt protocol over loopback.
  A Guile sibling process speaking that same protocol adds no new architectural concept.
  There is no good in-process Guile↔Node bridge, and on this design we do not need one.

### The port cost, measured against the recovered code

Recovery is done and green, so this is now measured rather than guessed:

```text
horsetail reader + evaluator + stdlib        1,968 lines   (evaluator alone: 1,144)
  @561-group/math/chu                          421 lines   required
  @561-group/math/bilattice                    604 lines   required
  @561-group/computer eavt-substrate       ~part of 823    required
                                          ------------
a Guile port must carry roughly            3,000-4,000 lines
```

The Lisp layer is the smaller half. Horsetail's evaluator is not self-contained: it
imports `fold`, `settle`, `section`, `sectionSpace`, `relate`, `rowId` from the EAVT
substrate, and `chu`/`four`/`bilattice`/`descent` from the math package. **That substrate
is mathematics, not Lisp plumbing, and it will not shrink from being written in Scheme.**
Any estimate that counts only the 1,968 lines is wrong by roughly half.

### Honest costs

- Two runtimes to maintain and install.
- Horsetail's recovered tests are JavaScript; they would need porting, and porting
  tests is where semantics quietly change.
- Guile is a real learning curve, a cost the earlier notes already named honestly and
  which should not be re-litigated as though it were new.

### A correction: the substrate was renamed, not orphaned

An earlier draft of this note recorded `@561-group/math` as a package whose source had no
first-class home, tracked only inside a website's vendor directory, and called that a
fragility to fix. **That was wrong, and the error is worth keeping visible.**

The package was renamed at `d416a42175f` ("rename math core to metrologic", 2026-08-26).
It is now `@red-cup-engineering/metrologic`, it lives in the science tree at
`math-services-section/.../obsmetrological-services-section/apps/metrologic`, it is
git-tracked, and every live consumer already depends on it. The vendored copy under
`farstone.561.group` was a build artifact of the *old* name, not the package's home.

The real defect was narrower and in the recovered code: horsetail was recovered from a
commit predating the rename, so it reintroduced the dead name. Before the repoint it was
the only live package in the tree still importing `@561-group/math` — every other dependant
on that name sits under `lib/legacy/`. Now repointed and pinned to `0.1.0`, matching
`@561-group/computer`, so one shared copy resolves. Tests stayed green across the swap.

The general lesson survives the correction, and is sharper for it: **recovering code from
before a rename silently reintroduces dead names.** Archaeology has to check what its
dependencies are called *now*, not only whether they resolve.

---

## 6. Sequencing

1. ~~Do not let this block Opal.~~ **Done 2026-08-27.** Browse navigation now carries a
   vault root and single-child run collapsing; 15/15 green. Reaching a dated mineralogy
   note fell from 20 clicks to 10, with proof paths preserved verbatim.
2. ~~Recover Horsetail first and decide from the code.~~ **Done 2026-08-27, then superseded the
   same day.** The recovered JavaScript lineage was green at 62/62 + 70/70 + 17, but reading its
   code answered the question against itself: it is a Fennel, and a second, later TypeScript
   Scheme lineage exists with 55 special forms, 127 tests and a clean typecheck. That one now holds
   `@561-group/horsetail`; the recovered one was deleted. See
   [the note on the two lineages](./2026-08-27-note-on-the-two-horsetail-lineages.md). The port-cost
   figures in section 5 below were measured against the deleted lineage and are kept only as the
   record of that measurement.
3. **Un-stubbing `tsander` is not mechanical.** `tsander/tests/prove-horsetail.mjs` asserts
   the *stub's* contract (`r.four === "bot"`), so un-stubbing rewrites that test's
   semantics rather than swapping an import. `tsander/src/world.mjs` carries a second,
   separate descope to single-writer worlds for want of `distribution/federate`, which the
   recovery also restores. Both are real behavior changes and neither should be done
   incidentally.
4. **Guile enters at Opal Phase 4**, when extensions are built, and not before. The
   sandbox is the reason, and Phase 4 is the natural seam.
5. **Guix: `guix pull` for provenance, `guix shell` for non-Node tooling.** Do not attempt
   to package Node 24.
6. **The Lisp machine is real**, but it is Horsetail-on-Guile *beside* Node, not Guile
   replacing Node.

---

## 7. What would change this assessment

- Guix packaging a modern Node, or Opal's Node floor dropping to 14 — neither is likely.
- A maintained in-process Guile↔Node binding appearing, which would make the runtime
  split cheaper but is not required by the design above.
- ~~Recovery showing Horsetail's evaluator to be less complete than its commit message
  claims.~~ **Settled 2026-08-27.** Recovery succeeded and the evaluator is more complete
  than the commit message claimed: 62/62 and 70/70 green, `eval = settle` real and
  load-bearing (a Knaster-Tarski fixed point over an append-only trace), macro hygiene and
  four-valued comparison tested. The recovery also found and fixed a genuine latent bug —
  at the last pre-archive commit the substrate import pointed at a path that same commit
  had flattened, so horsetail's tests could not have run there. What changed instead is the
  *cost* estimate: the required bilattice/Chu substrate roughly doubles the port.

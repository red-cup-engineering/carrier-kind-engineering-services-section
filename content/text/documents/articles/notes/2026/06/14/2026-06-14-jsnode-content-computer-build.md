---
title: "jsnode-content-computer — build notes"
description: "Build notes for the jsnode-content-computer implementation, recording how it was built smarter than its original plan after deeper reading of the ecosystem — notably declining to port the content-farm cultivate loop as the plan specified."
keywords:
  - package
  - computing
  - organizing
  - structure
  - codec
  - action
---

# jsnode-content-computer — build notes (2026-06-14)

Implements `dev/planning/jsnode-content-computer.md`, built smarter than the original plan after deeper reading of the ecosystem.

## What changed from the plan

The plan said "port the content-farm `cultivate` loop."
We did **not**.
Cultivate is news-shaped (syndication intake, demand tables over a term space, story selection, SEO gates) and none of that maps to documenting code.
What we reused is the genuinely editorial core: the **minimal-reply + parse pattern** (`parseDraftReply` → `parseDocReply`), the **revise-with-findings loop**, and the **gate-as-value** discipline.
The rest is documentation-specific.

The build is **compositional / bottom-up**, matching the operator's framing ("document this class, then this function, then more context, then explainers, then readme"):

1. **Symbol reference** (built, live-proven) — per exported symbol, the model gets ONLY that symbol's surface (signature + JSDoc + sibling names) — careful context spacesuiting — and returns three small prose fields.
  Our code formats the markdown and the gates verify it.
2. **Package reference** — symbol entries composed in load-bearing order.
3. **Explanation / README** — composed from the symbol *summaries* (distilled), never raw code: the higher rungs never re-read the source.

## Architecture (who owns what)

- **`@emsenn/javascript-computer` → `extractDocSurface`** (new): reads source `.mts` (not dist — richer JSDoc, reads intent) and returns each exported symbol's verbatim signature + JSDoc description.
  Kept out of the pure `javascript-algebra` (its `JsFn`/`JsType` are identity-by-name carriers and must not grow doc text), exactly as `introspect` keeps the compiler in the computer.
- **`@561-group/content-topology` → `documentation` module** (new): the pure doc-production surface — `parseDocReply`, the gates (`judgeDoc`, `hallucinatedApiFindings`, `exampleFindings`), `symbolDocPrompt`, and the formatters.
  Sibling to `gates`/`copyedit`; no I/O.
- **`apps/jsnode-content-computer`** (new): the I/O shell — `readPackageSurface` (surface.mts), the `documentSymbol` cycle (cycle.mts), and the CLI.

## The keystone: no-hallucinated-API

The single gate that makes LLM autodoc trustworthy vs. the deterministic skeletons it supersedes.
Two vocabularies, deliberately separated (a bug found live and fixed): - **reference set** (may-name; over-admitting is safe) = exports + signature type names + JS/TS builtins.
Checked against bare-call `name(` and backticked PascalCase ``\`Type\``.
Method calls (leading `.
`) are excluded. - **value-export set** (shadowing is a real TDZ hazard) = runtime export bindings only (functions/classes/consts; never params or type names).
Used by `exampleFindings` to catch `const jsFn = jsFn(...)
`. - Example CODE is scanned with the reference set widened by the example's own `const/let/var/function/class` bindings, so `const r = f(); r(x)` is not a false positive.

## Finding: copyedit / language-editing `suggest` semantics

We initially ran `@561-group/content-topology/copyedit`'s `applyLintSuggestions` over the model's prose.
It **corrupted** text: `applyLintSuggestions` splices the lint `suggest` value literally, but language-editing's weasel rules put *authorial directives* there, not mechanical replacements:

- `weasel-various`: "various" → **"list them"**
- `weasel-numerous`: "numerous" → **"how many?"**
- `wordy-a-number-of`: "a number of" → "several" (this one IS a literal sub)

So some `suggest` values are mechanical replacements and some are questions to the writer; `Diagnostic` carries no flag distinguishing them.
Auto-splicing the directive class produces garbage like "used in list them scenarios."

We therefore consume lint the way content-farm actually does: **detection feeding revision** (prose-lint errors as a gate, suggestions folded into revision findings the *model* fixes), never auto-mutation.

**Recommended upstream enrichment** (not done here — `language-editing` is a submodule, separate repo): add a `mechanical: boolean` (or split `replacement` vs `hint`) to `Finding`/`Diagnostic` so `copyedit`'s `applyLintSuggestions` can safely apply only the literal-replacement class.
That fixes a latent corruption risk in the whole content farm, not just here.

## Status — done

- `extractDocSurface` (`@emsenn/javascript-computer`) + 6 tests.
- `content-topology/documentation` module + 13 tests (the pure parse/gates/ prompt/format, including the README-overview rung).
- `apps/jsnode-content-computer`: surface read, the `documentSymbol` / `documentPackage` / `documentReadme` cycle, deterministic `audit`, and the CLI (`document` / `reference` / `readme` / `audit`).
  11 tests.
- Live-proven against `javascript-algebra` (jsFn, composeAt, the 3-symbol reference) and self (the README dogfood: overview cleared every gate).

The compositional arc holds end to end: symbol → package reference → README, each rung spacesuiting the one below (the README overview composes from symbol *summaries*, never re-reading source).

### Bugs found via live runs (all fixed + regression-tested)

1. `applyLintSuggestions` corrupts prose (the copyedit/language-editing finding above) — removed from the cycle; lint is detection-feeding-revision now.
2. Two vocabularies conflated: param/type names leaked into the shadow check, so `const outer = …` (a param name) was wrongly flagged.
  Split into a may-reference set and a value-export set.
3. Example locals (`const r = f(); r(x)`) false-positived as hallucinated API — the example is now scanned widened by its own bindings.
4. One unformattable symbol aborted the whole package run — `documentPackage` now records it in `failed` and continues.

### Not done (deliberate)

- `jsnode-doc-computer` NOT deprecated/deleted — superseded; its audit + manifest skeletons still stand (plan makes deletion the last step).
- AGENTS.md generation and a standalone `explain` rung left for a later pass; the README rung already exercises summary→prose composition.
- "More context for harder code" currently feeds sibling *names* (and, at the README rung, sibling *summaries*).
  Feeding already-generated sibling *docs* as context for documenting a complex symbol — the full escalation the goal sketches — is a deliberate v2: the carriers (`SymbolDocResult`, `SymbolSummary`) already hold what that rung would compose from.

## Repo note

The old package-boundary hook was the wrong convention: every package carrying an `audit:boundary`/`lint:package` script coupled package verification to a repo-local helper instead of to the package's own check, lint, build, and test surface.
Boundary and conformance checks should be exposed as package-owned library operations or workspace analysis, then composed at the repo level; a package's `verify` script should stay an ordinary package gate.

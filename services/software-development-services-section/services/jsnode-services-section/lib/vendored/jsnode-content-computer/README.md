# @emsenn/jsnode-content-computer

LLM-written, gate-checked documentation for jsnode workspace packages.

Documentation is cultivated **bottom-up**: a package's introspected surface —
every exported symbol's signature and JSDoc, read by
[`@emsenn/javascript-computer`](../javascript-computer)'s `extractDocSurface` —
is the intake. For each symbol the model is asked for the *smallest* prose it
can give (a one-line summary, a short description, an optional example); **our
code does every bit of formatting** (the heading, the fenced signature, the
example framing) and **every bit of verification** (the gates). Symbol
references then compose upward into a package reference and a README.

The model supplies prose. It never produces structure, and it is never trusted
to be faithful — the gates enforce that.

## The keystone: no hallucinated API

The single gate that makes LLM autodoc trustworthy where a manifest skeleton is
merely accurate-but-empty. Every API-shaped reference in the model's output —
a bare call `name(...)`, a backticked `` `TypeName` `` — is checked against the
package's own exported surface (plus the types its signatures name, plus JS/TS
builtins). An invented function or type fails the gate and triggers a revision.
Examples are scanned too, widened by their own local bindings so `const r =
f(); r(x)` is not a false positive, and a separate check catches the TDZ
shadow `const jsFn = jsFn(...)` the smaller models reliably emit.

**Trust boundary.** The gate verifies that every named symbol *exists*; it does
not verify *usage* — a doc may still call a real symbol with a fabricated
argument shape. Generated docs are operator-review drafts (names verified,
semantics not), never publish-ready output. That is why every write is a draft
and `shipped` records only the gate verdict.

The pure documentation machinery — the parser, the gates, the prompt, the
formatters — lives in
[`@561-group/content-topology/documentation`](../../lib/content-topology); this
package is the I/O shell that reads surfaces, runs the model cycle, and writes
files.

## Usage

```sh
# one symbol → one reference entry (printed; --write projects it)
jsnode-content-computer document <pkg> --symbol <name> [--write]

# the whole package surface → one composed reference document
jsnode-content-computer reference <pkg> [--limit N] [--write]

# an LLM-written README (overview composed from the symbol summaries)
jsnode-content-computer readme <pkg> [--limit N] [--write]

# deterministic coverage audit — no model, no network
jsnode-content-computer audit <pkg> [--format text|json]
```

`<pkg>` is a directory, a directory basename, or a declared workspace package
name. Common flags: `--provider nim|groq`, `--model <id>`. The provider is
chosen from the keyed environment (`NVIDIA_API_KEY` for `nim`,
`GROQ_API_KEY` for `groq`); `nim` leads.

`--write` projects into `<pkg>/dev/docs/` and appends a run trace to
`<pkg>/dev/planning/runs.jsonl`. Nothing is scaffolded until there is real
content to write — empty `dev/docs` trees are noise.

A withheld doc (a gate it could not clear within two revisions) is still
reported, with the failing gate's evidence; publication is the operator's read.
Symbols beyond `--limit`, and symbols the model could never format, are reported
explicitly — never silently dropped.

## How it composes

1. **Symbol reference** — the model sees ONLY one symbol's surface (signature,
   JSDoc, sibling names): careful context spacesuiting. → `document`
2. **Package reference** — the symbol entries, in load-bearing order. →
   `reference`
3. **README** — its overview is composed from the symbol *summaries* (the
   distilled prose), never from source: the higher rung never re-reads the
   code. → `readme`

This README was hand-authored; running `jsnode-content-computer readme
jsnode-content-computer` regenerates an LLM-written one from the same surface.

## Build

```sh
pnpm --filter @emsenn/jsnode-content-computer run build
pnpm --filter @emsenn/jsnode-content-computer run test
```

# token-compactification-services-section

Deterministic transcript compaction under a derived budget. README.md carries the
doctrine and its evidence; this file carries the operative rules.

- **Extractive core stays deterministic.** No provider call, no key, no network in
  `src/token-compactification.mjs`, `src/erasure-nerve.mjs`, or the adapter. The
  abstractive tier is bought on the inference-work-lot-market through
  `src/inference-market-summarizer.mjs` — never author a direct provider call here,
  and never let a market refusal fall back to a locally invented summary.
- **Pinning is structural law, not a preference.** A change that lets a pinned span
  reach a lossy path is wrong even if every test still passes; add the test it
  should have failed.
- **The archive is the rigid phase.** Content-addressed, append-only in spirit:
  compaction output is a view plus a sidecar, and originals are never mutated.
  Don't add an in-place mode.
- **Don't overclaim the math.** The erasure receipt cites exactly what the
  Obsmetrologia Lean corpus proves (see README's stated limits). "Yield", energy
  scaling, and reordering claims are not licensed by the corpus; keep them out.
- **`npm run verify` (check + test) before calling a change done.** Dependencies
  resolve from the union private registry (`~/.npmrc` scopes).

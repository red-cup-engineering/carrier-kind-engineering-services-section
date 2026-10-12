# Agent Work Computer System Engineering Services Section

Shared semantic models and deterministic operations for agent work. It owns
the typed work-intent receiver, duty classification, and deterministic
discharge operations. Provider dispatch and ready-duty execution are separate
effect boundaries; this package does not own an inference runtime or executor.

## Exports

- `src/structured-work-intent.mjs` — canonical source-span structured-work
  intent model and admission assertions used by real roadmap producers.
- `src/founder-utterance-reading.mjs` and
  `apps/read-founder-utterances.mjs` — deterministic reading of retained
  Founder sources. An external provider may use its exported bounded demand
  and assay operations; it is not pulled into this package.
- `src/duty-discharge.mjs` — deterministic exact-dependency and data-custody
  repair, gate, and discharge operations for an executor that owns the rail
  effect.

## Boundary

An execution or inference runtime consumes these pure models and performs
its own authorized effects. It must not make this reusable semantic package
depend on runtime provider peer locks.

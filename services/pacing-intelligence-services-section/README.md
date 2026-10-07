# Pacing Intelligence Services Section

This engineering section owns the pure compute layer for infection-associated
chronic illness pacing (ME/CFS, long COVID, and related post-exertional
malaise conditions): rolling personal baselines, morning deviation scoring,
the Workwell resting-heart-rate heuristic, and conservative, evidence-labeled
PEM risk flags. Both a future practitioner-facing app and a paid agent API
call this same math — this package is the one place it is computed.

`src/pacing-intelligence.mjs` has no filesystem, network, clock, or random
access. Every input — including "now" and every biometric series — is
supplied by the caller. This discipline mirrors
`nutrition-practice-system-services-section`: no I/O, no clock, injected
everything.

## What this is not

No function here diagnoses, predicts, or confirms post-exertional malaise.
Outputs are descriptive statistics (medians, robust deviation scores) plus
clearly labeled heuristic flags, each carrying its own evidence status in
its JSDoc and in its return value. Read
`src/pacing-intelligence.mjs` for the literature basis and epistemic status
of each function before trusting or extending it; the fuller dossier is
`../../../../../../../../../science-services-section/services/natural-science-services-section/services/biological-science-services-section/services/medical-science-services-section/services/myalgic-encephalomyelitis-services-section/content/text/documents/articles/notes/2026/09/02/2026-09-02-note-on-biometric-guided-pacing-evidence.md`.

## Layout

- `src/pacing-intelligence.mjs` — the pure math: `rmssdFromRrIntervals`,
  `rollingBaseline`, `morningDeviation`, `heartRateThresholdEstimate`,
  `pemRiskFlags`, and the composing `analyzePacing`.
- `scripts/analyze-pacing.mjs` — file-in/JSON-out CLI wrapper around
  `analyzePacing`. The only I/O boundary in this package.
- `test/` — `node --test` suite with fixtures shaped like the
  personal-health-computer-systems general biometric-observation schema
  (`urn:red-cup-science:health:biometric-observation:1.0.0`), covering
  sparse data, missingness, and single-day baselines.

## Observation shape `analyzePacing` expects

Each element of the `observations` array passed to `analyzePacing` is
expected to be shaped like a
`biometric-observation-v1` record (owned by
`personal-health-computer-systems-engineering-services-section/lib/schemas/biometric-observation-v1.schema.json`):
`{ metric, measuredAt|enteredAt, measurement: { value, unit, precision },
missingness: { status } }`. A `nutrition-biometric-observation-v1` record
(the nutrition-domain profile of the general schema, same fields) is
accepted too — `analyzePacing` reads only the fields above and does not
inspect `recordType`. This package does not validate against either
schema itself — it has no schema-validator port — callers that need
admission checking supply their own, the same pattern
`nutrition-practice-computer` uses for its ledger records.

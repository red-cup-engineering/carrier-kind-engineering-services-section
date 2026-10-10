# Retired: @red-cup-engineering/cloudflare-d1-service

This was `services/cloudflare-d1-service`: the Cloudflare D1 handle contract
(prepare/bind/first/all/run/batch/exec) over a local `node:sqlite` double, plus a D1 migration
applier. It is kept here byte for byte. Under `legacy/`, the release tooling reads no manifest and no
runtime file from it.

## Why
The house keeps state as signed records in SEAVT journals, never in SQL (requirement
`no-sqlite-flatfiles-only`). This package's one consumer was `computer-web-server`'s Discord
admission. Its OAuth sessions, command-login challenges, interaction sessions and rate limits were D1
tables, and they now live in a semantic record journal (`src/admission/discord-store.mjs`).

## What carried over
| Capability here | Where it lives now |
|---|---|
| D1 tables for Discord admission (`computer-web-server/src/admission/schema.mjs` migrations) | `computer-web-server/src/admission/discord-store.mjs`: one record category per table, a row's history as revisions, removal told denied |
| Conditional `UPDATE ... WHERE` (refresh compare-and-swap, approve or consume a challenge once) | `store.atomically(() => table.update(key, change))` under the SEAVT directory lock |
| `INSERT ... ON CONFLICT DO UPDATE` (command-login rate limits) | the same `update`, in one step |
| A D1 or SQLite file's rows | `computer-web-server/src/admission/import-sql-discord-admission.mjs`, read once and read-only (SQL only as an admission path) |
| `createSqliteD1(':memory:')` + `applyMigrations` in tests | the journal store under a temporary root; `test/fixtures/legacy-d1-admission-schema.mjs` keeps the D1 schema for writing a legacy database to import |

No other package in computer-services-section, nor any source Cold Red Gate pins, imported it
(surveyed 2026-10-10). Assist on web-tufte-gui-services-section main no longer uses D1.

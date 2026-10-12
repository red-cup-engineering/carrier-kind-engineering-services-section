---
title: Fabricate the shared HTTP request identity boundary
date-created: 2026-09-27
type: fabrication-specification
status: closed source order; generation and independent acceptance outstanding
derived-from: 2026-09-27-muse-assist-http-identity-lld.md
derived-from-sha256: 1cfc7e313558242f5b52fe6fe64250e8cf5f511bac92ae5b8e3f1b7459ed1399
---

## Governing transformation

Realize L-A01–L-A07 in the three writable files below. The ordinary HTTP request and constructor-installed WebSocket connection are the receiving carriers. Preserve admitted process behavior, authenticated gateway identity, signed peer exchange and existing operation standing checks; remove implicit gateway-to-process fallback before every ordinary HTTP branch. This is the identity component of L-I01/L-I08, not private context authorization or application completion.

Use the existing operator-mediated isolated generation process in `2026-09-27-muse-assist-fabrication-lld.md` (L-F01–L-F07). The output is the closed edit-only `disposition/reason/edits` contract, not shell commands or a new server. Clauses on each edit name L-A01–L-A07. No new source files, package exports, dependencies, configuration formats, registry or scheduler are required. Refuse if the contract cannot be realized from admitted inputs. Only the three named files are writable; the rest are source evidence. Test and private assay bytes are withheld.

The root assessor commits its assay before generation, stages exact replacements mechanically, observes candidate modules independently, and compares all admitted input hashes before promotion. A passed port-isolated observation proves only that boundary under those ports; it must not be represented as production authentication, live gateway acceptance, durable storage, or a completed assistant.

## Bound inputs

| Path relative to MetroPlat | Role | SHA-256 |
| --- | --- | --- |
| `src/http-options.mjs` | writable | `897aac3d77f0291eb65d7a506883e5f1d2fbf160a4af177e5e4cdfe7d435f377` |
| `src/http/server.mjs` | writable | `8c9b6d7c7fa2b27e7da3a4df73d349c4d45c7417dcd37e6e3bfd1a1bd3bc390d` |
| `src/http/ws-session.mjs` | writable | `6e7a5dbe051756be60ca6ad9a23cfc3a7aa9a050c4c09cabb5cb5f94413b63cb` |
| `src/presentation/serving.mjs` | read only | `8e493e0ed86e116e9bd744059175aa79491771f68c04947c631f48d044801d7d` |
| `src/http/resource-router.mjs` | read only | `1e93faef0eb0bc5c6a581a3fd28c6393afd00a65b850f433db678119d88fcb3a` |
| `src/mcp-options.mjs` | read only | `77c37e06723bea58ae83fcc6ac350785beb5604951c8aa0e0a84486a7a8a2b1f` |
| `scripts/metroplat-serve.mjs` | read only | `11379dbdc221fc9007a38ac651e2455b753d9b0f27b106e2f090ce500b1457b6` |

## Public examples

With configured gateway token `example-token`, subject `person:example`, and exact matching headers, resolve `{kind:"gateway",subject:"person:example"}`. The same configuration without headers resolves `{kind:"refused"}`. With no gateway configured and no assertion headers, resolve `{kind:"process"}`. An assertion presented to an unconfigured gateway refuses. These examples are public and do not constitute acceptance evidence.

## Explicit limits

No deployed authenticating gateway, context catalog, external grant, isolated executor or independently received assistant result is introduced by this order. The raw data-resource reader and mixed MCP host/user channel remain unsuitable evidence of personal isolation. The public information site is a separate read-only deployment and need not expose this gateway-protected operational server.

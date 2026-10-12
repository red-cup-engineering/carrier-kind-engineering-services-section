# Changelog

## 0.1.0 — 2026-07-11

- Established the contracted `Operation` as the canonical executable unit and
  derived CLI, HTTP, MCP, OpenAPI, and LSP presentations from one catalog.
- Separated pure settlement, capability, causal-graph, and RMN semantics from
  filesystem infrastructure and application composition.
- Defined the causal journal as optional durable audit evidence and retained
  the existing event bytes, digests, and `metroplat.action` wire constants.
- Added explicit application, presentation, module, interface, integration,
  infrastructure, and composition ownership with enforced dependency edges.
- Published a compact root SDK, explicit subsystem exports, and five Infograph
  executables, retaining the LSP and federation process capabilities under the
  application composition root.
- Added clean builds, export/tarball validation, causal and settlement laws,
  capability checks, persisted-format vectors, and CLI/HTTP smoke tests.

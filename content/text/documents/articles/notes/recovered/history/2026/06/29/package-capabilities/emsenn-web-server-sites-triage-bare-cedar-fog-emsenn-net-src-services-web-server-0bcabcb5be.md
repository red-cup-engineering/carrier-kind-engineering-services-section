---
title: "Capability note: @emsenn/web-server"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/services/web-server"
---

# Capability note: @emsenn/web-server

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/services/web-server`
- Package kind: `src-service`
- Declared workspace entries: `services/web-server`
- Description: @emsenn/web-server — deployable web-tier services: a WebTics utterance-log service and an HTTP-to-Node-binary gateway that transports whole HTTP request/response carriers over stdio.
- Capability tags from manifest/source hints: `application`, `service`, `cli`, `workspace-analysis`, `persistence`
- Bins: `web-server`
- Export subpaths: `.`, `./service`, `./binary-gateway`, `./cli`, `./package.json`
- Scripts: `clean`, `check`, `build`, `serve`, `serve:gateway`, `prepack`, `rebuild`
- Dependencies: `@emsenn/animating`, `@emsenn/computing`, `@emsenn/relating`, `@emsenn/http-server`

## Local Evidence

- No nearby README/AGENTS/CLAUDE paragraph was found by the measurement script.
- Source hints: `eslint.config.mjs`, `scripts/serve.mjs`, `src/binary-gateway.mts`, `src/cli.mts`, `src/index.mts`, `src/service.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.

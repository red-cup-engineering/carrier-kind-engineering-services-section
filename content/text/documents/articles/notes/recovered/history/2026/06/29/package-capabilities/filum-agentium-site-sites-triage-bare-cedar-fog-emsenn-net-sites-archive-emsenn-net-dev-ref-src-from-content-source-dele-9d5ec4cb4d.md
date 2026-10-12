---
title: "Capability note: filum-agentium-site"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom/examples/filum-agentium"
---

# Capability note: filum-agentium-site

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom/examples/filum-agentium`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: Deployment declaration for the Filum Agentium example newswire (agentic-web). It sits inside the newsroom package's examples/ and exists only to carry the 561:serve block. The site is served by the semantic-site-server engine (reader=luca) over this example's store; its 561:serve.run block runs that engine as a systemd service — scripts/deploy.mjs renders both the vhost and the unit.
- Capability tags from manifest/source hints: `application`, `service`, `workspace-analysis`, `content-production`, `persistence`
- Bins: none
- Export subpaths: none
- Scripts: none
- Dependencies: none

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/deleted-in-74874b9/apps/web/newsroom/examples/filum-agentium/README.md: The first **example beat** for the (topic-agnostic) `semantic-site-server`. **Filum Agentium** (Latin, "thread of the agents") covers *the agentic web* — AI agents acting on the web — by synthesizing arXiv research into its own cited coverage. It serves at **agentium.filum. 561.group**. Everything topic-specific lives here in `config.json`; the server software knows nothing about it.
- Source hints: `seed.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: none found by name
- Capability classes not directly realized by infography's exported package surface: `application`, `content-production`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.

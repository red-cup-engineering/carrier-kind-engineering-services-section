---
title: "Capability note: @561-group/wheatstone"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/wheatstone"
---

# Capability note: @561-group/wheatstone

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/wheatstone`
- Package kind: `archive-site`
- Declared workspace entries: none found in the scanned workspace declarations
- Description: wheatstone — a MUD CLIENT and the client half of the 561-group MUD stack (the server half is @561-group/fizzos + @561-group/tab + the @561-group/farstone game). Named for Charles Wheatstone, telegraph pioneer. It speaks the telnet CLIENT side (IAC option negotiation; GMCP / MSDP / MXP / COMPRESS2 from the client perspective, reusing @561-group/tab's wire alphabet) and renders a scrolling ANSI-colored world pane, a GMCP/MSDP-fed status line, an optional side panel (map / who / world state), and a command line (history, aliases, triggers, local slash-commands) — all over @561-group/arnold's diffed cell buffer. The WORLD/CARRIER is PLUGGABLE: a world is {connect, send, onLine, onGMCP, close}; telnet now, a local/SSE swarm-as-MUD carrier later, so 'talking to your agents' is just wheatstone connecting to one more world. THE LAW where it surfaces world state: CALM by default with audit-on-demand (the side panel's audit view), never flaunting the contradiction.
- Capability tags from manifest/source hints: `application`, `service`, `cli`, `workspace-analysis`, `game-or-play`, `persistence`
- Bins: `wheatstone`
- Export subpaths: `.`, `./telnet`, `./world`, `./ansi-text`, `./scrollback`, `./worldstate`, `./commands`, `./render`, `./app`, `./package.json`
- Scripts: `test`, `start`, `farstone`
- Dependencies: `@561-group/arnold`, `@561-group/tab`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/sites/archive.emsenn.net/dev/ref/src/from-content-source/apps/tools/wheatstone/README.md: > A **MUD client** — the client half of the 561-group MUD stack (the server half is [`@561-group/fizzos`](../fizzos) + [`@561-group/tab`](../tab) + the [`@561-group/farstone`](../../games/farstone) game). > Named for Charles Wheatstone, telegraph pioneer. > It speaks the **telnet client side** (IAC negotiation; GMCP / MSDP / MXP / COMPRESS2 from the *client* perspective), and renders a scrolling ANSI-colored world pane, a GMCP/MSDP-fed status line, an optional side panel, and a command line — all over [`@561-group/arnold`](../arnold)'s diffed cell buffer. > The **world/carrier is pluggable**, so "talking to your agents" is just wheatstone connecting to one more world once SWARM exposes a MUD-like face.
- Source hints: `bin/wheatstone.mjs`, `src/ansi-text.mjs`, `src/app.mjs`, `src/commands.mjs`, `src/index.mjs`, `src/render.mjs`, `src/scrollback.mjs`, `src/telnet.mjs`, `src/world.mjs`, `src/worldstate.mjs`, `tests/_harness.mjs`, `tests/prove-ansi-text.mjs`, `tests/prove-commands.mjs`, `tests/prove-render.mjs`, `tests/prove-scrollback.mjs`, `tests/prove-smoke.mjs`, `tests/prove-telnet-client.mjs`, `tests/prove-worldstate.mjs`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: `application`, `game-or-play`

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.

---
title: "Survey of the 561 Group JS/Node Ecosystem"
description: "Surveys the potential JS/Node package mesh under apps/, lib/, services/, and sites/ (excluding the nine core packages), reading it not as a flat monorepo but as a staged projection of core categories into domains, transports, services, and sites, with non-core packages falling into six roles."
date-created: 2026-06-22
keywords:
  - Node
  - computing
  - package
  - site
  - service
  - communicating
  - animating
  - organizing
  - trading
  - structure
  - ledger
  - agent
status: "survey"
scope: "Active package manifests under apps/, lib/, services/, and sites/, excluding the nine core packages."
date: 2026-06-22
---

# Survey of the 561 Group JS/Node Ecosystem

This surveys the potential JS/Node package mesh visible under `apps/`, `lib/`, `services/`, and `sites/`.
It intentionally excludes the nine named core packages:

- `@emsenn/relating`
- `@emsenn/communicating`
- `@emsenn/knowing`
- `@emsenn/playing`
- `@emsenn/animating`
- `@emsenn/socializing`
- `@emsenn/computing`
- `@emsenn/gaming`
- `@emsenn/organizing`

I treated `pnpm-workspace.yaml` as the potential workspace register and also looked at direct package manifests in the same top-level strata.
Packages with a manifest but no workspace declaration are listed as "manifest-only"; they are present and intentional-looking, but not part of the recursive pnpm mesh today.
Archived package manifests under `.claude/`, `_archive/`, `node_modules/`, and build outputs are out of scope.

## Reading

The ecosystem is not a flat application monorepo.
It is a staged projection of core categories into domains, transports, services, and finally sites.
The non-core packages mostly fall into six roles:

1. Fibers and experimental successors over core packages.
2. Computing-with packages that admit concrete technical systems into the category mesh.
3. Content, operations, trading, divination, and conformance domain packages.
4. Runnable apps that bind a domain library to CLI or TUI process boundaries.
5. Services that turn package affordances into HTTP, MCP, or realtime server surfaces.
6. Sites that compose the above into deployable actuators.

The `computing-with-*` layer is the thickest part of the mesh.
It gives the repo its JS/Node ecosystem shape: JS packages, package binaries, terminals, HTTP, web documents, LLM agents, Git, Discord, Hive, and ledgers are all admitted as computing substrates.
`services/jsnode-*` and `sites/ops.
561.group` then make those package affordances inspectable and transportable.

## Package Inventory

| Path | Package | Status | Role |
| --- | --- | --- | --- |
| `apps/discord-steward` | `@emsenn/app-discord-steward` | workspace | Runnable Discord steward app over `@emsenn/computing-with-discord` and OpenAI-agent computing. It owns server/bot/admin configuration, gateway supervision, and the human-boundary runtime. |
| `apps/farolfi` | `@emsenn/farolfi` | workspace | CLI for paraconsistent double-entry accounting. It is the process interface over `@emsenn/trading` ledger capabilities. |
| `apps/gnoponemacs` | `@emsenn/gnoponemacs` | manifest-only | Markdown-native Emacs cockpit for Rust, Node, GitHub, project memory, and agentic programming. It appears as an editor configuration/application, not an active pnpm workspace member. |
| `apps/llm-computer` | `@emsenn/llm-computer` | workspace | Pure LLM-agent computer over an injected inference function. It runs the bounded loop, tool governance, MCP tool conversion, and cost-ledger projection while leaving sockets and keys to `services/llm-server`. |
| `apps/openai-agent-tui` | `@emsenn/app-openai-agent-tui` | workspace | Full-screen TUI for OpenAI-compatible chat endpoints. It composes the TUI shell, terminal computing, CLI computing, and OpenAI-agent layer. |
| `apps/tui` | `@emsenn/app-tui` | workspace | Generic TUI application shell assembled from terminal and CLI computing. Provides ANSI/rendering package bins. |
| `apps/vibemacs` | `@emsenn/vibemacs` | manifest-only | Emacs configuration for agentic programmers. It has validation scripts but is outside the current pnpm workspace. |
| `apps/waggle` | `@emsenn/waggle` | workspace | Hive wallet plus ledger compound app. It owns local keystore interaction and composes Hive chain computing with trading. |
| `apps/web-computer` | `@emsenn/web-computer` | workspace | Operational CLI over web computing: palette linting against accessibility/scarcity constraints and codec fixture round trips. |
| `lib/561-group` | `@emsenn/561-group-content` | manifest-only | Markdown/frontmatter content records about the group and its generated world. It is a content source package, not currently a workspace package. |
| `lib/561-group-conformance-algebra` | `@emsenn/561-group-conformance-algebra` | workspace | Workspace invariant catalog. It gives the package mesh a local conformance algebra over relating. |
| `lib/561-group-website-theme` | `@emsenn/561-group-website-theme` | workspace | 561 Group visual identity as a web theme: palette, type scale, and grid for web packages. |
| `lib/animating-experimental` | `@emsenn/animating-experimental` | workspace | Greenfield animating successor over relating, communicating, and playing. It mirrors a core face experimentally rather than being one of the excluded core packages. |
| `lib/communicating-in-english` | `@emsenn/communicating-in-english` | workspace | English language fiber over communicating. It provides compiled English bundle, realization, prose conformance, and runnable communicate bins. |
| `lib/communicating-in-lakota` | `@emsenn/communicating-in-lakota` | workspace | Lakota language fiber over communicating with compiled bundle and runnable communicate bins. |
| `lib/communicating-in-latin` | `@emsenn/communicating-in-latin` | workspace | Latin language fiber over communicating with compiled bundle and runnable communicate bins. |
| `lib/communicating-in-tokipona` | `@emsenn/communicating-in-tokipona` | workspace | Tokipona language fiber over communicating with compiled bundle and runnable communicate bins. |
| `lib/organizing-with-agents` | `@emsenn/organizing-with-agents` | workspace | Generic agent substrate: conversations, tools, tokens, sessions, run structures, and traces. It sits upstream of LLM-specific agent packages. |
| `lib/organizing-with-claude` | `@emsenn/organizing-with-claude` | workspace | Claude-specific model topology and operational harness computer. It includes a Claude inference wrapper over LLM-agent holography. |
| `lib/organizing-with-claude-code-cli` | `@emsenn/organizing-with-claude-code-cli` | workspace | Driver for the `claude` binary itself, including argv construction, spawn control, JSON event projection, transcript reading, and coding-agent session structures. |
| `lib/computing-with-cli` | `@emsenn/computing-with-cli` | workspace | CLI substrate: argv, stdio filter helpers, command history, aliases, triggers, and command-intent structures. |
| `lib/computing-with-discord` | `@emsenn/computing-with-discord` | workspace | Discord transport and agentic server-operation domain. It keeps token/socket concerns at the Discord boundary and exports structures for steward behavior. |
| `lib/computing-with-emacs` | `@emsenn/computing-with-emacs` | workspace | Emacs boundary-system model: cockpit topology, agent endpoints, monitorable streams, and pane plans as data. |
| `lib/computing-with-git` | `@emsenn/computing-with-git` | workspace | Git as relational structures and strategy boundaries: status, refs, remotes, logs, evidence, and readings. |
| `lib/computing-with-hive` | `@emsenn/computing-with-hive` | workspace | Hive blockchain computing package. It admits chain facts, protocol codecs, key math, holography, and account-fleet operations. |
| `lib/computing-with-http` | `@emsenn/computing-with-http` | workspace | HTTP protocol primitives: headers, cookies, negotiation, SSE, WebSocket frames, ESI, multipart bodies, and codecs. |
| `lib/organizing-with-jsnode` | `@emsenn/organizing-with-jsnode` | workspace | Decommissioned historical JS/Node substrate. Do not use it for new work; `apps/jsnode-ick` now owns workspace discovery, package facts, consumption/decommission audits, topology settlement, and served JSNode ICK projections. |
| `lib/computing-with-ledgers` | `@emsenn/computing-with-ledgers` | workspace | Ledger representation codecs and exact accounting amounts downstream of animating's accounting structures. |
| `lib/organizing-with-llm-agents` | `@emsenn/organizing-with-llm-agents` | workspace | LLM-agent substrate: endpoints, inference requests/results, exact cost arithmetic, bilattice observability, holography, and agent-loop structures. |
| `lib/organizing-with-openai-agents` | `@emsenn/organizing-with-openai-agents` | workspace | OpenAI-dialect agent capabilities: endpoint resolution, inference, run loop, coding-agent session computing, and trace projection. |
| `lib/computing-with-openai-codex` | `@emsenn/computing-with-openai-codex` | workspace | OpenAI/Codex-specific topology and operational harness layer over the generic agent, Git, JS/Node, and LLM-agent substrates. |
| `lib/computing-with-terminal` | `@emsenn/computing-with-terminal` | workspace | Terminal substrate: ANSI/SGR codecs, cell buffers, layouts, widgets, keyboard events, screen rendering, and terminal-world projection. |
| `lib/computing-with-the-living-web` | `@emsenn/computing-with-the-living-web` | workspace | Composite web surfaces that fuse the web tier and semantic-web tier: content APIs, blogs, gardens, microblogs, operation surfaces, and web apps. |
| `lib/computing-with-the-semantic-web` | `@emsenn/computing-with-the-semantic-web` | workspace | Semantic-web layer: linked data, RDF/Turtle/JSON-LD, fragments, microformats, page metadata, and semantic reading over the web tier. |
| `lib/computing-with-the-web` | `@emsenn/computing-with-the-web` | workspace | Web-domain computing library: topology, IndieWeb auth/posting, ActivityPub, feeds, pagination, theming, and app surfaces on HTTP primitives. |
| `lib/content` | `@emsenn/content` | workspace | Accountable producing-content domain. It consolidates topology, provenance, pipelines, newsroom, syndication, media, and content-app surfaces as module subpaths. |
| `lib/producing-content` | `@emsenn/producing-content` | workspace | Content plus computing: runs the content domain on the computer domain, including content farm production and enacted publication processes. |
| `lib/divining` | `@emsenn/divining` | workspace | Sign-reading as settling over communicating, knowing, socializing, playing, and relating. It is a domain package rather than a transport package. |
| `lib/managing-operations` | `@emsenn/managing-operations` | workspace | Operations-management category package for work briefs, cycles, governance, and operational coordination. |
| `lib/managing-operations-experimental` | `@emsenn/managing-operations-experimental` | workspace | Experimental operations-management package built over `@emsenn/animating-experimental`. It appears to be the potential edge used by `sites/ops.561.group`. |
| `lib/organizing-as-lakota` | `@emsenn/organizing-as-lakota` | workspace | Lakota fiber over organizing. It localizes the relating-to-animating-to-organizing web rather than replacing the core organizing package. |
| `lib/exploring-the-wilderness` | `@emsenn/exploring-the-wilderness` | workspace | Organized archive experiments for image, audio, relation, and math generation, now exposed through TypeBox structures and relating actions downstream of organizing. |
| `lib/trading` | `@emsenn/trading` | workspace | Trading domain downstream of gaming and organizing. It reads order books as arenas and derives financial, market, and ledger modules from that base. |
| `services/conformance-tics` | `@emsenn/conformance-tics` | workspace | Live package-conformance service. It runs conformance checks on registered package paths and depends directly on JS/Node computing. |
| `services/fizzos` | `@emsenn/fizzos` | workspace | MUD operating-system kernel over the 561 stack. It models world state, ticks, perception, arenas, and package-bin document morphisms. |
| `services/http-server` | `@emsenn/http-server` | workspace | HTTP service library: application types, responses, routing composition, middleware, Node startup, and HTTP edge helpers. |
| `apps/jsnode-ick/src/package-bin-transport*.mts` | `@emsenn/jsnode-ick/package-bin-transport` | workspace | HTTP/MCP adapters for JS/Node package affordances, especially `package.json#bin` structures projected through the JSNode ICK app. |
| `apps/jsnode-ick/src/package-bin-web.mts` | `@emsenn/jsnode-ick/package-bin-web` | workspace | WebUX, OpenAPI, HTTP, and MCP projections for JS/Node package-bin computing over a provided package directory, downstream of ICK. |
| `services/llm-claude-harness` | `@emsenn/llm-claude-harness` | workspace | Claude Code MCP hub service, defaulting to loopback MCP on port 18805. It wires tools, hooks, and skills into Claude Code processes. |
| `services/llm-openai-codex-harness` | `@emsenn/llm-openai-codex-harness` | workspace | Codex MCP hub service, defaulting to port 18806 or the mounted operations-manifold endpoint. It binds Codex harness affordances to HTTP/MCP transport. |
| `services/llm-server` | `@emsenn/llm-server` | workspace | Transport-bound LLM computer. It exposes an OpenAI-compatible chat-completions HTTP surface and is the boundary where live inference sockets and keys enter. |
| `services/propolis` | `@emsenn/propolis` | workspace | Hive account fleet service surfaces. It is a small service package over the HTTP server layer. |
| `services/qwzspace-server` | `@emsenn/qwzspace-server` | workspace | Server-side half of a 3D realtime graphics/game engine. It provides authoritative simulation and progressive client render-tier negotiation. |
| `services/web-server` | `@emsenn/web-server` | workspace | Deployable web-tier services: WebTics utterance-log service and HTTP-to-Node-binary gateway over stdio. |
| `sites/561.group` | `@emsenn/561-group-site` | workspace | Deployable apex 561.group site using the group theme, semantic web computing, and HTTP service layer. |
| `sites/aagaard.561.group` | `@emsenn/aagaard` | workspace | Autonomous Hive wallet fleet operations platform: gated voting and trading lanes over the Hive computing pipeline. |
| `sites/agents.561.group` | `@emsenn/agents` | workspace | OpenAI-compatible chat surface over the character roster, with OAuth, per-user memory, and MCP endpoint affordances. |
| `sites/cassia-lorne.substack.com` | `@emsenn/cassia-lorne.substack.com` | workspace | Syndication-only divination publication driven by atomic divinations, synthesis gates, and a reviewable content store. |
| `sites/emsenn.net` | `@emsenn/emsenn.net` | workspace | emsenn personal website built on living-web, semantic-web, web, content, and HTTP layers. |
| `sites/farstone.561.group` | `@emsenn/farstone.561.group` | workspace | Playable harbor MUD site served through package-script transport over `@emsenn/fizzos`. |
| `sites/filum.561.group` | `@emsenn/filum.561.group` | workspace | 561 Group newswires site. It composes web computing, content, content production, divining, and HTTP serving. |
| `sites/flickering.561.group` | `@emsenn/flickering.561.group` | workspace | Idle-roguelike site on the FizzOS kernel, with Hive/ledger/trading payments and auditable world traces. |
| `sites/hai-rui.561.group` | `@emsenn/hai-rui` | workspace | Inference and advice layer over workspace conformance findings, backed by conformance-tics and web computing. |
| `sites/koios.news` | `@emsenn/koios.news` | workspace | Collapse-aware news publication with pages, feeds, sitemaps, NewsArticle JSON-LD, ads, and privacy-light view counting. |
| `sites/ops.561.group` | `@emsenn/561-group-operations-manifold` | workspace | Primary operations manifold. It composes animating, computing, Git, JS/Node, LLM, Codex harness, gaming, HTTP, JS/Node servers, experimental operations management, relating, and trading. |
| `sites/research.561.group` | `@emsenn/research.561.group` | workspace | Package-bin transporter for computing with 561 Group knowledge vaults. It joins content, knowledge, HTTP, and JS/Node web-server transport. |

## Strata

### Fibers And Experimental Mirrors

The language fibers (`communicating-in-*`) and `organizing-as-lakota` are not ordinary localization packages.
They present a specific communicative or organizational fiber over a core category.
`animating-experimental` and `managing-operations-experimental` are different: they are greenfield or experimental mirrors, useful for migration pressure and for the operations manifold's active edge.

### Computing-With Packages

The `computing-with-*` packages are the primary JS/Node middle layer.
They admit concrete infrastructures and interaction surfaces as categorical computing:

- Technical substrates: CLI, terminal, HTTP, JS/Node, Git, ledgers.
- Network/social substrates: Discord, Hive, the web, the semantic web, the living web.
- Agent substrates: generic agents, LLM agents, OpenAI agents, OpenAI Codex, Claude, and Claude Code CLI.
- Editor substrate: Emacs as cockpit topology and boundary system.

`@emsenn/jsnode-ick` is the potential JS/Node center for this survey: it reads package manifests, binaries, package analysis, source imports, and consumption indexes as workspace structures, then induces them with ICK faculties into topology, HTTP, WebUX, OpenAPI, MCP, and CLI action projections.
`@emsenn/organizing-with-jsnode` remains only as historical migration evidence.

### Domain Packages

The domain packages outside the core strata provide concrete organizational work:

- `@emsenn/content` and `@emsenn/producing-content` govern accountable content and enacted production.
- `@emsenn/divining` adds sign-reading and divinatory synthesis.
- `@emsenn/trading` derives ledgers, markets, and financial surfaces from game and organization structures.
- `@emsenn/managing-operations` and its experimental sibling gather work management capability into operational packages.
- `@emsenn/561-group-conformance-algebra` makes local invariants explicit.
- `@emsenn/561-group-website-theme` makes the visual identity reusable by web surfaces.

### Apps

Apps are parameterized process surfaces.
They should be read as "this domain, run here":

- `farolfi`: trading ledger domain as a CLI.
- `waggle`: Hive plus trading as a wallet/accounting app.
- `llm-computer`: LLM-agent loop as a pure computer.
- `openai-agent-tui` and `app-tui`: terminal UI process shells.
- `web-computer`: web computing as operational checks.
- `discord-steward`: Discord agentic operation as a runnable steward.

The manifest-only Emacs packages are adjacent cockpit work rather than current workspace members.

### Services

Services convert library affordances into live boundaries:

- `http-server` is the general service library.
- `web-server` is the deployable web tier.
- `apps/jsnode-ick` exposes JS/Node package affordances through package-bin transport and WebUX, downstream of ICK.
- `llm-server` binds `apps/llm-computer` to live inference transport.
- `llm-claude-harness` and `llm-openai-codex-harness` expose MCP hubs for coding-agent harnesses.
- `conformance-tics` exposes package conformance checking.
- `fizzos`, `propolis`, and `qwzspace-server` are domain-specific servers or engines over the shared stack.

### Sites

Sites are the actuator layer.
They are deployable compositions, not merely content folders:

- `ops.
  561.group` is the most important operational composition.
  It mounts the JS/Node inspection and transport layer, Codex harness, operations management, and broader stack into the Operations Manifold.
- `research.
  561.group` exposes knowledge-vault computing.
- `agents.
  561.group` exposes character chat and MCP surfaces.
- `aagaard.
  561.group` and `flickering.
  561.group` connect Hive, trading, games, and web service layers.
- `filum.
  561.group`, `koios.news`, and `cassia-lorne.substack.com` are content and publication systems.
- `farstone.
  561.group` is a MUD site over FizzOS.
- `561.group` and `emsenn.net` are apex/personal web compositions.
- `hai-rui.
  561.group` is the conformance-advice site.

## Notable Edges

- JS/Node self-observation is an explicit capability: `organizing-with-jsnode` feeds `conformance-tics`, `apps/jsnode-ick`, `research.
  561.group`, and `ops.
  561.group`.
- LLM-agent work is layered: generic agents -> LLM agents -> dialect packages (`openai-agents`, `openai-codex`, `claude`, `claude-code-cli`) -> app/service surfaces (`llm-computer`, `llm-server`, harness services, TUI).
- Web work is layered: HTTP primitives -> web -> semantic web -> living web -> services and sites.
- Hive and trading recur together in `waggle`, `aagaard`, and `flickering`, while `trading` itself still depends on the core game/organization strata.
- The manifest-only packages are real local artifacts but are not part of the workspace mesh.
  If they should participate in recursive build/check flows, they need explicit `pnpm-workspace.yaml` membership.

## Package Count

- Workspace packages surveyed: 62.
- Manifest-only active packages surveyed: 5.
- Core packages intentionally excluded: 9.

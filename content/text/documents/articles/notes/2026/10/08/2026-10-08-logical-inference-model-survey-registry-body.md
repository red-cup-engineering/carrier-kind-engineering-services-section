---
title: "Logical inference model survey: the registry as the organism's body"
description: "Complete findings of the registry-body reader: the registry as the organism's body."
date-created: 2026-10-08
kind: engineering-survey-note
keywords:
  - logical-inference-model
  - survey
  - registry-body
status: survey-read-only-not-adversarially-verified
produced-by: info-0d logical-inference-model survey workflow (Claude agents; Sonnet readers for code, Fable readers for house theory), read-only over the tree at 773ea6d6df4
---

# Round 2 - registry-body: what it takes to put SignCell/SignChain/SignGraph/SignCraft/metrologic on https://registry.561.group

Read-only analysis. Nothing published, no repo created, no git write. Scratch scripts and raw data are in the same scratchpad dir
(closure.json, registry-status.json, drift.json, realgraph.txt, modgraph-*.json, topo.txt, scc.txt).
Registry reachable: `GET https://registry.561.group/-/ping` -> 200 (Caddy, h2). Packument URL form that works: `/@red-cup-engineering%2fNAME`; unpublished returns
`{"error":"@red-cup-engineering/signcell is not in this registry"}`. ~/.npmrc already routes all house scopes
(@red-cup-engineering, @lenticule-science, @561-group, @causeway-services, @coesite-operations, @emsenn) to https://registry.561.group/ and holds
username `emsenn` + a `_password` for it (value deliberately not copied here). Also holds stale 127.0.0.1:4873 and us-central1-npm.pkg.dev auth lines.

Abbreviations: S = lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section ;
P = S/lib/signstuff ; M = S/services/computer-data-engineering-services-section/lib/metrologic.

## 0. Headline findings (in order of how hard they block publication)

1. The DECLARED workspace dependency graph of the six packages is a hairball. Transitive closure of signcell, signchain, signgraph, signcraft, metrologic is 208 workspace
   packages each (signstuff-evm 209); 176 of those 209 sit in ONE strongly connected component (cycle) of declared dependencies. `publish-workspace-tiers`
   (leaf-first Kahn tiers) reports cycle members as `cyclic (excluded)`, never tiers them, and exits 1 whenever `cyclic.length > 0`. So with today's manifests NONE of
   the sign libs can be tiered or published by the house tool. Cause: coarse package.json declarations (phantom edges), not code reality.
2. The REAL module graph is small. Following actual import statements (comments stripped) through package `exports` maps from every exported file, the five sign libs + metrologic touch
   24 packages / 375 files, with only THREE tiny package-level cycles (section 3). Everything else is declared-but-unused edges to prune. (A first pass that did not strip comments
   found a false 4th cycle signgraph<->relating<->computer-system-engine<->signcraft; it was caused by JSDoc `import { ... } from "@red-cup-engineering/relating"` examples
   in signgraph/src/chu-term.mjs. NOT a real cycle. Likewise the apparent metrologic export hole `.../positing/settling` was in a comment.)
3. Registry immutability vs. working-tree drift: of 110 closure packages whose LOCAL version string is already published, 95 have a LOCAL package.json whose workspace
   dependency set differs from the immutable published manifest of the same version (consolidations: cbor-services-section was published depending on encode-cbor-service/decode-cbor-service/derive-cbor-ni-service,
   local now depends on uri/crypto/json; published computer-data-engineering-services-section@0.1.0 has 3 exports and 0 deps, local has 26 exports and 5 deps;
   published eavt@0.10.4 has 3 exports/2 deps, local has 77 exports/18 deps; published json-services-section@0.3.0 has 14 exports, local 35). The tool sees "already published" and skips them, so consumers would install old code.
   Every drifted package that sits under the sign libs needs a new version (section 4).
4. Version-policy blockers: json-services-section local 1.0.0 -> `assertHousePublicationVersion` throws "house publication version must remain below 1.0.0" (a2a-services-section also 1.0.0, outside our set).
   json-schema-services-section local 0.3.0 but registry already holds 0.4.0/0.4.1 (latest=0.4.1): publishing 0.3.0 stable would force `--tag latest` BACKWARDS, and a dev bump would compute 0.4.0-dev.0 which sorts BELOW the occupied 0.4.0.
5. signcell, signchain, signgraph, signcraft, metrologic, computer-content-engineering-services-section, computer-filepath-engineering-services-section, computer-text-content-engineering-services-section,
   computer-code-engineering-services-section, jsonl-services-section: all NOT PUBLISHED at all (404). signstuff-evm is `private:true` (UNLICENSED) and is not publishable by design.
6. `gh auth status` for account emsenn: token INVALID ("Failed to log in"). `git ls-remote https://github.com/red-cup-engineering/signcell.git` -> repository not found. No sign repos exist yet. Repo creation is blocked until `gh auth login`.
7. Tool gotchas: prepare-release-wave only bumps packages with uncommitted/untracked changes (`git diff HEAD` + `ls-files --others`); on a clean tree it plans nothing, so drifted-but-unedited packages must be bumped by hand
   or edited first. publish-workspace-tiers defaults `--registry` to http://127.0.0.1:4873/ (old local Verdaccio) and its storage-repair default points to a local verdaccio dir; pass registry flags explicitly.

## 1. The six packages (package.json facts)

| pkg | dir | version | private | license | files | exports | scripts | declared workspace deps |
|---|---|---|---|---|---|---|---|---|
| @red-cup-engineering/signcell | P/signcell | 0.1.0 | no | none | ["src"] | 14 (+./package.json) | test | computer-content-engineering-services-section 0.1.0, computer-data-engineering-services-section 0.1.0 |
| signchain | P/signchain | 0.1.0 | no | none | ["src"] | 18 | test | signcell, data, content, json-schema-services-section 0.3.0, computer-filepath-engineering-services-section 0.1.0, metrologic 0.3.0 |
| signgraph | P/signgraph | 0.1.0 | no | none | ["src"] | 21 | test | signcell, signchain, uri-services-section, data, metrologic, computer-code-engineering-services-section, cbor-services-section, json-schema, json-services-section 1.0.0, eavt 0.10.4, content, xml-document-rendering-service 0.1.6 |
| signcraft | P/signcraft | 0.1.0 | no | none | ["src","scripts"] | 25 | test | signcell, signchain, signgraph, content, json-services-section 1.0.0, metrologic, data, eavt, html-structural-projection-service 0.3.0, computer-code-engineering-services-section, immutable-content-custody-service 0.3.0; devDep javascript-node-services-section 0.3.0 |
| signstuff-evm | P/signstuff-evm | 0.1.0 | YES (UNLICENSED) | UNLICENSED | src,scripts,foundry.toml,DESIGN.md,ROADMAP.md | 3 | forge build/test, vectors(+:check,:lean,:lean:check) | signcell, signchain, data, content; devDeps @foundry-rs/forge 1.7.1, @openzeppelin/contracts 5.6.1, forge-std github:foundry-rs/forge-std#v1.10.0 |
| @red-cup-engineering/metrologic | M | 0.3.0 | no | none | ["README.md","src","scripts","specifications"] | 141 | node --test (256MB, concurrency 1) | content, data, eavt 0.10.4, json-services-section 1.0.0 |

All workspace dep specifiers are exact versions (no `workspace:` / ranges), which is what `dependencySpecificationViolations` demands. No `engines` (except metrologic node>=22), no `publishConfig`, no `repository`
(metrologic's points to red-cup-engineering/bare-cedar-fog directory=... - stale after a split), no `bin`, no `main`. Working trees are clean in git (0 changed files; 214 tracked files under P, 219 under M).

### Defects per package (checked with comment-stripped import scan + exports-map resolution)
- ALL: every `exports` target file exists (signcell 14, signchain 18, signgraph 21, signcraft 25, signstuff-evm 3, metrologic 141 targets; 0 missing). Every exported target lies inside `files`. Every cross-package subpath import resolves in the target's `exports`. No relative import escapes or misses.
- ALL: no root README.md except metrologic (P/README.md exists only at the signstuff parent; each of signcell/signchain/signgraph/signcraft has src/README.md, which is NOT what npm treats as the package README); no LICENSE file; `license` field absent
  (publication service itself uses MIT; kalshi uses UNLICENSED - license is a human decision); no `publishConfig` (house packages use {access:"public", provenance:true}; the publisher passes `--provenance=false` anyway); no `repository`, no `description` problems (all have descriptions except none missing).
- signcell: clean. Declared == used.
- signchain: clean. Declared == used. Its test imports data subpath only.
- signgraph: declares computer-code-engineering-services-section but never imports it in src (phantom, and it drags in the npm-registry hairball); tests import undeclared `@red-cup-engineering/a2a-services-section/circuit-interface` (test/hierarchical-circuit.test.mjs) - needs devDependency or removal (a2a-services-section is 1.0.0 and unpublished-name-wise ok? it IS UNPUBLISHED: not in registry). src/chu-term.mjs mentions relating only in JSDoc (harmless, but `grep` tools and the carrier assay may be fooled; reword the examples).
- signcraft: declares computer-code-engineering-services-section; real graph reaches it via 2 file edges (keep). Uses self-reference imports `@red-cup-engineering/signcraft/inference/*`, `/settle`, `/primitives` (legal because exports map exists). test/history-mesh-effects.test.mjs builds `node -e` strings with `require.resolve(...)` (scanner noise, not a defect). devDependency javascript-node-services-section is counted as a graph edge by workspace-graph.mjs (DEPENDENCY_FIELDS includes devDependencies) and must be published/pinned too.
- signstuff-evm: src has only Solidity (JS is scripts/); scripts/emit-golden-vectors.mjs imports `@red-cup-engineering/signgraph/cohomology` which is UNDECLARED (declares signcell/signchain/data/content only). private:true so never in the tiers; fix declaration anyway. Working dir carries untracked build output out/ cache/ node_modules/ (its .gitignore covers them; the other four libs have NO .gitignore - root .gitignore ignores node_modules, a new standalone repo needs its own).
- metrologic: dependency on eavt is REAL but cyclic (eavt also depends on metrologic) - see section 3. Repository field stale. README + specifications ship.

## 2. Dependency closure and registry presence

Method: pnpm-workspace.yaml `packages: lib/**` minus legacy/triage/_archive/lenticule-import/dist/content/text (and I also excluded koios-news vendor/runtime copies, which duplicate signcell etc.).
Followed dependencies+peer+optional edges for @red-cup-engineering/* and @lenticule-science/*. Result: 209 distinct packages in the union closure (206 if vendor copies not excluded, with 3 duplicated identities in vendor/ only). Two names are declared but have no workspace member:
`@red-cup-engineering/ni-uri-services-section`, `@red-cup-engineering/semantic-record-journal-service` (registry has the latter at 0.5.0, not the former).
Registry probe (curl/fetch of every packument): 130 published, 79 not published, 0 errors. Of the 130: 19 have local versions that are not published (list in section 5), 110 have the local version published, and 95 of those 110 have manifest drift.

Per-library closure sizes: signcell 208, signchain 208, signgraph 208, signcraft 208, signstuff-evm 209, metrologic 208. Declared-edge SCC: 176 packages (data-layer packages like computer-data, computer-content, json-services, eavt, uri, cbor, crypto all in it, plus
feltos, relating, computer-system-engine, javascript-node-services-section, the whole npm-registry-* family, brokerage/forecasting/hive services...). Even restricting to imports found in non-test src, a 127-package SCC remains (so the hairball is not only phantom declarations; but it is outside what the sign libs actually execute).

Published direct deps of the six (registry vs local):
- cbor-services-section 0.1.0 published 0.1.0 (manifest drifted)
- uri-services-section 0.1.0 published 0.1.0 (drifted)
- cryptographic-computer-data-engineering-services-section 0.3.0 published 0.2.0,0.3.0 (drifted)
- computer-data-engineering-services-section 0.1.0 published 0.1.0 (drifted: pub 3 exports/0 deps vs local 26/5)
- eavt 0.10.4 published (14 versions, latest 0.10.4) (drifted: pub 3 exports/2 deps vs local 77/18)
- json-services-section local 1.0.0; registry 0.1.0,0.2.0,0.3.0 (latest 0.3.0) - NOT published, refused by policy
- json-schema-services-section local 0.3.0; registry has 0.1.0..0.2.0,0.4.0,0.4.1 (latest 0.4.1; tag "recovered"=0.1.1) - local version absent, local is BEHIND
- xml-document-rendering-service 0.1.6 published (drifted; its manifest dropped articulating, typed-resource-classification-kernel-service, json-codec-service and gained metrologic, content, data, crypto, uri, signcell)
- html-structural-projection-service 0.3.0 published (drifted; gained signcell etc.)
- immutable-content-custody-service 0.3.0 published (drifted; removed ni-services-section, gained serialization/filepath/file-services/uri)
- javascript-node-services-section 0.3.0 published (dev-dep of signcraft; not in its real graph)
- NOT published: computer-content-engineering-services-section 0.1.0, computer-code-engineering-services-section 0.1.0, computer-filepath-engineering-services-section 0.1.0, computer-text-content-engineering-services-section 0.1.0, jsonl-services-section 0.1.0, metrologic 0.3.0, signcell/signchain/signgraph/signcraft 0.1.0, semiotic-eavt-services-section 0.1.0, rdf-data-model-services-section, datom, computer-system-engine, a2a-services-section, computer-networking-engineering-services-section.

Note on dist-tags: several packages carry a "recovered" tag (relating, knowing, animating, organizing, x402, ...) = versions restored after a prior registry loss/reset; registry `latest` can differ from local versions.

## 3. The REAL package graph for the stack (24 packages, exports-reachable, comments stripped)

Edges (A -> B = some exported-reachable file of A imports B; counts omitted):

- Leaves (no workspace imports): json-services-section, computer-text-content-engineering-services-section, computer-filepath-engineering-services-section, cryptographic-computer-data-engineering-services-section, computer-data-serialization-services-section, file-services
- json-schema-services-section -> json-services-section
- uri-services-section -> cryptographic, json-services
- cbor-services-section -> uri, cryptographic
- immutable-content-custody-service -> uri, filepath, file-services, data-serialization
- computer-content-engineering-services-section <-> computer-data-engineering-services-section  (CYCLE A); content -> cbor, uri, crypto, data; data -> json-schema, content, cbor
- computer-code-engineering-services-section -> data, content
- jsonl-services-section -> json-services, content, crypto
- signcell -> data, content
- eavt <-> metrologic (CYCLE B); eavt -> json-services, metrologic, content, jsonl, signcell, uri, cbor, data, file-services; metrologic -> content, data, json-services, eavt
- xml-document-rendering-service -> content, signcell, data
- css-services-section -> metrologic
- signchain -> signcell, data, metrologic, json-schema, content
- html-engineering-services-section <-> html-structural-projection-service (CYCLE C); also -> css, json-services / -> xml-document-rendering, content, signcell, json-services, crypto, text-content, data, css
- signgraph -> signcell, data, metrologic, json-services, eavt, content, uri, cbor, json-schema, xml-document-rendering, signchain
- signcraft -> metrologic, data, signcell, signchain, signgraph, content, eavt, html-structural-projection, json-services, code, immutable-content-custody

External npm packages actually reached: cbor2, @rgrove/parse-xml, xml-name-validator, parse5, entities, whatwg-mimetype (and http-structured-fields, @scure/base per data-serialization/crypto manifests). These must be declared by the packages that import them (data-serialization declares http-structured-fields,@scure/base,whatwg-mimetype; cbor declares cbor2; xml-document-rendering declares @rgrove/parse-xml,xml-name-validator; html-structural declares parse5,entities).

### The three real cycles and the exact file edges that make them
- CYCLE A (data <-> content). data -> content: data/src/semiotic-expression-notation/typing.mjs and data/src/type-system/type-system.mjs import content/src/semiotic-content-address/semiotic-content-address.mjs.
  content -> data: content/src/semiotic-content-address/semantic-content-identity.mjs imports data/src/semiotic-expression-notation/json-codec.mjs and /typing.mjs; content/src/typed-resource-classification.mjs imports data/src/closure-regime.mjs and /four.mjs.
  Only ~6 file edges. Fix: choose a direction (the layering rule says content addresses a datum, so data is lower: move semiotic-content-address.mjs's hashing core down into data, or split a leaf package for the content-address kernel), then delete the other direction.
- CYCLE B (eavt <-> metrologic). metrologic/src/articulation/predicating/positing/independent-evidence.mjs imports a SCRIPT inside eavt (eavt-services-section/scripts/identify-content-addressed-row.mjs, exported as `@red-cup-engineering/eavt/identify-content-addressed-row`). eavt imports metrologic in src/ledger/state-fold.mjs (settling/closure.mjs), src/relation-web.mjs (models/graphs/directed-multigraph.mjs), and scripts/stratify-eavt-evidence.mjs.
  metrologic is declared "data-layer math" and eavt a ledger (code), so cut metrologic -> eavt: move identify-content-addressed-row into content/data (content-addressed row identity is a content-address function) and have both import it. Single-file fix.
- CYCLE C (html-engineering <-> html-structural-projection). html-engineering/src/html-document-render.mjs imports html-structural-projection/src/html/lexical.mjs; html-structural-projection/src/html/index.mjs imports html-engineering/src/html-document-render.mjs. Fix: merge or move html-document-render to one side. Only on signcraft's path through html-structural-projection.
After A, B, C are cut and declared deps pruned to the real set, the stack is a DAG; the wave order below follows.

## 4. Exact leaf-first publication order (after the defect fixes)

Order computed from the real graph with cycles A/B/C assumed cut in the stated direction (data below content? see fix choice: shown order assumes data < content is replaced by whichever
direction is chosen; if the content-address kernel is made a leaf, add it as wave 0 and data/content move up one). Within a wave, any order. "Bump" = needs a new version because local version is occupied by a different published manifest (drift) or is unpublished-but-regressed.

WAVE 0 (no workspace imports): 
 - json-services-section 1.0.0 -> MUST be reset below 1.0.0 and above 0.3.0 (e.g. 0.4.0-dev.0); unpublished-as-local; policy refuses 1.0.0. (tools: `reset-package-versions` / `zero-major-version-reset` exist in the publication service)
 - computer-text-content-engineering-services-section 0.1.0 (NEW, unpublished; declared dep json-services is phantom - prune)
 - computer-filepath-engineering-services-section 0.1.0 (NEW; declared text-content + json-services phantom/real? real: none - prune)
 - cryptographic-computer-data-engineering-services-section 0.3.0 (DRIFT, bump; prune json-services, rdf-data-model; published is 0.2.0/0.3.0)
 - computer-data-serialization-services-section 0.1.0 (DRIFT, bump; declares eavt+json-services but real imports none - prune; eavt would otherwise create a cycle through it)
 - file-services 0.4.0 (DRIFT, bump; 8 declared deps incl signcell, jsonl, content, data, all phantom - prune to none)
WAVE 1: json-schema-services-section (set version > 0.4.1 first; real dep: json-services only; declared eavt, relating, file-services, ... phantom), uri-services-section (DRIFT bump; real: crypto, json-services)
WAVE 2: cbor-services-section (DRIFT bump; real: uri, crypto; drop json-services), immutable-content-custody-service (DRIFT bump; real: uri, filepath, file-services, data-serialization)
WAVE 3: computer-data-engineering-services-section + computer-content-engineering-services-section (CYCLE A - must be cut first; data is DRIFT bump, content NEW; content also declares javascript-node-services-section - phantom, prune; data real: json-schema, cbor)
WAVE 4: signcell (NEW; real: data, content), jsonl-services-section (NEW; real: json-services, content, crypto), computer-code-engineering-services-section (NEW; real: data, content; prune its 9 declared deps to 2 - it currently declares metrologic, semiotic-eavt etc. which would make a cycle through eavt)
WAVE 5: eavt + metrologic (CYCLE B - cut first; eavt DRIFT bump, prune 18 declared to ~9; metrologic NEW 0.3.0), xml-document-rendering-service (DRIFT bump; real: content, signcell, data; drop metrologic declared)
WAVE 6: signchain (NEW; real: signcell, data, metrologic, json-schema, content; drop declared computer-filepath if truly unused), css-services-section (DRIFT bump; real: metrologic only; declared web-theming, xml-doc, signcell... prune)
WAVE 7: signgraph (NEW; real: signcell, signchain, data, metrologic, json-services, eavt, content, uri, cbor, json-schema, xml-document-rendering; drop declared computer-code), html-engineering-services-section + html-structural-projection-service (CYCLE C - cut; both DRIFT bump)
WAVE 8: signcraft (NEW; plus devDep javascript-node-services-section 0.3.0 already published; or drop the devDep)
(signstuff-evm: private, never published; it follows signgraph/cohomology import fix.)

Total that must go to the registry for the stack: signcell, signchain, signgraph, signcraft, metrologic (5 new), + new-but-supporting: computer-content-engineering-services-section, computer-filepath-engineering-services-section,
computer-text-content-engineering-services-section, computer-code-engineering-services-section, jsonl-services-section (5 new) + re-versioned drifted: json-services-section, json-schema-services-section, cryptographic-computer-data-engineering-services-section,
computer-data-serialization-services-section, file-services, uri-services-section, cbor-services-section, immutable-content-custody-service, computer-data-engineering-services-section, eavt, xml-document-rendering-service, css-services-section,
html-engineering-services-section, html-structural-projection-service (14). = 24 packages (23 once you count that json-schema/json-services are in the 14). Plus javascript-node-services-section/a2a only if test/dev edges are kept.
Everything outside these 24 can stay untouched ONLY IF no package in the 24 declares it after pruning.

Edge subtleties for the tool: `internalDependencyGraph` only counts an edge when the dependency's CURRENT local version string equals the declared specifier, so mismatched pins (eg declared json-schema 0.3.0 vs published 0.4.1) silently vanish from the tiering and then fail preflight with "dependency is absent from registry and publication set".

## 5. Packages whose local version is NOT on the registry (19) - for reference
json-services-section 1.0.0 (latest 0.3.0), json-schema-services-section 0.3.0 (latest 0.4.1), http-services-section 0.6.0 (0.1.0), csl-json-services-section 0.2.0 (0.1.0), discord-rest-transport-service 0.6.0 (0.5.0),
execute-javascript-node-command-service 0.3.0 (0.2.2), c2pa-services-section 0.5.0 (0.4.0), route-directed-yield-service 0.2.0 (0.1.1), feltos 0.18.3 (0.18.2), bibliography-engineering-services-section 0.5.0 (0.4.0),
git-services-section 0.2.0 (0.1.0), gemini-notebook-services-section 0.6.0 (0.1.0), npm-package-manifest-normalization-service 0.1.0 (0.0.0), ucan-invocation-verification-service 0.1.1 (0.1.0),
mandate-portfolio-allocation-service 0.2.0 (0.1.1), pluggable-venue-adapter-service 0.1.6 (0.1.5), digital-goods-storefront-services-section 0.4.0 (0.1.2), qwzspace 0.9.0 (0.8.2), github-services-section 0.1.0 (0.0.0).
Unpublished (404) in the 209-closure (79): signcell, computer-content-engineering-services-section, computer-code-engineering-services-section, metrologic, computer-filepath-engineering-services-section, computer-text-content-engineering-services-section,
semiotic-eavt-services-section, jsonl-services-section, rdf-data-model-services-section, computer-system-engine, computer-networking-engineering-services-section, a2a-services-section, signchain, signgraph, computer-web-server, hive-keychain-login-service,
computer-language-systems-engineering-services-section, javascript-file-services-section, javascript-file-import-services-section, npm-registry-services-section, npm-registry-snapshot-publication-service, npm-registry-snapshot-services-section,
semiotic-npm-registry-services-section, mcp-engineering-services-section, ni-uri-services-section (no workspace member), computer-inference-engine, computer-system-platform, normalize-earning-opportunity-service, observe-hive-engine-liquidity-opportunity-service,
signcraft, agent-harness-computer-system-engineering-services-section, computer-code-development-engine, communicating-in-english, computer-web-platform, cron-services-section, corpus-census-service, carrier-kind-engineering-services-section,
flatfile-resource-graph-service, javascript-normalization-services-section, @lenticule-science/l-space, icalendar-services-section, web-page-tiling-engine, knowledge-system-server, specification-engineering-services-section,
graphical-knowledge-game-server, computer-systems-publishing-engineering-services-section, graphical-knowledge-system-server, csv-services-section, assisted-browser-services-section, activitypub-server, agent-organization-engine,
tex-engineering-services-section, attention-allocation-readout-service, base-pre-sign-policy-service, blockchain-trashpanda, hive-fleet-operations-service, computing-with-hive, dcity/dcrops/hashkings/terracore/workerbee-services-section,
structural-claims-register-services-section, web3-gambling-platform-services-section, heir-search-services-section, propublica-nonprofit-explorer-services-section, usaspending-services-section, land-contracts-services-section, arcgis-rest-services-section,
ssrs-report-services-section, multi-agent-resource-sharing-host, computer-content-graph-engineering-services-section, us-representation-services-section, consolidated-screening-list-services-section, openfda-services-section,
javascript-node-code-fabrication-services-section, agentic-orchestration-platform, datom, signstuff-evm.
Of these, only the ones in section 4 matter if the declared graph is pruned to the real graph. (Note `datom` is declared by eavt and by relating but is a leaf with no imports reachable from the stack.)

## 6. Publication commands (publish tooling facts, verified by reading source)

Location: S/services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/services/jsnode-packaging-services-section/services/npm-services-section/services/npm-registry-services-section/services/npm-workspace-publication-service
(package @red-cup-engineering/npm-workspace-publication-service 0.11.3, published and matching on the registry; bins publish-workspace-tiers, prepare-release-wave, verify-package-carrier, audit-semantic-version-policy, audit-release-truth, pin-exact-dependencies, verify-exact-dependencies, reconcile-package-locks, ...).
Its package.json has `main: ./src/index.mjs` but src/index.mjs does not exist (minor defect). README says "publishes with pnpm"; the code actually runs `npm publish --ignore-scripts --provenance=false --tag <tag> --registry=<url> --@scope:registry=<url> --json` (src/npm-publication-command.mjs). It enumerates members with `pnpm list --recursive --depth -1 --json` (needs pnpm).
Version law (release-wave.mjs): stable `X.Y.Z` publishes only as dist-tag `latest`; development `X.Y.Z-<tag>.N` publishes only under tag `<tag>` (default `dev`); stable packages may not depend on prerelease packages (prerelease may pin prerelease exactly); house scopes (@red-cup-engineering, @lenticule-science, @561-group, @emsenn, @coesite-operations, @causeway-services, ...) refuse major >= 1; dependency specifiers must all be exact semver; no `workspaces` or `overrides` keys in a published manifest; secret-bearing tarball paths refused.
Commands, from /home/emsenn/info (the repo root, where pnpm-workspace.yaml lives); H = the publication service's scripts dir (or call the `publish-workspace-tiers` / `prepare-release-wave` bins):
1. `prepare-release-wave --root /home/emsenn/info --registry https://registry.561.group/ --release-kind prerelease --channel dev --bump minor --report <file>`   (dry-run: prints plan; no --apply). With a prerelease wave an unpublished 0.1.0 becomes 0.2.0-dev.0 (bump=minor) because `nextPrereleaseVersion` always advances the base; with --bump patch it becomes 0.1.1-dev.0. It processes the WHOLE repo's changed packages (no package filter flag), so run it only on a tree whose only edits are the intended ones, or stash others. Then add `--apply` to rewrite manifests + lock roots and retarget exact internal consumers to a fixed point.
2. `publish-workspace-tiers --root /home/emsenn/info --registry https://registry.561.group/ --publish-registry https://registry.561.group/ --package @red-cup-engineering/signcraft --tag dev --preflight`  (--package selects the named package + its local dependency closure via DECLARED edges: with an unpruned graph that is 208 packages; after pruning it is the 24). Preflight: manifest exactness, lock-vs-manifest consistency, every non-pending dep exists on registry, secret scan, then installs each pending package into an isolated copy, runs its check/build/test (or `verify`) lifecycle, packs, assays tarball/exports/module graph, and unpacks into an empty consumer resolving every public subpath. Registry writes begin only after ALL pass.
3. Same command with `--execute` instead of `--preflight`. Publishes tier by tier leaf-first, re-reads packument to confirm version and dist-tag (outcome published-and-verified). Nonzero exit if any cycle remains (`cyclic`) even when everything else passes.
Also: `verify-package-carrier --package-dir <dir> --registry https://registry.561.group/` (single-package law, JSON outcome isolated-carrier-verified|refused). Promotion dev -> stable later: stable wave over manifests already carrying the prerelease, needs an org.emsenn.npm-promotion-admissions.v1 doc with outcome carrier-verified and the stable base unoccupied.
Auth: ~/.npmrc already has //registry.561.group/:username=emsenn and :_password (plain, base64) - npm publish should authenticate with it; verify with `npm whoami --registry https://registry.561.group/` before the wave. Registry server side: Verdaccio-layout store behind Caddy, publishes immutable.
Caveat: the repo's own registry README names Verdaccio at 127.0.0.1:4873 as "the ordinary private npm registry"; the remote registry.561.group is the one every house scope now resolves to. The tool's default `--registry` is still 127.0.0.1:4873 - always override.

## 7. Defect-fix checklist, in order (do these BEFORE any wave)

1. Authenticate gh (`gh auth login`) - token for emsenn is invalid; needed for repo creation and submodule pushes.
2. Prune declared deps to the real set for the 24 packages (section 4 lists real edges). Biggest prunes: eavt 18 -> ~9, file-services 8 -> 0, computer-code 9 -> 2, html-engineering 7 -> 3, css 6 -> 1, json-schema 7 -> 1, json-services 4 -> 0, crypto 2 -> 0, data-serialization 2 -> 0, signgraph drops computer-code.
   Add undeclared: signgraph devDep a2a-services-section (or delete test), signstuff-evm gets signgraph.
3. Cut CYCLE A (data<->content), CYCLE B (metrologic -> eavt script), CYCLE C (html pair). All are 1-6 file edges.
4. Fix versions: json-services-section 1.0.0 -> below 1.0.0 and > 0.3.0; json-schema-services-section 0.3.0 -> > 0.4.1; bump the 12 other drifted packages (prepare-release-wave only sees edited packages; pruning edits them).
5. Add per sign lib: README.md at package root (move/extract src/README.md or add a pointer), `license`, LICENSE file, `publishConfig: {access: "public"}`, `repository` {type git, url, directory omitted since it becomes repo root}; update metrologic's stale repository to the new repo; add `.gitignore` (node_modules/, out/, cache/).
6. Rerun comment-stripped import scan; confirm no package in the 24 declares anything outside the 24 (+ external npm).
7. Run `publish-workspace-tiers ... --package @red-cup-engineering/signcraft --preflight` against https://registry.561.group/ until `cyclic` is empty and global-preflight-passed.

## 8. The house split pattern (how code moves into its own red-cup-engineering repo, composed back as a submodule)

Evidence (git show --stat of the four commits):
- 51ce4b5e025 (2026-10-04) "Kalshi engineering services live in their own repository, composed back as a submodule": 153 files, +5/-22637. Net effect: delete all files under the directory, add .gitmodules block + a gitlink (mode 160000) at the SAME PATH.
  .gitmodules block: `[submodule "kalshi-engineering-services-section"]` path = <the exact original path> ; url = git@github.com:red-cup-engineering/kalshi-engineering-services-section.git ; branch = main. Gitlink commit a3f42b27f9f3.
- beed92a1e0b (2026-10-04) Polymarket: same shape (+4 .gitmodules lines, gitlink 7ae2e65862d1; 32 files removed). Submodule name = repo name; repo name differs from path leaf (kalshi-engineering-services-section vs path .../kalshi-services-section), package name inside is @red-cup-engineering/kalshi-services-section.
- 8e21341889f (2026-10-07) Koios.News: gitlink 4889ff16fb74 at .../public-news-media-services-section/services/koios-news-services-section; url https://github.com/causeway-services/koios-news.git (no branch line); submodule NAME = full path (the newer style). Also touched deployment package.json files and retired laptop jobs - consumer rewiring in the SAME commit.
- 79d889a50cc (2026-10-08) opportunity + language sections: replaces inline copies with two gitlinks (2a8dba8d5165 -> 561-group/561-group-opportunity-services-section; 40f291e4bec1 -> red-cup-engineering/language-engineering-services-section). Uses https:// URLs, name = full path, NO branch line. Parent READMEs were restored to their prior text plus ONE child-entry line (`### Language Engineering` entry in engineering-services-section/README.md). The language repo itself composes children as submodules (its .gitmodules points at red-cup-engineering/english-engineering-services-section and ptgae-engineering-services-section) - nested composition is the established pattern; repo = README.md + package.json (name, version 0.1.0, description, type module) + services/.
Current .gitmodules (16 entries) has red-cup-engineering repos: feltos, kalshi-engineering-services-section, polymarket-engineering-services-section, language-engineering-services-section, smart-contract-audit-services-section, weiqi-onchain-arena-services-section. Mixed URL styles (older git@github.com:, newer https://). Submodule worktrees keep gitdir under /home/emsenn/info/.git/modules/<name>.
No script or doc was found that automates the split; it is manual git (the commit messages are the only record). Observed repo contents: package.json at root of the submodule (same as the directory's package.json), own .gitignore, .git file pointing at ../../...(15 levels)/.git/modules/<name>. Sign dirs currently have 0 uncommitted changes, so history can be preserved.

Exact procedure for each of signcell, signchain, signgraph, signcraft, signstuff-evm, metrologic (do metrologic and leaf data packages first; publication order unchanged by the split):
 a. Decide the repo name (house rule: generic, never-branded; "SignCell" is branded, so the repo names are an open human decision - e.g. a function-named repo per package; precedent: repo name = full descriptive section name, not the product). Package names stay @red-cup-engineering/signcell etc. unless the human renames them; renaming also needs consumer rewrites (relating, eavt, json-services, xml-doc, html, file-services, computer-system-engine... all import signcell by name).
 b. `gh auth login` then `gh repo create red-cup-engineering/<name> --public|--private` (visibility: private repos can still be published as public npm packages; decide).
 c. Extract history: from /home/emsenn/info, `git subtree split --prefix=<exact dir path> -b split/<name>` (or `git filter-repo --subdirectory-filter <path>` in a clone) so the new repo's root == the package dir (package.json at repo root). Push that branch to the new repo's main. Add the .gitignore, root README.md, LICENSE, publishConfig/repository edits as the first commits on the new repo (fix section 7 items 2-5 there, not in the monorepo, or in monorepo first - either way before the gitlink commit).
 d. In /home/emsenn/info: `git rm -r <exact dir path>`; `git submodule add -b main https://github.com/red-cup-engineering/<name>.git <exact dir path>` (this writes the .gitmodules block and gitlink at the SAME path; newest style uses https and submodule name = path, optionally `branch = main`); commit as one commit with a message like "<X> live in their own repository, composed back as a submodule".
    For lib/signstuff/*: the parent directory lib/signstuff/ holds README.md and the five packages; each package becomes its own submodule; the parent README stays in the monorepo (restore its prior text plus one entry per child, as 79d889a50cc did for READMEs).
    For metrologic: path is M (inside the computer-data-engineering-services-section package dir, which remains a monorepo directory); the submodule path is M. pnpm-workspace `lib/**` still matches (glob is path-based, gitlink content is checked out).
 e. Keep pnpm-workspace.yaml untouched: checked-out submodules at the same paths remain workspace members, so `linkWorkspacePackages`/`preferWorkspacePackages` still link them; no import changes are needed because package names do not change.
 f. Publish leaf-first per section 6 only after cycle/version/dep fixes. Publish from the checked-out submodule paths (the tool scans the pnpm workspace). Each package's lifecycle (`npm test` etc.) must pass inside the isolated copy; do not rely on monorepo hoisting - verifyIsolatedCarrier installs only the exact registry versions declared.
 g. After publish, consumers (relating, eavt, json-services, etc.) reference the new exact versions (prepare-release-wave --apply retargets exact internal consumers and lock roots), then bump the submodule pointer in the monorepo.
Side effects to expect: the submodule worktrees contain `node_modules` symlink forests created by pnpm (signcell/node_modules/@red-cup-engineering/{content,data}) - ignore via .gitignore. Existing koios-news vendor/runtime copies embed signcell and metrologic snapshots (red-cup-engineering-signcell-e7663fb6, red-cup-engineering-metrologic-26da47e1): independent of the split.

## 9. Open decisions for the human (not guessable from the code)
- Generic repo names for the six (not "signcell" etc. if brand-free is mandatory) and whether to rename the packages.
- Direction of CYCLE A (which of data/content is lower) and whether to introduce a tiny content-address kernel leaf package.
- License (MIT like the publication service? UNLICENSED like kalshi?) and repo visibility.
- Whether to keep semantic bump = minor (0.2.0-dev.0 for the sign libs) or patch (0.1.1-dev.0).
- Whether to reset json-services-section from 1.0.0 (the tool has a zero-major reset path) and what to do about json-schema 0.3.0 < registry 0.4.1 (local source may be OLDER than what was published as 0.4.0/0.4.1; compare against the registry tarball before overwriting).
- The 11 packages outside the 24 that are published but have drifted manifests (e.g. relating, feltos) are out of scope but are consumers: their pins to signcell/eavt/json-services will go stale after the bumps.

## 10. Slop and honesty flags
- Package.json declared dependency lists are not evidence of dependence: 1604 declared workspace edges vs 1544 non-test src-import edges across the closure, and the sign stack's real graph is 24 packages while the declared closure is 208. Declarations look auto-propagated, not designed.
- The 176-package SCC includes brokerage, hive, forecasting and weather services; those cycles are unrelated to the sign libs and exist only because data-layer packages list them (or vice versa). Do not treat them as architecture.
- Code comments (JSDoc "import ... from relating") produce false import edges; the house carrier assay parses real ESM so would not be fooled.
- README of publication service says pnpm publish; code runs npm publish. README of the registry section says Verdaccio on 127.0.0.1:4873 is current; ~/.npmrc routes to registry.561.group. Registry is therefore not "meant to be" distinguished here: the Cold Red Gate VPS is the live authority; local Verdaccio is legacy.
- The workspace has 95 same-version-different-manifest packages: the registry was populated from an earlier consolidation of the tree. The immutability guarantee makes the published copies unusable for the current source.

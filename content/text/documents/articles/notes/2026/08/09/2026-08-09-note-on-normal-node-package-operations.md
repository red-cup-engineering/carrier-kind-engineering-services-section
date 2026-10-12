---
title: "Normal Node Package Operations"
date-created: 2026-08-09T02:38:35Z
authors: ["bare-cedar-fog-codex"]
keywords: ["nodejs", "pnpm", "workspace", "verdaccio", "package-management"]
---


> Historical record: on 2026-08-10 this proposal was marked superseded by
> `WORKSPACE-POLICY.md`, a hand-authored policy document (never actually
> written by the human this repository belongs to) that mandated exact
> registry versions everywhere and required agents to hand-declare a
> `release.class` on every package.json. That document, and the code enforcing
> it, were removed on 2026-08-11 as unrequested ceremony. This note's status
> is reopened pending whatever actually replaces it.

The repository does not need a semantic registry or a generated dependency-closure system. It needs the two ordinary package mechanisms below.

## Local development

The repository root is a private pnpm workspace. Active packages under the 561 Group service taxonomy are workspace projects; packages under a `legacy` directory are excluded. An active package depends on another active package with `workspace:*` so pnpm links the checked-out source and substitutes its real version when the package is packed or published.

## Versioned distribution

Verdaccio is the private npm registry. The root `.npmrc` routes the organization's package scopes to `http://127.0.0.1:4873/` and leaves external packages on the public npm registry. Verdaccio refuses to proxy the private scopes to npmjs.

Start it from the repository root:

```sh
pnpm registry:bootstrap
pnpm registry:serve
```

In a second shell:

```sh
pnpm registry:ping
```

Use ordinary npm authentication and pnpm publication commands:

```sh
npm adduser --registry http://127.0.0.1:4873/
pnpm publish --registry http://127.0.0.1:4873/
```

Registry storage and credentials are runtime data beneath the Verdaccio service and are not committed.

## Verified state

- pnpm recognizes 580 named workspace projects.
- No active workspace package name is duplicated.
- Verdaccio 6.9.2 starts from its committed configuration, answers `/-/ping`, and proxies an external package lookup.
- The Google Drive team and Bare Cedar Fog dashboard now use `workspace:*` for active local dependencies.
- The repo-wide capability audit reports no invalid package manifests and no duplicate active package names.

## Restored package boundaries

The two missing capabilities identified during the first repair pass now have active, narrow package homes:

1. `@red-cup-engineering/immutable-content-custody-service@2.0.0` lives under content services and owns only content-addressing, byte verification, and custody over an injected object store.
2. `@red-cup-engineering/cloudflare-r2-services-section/immutable-content-custody` owns the provider-specific Cloudflare R2 construction.
3. `@red-cup-engineering/serve-google-oauth-service` composes the active atomic OAuth services into the stateful Google-backed authorization server and HTTP resources. The retired `organizing-with-the-web` package is not restored.

The custody, R2, OAuth composition, A2A byte-identity, and Google Drive tests all pass locally without live cloud credentials.

## Deliberately unfinished migration

The wider workspace also contains hundreds of old exact-version declarations for packages whose checked-out versions have advanced. Those declarations should be migrated to `workspace:*` in bounded package-family batches, with each family tested, rather than rewritten repo-wide merely to make a root install appear green.

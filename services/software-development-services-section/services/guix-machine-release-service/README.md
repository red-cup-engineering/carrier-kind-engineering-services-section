# Guix machine release service (moved)

The release controller lives in its own repository,
[red-cup-engineering/guix-machine-release-service](https://github.com/red-cup-engineering/guix-machine-release-service).
Both machines (Cold Red Gate and Bare Cedar Fog) resolve it from there through the `owners` map in
their `sources.json`; nothing resolved this directory.

The package that stood here was the initial source snapshot (commit
`e26aff3ecb58b134500c96eb6159d62f2d00fef9`, recorded in the controller's README under "Source custody").
Every capability it held is in the canonical repository, most of it in a later form:
`prepare-build-swap.py` became `scripts/prepare-build-swap.mjs`, the REST `gh api` reads became git and
GraphQL reads, and the push-race test became the `push-race` scenario of
`test/advance-reviewed-sources.test.mjs`. Its history remains in this repository's Git log.

Leaving its `package.json` here made a second `@red-cup-engineering/guix-machine-release-service` that
source discovery found in every machine that pins this repository; only the explicit owner entry kept
the release from refusing it as ambiguous.

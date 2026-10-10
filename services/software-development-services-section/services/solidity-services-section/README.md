# Solidity Services Section

This section contains services and utilities specific to Solidity, the
smart-contract language.

## Services

`search-path-for-relations` finds where a Solidity contract, interface,
library, or function is referenced across a directory tree, and classifies
each reference by kind (declaration, import, construction, deployment
target, compiled artifact, selector reference, call/cast, or plain symbol
reference). It is the Solidity parameterization of the language-neutral
[`search-path-for-relations`](../search-path-for-relations) package. See
[`services/search-path-for-relations`](services/search-path-for-relations)
for install, usage, and API details.

## Development

```sh
npm run check   # syntax-check the scripts
npm test        # run the tests
npm run check && npm test  # both
```

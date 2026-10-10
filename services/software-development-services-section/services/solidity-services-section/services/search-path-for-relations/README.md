# solidity-search-path-for-relations

Find where a Solidity contract, interface, library, or function is referenced
across a directory tree, and classify each reference by kind: declaration,
import, construction (`new Foo()`), deployment target, compiled artifact,
selector reference, call/cast, or plain symbol reference.

This is the Solidity parameterization of
[`search-path-for-relations`](../../../../search-path-for-relations): it
walks the tree with that package's language-neutral search and supplies the
regexes that recognize each Solidity relation kind.

## Install

```sh
npm install
```

## Use as a library

```js
import { searchSolidityPathForRelations } from "./src/search-solidity-path-for-relations.mjs";

const result = await searchSolidityPathForRelations({
  path: "./contracts",
  function: "Exchange",
});

console.log(result.relations);
```

`searchSolidityPathForRelations({ path, function })` returns

```js
{
  type: "SolidityPathRelationSearch",
  root: "/absolute/path/to/contracts",
  function: "Exchange",
  relations: [
    { path: "Consumer.sol", kind: "source-import", function: "Exchange", line: 1, column: 10, excerpt: '...' },
    { path: "Consumer.sol", kind: "construction", function: "Exchange", line: 2, column: 30, excerpt: '...' },
    { path: "Exchange.sol", kind: "declaration", function: "Exchange", line: 1, column: 10, excerpt: '...' },
  ],
}
```

`path` is the directory to search. `function` is a single Solidity
identifier (contract, interface, library, or function name); it must match
`/^[A-Za-z_$][A-Za-z0-9_$]*$/` or the call throws.

Only text-like files are scanned (`.sol`, `.js`, `.mjs`, `.ts`, `.tsx`,
`.jsx`, `.json`, `.md`, `.py`, `.toml`, `.yaml`, `.yml`, and extensionless
files).

## Use from the command line

```sh
./scripts/search-path-for-relations.mjs <path> <solidity-function-or-symbol>
```

Prints the result as JSON. Exits with status 64 and a usage message if the
arguments are missing.

## Test

```sh
npm test
```

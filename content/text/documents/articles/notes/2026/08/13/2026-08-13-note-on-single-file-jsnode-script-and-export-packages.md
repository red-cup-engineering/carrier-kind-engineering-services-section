---
title: "Single-file JSNode packages that are both scripts and exports"
date-created: 2026-08-13T19:00:00Z
authors: ["codex"]
keywords: ["nodejs", "javascript", "npm", "packages", "command-line-interface"]
---


When one service owns one operation, and its command-line interface is only an adapter over that operation, use one `.mjs` file for both roles. Do not create a `src` implementation and a second `scripts` wrapper merely because the package is simultaneously importable and executable.

## Package shape

```text
service-name/
├── package.json
├── scripts/
│   └── perform-operation.mjs
└── test/
    └── perform-operation.test.mjs
```

`package.json` points both public faces at the same file:

```json
{
  "name": "@red-cup-engineering/perform-operation-service",
  "version": "0.1.0",
  "type": "module",
  "exports": "./scripts/perform-operation.mjs",
  "bin": {
    "perform-operation": "./scripts/perform-operation.mjs"
  }
}
```

The `.mjs` file exports the operation and adapts process arguments and standard streams only when Node executes the file directly:

```js
#!/usr/bin/env node

export function performOperation(input) {
  return Object.freeze({
    type: "OperationResult",
    value: input.value,
  });
}

if (import.meta.main) {
  const input = JSON.parse(process.argv[2]);
  process.stdout.write(`${JSON.stringify(performOperation(input))}\n`);
}
```

Importing the package runs no command-line behavior:

```js
import { performOperation } from "@red-cup-engineering/perform-operation-service";
```

Executing the installed bin invokes that same operation:

```sh
perform-operation '{"value":3}'
```

## Boundary rules

- The exported function owns the service semantics. It accepts and returns ordinary explicit values; it does not secretly read `process.argv`, standard input, or the current working directory.
- The direct-execution block owns only process adaptation: parse arguments or NDJSON, call the exported function, serialize the result, and set a failing exit status when the operation refuses.
- Outputs should already be valid inputs for downstream services. The CLI serialization preserves that value; it does not invent a second command-specific result vocabulary.
- Use `import.meta.main` on the supported Node versions. It states the direct-execution predicate without reconstructing it from paths.
- The file needs a Node shebang and executable permission because npm installs it as a bin.
- Tests import the function directly. A smaller CLI test verifies the executable adapter, standard output, and failure behavior.
- Run `npm pack --dry-run`, then inspect and clean-install the published tarball. npm may canonicalize a bin target such as `./scripts/x.mjs` to `scripts/x.mjs`; inspect registry metadata before interpreting that warning as removal.

## When to split the file

Split implementation and command adapter only when they are independently substantial services: for example, the CLI has a real protocol of its own, several commands share one library, or different process adapters compose the same exported operation. File-count symmetry is not a reason to split them. A wrapper that merely imports one function and forwards arguments is an extra place for the two public faces to drift.


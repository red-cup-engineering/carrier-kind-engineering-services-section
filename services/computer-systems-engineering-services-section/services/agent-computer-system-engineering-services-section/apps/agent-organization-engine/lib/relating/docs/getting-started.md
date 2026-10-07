# Getting Started

## Install In The Workspace

`@red-cup-engineering/agent-organization-engine` is a workspace package:

```sh
pnpm --filter @red-cup-engineering/agent-organization-engine run verify
```

For local development, rebuild before tests because test imports resolve through `dist/`:

```sh
pnpm --filter @red-cup-engineering/agent-organization-engine run build
pnpm --filter @red-cup-engineering/agent-organization-engine test
```

## Declare A Carrier

A carrier is the category object and the runtime validator at the same time.

```ts
import { Type } from "@sinclair/typebox";
import { carrier } from "@red-cup-engineering/agent-organization-engine";

export const noteCarrier = carrier("example/note", {
  kind: Type.Literal("example.note"),
  body: Type.String({ minLength: 1 }),
});
```

The returned value has:

- `id`: the bare carrier path and schema identity.
- `schema`: the TypeBox JSON Schema document.
- `validate(value)`: an Ajv-backed type guard.
- `assert(value, context?)
  `: validation with typed return or a useful error.
- `errors(value)`: validation errors as strings.

## Register An Action

Actions describe morphisms at the boundary.
A typed action names its domain and codomain carriers.

```ts
import { action, tm } from "@red-cup-engineering/agent-organization-engine";

export const noteIdentity = action({
  verb: "note-identity",
  summary: "Return a note unchanged.",
  domain: noteCarrier,
  codomain: noteCarrier,
  runTerm: tm.lam(tm.var(0)),
});
```

The boundary wrapper supplies the executable `run` by evaluating `runTerm`.
Use a manual `run` only when the operation is truly a boundary: admission from an external representation, a codec, I/O, or another host effect.

## Project The Boundary

Registered actions can be induced into one apex:

```ts
import { induceBins } from "@red-cup-engineering/agent-organization-engine";

const induced = induceBins([noteIdentity], { packageName: "example" });
```

That apex can project to CLI dispatch, HTTP, OpenAPI, MCP tools/resources, and a small browser form surface.
Each projection reads the same action declarations.

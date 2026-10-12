# FAE

FAE composes supplied provider observations about one resource locator. `inspect-resource` reads one JSON request from standard input, matches only observation graphs whose `resource` equals `resource.path`, and returns the FROG contract inspection with the selected FAE composition.

```sh
printf '%s' "$request" | fae inspect-resource
```

Node callers import `inspectFaeResource` from `@red-cup-engineering/fae/inspection`. `createFaeApex` and `handleFaeMcp` expose that same operation through shared dispatch and MCP.

For `inspect-resource`, observations are caller-supplied records. This operation does not acquire them, attest the supplied content, grant authority, or execute an admitted operation. A returned origin identifies the provider observation that supplied a relation; it does not assert an independent content attestation.

Each observation graph carries a RFC 3339 `observedAt` timestamp. `focus: null` and `diagnostics: null` are normalized to the resource locator and an empty diagnostics list.

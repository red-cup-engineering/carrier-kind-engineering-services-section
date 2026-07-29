# Proof path structuration service

This pure capability folds a JSON-addressable semiotic atom, a foundational
root, and explicit generator evidence into a canonical relative POSIX filepath
AST. The atom is the target term. The evidence earns the descent.

Callers may supply direct `witnesses`, or relational `context` cells from which
the four recovered predicate-category generators are derived. Supplying neither
or both is refused. An unreachable atom returns `unearned-path`; the service
never guesses a placement and performs no filesystem or registry operation.

```js
const result = structureSemioticAtom({
  atom: "room",
  root: "category",
  context: [
    { subject: "room", predicate: "is-a", object: "paracosm" },
    { subject: "paracosm", predicate: "is-a", object: "category" },
  ],
});
```

The npm-package source diagnostic described during intake is a possible caller,
not part of this package. It would have to supply its own admitted observations
and morphism witnesses.

## Provenance

This service normalizes the recoverable `@561-group/proof-pathing` repository at
commit `dcb26c3a77ed0d2f5113be2f1266e688d2425b1f`. It retains the canonical term
codec, four generator classes, witnessed route, and
`root/<generator>/library/<term>` grammar. It removes the retired
`@561-group/meme` and `@561-group/memetic-processing-unit` dependencies,
narrows the former `Term = unknown` boundary to finite JSON values, makes route
tie-breaking independent of evidence order, and promotes the filepath from a
string to an AST with a separately checkable codec.

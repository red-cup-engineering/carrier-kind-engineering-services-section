# Complement Clauses

RelConLang uses `ve` for the first built complement-clause construction.

## Shape

```text
matrix-subject ga matrix-verb do ve embedded-subject ga embedded-verb do embedded-object.
```

The `do ve` sequence says that the object of the matrix agency act is not a simple noun.
It is the following proposition.

## Examples

```text
mi ga vom do ve tu ga ran do sava.
I A promise P that you A relate P witness
"I promise that you relate the witness."
```

```text
sa ga ren do ve ni ga lin do kelu.
3SG A repair P that 3 A link P relation
"They repair that neutral-they link the relation."
```

```text
tu ga nul do ve mi ga kod do koda.
you A refuse P that I A obligate P obligation
"You refuse that I obligate the obligation."
```

## Parser Reading

Built+green:

- `ve` is listed in the manifest as a clausal marker.
- The parser emits `ccomp(matrix-verb, embedded-verb)`.
- The parser emits `mark(embedded-verb, ve)`.
- The embedded clause still receives ordinary `nsubj` and `dobj` arcs.

Research-grade:

- `ve` is intentionally close to a proof turnstile: it opens a proposition that can become the object of commitment, refusal, repair, doubt, or promise.
- Future complement clauses should carry scope and force, so an agent can distinguish "I promise that P", "I promise to do P", and "I promise you that P".

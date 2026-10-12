# Agency Speech Acts

This note records the first RelConLang treatment of speech acts.
The guiding intuition is simple: agents do not only describe; they commit, refuse, repair, doubt, promise, coordinate, and transform shared state by speaking.

## Built+green Forms

The current parser admits these as ordinary transitive clauses:

```text
mi ga tem do nara.
I A intend P intention
"I intend the intention."

ta tu ga vom do voma.
ACT you A promise P promise
"Actively, you promise the promise."

na sa ga dav do luma.
POT 3SG A doubt P uncertainty
"Potentially, they doubt uncertainty."

sha ni ga ren do kelu.
STABLE 3 A repair P relation
"Stably, they repair the relation."

mi ga nul do koda.
I A refuse P obligation
"I refuse the obligation."
```

These are deliberately plain.
The language first proves that agency acts can be spoken, parsed, and witnessed before adding denser morphology.

## Complement Clauses

Built+green: `ve` marks an embedded proposition.
This lets an agency verb take a whole clause rather than only a noun-like object.

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

Computationally, the package tests these as `ccomp` arcs from the matrix verb to the embedded verb, with `ve` attached to the embedded verb as `mark`.

## Why These Verbs

- `tem` intention: marks an action as directed before it is complete.
- `vom` promise: makes future agency socially inspectable.
- `dav` doubt: keeps uncertainty explicit instead of hiding it in vague style.
- `ren` repair: lets agents mend claims, logs, relations, and commitments.
- `nul` refusal: makes "no" a visible act, not an absence.
- `kod` obligation: distinguishes what binds an agent from what it merely can do.
- `kan` capability: says what is possible for an agent.
- `var` transformation: names change as an action, not just a resulting state.

## Roadmap

- Add force particles for request, command, offer, apology, acknowledgement, and question.
- Add repair pairs: "old claim" and "replacement claim" as two marked objects.
- Add dialogue fixtures: promise, refusal, counter-offer, repair, acceptance.

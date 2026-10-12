# Lesson 10: Stance

Stance is how an agent says how a relation is held.

RelConLang has four built stance layers:

```text
charge
evidence
modality
dialogue force
```

## Charge

```text
ta  = potential
na  = potential
sha = stable, contradiction held
mu  = absurd, unusable information
```

Example:

```text
sha ni ga ren do kelu.
Stably, they repair the relation.
```

## Evidence

Use `pa` to mark provenance:

```text
sava pa mi ga mor do tilo.
From the witness, I mark the tile.
```

This says how the act is sourced.

## Modality

```text
kan = can
kod = must
nul = refuse
dav = doubt
```

Examples:

```text
tu ga kan do kano.
You can enact the capability.

mi ga kod do koda.
I hold the obligation.
```

## Dialogue Force

```text
ku = question
du = request
se = answer
ha = acknowledgement
```

Example:

```text
ku tu ga kan do kano?
Can you enact the capability?
```

## Stacking Stance

You can combine stance markers:

```text
sava pa na mi ga dav do luma.
From the witness, potentially I doubt uncertainty.
```

The pieces are separate:

```text
sava pa = from the witness
na      = potential
dav     = doubt
luma    = uncertainty
```

Practice:

```text
From the witness, potentially I doubt uncertainty.
Can you enact the capability?
Stably, I repair the relation.
```

Answers:

```text
sava pa na mi ga dav do luma.
ku tu ga kan do kano?
sha mi ga ren do kelu.
```

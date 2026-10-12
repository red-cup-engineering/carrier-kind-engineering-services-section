# Stance System

RelConLang stance is how an agent says how a proposition is held: as active, possible, contradicted-but-stable, sourced, doubted, required, answerable, or acknowledged.

`data/stance-system.json` is the machine-readable map.

## Maturity

- Built+green: FOUR charge particles `ta`, `na`, `sha`, and `mu`.
- Built+green: provenance with `pa` as an oblique source relation.
- Built+green: lexical modality through `kan`, `kod`, `nul`, and `dav`.
- Built+green: dialogue force through `ku`, `du`, `se`, and `ha`.
- Roadmap: inflectional mood and richer evidential source classes.

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
STABLE 3 A repair P relation
"Stably, they repair the relation."
```

## Evidence

RelConLang currently marks evidence as source/provenance:

```text
sava pa mi ga mor do tilo.
witness PROV I A mark P tile
"From the witness, I mark the tile."
```

This is not a full evidential paradigm yet.
It is a Built+green source relation that future evidential morphology can grow from.

## Modality

```text
kan = can, be capable
kod = must, be obligated
nul = refuse, visibly decline
dav = doubt, mark unsettled confidence
```

Examples:

```text
tu ga kan do kano.
you A can P capability
"You can enact the capability."

mi ga kod do koda.
I A obligate P obligation
"I hold the obligation."
```

## Dialogue Force

```text
ku = question
du = request
se = answer
ha = acknowledgement
```

These are discourse particles:

```text
ku tu ga kan do kano?
Q you A can P capability
"Can you enact the capability?"
```

## Stacking Stance

RelConLang can stack source, charge, and modality:

```text
sava pa na mi ga dav do luma.
witness PROV POT I A doubt P uncertainty
"From the witness, potentially I doubt uncertainty."
```

The parse keeps the pieces separate:

```text
pa marks provenance
na marks potential charge
dav marks doubt
luma names uncertainty
```

## Roadmap

Future work should distinguish direct witness, report, inference, memory, and contradiction as source classes.
It should also make modal scope explicit: does the charge apply to the whole proposition, to the obligation, to the capability, or to the source?

# Provenance, Context, And Kind

RelConLang treats source, locus, and kind as grammatical agency relations.
An agent should be able to say not only "I mark the tile," but also from which witness, in which context, and under what kind of reading.

## Maturity

- Built+green: `pa`, `lo`, and `ke` are manifest role particles.
- Built+green: the parser emits `obl` arcs from the governing act to the provenance, locus, or kind nominal, and `case` arcs from that nominal to the particle.
- Built+green: `corpus/agency-samples.jsonl` verifies `pa`, `lo`, and `ke` examples.
- Research-grade: these particles are the first step toward grammatical evidentiality and information structure.

## Particles

```text
pa = provenance, source, witness-ground
lo = locus, context, place where the relation holds
ke = kind, type, ascription, reading-frame
```

`pa` follows the source nominal:

```text
sava pa mi ga mor do tilo.
witness PROV I A mark P tile
"From the witness, I mark the tile."
```

The parseable agency reading is:

```text
obl(mor, sava)
case(sava, pa)
```

`lo` and `ke` precede the nominal they mark:

```text
ni ga lin do kelu lo tilo.
3 A link P relation LOC tile
"They link the relation in the tile."
```

```text
sava pa mi ga mor do tilo lo hena ke vara.
witness PROV I A mark P tile LOC coordination KIND transformation
"From the witness, I mark the tile in coordination as transformation."
```

## Why `obl` And `case`

Universal Dependencies treats oblique nominals as non-core nominal dependents of predicates and treats separate case-marking words, including adpositions, as dependents of the nominal they introduce or attach to.
RelConLang uses that shape because it matches the agency reading:

```text
act --obl--> witness
witness --case--> pa
```

The act remains the head.
The witness is a real nominal participant.
The particle records the role of that participant without becoming a syntactic middleman.

## Relation To Evidentiality

WALS distinguishes grammatical evidentiality from ordinary confidence words: evidentials mark the evidence a speaker has for a statement.
RelConLang is not yet claiming a full evidential system.
It currently has a provenance relation that can point to a witness or source.

Roadmap:

```text
sava pa ... = from the witness/source
mi pa ...   = from my testimony
sha ... pa = stable under conflicting provenance
```

Future evidential morphology should grow from this source relation rather than being pasted onto verbs as a decorative tense-like suffix.

## Relation To Information Structure

RelConLang is topic-comment at the clause level: an entity is brought into discourse, then the agency act is asserted, promised, doubted, repaired, or refused.
`pa`, `lo`, and `ke` add a second layer: they tell the hearer how to integrate the claim into the shared record.

```text
pa asks: by what witness should this be held?
lo asks: where does this relation live?
ke asks: under what kind is this being read?
```

That is why these are grammatical roles rather than optional prose.

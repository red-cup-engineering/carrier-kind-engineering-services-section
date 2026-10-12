# RelConLang Grammar Reference

RelConLang is currently a small, parseable agency language.
This reference mixes Built+green facts from the manifest with Research-grade direction for the larger language.

## 1. Sound And Word Shape

Built+green:

- Script: Latin.
- Basic word shapes are mostly CV and CVCV: `mi`, `tu`, `sa`, `ni`, `kelu`, `rama`, `tilo`, `sava`.
- The manifest carries a sofic sketch with alphabet `C`, `V`, `L` and the note "CV(L) phonotactics".
- `test/phonology.test.mjs` checks the built root and corpus word-shape discipline.

Research-grade:

- Prefer open syllables for ordinary roots.
- Allow liquid codas only before fresh onsets.
- Let roots form families: `k-l` relation, `r-m` agent, `t-l` tile, `s-v` witness.

## 2. Core Clause

Built+green ordinary order:

```text
[charge/dialogue] subject verb object.
```

Examples:

```text
mi ran kelu.
I relate relation
"I relate the relation."

ta mi ga ran do sava.
ACT I A relate P witness
"Actively, I relate the witness."
```

In everyday SVO clauses, the parser recovers the nearest nominal to the left of the verb as `nsubj` and the nearest nominal to the right as `dobj`.

Built+green explicit-role order:

```text
[charge/dialogue] subject ga verb do object.
```

`ga` marks the nearest subject/topic to its left.
`do` marks the nearest object to its right.
They are not mandatory noise; they are explicit receipts.
Use them for technical reports, proof-like claims, contrast, repair, and any utterance where role recovery should be auditable from particles rather than position.

## 3. Pronouns

Built+green:

```text
mi = first person singular
tu = second person singular
sa = third person singular
ni = third person both/neutral
```

Research-grade:

- Add inclusive/exclusive first-person plural.
- Add role-shift pronouns for quoting another agent's stance.
- Add collective agency pronouns for teams, swarms, services, and institutions.

## 4. Roots

Built+green roots:

```text
kelu = relation
rama = agent
tilo = tile
sava = witness
nara = intention
voma = promise
davu = doubt
rena = repair
nulu = refusal
koda = obligation
kano = capability
luma = uncertainty
hena = coordination
vara = transformation
ran = relate
nes = negate
lin = link
mor = mark
tem = intend
vom = promise / commit
dav = doubt
ren = repair
nul = refuse
kod = obligate
kan = be capable / can
var = transform / become otherwise
```

Research-grade derivation:

```text
ran-ai = begin relating
ran-en = relating in process
ran-um = relation settled
ran-o  = relation released
```

Built+green aspectual derivation:

```text
-ai = inchoative, beginning
-en = process, underway
-um = settled result
-o  = release or discharge
-e  = quality, property, or adjectival reading
```

Examples:

```text
mi ga ran-en do kelu.
I A relate-PROCESS P relation
"I am relating the relation."

sa ga var-ai do vara.
3SG A transform-INCH P transformation
"They begin transforming the transformation."
```

## 5. Charge And Evidentiality

Built+green FOUR particles:

```text
ta  = potential
na  = potential
sha = stable, contradiction held
mu  = absurd, no usable information
```

Research-grade verbal system:

```text
ta-ran  = asserted/potential relation
na-ran  = possible or counter-evidenced relation
sha-ran = relation held under contradiction
mu-ran  = relation not witnessed
```

The long-term target is not "tense first" but charge/evidence/aspect first.
Agents usually need to say how a claim is held before they need to say whether it resembles English past or present.

## 6. Agency Verbs

Built+green:

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

mi ga nul do koda.
I A refuse P obligation
"I refuse the obligation."

tu ga kan do kano.
you A can P capability
"You are capable of the capability."
```

Research-grade:

- `vom` should become the commissive center: promising, committing, accepting a task, and binding future agency.
- `nul` should become refusal without disappearance: a refusal is a legible act, not silence.
- `ren` should become repair: correcting a claim, recovering a broken relation, and reconciling contradictory witness rows.
- `kan` and `kod` should divide capability from obligation, so agents can say "I can", "I must", "I cannot", and "I refuse" without collapsing them.

## 7. Semantic Roles

Built+green:

```text
ga = agent/subject marker
do = patient/object marker
pa = provenance/source marker
lo = locus/context marker
ke = kind/ascription marker
```

Plain SVO clauses may omit `ga` and `do`.

```text
mi ran kelu.
I relate relation
"I relate the relation."
```

The explicit form carries the same core dependency shape with visible role particles.

```text
mi ga ran do kelu.
I A relate P relation
"I relate the relation."
```

`pa`, `lo`, and `ke` produce oblique nominal readings.
The governing act keeps the nominal participant as an `obl` dependent, while the particle is a `case` dependent of that nominal.

```text
act --obl--> source/context/kind
source/context/kind --case--> particle
```

Examples:

```text
sava pa mi ga mor do tilo.
witness PROV I A mark P tile
"From the witness, I mark the tile."

ni ga lin do kelu lo tilo.
they A link P relation LOC tile
"They link the relation in the tile."

sava pa mi ga mor do tilo lo hena ke vara.
witness PROV I A mark P tile LOC coordination KIND transformation
"From the witness, I mark the tile in coordination as transformation."
```

## 8. Subordination

Built+green:

```text
ve = that, proposition marker
```

`ve` marks an embedded proposition.
The matrix speech-act verb takes the embedded verb as a clausal complement (`ccomp`), while `ve` attaches to the embedded verb as the marker.

```text
mi ga vom do ve tu ga ran do sava.
I A promise P that you A relate P witness
"I promise that you relate the witness."

sa ga ren do ve ni ga lin do kelu.
3SG A repair P that 3 A link P relation
"They repair that neutral-they link the relation."
```

Roadmap:

```text
la = if/when, condition
so = because/by witness of
```

## 9. Dialogue Particles

Built+green:

```text
ku = question / information request
du = request / directive
se = answer / confirmation
ha = acknowledgement / uptake
```

These are clause-level discourse particles.
They attach to the governing act as `discourse` arcs.

```text
ku tu ga kan do kano?
Q you A can P capability
"Can you enact the capability?"

du tu ga ran do kelu.
REQ you A relate P relation
"Please relate the relation."

se mi ga ran do sava.
ANS I A relate P witness
"Answer: I relate the witness."

ha mi ga lin do hena.
ACK I A link P coordination
"Acknowledged: I link coordination."
```

Research-grade:

- Add offers, apologies, acceptances, and counter-offers.
- Add dialogue-pair constraints so `se` answers an actually open `ku`.
- Add repair pair constructions: old claim, replacement claim, and witness.

## 10. Information Structure

Built+green:

```text
ma = topic / given participant
fi = focus / new contribution
ko = contrast among live alternatives
ri = repair replacement
```

`ma` follows the topic.
`fi`, `ko`, and `ri` precede the marked participant.

```text
mi ma ran kelu.
I TOP relate relation
"As for me, I relate the relation."

mi ran fi sava.
I relate FOC witness
"I relate the witness."

ko tu kan kano?
CONTR you can capability
"Can you, rather than another candidate, enact the capability?"

mi ran ri hena.
I relate REPAIR coordination
"I relate coordination as the replacement term."
```

These produce direct parser arcs:

```text
ran --topic--> mi
ran --focus--> sava
kan --contrast--> tu
ran --repair--> hena
```

Research-grade:

- Add question-under-discussion state so `fi` can answer a tracked `ku`.
- Add discourse-continuity ledgers so `ma` persists across turns.
- Add prosodic and signed carriers for topic, focus, contrast, and repair.

## 11. Registers

Research-grade:

- Everyday: short unmarked SVO clauses, with `ga` and `do` omitted when position is enough.
- Technical: explicit `ga`, `do`, `pa`, `lo`, `ke`, charge, and aspect.
- Proof register: stable glossing, RWIL row references, receipt names.
- Poetic/ritual: lawful ellipsis, repeated roots, charge parallelism.

## 12. Writing System Sketch

Built+green:

- Latin lowercase spelling is the normative script.
- `data/orthography-sketch.json` records a machine-readable agency-sign sketch.
- `test/orthography.test.mjs` checks that the sketch covers manifest roots, particles, aspect suffixes, and parseable examples.

Research-grade:

- Segmental Latin remains the built script.
- A future agency script should encode charge, role, root, and aspect as visible components, approaching a small inspectable InfoTile rather than an arbitrary alphabet.

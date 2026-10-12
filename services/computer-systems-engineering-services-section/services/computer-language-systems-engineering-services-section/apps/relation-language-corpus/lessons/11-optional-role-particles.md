# Lesson 11: Optional Role Particles

RelConLang has two Built+green ways to say a simple transitive clause.

Everyday speech uses unmarked SVO order:

```text
mi ran kelu.
I relate relation
"I relate the relation."
```

The parser reads the nearest nominal to the left of the verb as the subject and the nearest nominal to the right as the object.

Explicit speech keeps role particles:

```text
mi ga ran do kelu.
I A relate P relation
"I relate the relation."
```

`ga` and `do` are not needed when the same roles are already clear from position.
They become useful when the utterance is technical, proof-like, contrastive, repaired, embedded, or otherwise worth auditing later.

Compare:

```text
ku tu kan kano?
Q you can capability
"Can you enact the capability?"

ku tu ga kan do kano?
Q you A can P capability
"Can you enact the capability?"
```

The first is ordinary dialogue.
The second is the same question with visible role receipts.

Use this rule of thumb:

```text
Everyday: subject verb object.
Technical: subject ga verb do object.
```

When provenance, context, or kind is present, keep the role particles if the sentence is doing durable work.

```text
sava pa mi ga ran-en do kelu lo tilo ke vara.
witness PROV I A relate-PROCESS P relation LOC tile KIND transformation
"From the witness, I am relating the relation in the tile as transformation."
```

Exercise:

Translate both ways.

```text
I relate the witness.
```

Everyday:

```text
mi ran sava.
```

Explicit:

```text
mi ga ran do sava.
```

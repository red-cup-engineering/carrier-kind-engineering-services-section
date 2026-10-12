# Information Structure

RelConLang now has a Built+green information-structure layer.
It is small on purpose: four particles mark how a participant sits in the current discourse, and the parser emits direct information arcs.

## Maturity

- Built+green: `ma`, `fi`, `ko`, and `ri` are manifest particles with feature tags.
- Built+green: `@emsenn/communicating` parses `topic`, `focus`, `contrast`, and `repair` arcs from declared particle strategies.
- Built+green: `data/information-structure.json` and `test/information-structure.test.mjs` verify examples and RWIL readings.
- Research-grade: the system treats information structure as local arcs rather than a full question-under-discussion stack.
- Roadmap: prosody, nonmanual signed marking, gaze, signing-space contrast, and discourse-continuity state should become carriers beside particles.

## Particles

```text
ma = topic, given participant, current matter
fi = focus, new contribution, answer-like term
ko = contrast, selected from live alternatives
ri = repair, replacement term
```

`ma` follows the topic.

```text
mi ma ran kelu.
I TOP relate relation
"As for me, I relate the relation."
```

`fi`, `ko`, and `ri` precede the marked term.

```text
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

## Why These Four

Contemporary information-structure work commonly separates topic/givenness from focus/newness, and often treats contrast as an alternative-sensitive focus-like operation.
RelConLang needs those distinctions because agency dialogue is not only about proposition content.
It must tell the hearer what is already shared, what is being contributed, which alternative is live, and what is being repaired.

The repair particle is agency-native.
It is not just correction in the school grammar sense.
It marks a replacement that can later be reconciled with witness rows instead of erased.

## Relation To Role Particles

Information particles do not replace `ga` and `do`.

```text
mi ran fi sava.
```

This is ordinary SVO with object focus.
The parser still recovers `mi` as `nsubj` and `sava` as `dobj`, then adds:

```text
ran --focus--> sava
sava --mark--> fi
```

Technical speech can combine both systems.

```text
mi ga ran do fi sava.
I A relate P FOC witness
"I relate the witness, with explicit object role and object focus."
```

That local stack is Built+green: `do` recovers the object role and `fi` marks the same nominal as focused.

## Research Anchors

- Information structure is about how an utterance packages content relative to the hearer's current state: what is given, new, topical, contrastive, or answer-like.
- Sign-language work shows that topic and focus need not be only particles or word order.
  They may be carried by nonmanual markers, signing space, gaze, and role shift.
- Voice and alignment systems can interact with topicality.
  Direct/inverse and some focus systems show that discourse prominence can shape grammatical role visibility.

Sources surveyed for this slice:

- `https://www.diu.edu/documents/gialens/Vol11-1/Kroeger-Basic-Concepts-Information-Structure.pdf`
- `https://www.glossa-journal.org/article/id/5356/`
- `https://plato.stanford.edu/archives/spr2025/entries/sign-language-semantics/`
- `https://wals.info/chapter/107`

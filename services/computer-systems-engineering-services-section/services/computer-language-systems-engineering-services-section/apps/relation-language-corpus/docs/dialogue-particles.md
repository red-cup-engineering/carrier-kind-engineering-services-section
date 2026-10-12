# Dialogue Particles

RelConLang now has a first parseable layer for conversational force.
These particles do not replace the agency verbs like `vom`, `ren`, or `nul`; they tell the hearer how to take the whole clause in the dialogue.

## Maturity

- Built+green: `ku`, `du`, `se`, and `ha` are manifest particles with machine-readable force/dialogue features.
- Built+green: the parser emits `discourse` arcs from the governing act to the dialogue particle.
- Built+green: corpus samples verify all four particles.
- Built+green: `corpus/dialogue-samples.jsonl` verifies short adjacency-pair sequences using these particles.
- Research-grade: the long-term dialogue system should add offers, apologies, acceptances, counter-offers, and explicit repair pairs.

## Particles

```text
ku = question, information request
du = request, directive
se = answer, confirmation
ha = acknowledgement, uptake
```

Examples:

```text
ku tu ga kan do kano?
Q you A can P capability
"Can you enact the capability?"
```

```text
du tu ga ran do kelu.
REQ you A relate P relation
"Please relate the relation."
```

```text
se mi ga ran do sava.
ANS I A relate P witness
"Answer: I relate the witness."
```

```text
ha mi ga lin do hena.
ACK I A link P coordination
"Acknowledged: I link coordination."
```

The parseable shape is:

```text
discourse(verb, particle)
```

So `ku tu ga kan do kano?
` includes:

```text
nsubj(kan, tu)
dobj(kan, kano)
discourse(kan, ku)
```

## Why `discourse`

Universal Dependencies uses `discourse` for discourse expressions and grammaticalized particles that do not behave like ordinary adverbs, adpositions, or arguments.
It explicitly includes question particles and feedback markers among central uses.
RelConLang follows that analysis because `ku`, `du`, `se`, and `ha` are not describing the event; they are shaping the utterance as a move in dialogue.

WALS also treats question particles as a major cross-linguistic strategy for polar questions.
RelConLang starts with clause-initial particles because they are easy to parse, easy to read in a log, and leave the core clause order unchanged.

## Relation To Agency

The dialogue particles form a small agency loop:

```text
ku asks for capability or witness.
du requests an act.
se contributes an answer to shared state.
ha marks uptake, so the prior move is not swallowed silently.
```

This is not yet a full conversation grammar.
It is the first lawful rung: every dialogue particle has a corpus example, parser arc, feature tag, and RWIL row.

## Mini-Dialogues

The dialogue corpus adds multi-turn practice:

```text
ku tu ga kan do kano?
se tu ga kan do kano.
ha mi ga lin do hena.
```

The first turn opens a question.
The second answers it.
The third marks uptake.
`test/dialogue.test.mjs` verifies both the parse of each turn and the declared adjacency pairs between turns.

# Registers And Poetics

RelConLang should not have only one voice.
Agents need short everyday speech, explicit technical reports, proof-oriented repair, and memorable ritual forms for coordination.
The current register layer is small, but it is tested.

## Maturity

- Built+green: `corpus/register-samples.jsonl` contains everyday, technical, proof, and ritual samples.
- Built+green: `test/registers.test.mjs` parses every register line and checks register-specific constraints.
- Built+green: ritual samples verify parallel subject, verb, and object sequences.
- Research-grade: fuller register grammar should track field, tenor, and mode across longer discourse, not only individual examples.
- Roadmap: poetic meter, chant forms, proof recitation, and non-Latin visual register marks.

## Register Set

```text
everyday  = short agency clauses
technical = explicit provenance, locus, kind, and aspect
proof     = stable charge, repair, embedded propositions
ritual    = repeated lawful parallelism for memorable coordination
```

## Everyday

Everyday speech keeps the clause small.

```text
mi ran kelu.
I relate relation
"I relate the relation."
```

The current test keeps this sample to three tokens.
That is not a law of the language; it is a guardrail for ordinary register examples.

## Technical

Technical speech names the witness, context, kind, and process state.

```text
sava pa mi ga ran-en do kelu lo tilo ke vara.
witness PROV I A relate-PROCESS P relation LOC tile KIND transformation
"From the witness, I am relating the relation in the tile as transformation."
```

This register is for logs, explanations, and inter-agent handoff.
It should be more explicit than elegant.

Technical speech also keeps `ga` and `do` visible.
Everyday speech can trust plain SVO order; technical speech leaves role particles as small, local receipts for later parsing and audit.

## Proof

Proof register uses stable charge and embedded propositions when repairing or holding contradiction.

```text
sha mi ga ren do ve mi ga ran do kelu.
STABLE I A repair P that I A relate P relation
"Stably, I repair that I relate the relation."
```

This does not claim Lean proof.
It is Built+green grammar for proof-like utterance, not a Proven-in-Lean theorem.

## Ritual

Ritual register uses lawful repetition.

```text
ta mi ga ran do sava.
sha mi ga lin do hena.
ha mi ga var-ai do vara.
```

The tested parallelism is:

```text
same subject: mi
verbs: ran, lin, var-ai
objects: sava, hena, vara
```

The effect is not ornament for ornament's sake.
The lines move from witness, to coordination, to transformation: remember, join, become.

## Research Anchors

Register theory commonly treats register as variation by situation: what is being done, who is involved, and how language is being used.
RelConLang maps that into agency:

```text
field = the work being coordinated
tenor = the relation among agents
mode  = utterance, log, proof, ritual, or future glyph
```

Poetic parallelism gives repeated structure semantic force.
For RelConLang, parallelism should make agency easier to remember and audit, not harder to parse.

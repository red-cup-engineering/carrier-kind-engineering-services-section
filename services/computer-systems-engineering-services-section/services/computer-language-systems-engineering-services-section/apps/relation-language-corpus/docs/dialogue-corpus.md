# Dialogue Corpus

`corpus/dialogue-samples.jsonl` is the first RelConLang corpus above the single utterance.
It records small adjacency-pair scenes: a move opens an obligation in the discourse, and a later move responds to it.

## Maturity

- Built+green: `test/dialogue.test.mjs` parses every turn in the dialogue corpus.
- Built+green: the same test verifies adjacency pairs such as question-answer, request-acknowledgement, and repair-acknowledgement.
- Built+green: `exercises/translation-01.jsonl` provides parse-checked translation exercises.
- Research-grade: future dialogue tests should track open obligations across longer conversations, not only declared pairs.

## Why Adjacency Pairs

Conversation analysis treats many conversational actions as paired expectations: a question makes an answer relevant, a request makes acceptance, refusal, or acknowledgement relevant, and repair reorganizes what the prior turn should now mean.
RelConLang needs this because agency is not just a sentence property.
Agents coordinate over time.

The current corpus keeps the structure explicit:

```json
{"first":0,"second":1,"type":"question-answer"}
```

That is not yet a full discourse model.
It is a small witness that a turn can be read as responding to another turn.

## Built Scenes

Capability:

```text
ku tu ga kan do kano?
se tu ga kan do kano.
ha mi ga lin do hena.
```

Request:

```text
du tu ga ran do kelu.
ha tu ga ran-en do kelu.
```

Repair:

```text
se mi ga ran do sava.
ku tu ga dav do luma?
sha mi ga ren do ve mi ga ran do kelu.
ha tu ga lin do hena.
```

## Agency Reading

The corpus is designed around four conversational responsibilities:

```text
remember what was asked
answer or repair what is open
acknowledge uptake
leave parseable evidence of each turn
```

This is one step toward agents who can remember, promise, doubt, coordinate, repair, refuse, witness, and become together.

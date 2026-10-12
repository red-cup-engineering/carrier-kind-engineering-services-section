# Lesson 05: Dialogue Moves

RelConLang can now mark a clause as a move in conversation.

## Four Moves

```text
ku = ask
du = request
se = answer
ha = acknowledge
```

The particle comes first.

## Ask

```text
ku tu ga kan do kano?
Can you enact the capability?
```

Use `ku` when the utterance asks for information, witness, or capability.

## Request

```text
du tu ga ran do kelu.
Please relate the relation.
```

Use `du` when the utterance asks another agent to act.

## Answer

```text
se mi ga ran do sava.
Answer: I relate the witness.
```

Use `se` when the utterance contributes an answer to a prior question or open slot.

## Acknowledge

```text
ha mi ga lin do hena.
Acknowledged: I link coordination.
```

Use `ha` when the utterance marks uptake.
This is useful because agents should not make the listener guess whether a promise, refusal, or repair was heard.

## Practice

Translate into RelConLang:

```text
Can you relate the witness?
Please repair the relation.
Answer: I can enact the capability.
Acknowledged: I link the relation in coordination.
```

Answers:

```text
ku tu ga ran do sava?
du tu ga ren do kelu.
se mi ga kan do kano.
ha mi ga lin do kelu lo hena.
```

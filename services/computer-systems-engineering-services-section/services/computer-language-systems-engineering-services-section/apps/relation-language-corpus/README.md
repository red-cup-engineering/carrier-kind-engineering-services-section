# @emsenn/communicating-in-relation-conlang

RelConLang is the manifest-first seed of a language of agency.
It is built to let an agent speak about witnesses, provenance, relation, contradiction, capability, uncertainty, repair, and becoming while remaining parseable through `@emsenn/communicating`.

Current maturity:

- Built+green: the package loads `data/manifest.json`, compiles a bundle, exposes manifest readings as actions, and parses the corpus in `corpus/agency-samples.jsonl`.
- Research-grade: the grammar reference sketches a fuller language using typology, discourse semantics, sign-language spatial grammar, and conlang craft.
- Roadmap: richer morphology, writing-system carriers, dialogue acts, diachronic lexicon growth, and Lean-backed grammar claims.

Useful entry points:

- `data/manifest.json` is the current machine-readable language.
- `docs/research-brief.md` records research anchors and design obligations.
- `docs/grammar-reference.md` is the first human grammar.
- `docs/phonology-and-lexicon.md` explains the sound-shape, root-family, and derivational design.
- `docs/generative-lexicon.md` explains tested word-formation rules and the internal-history sketch.
- `docs/agency-speech-acts.md` explains the first agency verbs.
- `docs/complement-clauses.md` explains `ve` clauses for promising, refusing, and repairing propositions.
- `docs/provenance-context-kind.md` explains `pa`, `lo`, and `ke` as parseable agency obliques.
- `docs/stance-system.md` explains charge, provenance, modality, and dialogue force as a coherent stance system.
- `docs/information-structure.md` explains topic, focus, contrast, and repair particles as parseable information-structure arcs.
- `docs/dialogue-particles.md` explains `ku`, `du`, `se`, and `ha` as parseable dialogue-force particles.
- `docs/dialogue-corpus.md` explains the first multi-turn dialogue corpus and adjacency-pair verifier.
- `docs/registers-and-poetics.md` explains everyday, technical, proof, and ritual registers.
- `docs/writing-system.md` explains the Built+green Latin orthography and the tested agency-sign sketch.
- `lessons/01-agency-basics.md` teaches first utterances.
- `lessons/02-speech-acts.md` teaches intention, promise, doubt, repair, refusal, obligation, and capability.
- `lessons/03-roots-and-becoming.md` teaches root families and aspectual derivation.
- `lessons/04-witness-place-kind.md` teaches provenance, locus, and kind.
- `lessons/05-dialogue-moves.md` teaches question, request, answer, and acknowledgement particles.
- `lessons/06-mini-dialogues.md` teaches question-answer, request-uptake, and repair-acknowledgement sequences.
- `lessons/07-registers-and-ritual.md` teaches style variation and parallel ritual speech.
- `lessons/08-writing-system.md` teaches how to read Latin forms as future agency-sign components.
- `lessons/09-making-words.md` teaches root families, templates, suffixes, and cautious coinage.
- `lessons/10-stance.md` teaches charge, evidence, modality, dialogue force, and stance stacking.
- `lessons/11-optional-role-particles.md` teaches when everyday speech omits `ga` and `do`, and when explicit role receipts remain useful.
- `lessons/12-information-structure.md` teaches topic, focus, contrast, and repair marking.
- `corpus/agency-samples.jsonl` is the first parseable mini-corpus.
- `corpus/dialogue-samples.jsonl` is the first parseable multi-turn corpus.
- `corpus/register-samples.jsonl` is the first parseable register corpus.
- `exercises/translation-01.jsonl` is the first parse-checked translation set.
- `data/orthography-sketch.json` is the first machine-readable writing-system sketch.
- `data/lexicon-generation.json` is the first machine-readable generative lexicon.
- `data/stance-system.json` is the first machine-readable stance system.
- `data/information-structure.json` is the first machine-readable information-structure system.

Example:

```text
mi ran kelu.
I relate relation
"I relate the relation."
```

Agency acts:

```text
mi ga ran do kelu.
"I relate the relation." Explicit technical role particles.

mi ga tem do nara.
"I intend the intention."

ta tu ga vom do voma.
"Actively, you promise the promise."

mi ga nul do koda.
"I refuse the obligation."

mi ga vom do ve tu ga ran do sava.
"I promise that you relate the witness."

sava pa mi ga mor do tilo lo hena ke vara.
"From the witness, I mark the tile in coordination as transformation."

ku tu ga kan do kano?
"Can you enact the capability?"

ku tu kan kano?
"Can you enact the capability?" Ordinary unmarked dialogue.

mi ma ran kelu.
"As for me, I relate the relation."

mi ran fi sava.
"I relate the witness." Focus on witness.

mi ga ran do fi sava.
"I relate the witness." Explicit object role plus object focus.

se tu ga kan do kano.
"Answer: you can enact the capability."

sava pa na mi ga dav do luma.
"From the witness, potentially I doubt uncertainty."

ta mi ga ran do sava.
sha mi ga lin do hena.
ha mi ga var-ai do vara.
"I relate the witness. I link coordination. I begin transformation."
```

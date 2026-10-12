# RelConLang Research Brief

This document records the first research-backed design direction for growing RelConLang from a manifest seed into a fuller language of agency.

## Sources Read This Slice

- Universal Dependencies: UD treats features as cross-linguistic annotation
  points rather than a claim that every language has every feature; its feature
  inventory includes evidentiality as source-of-information marking.
  <https://universaldependencies.org/u/feat/index.html>
  <https://universaldependencies.org/u/feat/all.html>
- WALS: alignment asks how S, A, and P arguments are coded, and WALS treats sign
  languages as fully complex natural languages with their own grammatical
  organization.
  <https://wals.info/chapter/99>
  <https://wals.info/chapter/s9>
- Grambank: a broad typological database covering 2,467 language varieties and
  195 grammatical features, useful as a guardrail against parochial grammar
  design.
  <https://grambank.clld.org/>
- Leipzig Glossing Rules: a conventional format for interlinear morpheme
  glossing; RelConLang examples should be readable by linguists and agents.
  <https://www.eva.mpg.de/lingua/resources/glossing-rules.php>
- Sign-language semantics and morphology: role shift, spatial reference,
  simultaneity, and iconic mappings show how viewpoint and argument structure can
  be grammatical, not merely lexical.
  <https://plato.stanford.edu/entries/sign-language-semantics/>
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC3250214/>
- Speech-act theory: promising, requesting, refusing, asserting, and repairing
  are not merely descriptions but social acts performed through utterance. This
  motivates RelConLang's agency verbs as speech-act primitives, not just ordinary
  content words.
  <https://plato.stanford.edu/entries/speech-acts/>
- Evidentiality typology: source-of-information marking can be a grammatical
  category, which supports RelConLang's direction of making witness/provenance
  and charge grammatically salient.
  <https://wals.info/chapter/77>
- Universal Dependencies oblique/case relations: oblique nominals attach to
  predicates while separate case/adposition markers attach to the nominal,
  matching RelConLang's `pa`, `lo`, and `ke` design.
  <https://universaldependencies.org/u/dep/obl.html>
  <https://universaldependencies.org/u/dep/case.html>
- Universal Dependencies discourse relation: grammaticalized discourse
  particles, including question and feedback particles, are discourse dependents
  rather than ordinary arguments or adverbs.
  <https://universaldependencies.org/u/dep/discourse.html>
- WALS polar questions: question particles are a major typological strategy,
  which supports a parseable particle layer for RelConLang dialogue force.
  <https://wals.info/chapter/92>
- Conversation analysis: adjacency pairs and repair organization motivate
  testing multi-turn dialogue obligations, not only isolated clause parses.
  <https://emcawiki.net/Adjacency_pair>
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC4357221/>
- Register and poetic parallelism: register variation and repeated structure
  motivate distinct everyday, technical, proof, and ritual samples whose style
  remains parseable.
  <https://www.linguisticsociety.org/resource/register>
  <https://www.linguisticsociety.org/resource/poetic-function>
- SignWriting and formal sign-writing work: two-dimensional componential scripts
  motivate a visible agency script, while their encoding history warns that
  visual layout, font/rendering, and Unicode representation are separate
  obligations.
  <https://www.signwriting.org/about/what/what02.html>
  <https://tools.ietf.org/id/draft-slevinski-formal-signwriting-09.html>
- Root-and-pattern and derivational morphology: templatic roots and productive
  suffixes motivate a generative lexicon whose built forms are testable and
  whose roadmap coinages remain explicitly unbuilt.
  <https://wals.info/chapter/22>
  <https://glossary.sil.org/term/derivational-affix>
- Information structure: topic, focus, contrast, givenness, and repair are
  discourse-packaging resources, not decorative emphasis. They motivate
  RelConLang's first `topic`, `focus`, `contrast`, and `repair` arcs.
  <https://www.diu.edu/documents/gialens/Vol11-1/Kroeger-Basic-Concepts-Information-Structure.pdf>
  <https://www.glossa-journal.org/article/id/5356/>
  <https://plato.stanford.edu/archives/spr2025/entries/sign-language-semantics/>
  <https://wals.info/chapter/107>

## Design Commitments

- Agency first: the most natural clause says who acts, what is related, from what witness, under which charge, and toward what transformation.
- Evidence is grammar: source, confidence, contradiction, and absence must not be afterthought adverbs.
- Particles are lawful: `ga`, `do`, `lo`, `pa`, and `ke` are semantic-role markers, not decorative case labels.
- Obliques are participants: provenance, locus, and kind are parsed as nominal relations to the governing act, with the particle serving as case evidence.
- Dialogue force is grammar: question, request, answer, and acknowledgement particles should be visible in parser arcs and RWIL rows.
- Information structure is grammar: topic, focus, contrast, and repair should be visible in parser arcs and RWIL rows, not only in glosses.
- Dialogue is sequential: questions, requests, answers, repairs, and acknowledgements should be tested as paired turns in a corpus, not merely as one-off sentences.
- Style is lawful: register and poetic repetition should add social and mnemonic force without hiding the parse.
- Writing is evidence: the future script should expose charge, role, root, aspect, and dialogue force visually, while Latin remains the built carrier.
- Word-making is constrained: new vocabulary should arise from root families, templates, suffixes, and corpus need, not from arbitrary lists.
- FOUR is verbal: `ta`, `na`, `sha`, and `mu` should grow from particles into a mood/evidential system over active, potential, stable, and absurd readings.
- Speech acts are lexical today and grammatical tomorrow: `tem`, `vom`, `dav`, `ren`, `nul`, `kod`, `kan`, and `var` are Built+green verbs now, with a roadmap path toward dedicated force/aspect morphology.
- Space matters: future writing and discourse should learn from sign languages by letting viewpoint, role shift, locus, and simultaneous overlays become grammatical resources.
- Corpora before ornament: every extension needs examples, glosses, parse expectations when applicable, and an honest maturity tag.

## Maturity Ledger

- Built+green: current manifest, RWIL rows, Lambek/sofic/Chu/discourse-cover receipts, action surface, and corpus smoke tests, including first agency verbs for intention, promise, doubt, repair, refusal, obligation, capability, and transformation, first oblique particles for provenance, locus, and kind, and first dialogue particles for question, request, answer, and acknowledgement.
- Built+green: first multi-turn dialogue corpus and parse-checked translation exercises.
- Built+green: first register corpus for everyday, technical, proof, and ritual styles, including tested ritual parallelism.
- Built+green: Latin orthography and a tested machine-readable agency-sign sketch.
- Built+green: first machine-readable generative lexicon with tested root-family coverage, suffix alignment, and built generated examples.
- Built+green: first information-structure particles and parser arcs for topic, focus, contrast, and repair, including role/focus stacking.
- Research-grade: typological rationale, speech-act grammar, aspect/mood expansion, role inventory, register design, and writing-system sketch.
- Roadmap: historical phonology, larger lexicon, dialogue-act grammar, repair and refusal constructions, sign-inspired spatial notation, and proof-oriented grammar receipts stronger than today's finite sketches.

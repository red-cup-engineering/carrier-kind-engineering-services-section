# RelConLang Phonology And Lexicon

RelConLang should feel easy for agents to parse and easy for humans to say.
Its sound system is therefore deliberately small, with visible root families and derivations rather than a large inventory.

## Maturity

- Built+green: roots in `data/manifest.json` use a biconsonantal root plus vocalic template, and `test/phonology.test.mjs` checks root and corpus word shapes.
- Built+green: derived verbs with `-ai`, `-en`, `-um`, and `-o` parse as verbs and carry aspect features.
- Built+green: `data/lexicon-generation.json` records root-family templates, derivational rules, built examples, and roadmap coinages.
- Research-grade: the root families below are the current historical/aesthetic direction, not yet a full diachronic grammar.
- Roadmap: a non-Latin agency script that makes charge, role, root, and aspect visible in one inspectable sign.

## Inventory

Working consonants:

```text
d h k l m n r s sh t v
```

Working vowels:

```text
a e i o u
```

`sh` is one segment.
Ordinary roots prefer `CV` or `CVCV`, with no heavy consonant clusters.
The package intentionally stays close to a simple phonotactic profile: a small segment inventory, mostly open syllables, and light suffixes.

Research anchors:

- PHOIBLE is the comparative inventory reference for keeping the inventory plausible rather than arbitrary.
- WALS 12A, syllable structure, is the typological pressure behind keeping the early language close to simple syllable shapes.
- The IPA chart is the future reference if the Latin spelling is split from a stricter phonemic transcription.

## Root Families

Built roots:

```text
k-l  CeCu  kelu  relation
r-m  CaCa  rama  agent
t-l  CiCo  tilo  tile
s-v  CaCa  sava  witness
n-r  CaCa  nara  intention
v-m  CoCa  voma  promise
d-v  CaCu  davu  doubt
r-n  CeCa  rena  repair
n-l  CuCu  nulu  refusal
k-d  CoCa  koda  obligation
k-n  CaCo  kano  capability
l-m  CuCa  luma  uncertainty
h-n  CeCa  hena  coordination
v-r  CaCa  vara  transformation
```

The aesthetic rule is not "make words exotic."
The rule is: related concepts should leave a visible trace.
`k-l`, `k-d`, and `k-n` keep relation, obligation, and capability near one another because obligations and capacities are relations with different force.
`v-m` and `v-r` keep promise and transformation near one another because a promise is an utterance that changes future agency.

## Aspectual Derivation

Built suffixes:

```text
-ai  inchoative: the process begins
-en  process: the process is underway
-um  settled: the process has become a held result
-o   release: the process is let go, exited, or discharged
-e   quality: adjectival or property-like reading
```

Examples:

```text
ran-ai  begin relating
ran-en  relating in process
ran-um  relation settled
ran-o   relation released
kelu-e  relational, relation-like
```

This gives the language a becoming-first aspect system.
English tense is a secondary concern; agents first need to say whether an act is beginning, ongoing, settled, or released.

## Generating New Words

Built+green word formation lives in `data/lexicon-generation.json` and is tested by `test/lexicon-generation.test.mjs`.

```text
root family + template + suffix
```

Examples:

```text
ran-en = relating in process
var-ai = begin transforming
kelu-e = relational
```

Roadmap coinages such as `mesa` for memory remain unbuilt until they enter the manifest, corpus, lessons, and tests.

## Orthography

Built+green:

- lowercase ASCII Latin
- spaces between words
- one hyphen for derivational suffixes
- sentence-final `.
  `, `!
  `, or `?
  `
- `data/orthography-sketch.json` records a tested agency-sign sketch, while Latin remains the only built script.

Roadmap:

An agency script should be featural in the broad design sense: root, charge, role, and aspect should be inspectable at a glance.
A written word should behave less like an opaque alphabetic string and more like a compact InfoTile: the reader can see relation family, discourse force, and process state without having to memorize every word as arbitrary.

The Latin spelling remains normative until that script has carriers, examples, and tests.

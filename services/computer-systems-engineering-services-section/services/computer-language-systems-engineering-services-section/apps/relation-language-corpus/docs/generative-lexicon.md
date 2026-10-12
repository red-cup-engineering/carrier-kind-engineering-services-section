# Generative Lexicon

RelConLang words should feel related because they are related.
The current lexicon uses biconsonantal root families, vocalic templates, and light suffixes to make new forms predictable without making the language ornamental.

`data/lexicon-generation.json` is the machine-readable account.

## Maturity

- Built+green: every manifest root has a generative root-family entry.
- Built+green: every built template used by the manifest is declared in the generative lexicon.
- Built+green: aspect and quality suffixes are checked against manifest feature rules.
- Built+green: built generated examples parse in tests.
- Research-grade: the internal history is a coherent design sketch, not a reconstructed historical proof.
- Roadmap: new root coinage is listed separately and not claimed as built.

## Root Families

Roots are written as two consonants:

```text
k-l = relation family
k-d = obligation family
k-n = capability family
v-m = promise family
v-r = transformation family
```

The vowels choose a template:

```text
CeCu -> carried relation: kelu
CoCa -> binding force: koda, voma
CaCo -> open affordance: kano
CuCa -> unsettled field: luma
CuCu -> closure or refusal: nulu
```

This lets the language say: relation, obligation, and capability belong near one another, but they are not the same.
They are different readings of relation under force, affordance, and process.

## Built Derivation

```text
-ai = beginning
-en = process
-um = settled result
-o  = release
-e  = quality
```

Examples:

```text
ran-en
relating in process

var-ai
begin transforming

kelu-e
relational, relation-like
```

Built example:

```text
rama kelu-e ga mor do sava.
relation-like agent marks the witness.
```

Here `kelu-e` is an adjective modifying `rama`; the parser checks this as an `amod` relation.

## Internal History

The sketched history proceeds in five stages:

```text
1. particle ledger
2. root families
3. aspect suffixes
4. dialogue particles
5. agency signs
```

This is not nostalgia cosplay.
It is a design constraint: new forms should feel as though they came from repeated agency needs, not from arbitrary vocabulary lists.

## Coinage Roadmap

Roadmap examples:

```text
mesa = memory
paro = permission
shama = shared attention
```

These are not built words yet.
They are candidates whose root/template shape does not collide with the built lexicon.
To promote one, add it to the manifest, give it corpus examples, update the tests, and document why the agency system needs it.

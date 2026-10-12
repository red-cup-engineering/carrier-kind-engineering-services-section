# Writing System

RelConLang currently uses Latin spelling as its only Built+green script.
The agency-sign sketch in `data/orthography-sketch.json` is a tested design artifact, not yet a live script.

## Maturity

- Built+green: Latin lowercase spelling, spaces between words, hyphenated derivational suffixes, and sentence-final punctuation.
- Built+green: `test/orthography.test.mjs` verifies the orthography sketch against manifest roots, particles, aspect suffixes, and parseable examples.
- Research-grade: the agency-sign layout: top for charge/dialogue force, center for root family, sides for roles, bottom for aspect.
- Roadmap: renderer, font, Unicode story, handwriting guidelines, and visual examples beyond ASCII labels.

## Latin

The normative script is:

```text
lowercase ASCII Latin
space between words
hyphen before derivational suffixes
. ! ? as sentence terminators
```

Examples:

```text
mi ga ran do kelu.
ku tu ga kan do kano?
ran-en
var-ai
```

This keeps the language easy to type, parse, diff, and log.

## Agency Sign Sketch

The future agency script should behave like a compact visible receipt.
A sign should show how an utterance is held and what relation it performs.

```text
top    = charge or dialogue force
left   = agent/source/provenance role
center = root family
right  = object/kind/locus role
bottom = aspect or process state
```

The goal is not a mysterious alphabet.
The goal is inspectable agency:

```text
charge:active + role:agent + root:witness + role:object
dialogue:question + root:capability
role:provenance + aspect:process + role:locus + role:kind
```

## Examples

```text
ta mi ga ran do sava.
```

Visible components:

```text
charge:active
role:agent
root:witness
role:object
```

```text
sava pa mi ga ran-en do kelu lo tilo ke vara.
```

Visible components:

```text
role:provenance
role:agent
aspect:process
role:object
role:locus
role:kind
```

## Research Anchors

SignWriting matters because it shows that a writing system can be visual, componential, and spatial rather than a flat alphabetic string.
Its symbols represent handshapes, movements, and facial expressions, and its practical history also shows that two-dimensional layout and character encoding are separate hard problems.

RelConLang borrows the lesson, not the symbols.
Agency-signs should use visible components for charge, role, root, aspect, and dialogue force, but Latin remains the only built script until a renderer and carrier story exist.

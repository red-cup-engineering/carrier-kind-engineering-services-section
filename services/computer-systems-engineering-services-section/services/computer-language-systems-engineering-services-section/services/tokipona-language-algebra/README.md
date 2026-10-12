# @lenticule-science/tokipona-language-algebra

Toki Pona's language fiber: structural-particle lexicon, isolating morphology,
reference, SVO attachment and segmentation data, plus a directly invocable
tagging die.

The package owns Toki Pona data. `@lenticule-science/communicating@0.0.3` owns
the language-neutral Mark admission, articulation, charged parse, role and
cohomology machinery. `./tag` composes those public readings with this bundle;
it does not import a private section engine. Activity and request IDs preserve
the established SCIS v2 `objectKind`/`value`/empty-`witnessRoot` law.

Exports:

- `.` and `./bundle`: the immutable raw Toki Pona bundle
- `./tag`: compiled bundle, word tagging, tokenization and full-text readings
- `solicit-service` and `invoke-service`: ActivityStreams process faces

Established limits remain explicit. With no inflectional suffix rules, content
words honestly fall to the noun floor; no ordinary word anchors a verb relation.
A preverb such as `wile` can therefore attach the true verb as a nominal object
before reaching the true object. The tests retain both the visible obstruction
and the confidently wrong glued reading.

```sh
npm run check
npm run build
npm test
```

The release closure contains no linguistics-root, legacy RMN runtime or RDF
projection dependency.

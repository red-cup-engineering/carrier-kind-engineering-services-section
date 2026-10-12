# @lenticule-science/lakota-language-algebra

Lakȟótiyapi's language fiber: lexicon, a deliberately curated verb-stem
morphology, reference, SOV/postposed attachment and segmentation data, plus a
directly invocable tagging die.

The package owns Lakota data. `@lenticule-science/communicating@0.0.5` owns the
language-neutral Mark admission, articulation, charged parse, role and
cohomology machinery. `./tag` composes those public readings with this bundle;
it does not import a private section engine. Activity and request IDs preserve
the established SCIS v2 `objectKind`/`value`/empty-`witnessRoot` law.

Exports:

- `.` and `./bundle`: the immutable raw Lakota bundle
- `./tag`: compiled bundle, word tagging, tokenization and full-text readings
- `solicit-service` and `invoke-service`: ActivityStreams process faces

Established limits remain explicit. Productive prefixal/infixal person
morphology is absent; subject and object both use the left positional strategy
and can collide on the nearest nominal; postpositions occupy the nearest legacy
schema slot, so the generic preposition-object reading cannot recover every
Lakota relation. The tests preserve these ambiguity and obstruction receipts.

```sh
npm run check
npm run build
npm test
```

The release closure contains no linguistics-root, legacy RMN runtime or RDF
projection dependency.

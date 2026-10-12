# @lenticule-science/latin-language-algebra

Latin's language fiber: lexicon, morphology, reference, free-word-order grammar
and segmentation data, plus a directly invocable tagging die.

The package owns Latin data. `@lenticule-science/communicating@0.0.3` owns the
language-neutral Mark admission, articulation, charged parse, role and
cohomology machinery. `./tag` composes those public readings with this bundle;
it does not import a private section engine. Activity and request IDs preserve
the established SCIS v2 `objectKind`/`value`/empty-`witnessRoot` law.

Latin's nominative, accusative, ablative and genitive/dative suffix readings are
explicit `featureRules` in the bundle. They were formerly hidden as Latin-only
logic in a shared parser. The `roleBy: "case"` strategies now consume the
fiber's own `case:nom` and `case:acc` evidence, so case outranks surface order
without making the language-neutral provider secretly Latin.

Exports:

- `.` and `./bundle`: the immutable raw Latin bundle
- `./tag`: compiled bundle, word tagging, tokenization and full-text readings
- `solicit-service` and `invoke-service`: ActivityStreams process faces

```sh
npm run check
npm run build
npm test
```

The release closure contains no linguistics-root, legacy RMN runtime or RDF
projection dependency.

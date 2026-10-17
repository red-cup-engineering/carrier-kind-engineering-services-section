# microformats-services-section

microformats2, both directions.

- `parseMicroformats(html, { baseUrl })` (`./parse`) parses HTML into the microformats2 JSON
  `{ items, rels, "rel-urls" }` per [microformats2-parsing](https://microformats.org/wiki/microformats2-parsing):
  `h-*` roots; `p-`, `u-`, `dt-` and `e-` properties (vendor-prefixed names included); the value class
  pattern (`value`, `value-title`); implied `name`, `photo` and `url`; nested microformats as property
  values and as `children`; `id`; the first `<base href>`; `<template>` ignored; `rels` and `rel-urls`.
  Classic microformats (hCard, hEntry, hFeed, hEvent, hReview, hProduct, hRecipe, hResume, adr, geo) are
  upgraded by their backcompat tables, with rel-tag and rel-bookmark.
- `hEntry`, `hCard`, `hCite`, `hFeed`, `p`, `u`, `dt`, `e` (`./emit`) write the markup a parser reads
  back, escaping every value once (only `e-*` is verbatim). `entryFromFiniteAlgebra` lifts settled cells,
  emitting affirmed cells only.

## Conformance

`test/suite` is the shared microformats test suite (<https://github.com/microformats/tests>, CC0):
`microformats-v2`, `microformats-v2-unit`, `microformats-v1` and `microformats-mixed`. `npm test` runs
every pair. All of v2 and v2-unit pass, except two older `h-event` cases whose zones are written
without a colon, against the suite's own README and unit tests. Twenty cases are skipped, each with a
reason in `test/suite-skips.json`: those two, their classic twins, the classic include-pattern, and
classic composite cases (hNews, hReview-aggregate, hResume sub-cards) not yet carried.

The parser builds on [parse5](https://github.com/inikulin/parse5), the HTML Standard's parsing algorithm.

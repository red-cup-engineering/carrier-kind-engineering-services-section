# @red-cup-engineering/feng-shui-app

Builds household-scale Feng Shui capabilities for the 561 Group Feng Shui program.

The first application is a phone-sized desk review composed through VICTOR.
It opens a photo locally, proposes object boxes with TensorFlow.js COCO-SSD,
lets the person correct those boxes and labels, and retrieves source-linked
suggestions from the shared science corpus after the person confirms the
required facts. The [application specification](content/text/documents/articles/specifications/2026-09-07-feng-shui-browser-app.md)
defines the larger program and its remaining provider gates.

## Run the development preview

Use Node 24.2 or newer. From this directory:

```sh
npm ci --registry https://registry.561.group
npm test
```

From the repository root, build or serve with an explicit configuration:

```sh
node lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/domestic-computer-systems-services-section/services/feng-shui-computer-systems-services-section/apps/feng-shui-app/apps/feng-shui-browser-app.mjs build /path/to/desk-review.config.json
node lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/personal-computer-systems-services-section/services/domestic-computer-systems-services-section/services/feng-shui-computer-systems-services-section/apps/feng-shui-app/apps/feng-shui-browser-app.mjs serve /path/to/desk-review.config.json
```

The preview binds only to `http://127.0.0.1:8567/`. Stop it with Ctrl+C. The
public Feng Shui seat currently has no checked-in `desk-review.config.json`, so
the app cannot produce that configured preview until its delivery owner supplies
one.
Build writes the static artifact to `/tmp/feng-shui-desk-build`. The two commands
use the same VICTOR projector and conformance checks. The CLI also accepts
`FENG_SHUI_CORPUS_PATH`, `FENG_SHUI_SCHEMA_PATH`, and `FENG_SHUI_PORT`.
Relative input paths in a configuration resolve from that configuration's
directory. Restart the preview after changing source or corpus inputs.

## What the desk slice does

- The person chooses or captures an image. Camera behavior depends on their
  browser. Photos stay in tab memory; the app has no saved-scene store.
- Recognition loads the exact TensorFlow.js 4.22.0 and COCO-SSD 2.2.3 browser
  scripts from jsDelivr, then model weights. No photo is transmitted. Failed
  recognition leaves manual object entry available. The 80-class model can
  miss desk objects, doors, and walls.
- Objects are candidates. Boxes use original-image pixels and are clipped to
  its bounds. Manual edits clear detector confidence. The person confirms
  layout facts separately; absent, false, unknown, and contradictory facts
  cannot enable advice. Image spacing does not establish physical distances.
- Practical desk reflection is the default source choice; its source names no
  formal school. BTB is an explicit selection and retrieves only that tradition.
  An already-clear doorway view does not prompt a desk move or mirror.
- Advice repeats the eligible corpus actions with visible source links,
  passage identifiers, tradition, and limits. It offers no outcome promise.
  Corpus text and object labels render as text rather than HTML.
- Scene/advice JSON export excludes photo bytes and object URLs. Shared-corpus
  export preserves the science JSON. Reset revokes the current image URL and
  clears the image, objects, answers, and advice; exported files remain with
  their owner.

The build copies the explicitly supplied canonical science corpus and schema;
it keeps no hand-maintained knowledge copy. Schema validation uses the existing
JSON Schema instance service. `corpus-provenance.json` identifies both input
paths and SHA-256 digests. Browser retrieval validates the advice-bearing
records and their source-reference graph again.

## Checks and remaining work

The package suite reports 13 tests, 13 passes, 0 failures, and 0 skipped tests.
It covers box clipping, detector certainty, export privacy, positive fact
requirements, contradiction rejection, tradition isolation, reference and URL
validation, supplied-schema refusal, and VICTOR artifact conformance. Browser
assays at 390 and 1440 CSS pixels exercised photo review, real detection,
manual recovery, source-linked advice, HTML-like labels, export and reset,
without horizontal overflow or outgoing non-GET requests. The actual desk
fixture produced a laptop detection and missed its phone and apple; manual
review remains necessary. These checks do not establish physical-phone camera
behavior or deployment.

VICTOR 0.1.12's public asset collector returns byte buffers that its optional
fingerprinting transformer rejects as non-text (`BAI-005`). This app uses
VICTOR's documented `assets: false` setting and its normal static asset
delivery. The shared conformance check remains enabled.

The app is a source development preview. This package has not been published
to the registry and the site has not been deployed. LLM-generated advice is
unavailable pending an admitted, assayed text provider; the interface does not
simulate it. Shopping referrals remain empty pending actual enrollment,
destination, disclosure, and link validation. Room and house reviews are
future work. The loaded page can retrieve deterministic advice without further
network requests; offline reload and service-worker caching are not implemented.

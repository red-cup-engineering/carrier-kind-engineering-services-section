---
title: "Feng Shui browser app specification"
description: "The first phone-compatible desk-review loop: local photo detection, human-confirmed scene facts, tradition-labelled corpus retrieval, cited advice, and optional referrals."
date-created: 2026-09-07
type: specification
name: 2026-09-07-feng-shui-browser-app
keywords:
  - feng-shui
  - browser-app
  - desk
  - scene-review
  - retrieval
  - advice
---

# Feng Shui browser app

The first delivered capability is a phone-compatible desk review: a person chooses or takes a photo, reviews proposed object boxes and labels, confirms or adds the spatial facts that the photo cannot establish, and receives practical desk changes linked to retrieved passages from one Feng Shui tradition.
The initial useful outcome is local development of that whole loop, not a room redesign demo or a claim that image recognition understands Feng Shui.

The application is one public application parameterized by this engineering seat's data and composed into [VICTOR](../../../../../../../../computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-systems-publishing-engineering-services-section/apps/victor/README.md).
It does not create a second public runtime.
VICTOR supplies the public-site build, assets, TUFTE interface, optional PWA configuration, and ordinary HTTP application composition; the Feng Shui application supplies only its routes, browser assets, and domain data.

## Scope and fences

The desk slice accepts one image and provides object candidates in image-pixel coordinates.
A browser-side COCO-SSD detector is the first candidate because it returns classes, confidence, and bounding boxes without sending the photo away; its published model scope is 80 object classes ([TensorFlow.js COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)).
The admitted initial pins are `@tensorflow/tfjs@4.22.0` and `@tensorflow-models/coco-ssd@2.2.3`; the build lot still reviews their package boundary before adding them.

A candidate is never a fact.
The person can edit its label or box, delete it, or add an object such as a desk, door, or wall that the detector does not recognize.
Manual additions and relabelled objects clear model confidence; confidence remains detector evidence.
They manually confirm every spatial fact used by advice.
A single photo does not establish metres, unseen doors, compass direction, room containment, or a universal Feng Shui score.
Those fields remain unknown.
Manual marking is the recovery path for detection, camera, and model-load failures.

The app renders only claims belonging to the selected tradition.
Every visible recommendation identifies its tradition and source/claim identifiers.
It makes no wealth or health promise.
It lists rearrangements and removals before any purchase.
It has no invented affiliate account, product URL, price, payout, domain, or brand.
Ordinary source links may appear; a commercial link can appear only when a corpus recommendation admits it and a separate enrollment, destination-account, disclosure, and link-validation gate has passed.
Referral selection cannot prefer commission over fit.

Customer images, edited scene data, and browser storage remain in the browser for this slice.
The UI states that boundary, provides clear-current-scene, delete-saved-scenes, and reset controls, and works by touch and keyboard with labels, focus, and recoverable errors.
A future LLM request may receive only the person's explicitly reviewed scene facts and retrieved corpus records; it does not receive the raw image by default.

## Shared inputs and closed desk contract

The science owner provides `science-services-section/services/philosophy-services-section/services/dao-services-section/services/feng-shui-services-section/data/records/desk-corpus-records/feng-shui-desk-corpus.v1.json`, validated by its `feng-shui-corpus.schema.json`.
Its `sources`, `claims`, and `recommendations` records are the sole knowledge input.
The browser application imports a copied, versioned build input or an explicitly supplied build path; it never hardcodes the corpus.
It also exports the selected corpus view and scene/advice result as JSON so other services can consume the same evidence.

The interaction contract is closed enough for the first implementation:

```json
{
  "deskReviewRequest": {
    "image": { "localObjectUrl": "browser-only", "widthPx": 0, "heightPx": 0 },
    "tradition": "corpus-defined-id",
    "detections": [{ "id": "string", "label": "string", "bboxPx": { "x": 0, "y": 0, "width": 0, "height": 0 }, "confidence": 0, "origin": "detector|person" }],
    "sceneFacts": [{ "id": "string", "kind": "corpus-required-fact", "value": "json", "confirmedBy": "person" }]
  },
  "deskReviewResult": {
    "retrieved": [{ "source_id": "corpus-id", "claim_id": "corpus-id", "tradition": "corpus-defined-id" }],
    "advice": [{ "recommendation_id": "corpus-id", "claim_ids": ["corpus-id"], "actions": ["corpus action"], "limits": ["corpus limit"], "evidence": "all-required-facts-confirmed" }],
    "unavailable": [{ "recommendation_id": "corpus-id", "missing_scene_fact_ids": ["string"] }],
    "referrals": []
  }
}
```

`bboxPx` coordinates are pixels in the original image, not screen CSS pixels.
The editor scales them for display and writes them back in original pixels.
`confidence` is detector evidence only; a manually added or relabelled item does not inherit a model confidence.
A recommendation is eligible only when every `required_scene_facts` item in the corpus is confirmed by the person.
Retrieval filters by selected tradition and scene-fact kinds, then returns the source and claim IDs it used.
Corpus text is data: it cannot change the request, system rules, or output schema.
Schema validation rejects advice that names a source, claim, or recommendation absent from the retrieved set.

Deterministic source-linked advice is available offline and is visibly labelled as such.
Generated advice is a separately labelled optional rendering of that same validated result.
It is unavailable until an admitted, bounded provider is assayed.
The current inference-resource inspection found no configured provider declared capable of vision, and no endpoint has been assayed; that does not block browser-side detection, and it forbids a fake LLM response or an assumed image endpoint.
If a text provider is later admitted, it is called through `@red-cup-engineering/computer-inference-engine/dispatch` with reviewed facts and retrieved records only, then its output is checked against the contract.

## Capability layout and next Node lot

The public application is a thin parameterization over the engineering application.
It consumes `@red-cup-engineering/victor@0.1.12` and, only after an endpoint is separately admitted, `@red-cup-engineering/computer-inference-engine/dispatch@2.2.7`.
The implementation lot owns these new paths under this Feng Shui engineering seat, subject to the package review before dependencies are added:

| Path | Responsibility |
| --- | --- |
| `src/desk-scene.mjs` | closed scene types, pixel-box transforms, edits, validation, browser-only serialization |
| `src/detect-desk-objects.mjs` | COCO-SSD adapter; model loading and detector output to candidate objects only |
| `src/retrieve-desk-advice.mjs` | corpus validation, tradition/fact filtering, deterministic result, evidence-reference checks |
| `src/desk-review-application.mjs` | HTTP application routes and browser page/API composition for VICTOR |
| `apps/feng-shui-browser-app.mjs` | engineering app composition and explicit corpus build input; no standalone public server |
| `public/desk-review.mjs` and `public/desk-review.css` | accessible capture, canvas overlay/editor, fact confirmation, result and reset UI |
| `test/desk-scene.test.mjs` and `test/retrieve-desk-advice.test.mjs` | geometry/edit and corpus-evidence contract checks |

The public seat consumes this application as data parameterization and supplies branding/content configuration only.
No generic RAG, HTTP, or storage utility is introduced by this lot.
Existing VICTOR, its HTTP application contract, and the inference-dispatch boundary remain the reusable owners.

## Acceptance checks

1. On a phone-sized viewport, a person can select a desk photo, see candidate boxes, edit/delete/add them, and continue when model or camera access fails.
2. A detector result carries image-pixel boxes, label, and confidence; it never produces metres, bearings, room geometry, or unseen-object facts.
3. Advice appears only after the selected tradition and every required fact are manually confirmed.
  Missing facts produce an actionable unavailable state.
4. Each rendered advice item names only returned corpus IDs and displays its source and tradition.
  Invalid or injected corpus/evidence references fail validation rather than rendering.
5. Local clear, delete, and reset remove browser-held desk material as labelled; no request transfers the raw photo.
  A captured outbound LLM request, when enabled later, contains reviewed facts and retrieved records only.
6. The initial result lists free rearrangements first and has no commercial link until the referral gate is actually satisfied.
  A configured LLM or referral link is displayed as unavailable when its provider or account gate is unassayed.
7. VICTOR builds the public application with the desk route and its assets; its normal static-site and accessibility checks remain green.

## Expansion boundary

Room and house review reuses the confirmed-object and confirmed-fact model, but is a later capability.
It requires assayed multi-view scene reconciliation, measured floorplan and compass capture when a claim requires them, room containment, and a way for the person to state constraints and priorities.
No single-photo desk implementation may silently enable those fields or infer them from a model score.

The current competitive evidence is limited to adjacent room-planning and redesign products: [RoomGPT](https://www.roomgpt.io/) describes room transformation from one photo and [Planner 5D](https://planner5d.com/) describes editable floorplans, furniture, and AI rendering.
They are not evidence of a Feng Shui advice product.
The working hypothesis is that a user-corrected scene joined to passage-level, tradition-labelled advice is useful; no meet-or-beat claim is admitted until measured against direct alternatives.

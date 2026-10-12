# Roadmap engineering services section

The code that derives a roadmap.
A roadmap here is a readout, never a file: one transformation reads the work journals (the structured work intents and discharges on the work rail at ops.
561.group, the ledger's register, the registry's published versions, the deploy and publish receipts in the semantic record journals) and writes one RoadmapReadout, cells by horizon and modality with what is ready, blocked, and done derived, on demand, for whoever asks.
Nothing in this section stores a reading.

Operations, each an operation package under `services/` born through the jsnode fabrication line:

- `derive-roadmap-readout`: journals in, one RoadmapReadout out.
- `derive-set-of-work-intents-from-roadmap-cut`: one hand-written goal-stack roadmap cut in, one StructuredWorkIntent out, with provenance offsets into the cut, so the thirty-two cuts written before 2026-09-06 become rows on the rail and then deletion inventory.

Science seat: [roadmap-science-services-section](../../../../../../../../../../science-services-section/services/social-science-services-section/services/sociology-science-services-section/services/work-science-services-section/services/roadmap-science-services-section/README.md).
This section is a child of the agent-work engineering section and composes its `classify-work-demand` and `read-bcp-14-requirements` operations rather than re-reading modality or force itself.

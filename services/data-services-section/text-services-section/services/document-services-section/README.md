# Document Services Section

This section groups Red Cup Engineering capability cells and process nodes
that produce or conform standards-form documents, as distinct from the
plain-prose text operations that sit alongside it under `text-services-section`.

## What's here

- `services/` — one document-domain child per seated node.

[`standard-document-release-team`](services/standard-document-release-team/)
runs the standard-document-release cycle: it turns a semantic token the
corpus has already made unique and rich enough into a reviewable
IEEE/RFC/arxiv-style draft standards document, composed only from sources it
can cite by exact path, held as `DRAFT-FOR-LEADER-REVIEW` until the Leader or
a delegate accepts it. It is a process node (no runtime package).

[`standards-conformance-services-section`](services/standards-conformance-services-section/)
is a signed smart-account Phase 2 constitutional conformance assay over one
bounded territory: it scans a named filesystem territory against the closed
Phase 2 rule set and reports conformance, refusing waived violations,
compatibility exceptions, or a request to certify its own implementation.

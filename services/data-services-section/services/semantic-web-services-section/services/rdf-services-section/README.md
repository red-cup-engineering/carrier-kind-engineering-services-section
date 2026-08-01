# RDF services section

This section holds the in-memory RDF model and algorithms: term
construction, named-graph quad-set assembly, N-Quads serialization, and
RDFC-1.0 canonicalization. Each is a single-capability package adapted from
`witness-journal-rdf-projection-service`'s `src/witness-journal-rdf.mjs`.

## See also — rdf-file-services-section

[`rdf-file-services-section`](../../../../../file-services-section/services/data-services-section/services/flatfile-services-section/services/serialization-services-section/services/rdf-file-services-section/)
holds the file-format codec side of RDF: proof-path services (like
`turtle-term-writing-service`) that write RDF terms to a specific
concrete syntax on disk. This section is its mirror on the model side —
the in-memory term/graph/algorithm services those codecs serialize. A
codec turns an RDF term into bytes in one syntax; the services here define
what an RDF term, quad set, or canonical form *is*, independent of any one
serialization.

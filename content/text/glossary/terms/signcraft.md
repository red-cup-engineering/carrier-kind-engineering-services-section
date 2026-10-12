---
name: "SignCraft"
description: "The Group's computer-systems library: the engine composed from SignCell, SignChain and SignGraph that every system in the house is built on."
identity: signcraft
date-created: 2026-10-10
realized-by:
  - "@red-cup-engineering/signcraft"
see-also:
  - signcell.md
  - signchain.md
  - signgraph.md
provenance:
  sources:
    - "Leader, 2026-09-23 note on the software ecosystem, sections SignCraft and Layer 1"
  utterances:
    - "ni:///sha-256;1FvOuEWCDgqx2Il0iS3X_sjESvtlheCt3hOd7F-JZrc"
    - "ni:///sha-256;jA2QKSDY3j8avNlNP72Tl7TlA95WOzQpo2llynKZZYU"
    - "ni:///sha-256;IDxEIK-O7NnlLFZBV0phcEc0E3C5JMoUzO-x5AZip2o"
    - "ni:///sha-256;n18v1l5O6FpOMjEAsRsGkvstD5A0R5foLFZ066C3azk"
    - "ni:///sha-256;koU_yDK4UZM3nHTIZt54Tvf92LLDznaid4TdknEI-HM"
---

**SignCraft** is the application of **computer systems** among the four Sign
libraries (SignCell : SignChain : SignGraph : SignCraft :: Data : Code :
Networking : Systems). It requires SignCell, SignChain, SignGraph and
`metrologic`.

SignCell, SignChain and SignGraph are the substrate (Layer 0). SignCraft is the
first piece of Layer 1, the systems: engines, servers and clients, platforms and
applications build on it. The inference engine, the terminal user interface
engine, the QwzSpace graphics engine, the web server and the accounting server
Farolfi each require SignCraft in the Leader's 2026-09-23 ecosystem note.
[Horsetail](../../../../../../content/text/glossary/terms/horsetail.md), the
LISP-style language users write programs in, sits downstream of SignCraft.

The Group's software ecosystem is to be realized on the four Sign libraries.
Software that should use them and does not, such as the Google Cloud setup the
Leader reviewed on 2026-09-26, has drifted from the architecture.

The four libraries are also the ground of the Group's next-generation, non-LLM
logical inference model; see the requirement
`non-llm-logical-inference-model-on-signstuff`.

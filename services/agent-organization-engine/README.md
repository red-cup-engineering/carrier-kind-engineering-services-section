# Agent Organization Engine

This is the agent organization engine above SignCraft and below FeltOS. The
root `package.json` groups nine faculty packages; it has no root CLI or export
map. Import the particular faculty by its own package name and published
subpath. The older `agentic-relation-engine` instructions previously in this
file described a different package and are not commands for this directory.

The faculties are `relating`, `communicating`, `knowing`, `playing`,
`animating`, `computing`, `socializing`, `gaming`, and `organizing`, each under
[`lib/`](lib/). Their package manifests and READMEs describe their implemented
surfaces. Their current imports do not prove that every operation has been
migrated onto SignCell, SignChain, SignGraph, and SignCraft; that integration is
still an architectural obligation.

## Newswire

Newswire is a communicating component for syndication. Its purpose is to
aggregate configured source feeds and project one admitted arrival into one
or more syndicate feeds, including ActivityPub destinations. It does not write
news articles. The [Newswire source modules](lib/communicating/src/messaging/newswire/)
acquire RSS/Atom sources, form source observations on the communicating
CloudEvents carrier, and maintain a caller-owned replay cursor. The
`syndicate-feeds` module projects configured many-to-many RSS, Atom, and JSON
Feed snapshots from those observations with source identities retained. The
public imports are in [`lib/communicating/package.json`](lib/communicating/package.json).
Durable feed delivery and ActivityPub fanout remain unimplemented.

The Koios.News newsroom consumes admitted arrivals from this component. Story
selection, evidence assessment, writing, approval, and site publication belong
to later capabilities. Content Mill is intended as a FeltOS module. Koios.News
is a separate service that federates with the `bare-cedar-fog.561.group` MetroPlat
instance over Semioverse protocols; it is not installed in that instance. The
current news-property app and Koios service section contain incomplete and
overlapping pieces of that path; their locations do not settle future ownership.

## Software-development work

Codemods and workspace relocation are agent work, not a second source-code
ontology or a set of scripts owned by an instance. Their [work contract and
dependency order](content/text/documents/specifications/software-development-work.md)
place source identity and relations in SignCell/SignChain/SignGraph, admission
and assay in SignCraft, and the performed work in this engine. The JSNode
source engine provides parsing and byte-bound edit plans. AOE Animating owns
the `aoe-codemod` and `aoe-relocate` commands; their receipts use Sign
carriers but do not yet bind organizational authority or demonstrate complete
consumer migration. AOE Animating also owns the code-mission and
code-generation work entrypoints. Their lower code layer supplies syntax and
projection mechanics. The mission still retains private trajectory and
acceptance records that need migration onto the shared work carrier before
this family is coherent end to end.

For a module-specifier change, `aoe-codemod --file <file> --rewrite-module
<old> <new> --actor <actor> --journal <new-file.jsonl>` persists the proposal.
Repeat the same command with `--write` to apply that exact proposal and append
the observed result. The JSONL file is a SignChain telling log; keep it with
the work record. A changed source or a reused journal refuses the write.

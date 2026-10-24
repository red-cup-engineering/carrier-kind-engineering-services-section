# Typed Resource Catalog (TRC) — June 2026 package, specs and schemas as received

Authored index. The files beside this one are byte copies of the legacy
`development/active/typed-resource-catalog` package (README, manifest,
generated JSON Schemas, one claim log) and of the seven per-kind
specifications from the 2026-05-31 development snapshot, received from the
Group's legacy tree on 2026-10-24. They record the design in which a POSIX path
is a typing judgment and a file kind is a node whose restriction (MUST
membership test), extension and conformance verdict are specified.

Status: historical design record. The package's executable scripts (`read`,
`witness`, `stat`, `frontmatter`, `conform`, `scaffold`, `claim`, `project`,
`create`, `audit`) named in the README are not part of the received set; this is
not a living implementation. The living successor direction for typed records is SignCell
typed marks generated from `.schema.json` specifications carrying `x-codegen`
(see `computer-data-engineering-services-section`, specification of record kinds
and their carriers, 2026-10-09). The recovered notes `trc-tdp-specification.md`
(`computer-code-engineering-services-section`, `notes/recovered/history/`) and
`2026-06-06-trc-descriptor-typing.md` (`engineering-services-section`,
`notes/recovered/`) state the SPOTCOMP reading of the same catalog.

In the specification files, the taxonomy chain (file -> regular-file ->
flatfile -> json -> schema -> resource -> document -> markdown-document -> ...)
was encoded as nested `hacking/library/<kind>/` directories; the flat file
names below keep only the kind.

| received file | legacy snapshot | legacy path under typed-resource-catalog/ |
|---|---|---|
| `README.md` | 2026-06-04-c251305 | `README.md` |
| `claims/development-journal-entry.jsonl` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/library/file/restricting/library/regular-file/restricting/library/flatfile/restricting/library/markdown/extending/library/markdown-document/restricting/library/development-journal-entry/development-journal-entry.jsonl` |
| `schemas/attribute.schema.json` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/attribute.schema.json` |
| `schemas/binary-file.schema.json` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/library/file/restricting/library/regular-file/restricting/library/binary-file/binary-file.schema.json` |
| `schemas/development-journal-entry.schema.json` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/library/file/restricting/library/regular-file/restricting/library/flatfile/restricting/library/markdown/extending/library/markdown-document/restricting/library/development-journal-entry/development-journal-entry.schema.json` |
| `schemas/file.schema.json` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/library/file/file.schema.json` |
| `schemas/object.schema.json` | 2026-06-04-c251305 | `library/path/library/object/object.schema.json` |
| `schemas/path.schema.json` | 2026-06-04-c251305 | `library/path/path.schema.json` |
| `schemas/typed-resource-catalog.schema.json` | 2026-06-04-c251305 | `typed-resource-catalog.schema.json` |
| `schemas/verdict.schema.json` | 2026-06-04-c251305 | `library/path/library/object/library/attribute/library/file/restricting/library/regular-file/restricting/library/flatfile/restricting/library/markdown/extending/library/markdown-document/conforming/library/verdict/verdict.schema.json` |
| `specifications/development-document.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/regular-file/hacking/library/flatfile/hacking/library/json/hacking/library/schema/hacking/library/resource/hacking/library/document/hacking/library/markdown-document/hacking/library/development-document/docs/dev/specification.md` |
| `specifications/development-journal.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/regular-file/hacking/library/flatfile/hacking/library/json/hacking/library/schema/hacking/library/resource/hacking/library/document/hacking/library/development-journal/docs/dev/specification.md` |
| `specifications/directory.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/directory/docs/dev/specification.md` |
| `specifications/file.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/docs/dev/specification.md` |
| `specifications/journal-entry.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/regular-file/hacking/library/flatfile/hacking/library/json/hacking/library/schema/hacking/library/resource/hacking/library/document/hacking/library/markdown-document/hacking/library/journal-entry/docs/dev/specification.md` |
| `specifications/markdown-document.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/regular-file/hacking/library/flatfile/hacking/library/json/hacking/library/schema/hacking/library/resource/hacking/library/document/hacking/library/markdown-document/docs/dev/specification.md` |
| `specifications/specification.md` | 2026-05-31-bb8aeb2 | `hacking/typing/hacking/library/file/hacking/library/regular-file/hacking/library/flatfile/hacking/library/json/hacking/library/schema/hacking/library/resource/hacking/library/document/hacking/library/markdown-document/hacking/library/specification/docs/dev/specification.md` |
| `typed-resource-catalog.package.json` | 2026-06-04-c251305 | `package.json` |

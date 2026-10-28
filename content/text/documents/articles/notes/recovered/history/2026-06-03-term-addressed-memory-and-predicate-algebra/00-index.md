# Term-addressed memory and the predicate algebra parser (June 2026)

Authored index. The three files beside this one are byte copies of the
READMEs and TODO of two small experimental packages, received from the Group's
legacy tree on 2026-10-24:

- `term-addressed-memory-README.md` — a term addressed EAVT log: a path is the
  coordinate of a term, `write` affirms predication-cell datoms `{e,a,v,t}`
  monotonically and append-only, `read` folds them to the settled cells by the
  knowledge join.
- `predicate-algebra-parser-README.md` and `-TODO.md` — a pure predicate algebra
  over a settled section of such cells: `negates` (a `{not: X}` claim becomes
  counter-evidence on `(s, p, X)`), `functional` (competing objects of a
  single-valued predicate exclude each other to a held contradiction), `believe`
  (project `{affirmed, denied, contradicted}` by the consistent plus
  paraconsistent split), and `recall`, which reads which predicates are
  functional from `(p, is, functional)` cells so that teaching a rule is writing
  a fact. Planned rules: `specializes`, `converse`/`inverse-of`, sheafed
  multi-source consensus, and English-to-EAVT parsing.

Status: design records, not living implementations. Their sources were not part
of the received set. The living EAVT carrier is
`computer-data-engineering-services-section/services/semiotic-eavt-engineering-services-section`
(`seavtRow`, the content-addressed store, `causal-resource-head`), which keeps
the observation time field `t` and does not collapse contradiction. The
`negates`/`functional`/`recall` rules have no located living counterpart; a
consumer that needs them should build them over SignCell evidence pairs and
SignCraft settlement rather than over the retired `voidmath-kernel` imports.

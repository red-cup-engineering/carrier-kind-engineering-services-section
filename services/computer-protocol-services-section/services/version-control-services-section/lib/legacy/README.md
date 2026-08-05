# lib/legacy

Parked reference code. Nothing here runs as part of any build, test, or
product path in this section — these are copies kept for reference because
they touch git and someone doing related work later may want to read them.
Read them for ideas; don't import them, wire them up, or point a package.json
`bin`/`scripts` entry at them without first re-seating them as a proper
service the way `gitmodules-file-codec-service` and
`git-recursive-commit-service` were rescued.

## Contents and where each came from

- `measure-git-semantics.sh` — copied from
  `red-cup-engineering/src/content/assets/legacy/2025-11-22-emsdeavor/developing/semiotic-repository/standards/semiotic-git/measure-git-semantics.sh`.
  Reports a repository's annotated-tag/stable-vs-provisional commit counts
  and distance from its latest annotated tag.

- `install-a-git-pre-commit-hook.mjs` — copied from (two byte-identical
  copies existed; this is one of them)
  `red-cup-engineering/src/content/assets/legacy/2026-06-17-archive.emsenn.net/dev/ref/src/from-content-source/math-substrate/voidmath-2026-05-25/.../installing-a-git-pre-commit-hook/scripts/install-a-git-pre-commit-hook.mjs`.
  Writes `.git/hooks/pre-commit` as a thin shim that execs
  `route-a-git-pre-commit.mjs`.

- `route-a-git-pre-commit.mjs` — copied from (two byte-identical copies
  existed; this is one of them)
  `red-cup-engineering/src/content/assets/legacy/2026-06-17-archive.emsenn.net/dev/ref/src/from-content-source/math-substrate/voidmath-2026-05-25/.../routing-a-git-pre-commit/scripts/route-a-git-pre-commit.mjs`.
  The pre-commit hook body `install-a-git-pre-commit-hook.mjs` shims to; runs
  whatever checks that legacy tree considered pre-commit gates.

None of the three has been adapted to this section's conventions (the
`install`/`route` pair still reference the donor tree's own long nested
path internally). They are preserved as-is, as a record of what existed,
not as something meant to run here.

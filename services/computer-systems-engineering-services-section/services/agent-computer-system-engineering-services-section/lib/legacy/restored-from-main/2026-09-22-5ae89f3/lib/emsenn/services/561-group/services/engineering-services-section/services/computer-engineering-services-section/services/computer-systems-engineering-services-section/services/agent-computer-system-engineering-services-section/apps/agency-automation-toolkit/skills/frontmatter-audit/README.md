# Frontmatter Audit

Frontmatter in this repo is treated as a file-local inventory of
meaningful predications, not as a dumping ground for workflow state or
path trivia.

## Current cleanup rules

1. `cites` and `references` are legacy.
   Use a single `citations:` mapping keyed by citation id.

2. `part-of` is ambiguous and usually redundant.
   If a file is *about* a subject, use an explicit predicate such as
   `studies:` or `survey:`.
   If the claim only repeats directory membership, drop it.
   For terms, prefer `introduces`, `defines`, and `aliases`; add another
   relation only when it says something not already given by the path.

3. Duplicate YAML keys are always errors.
   They often indicate that a weak key should have been replaced by a
   single explicit predicate with a list value.

## Workflow

1. Run the audit.
2. Fix parse blockers first.
3. Migrate legacy keys subtree by subtree.
4. Re-run the Hugo build and repeat.

## Commands

Text report:

```powershell
powershell -ExecutionPolicy Bypass -File `
  operations/science/toys/frontmatter-audit/audit-frontmatter.ps1 `
  -Root library
```

JSON report:

```powershell
powershell -ExecutionPolicy Bypass -File `
  operations/science/toys/frontmatter-audit/audit-frontmatter.ps1 `
  -Root library `
  -Format json
```

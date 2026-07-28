# Repository State Observation Service

A directly contractible, purpose-specific software operation developed by the
Software Development Services Section. It observes `git status --short
--branch` through the separately owned Git Services Section. It never invokes Git
directly and it advertises no mutation effect.

The returned product contains the exact nested provider evidence, parsed branch
and worktree entries, and a digest of the raw status output. It is evidence for
a customer decision, not a claim that the repository or a proposed change is
good.

# Customer interface

For Git operations on this machine, invoke this section's managed wrapper
instead of raw `git`:

```
lib/emsenn/services/561-group/services/engineering-services-section/services/computer-services-section/services/computer-protocol-services-section/services/version-control-services-section/services/git-services-section/scripts/git-services <args>
```

`cd` into the repository first — the wrapper refuses `-C`, `--git-dir`,
`--work-tree`, and the other repository-override flags outright, and it
refuses to run at all outside the one `repo_root` its machine config names
(see `etc/machine.conf`).

Reads (`status`, `diff`, `log`, `show`, `rev-parse`, and the rest of
`etc/machine.conf`'s `read_commands` list) pass straight through with no
locking. Writes (`add`, `commit`, `push`, `submodule`, and the rest of
`write_commands`) serialize through one `flock` lane shared by every writer
on the machine, so two concurrent agents can't corrupt one index or run the
disk out of headroom.

Two write shapes are refused even inside the write lane, because on a
machine with several agents sharing one tree they silently absorb another
agent's in-flight work:

- ambient `git add -A` / `git add .` / `git add *` — stage named paths instead.
  The deletion-aware helper shape `git add -A -- path/to/file path/to/tree`
  is admitted because the `--` pathspec boundary makes its custody explicit.
- an unscoped `git commit` — scope it with `-- <paths>` or
  `--pathspec-from-file` (a commit that completes a merge/cherry-pick/revert
  is exempt, since git itself refuses path-limited commits in that state).

There is no signed request, no smart-account custody, no on-chain
settlement, and no separate device-I/O coordinator in the request path for
an ordinary Git operation today. (`block-device-io-coordinator`, this
section's sibling die, exists and is well-tested, but nothing calls it yet
— see the section README.) A refused command exits non-zero with a
`managed git: denied: ...` or `managed git: deferred: ...` line on stderr
naming the policy file and the exact reason.

## Nested-repository custody procedure

Every change begins by identifying the repository that owns the files and
every parent gitlink between that repository and `/home/emsenn/info`. A root
status alone is not evidence that nested work is safe.

1. Inventory registered submodules recursively and any independent nested
   `.git` worktrees. Record dirty state, branch or detached HEAD, configured
   remote, and remote reachability before changing refs.
2. Verify and commit the deepest changed repository first. Stage only named
   paths, push with `--recurse-submodules=check`, and confirm the remote ref
   resolves to the exact local commit.
3. At each parent boundary, commit only the updated gitlink, push that parent,
   and continue upward. Do not report a move complete until every affected
   parent gitlink has been published.
4. Before publishing the root, require an empty recursive registered-submodule
   dirty scan, run `scripts/audit-git-custody.mjs`, and use
   `git push --recurse-submodules=check`.
5. Never force a divergent branch during routine custody. Fetch and reconcile
   it, or publish the local tip to a new incident-recovery branch first.

Repository extraction and retirement are not routine deletion. Preserve path
history in a temporary clone, publish the populated leaf before replacing the
parent directory, and record broad moves under `.git-custody/relocations/`.
Retirement means a populated `lib/legacy/YYYY-MM-DD-name` submodule and a
matching dated hosted repository name. It never means an empty head.

The managed wrapper injects the tracked `hooks/pre-push` for every push. Do not
install wrappers, hooks, symlinks, or Git config in the human user's account.

Hooks are defense in depth, not the procedure itself. A hook refusal must name
the failing repository; bypassing a hook is reserved for a reviewed recovery
ref whose recorded gitlinks have independently passed the recursive check.

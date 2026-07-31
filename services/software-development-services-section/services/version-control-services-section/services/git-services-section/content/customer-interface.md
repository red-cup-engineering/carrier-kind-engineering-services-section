# Customer interface

For Git operations on this machine, invoke this section's managed wrapper
instead of raw `git`:

```
lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/services/software-development-services-section/services/version-control-services-section/services/git-services-section/bin/git <args>
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

- `git add -A` / `git add .` / `git add *` — stage named paths instead
  (`git add path/to/file`).
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

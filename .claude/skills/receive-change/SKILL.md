---
name: receive-change
description: Test, merge and see through your own change in this repository the way the 561 Group's machines receive it. Use before opening, updating or merging a pull request here, and whenever tests cannot load house packages.
---

# Receive your own change

You receive your own work. Nobody else will review, test or merge it.

1. **Commit** the change on your branch. The change test reads committed source, not the working tree.
2. **Test it for real**, with the machine's own dependencies, never stand-ins:

   ```sh
   node ~/.cache/561-group/controller/scripts/test-change.mjs \
     ~/.cache/561-group/cold-red-gate ~/.cache/561-group/test-change \
     OWNER/REPO="$CLAUDE_PROJECT_DIR"
   ```

   `OWNER/REPO` is this repository, as the session start named it (for example
   `red-cup-engineering/computer-services-section`). Pass one `OWNER/REPO=PATH` per repository your
   change spans.

   It composes Cold Red Gate's admitted workspace with your commit in place of the pinned one, installs
   from the house registry, builds the way a release is assembled, and runs the tests of every package you
   touched. The verdict is `no-regression`, `regression` (a file that fails with your change and passes
   without it) or `incomplete` (a comparison it could not make, with the reason). The first run takes about
   fifteen minutes; later runs reuse the pinned workspace.

   If the session start reported a repository it cannot read, attach it with `add_repo` first.
3. **Fix** every regression your change introduced. Failures that also fail without your change are not
   yours; say so on the pull request.
4. **Record** the verdict on the pull request: the commit, the verdict, and any pre-existing failures.
5. **Merge** into the branch the pull request targets with a merge commit, then delete your branch.
6. **See it received**: Cold Red Gate advances to merged source every fifteen minutes and releases it with
   sealed-store tests, an isolated probe, live health and automatic recovery. A failed release reopens the
   work for you.

Only real-money risk, credentials and calls the founder has reserved go to the founder. Name those once on
the pull request and keep working on everything else.

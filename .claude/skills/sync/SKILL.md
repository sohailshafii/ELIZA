---
name: sync
description: Sync the local repo with the remote default branch after a PR merges — switch to master, fast-forward pull with prune, and delete local branches whose PRs have already been merged. Use when the user says "sync", "sync up", or after a PR is merged and before starting the next stage.
---

# sync

Bring the local checkout back in line with the remote default branch after work
merges, and clean up stale local branches. Safe to run repeatedly.

## Steps

1. Make sure the working tree is clean enough to switch branches. Run
   `git status --short`. If there are uncommitted changes on the current
   branch, stop and report them — do not stash or discard without asking.

2. Switch to the default branch and fast-forward:

   ```bash
   git checkout master
   git pull --prune --ff-only origin master
   ```

   `--ff-only` guarantees we never create a surprise merge commit; if it
   refuses, the local `master` has diverged — report that instead of forcing.

3. Delete local branches that have already been merged into `master`:

   ```bash
   git branch --merged master | grep -vE '^\*|^\s*master$' | xargs -r git branch -d
   ```

   `git branch -d` (lowercase) only deletes fully-merged branches, so it will
   not throw away unmerged work. Squash-merged PR branches are an exception:
   they will not show as merged. If the user confirms a squash-merged branch is
   done, delete it explicitly with `git branch -D <name>`.

4. Report the result: the current branch, that it is up to date with the
   remote, and which local branches were deleted.

## Notes

- Do not push, open PRs, or modify files — this skill only syncs and prunes.
- If the repo's default branch is not `master`, substitute the actual default
  branch everywhere above.

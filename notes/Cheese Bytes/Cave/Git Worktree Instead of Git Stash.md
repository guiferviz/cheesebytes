When working with [[Git]], you often need to switch between branches or work on
multiple features simultaneously. While many developers use `git stash` to
temporarily save changes, Git worktrees offer a more powerful and flexible
alternative.

# What is Git Worktree?

Git worktree allows you to check out multiple branches at the same time. Each
worktree is a separate working directory with its own branch, but all worktrees
share the same repository history and object database. This makes it easier to
work on multiple features or bug fixes simultaneously without the need to stash
and unstash changes.

Commands:

```
git worktree add -b <new-branch> ../<my-folder>
```

Learned this from this nice video: https://www.youtube.com/watch?v=ntM7utSjeVU

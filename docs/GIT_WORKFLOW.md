# Git Workflow — VIKASANA_WEBSITE

Rule #1: **`main` is always deployable.** Never commit or experiment directly on `main`.
Rule #2: Every experiment gets a feature branch. Every risky change gets a checkpoint commit first.

If you follow this, you can always get back to a working version in under a minute.

---

## 1. Branch strategy

- `main` — always stable, always deployable. Nothing experimental ever lands here directly.
- `feature/<name>` — one branch per task/experiment. Created from `main`, merged back only after approval.

Naming examples: `feature/home-hero`, `feature/navigation`, `feature/search`, `feature/careers`,
`feature/mobile`, `feature/products`, `feature/animations`, `feature/legal`, `feature/ui-refresh`.

## 2. Starting new work

```bash
# make sure main is up to date and clean
git checkout main
git pull

# create your feature branch
git checkout -b feature/home-hero
```

All edits for that task happen on this branch. `main` is untouched until you approve a merge.

## 3. Safety checkpoints (before any risky change)

Before a significant or risky edit, snapshot the current state:

```bash
git add .
git commit -m "Checkpoint before Hero redesign"
```

This costs nothing and guarantees a return point. Commit early, commit often — checkpoints are cheap,
lost work is not.

## 4. Reviewing changes before merging

```bash
git status                  # what's changed
git diff                    # line-by-line diff, unstaged
git diff --cached           # line-by-line diff, staged
git log --oneline main..HEAD   # commits on this branch not yet on main
```

Only merge into `main` after you've reviewed the diff and approved it.

## 5. Merging an approved feature into main

```bash
git checkout main
git pull
git merge feature/home-hero
git push
```

## 6. Rollback commands

**Restore last checkpoint (undo uncommitted changes on current branch):**
```bash
git restore .
# or, to also remove untracked files:
git clean -fd
```

**Restore to the previous commit (discard the most recent commit, keep it reachable):**
```bash
git reset --soft HEAD~1     # keeps changes staged, undoes the commit
git reset --hard HEAD~1     # discards the commit AND its changes — only with explicit approval
```

**Return to a previous feature-branch state:**
```bash
git log --oneline           # find the commit hash you want
git checkout <commit-hash> -- .    # restore files from that commit into working tree
git commit -m "Revert to <commit-hash>"
```

**Delete a failed experiment branch:**
```bash
git checkout main
git branch -D feature/failed-experiment      # local
git push origin --delete feature/failed-experiment   # remote, if pushed
```

**Return to latest stable main (abandon all local changes):**
```bash
git checkout main
git fetch origin
git reset --hard origin/main   # only with explicit approval — discards local main changes
```

**Restore project to an exact previous tagged version:**
```bash
git checkout v0.1 -- .
git commit -m "Restore to v0.1"
```

## 7. Release tags

Tag a milestone once it's stable and worth being able to return to permanently:

```bash
git tag -a v0.2 -m "Description of this milestone"
git push origin v0.2
```

Suggested progression: `v0.1`, `v0.2`, `v0.3` … `v1.0-beta`, `v1.0`.

List tags: `git tag -n99`
Check out a tag (read-only, detached HEAD): `git checkout v0.1`
Restore working tree to a tag without losing current branch: `git checkout v0.1 -- .`

## 8. What NEVER happens automatically

- No `git push --force`
- No rewriting history (`rebase -i`, `filter-branch`, `commit --amend` on pushed commits)
- No `git reset --hard` without explicit approval
- No deleting branches without explicit approval
- No direct commits to `main`

## 9. Recommended daily workflow

1. `git checkout main && git pull`
2. `git checkout -b feature/<task-name>`
3. Work, checkpoint-commit often (`git add . && git commit -m "Checkpoint: ..."`)
4. When done: review diff (`git diff main..HEAD`), get approval
5. Merge to `main`, push
6. Tag if it's a milestone
7. Delete the feature branch once merged and confirmed working

## 10. .gitignore coverage

The root `.gitignore` excludes: `node_modules/`, build/dist output, `coverage/`, Next.js artifacts,
`.env*` files, logs (`*.log`), OS junk (`.DS_Store`, `Thumbs.db`, `desktop.ini`), editor files
(`.idea/`, `.vscode/`, swap files), temp/cache directories, and local Cowork/Claude settings
(`.claude/settings.local.json`). `frontend/.gitignore` additionally covers its own `node_modules/`,
`build/`, and env files.

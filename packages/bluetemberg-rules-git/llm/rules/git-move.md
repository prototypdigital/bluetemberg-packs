---
description: Use git mv for tracked files to preserve history.
scope: "**"
---

# Git move

If moving an existing file that is not `git ignored`, use `git mv {source} {dest}`, as this preserves the git history for the file and shows any new diff.

## Examples

```sh
# BAD — git loses history; the file appears as deleted + added
mv src/utils/format.ts src/lib/format.ts
git add .

# GOOD — git tracks the rename; history is preserved
git mv src/utils/format.ts src/lib/format.ts
```

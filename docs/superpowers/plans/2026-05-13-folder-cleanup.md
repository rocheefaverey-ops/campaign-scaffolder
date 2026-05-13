# Folder Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the campaign-scaffolder root to be visually tidy and professionally organized, with no code changes.

**Architecture:** Pure filesystem operations using `git mv` (preserves history) and `git rm -r` (tracked deletions), plus `.gitignore` edits. No logic or code changes at any point.

**Tech Stack:** Git, PowerShell

---

### Task 1: Move `.bat` scripts to `scripts/`

**Files:**
- Move: `scaffold-test.bat` → `scripts/scaffold-test.bat`
- Move: `teardown.bat` → `scripts/teardown.bat`
- Move: `wizard.bat` → `scripts/wizard.bat`
- Modify: `README.md` (update 3 references to `wizard.bat`)

- [ ] **Step 1: Move the files**

```bash
git mv scaffold-test.bat scripts/scaffold-test.bat
git mv teardown.bat scripts/teardown.bat
git mv wizard.bat scripts/wizard.bat
```

- [ ] **Step 2: Verify files are in new location**

```bash
ls scripts/
```

Expected output includes: `scaffold-test.bat`, `teardown.bat`, `wizard.bat`, `verify-antigravfix.js`

- [ ] **Step 3: Update README.md references**

README.md has three lines referencing `wizard.bat` at root (lines 37, 52, 132). Update each to `scripts/wizard.bat`:

Line 37: `- CLI: \`wizard.bat\` (Windows)` → `- CLI: \`scripts/wizard.bat\` (Windows)`
Line 52: `wizard.bat` (standalone) → `scripts/wizard.bat`
Line 132: `- \`wizard.bat\`, \`test-scaffold.bat\` convenience launchers.` → `- \`scripts/wizard.bat\`, \`scripts/scaffold-test.bat\` convenience launchers (in \`scripts/\`).`

- [ ] **Step 4: Commit**

```bash
git add scripts/scaffold-test.bat scripts/teardown.bat scripts/wizard.bat README.md
git commit -m "chore: move .bat scripts to scripts/"
```

---

### Task 2: Move `AGENTS.md` and `IMPLEMENTATION_SUMMARY.md` to `docs/`

**Files:**
- Move: `AGENTS.md` → `docs/AGENTS.md`
- Move: `IMPLEMENTATION_SUMMARY.md` → `docs/IMPLEMENTATION_SUMMARY.md`

- [ ] **Step 1: Move the files**

```bash
git mv AGENTS.md docs/AGENTS.md
git mv IMPLEMENTATION_SUMMARY.md docs/IMPLEMENTATION_SUMMARY.md
```

- [ ] **Step 2: Verify root no longer contains these files**

```bash
ls *.md
```

Expected: only `README.md` and `CLAUDE.md` remain at root.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: move AGENTS.md and IMPLEMENTATION_SUMMARY.md to docs/"
```

---

### Task 3: Rename `public/` to `reference-assets/`

**Files:**
- Rename: `public/` → `reference-assets/`

- [ ] **Step 1: Rename the directory**

```bash
git mv public reference-assets
```

- [ ] **Step 2: Verify**

```bash
ls reference-assets/
```

Expected: `assets/`, `fonts/`, and SVG files that were in `public/`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: rename public/ to reference-assets/"
```

---

### Task 4: Delete `_out/` and add to `.gitignore`

**Files:**
- Delete: `_out/`
- Modify: `.gitignore`

- [ ] **Step 1: Remove the directory from git tracking**

```bash
git rm -r _out/
```

- [ ] **Step 2: Add `_out/` to `.gitignore`**

Open `.gitignore` and append:

```
# Scaffold test output
_out/

# Large video files (keep locally, don't commit)
*.mp4
```

- [ ] **Step 3: Verify `_out/` is gone from the tree**

```bash
ls
```

Expected: `_out/` no longer appears at root.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: delete _out/ test output and update .gitignore"
```

---

### Task 5: Delete `voorbeeld figma designs/`

**Files:**
- Delete: `voorbeeld figma designs/`

- [ ] **Step 1: Check if the directory is tracked by git**

```bash
git ls-files "voorbeeld figma designs/"
```

If output is empty, the folder is untracked — skip to Step 3.

- [ ] **Step 2: Remove from git if tracked**

```bash
git rm -r "voorbeeld figma designs/"
```

- [ ] **Step 3: Remove from disk if untracked**

```powershell
Remove-Item -Recurse -Force "voorbeeld figma designs"
```

- [ ] **Step 4: Verify folder is gone**

```bash
ls
```

Expected: no `voorbeeld figma designs/` at root.

- [ ] **Step 5: Commit (only if git tracked; skip if untracked)**

```bash
git add -A
git commit -m "chore: delete voorbeeld figma designs/"
```

---

### Task 6: Move `docs/superpowers/` to `.claude/superpowers/`

**Files:**
- Move: `docs/superpowers/` → `.claude/superpowers/`

Note: This moves the specs and plans directories (including this plan file) into `.claude/`. That is intentional — Claude Code internal planning docs belong alongside Claude Code config, not in project-facing docs.

- [ ] **Step 1: Move the directory**

```bash
git mv docs/superpowers .claude/superpowers
```

- [ ] **Step 2: Verify**

```bash
ls .claude/
```

Expected: `settings.local.json` and `superpowers/` directory.

```bash
ls .claude/superpowers/
```

Expected: `plans/`, `specs/`, and any context `.md` files.

- [ ] **Step 3: Verify `docs/` is clean**

```bash
ls docs/
```

Expected: `AGENTS.md`, `IMPLEMENTATION_SUMMARY.md`, `PROJECT-CONTEXT.md` — no `superpowers/` directory.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: move docs/superpowers to .claude/superpowers"
```

---

## Final Verification

After all tasks complete, confirm the root looks exactly like this:

```
.claude/
base-templates/
brand-assets/
cli/
docs/
examples/
games/
modules/
reference-assets/
scripts/
.gitignore
CLAUDE.md
package.json
README.md
```

Run:
```bash
ls -la
```

And confirm no extra files or directories remain at root.

---
title: Project Folder Cleanup & Visual Tidiness
date: 2026-05-13
status: approved
---

# Project Folder Cleanup — Design Spec

## Goal

Make the campaign-scaffolder root visually clean and professional for anyone opening the repo, and remove operational clutter (test output, orphaned files, misnamed directories).

## Scope

Visual tidiness + operational cleanup only. No code changes, no tooling additions, no CI/CD.

---

## Operations

### 1. Move `.bat` scripts → `scripts/`

| From | To |
|------|----|
| `scaffold-test.bat` | `scripts/scaffold-test.bat` |
| `teardown.bat` | `scripts/teardown.bat` |
| `wizard.bat` | `scripts/wizard.bat` |

`scripts/` already contains `verify-antigravfix.js`. All utility scripts live together.

### 2. Move root docs → `docs/`

| From | To |
|------|----|
| `AGENTS.md` | `docs/AGENTS.md` |
| `IMPLEMENTATION_SUMMARY.md` | `docs/IMPLEMENTATION_SUMMARY.md` |

Root keeps only `README.md` and `CLAUDE.md`.

### 3. Move `docs/superpowers/` → `.claude/superpowers/`

Claude Code internal planning files (specs, plans, context docs) belong in `.claude/`, not in project documentation. `docs/` should contain only project-facing documentation.

### 4. Rename `public/` → `reference-assets/`

The root `public/` is a reference library of fonts, icons, and static assets used when building templates and seeding files — not a web-served directory. Renaming makes its purpose clear and avoids confusion with `base-templates/next/public/`.

### 5. Delete `_out/`

Contains scaffolded smoke test outputs. These are throwaway test runs and should not be tracked. Add `_out/` to `.gitignore`.

### 6. Delete `voorbeeld figma designs/`

Figma design exports that are no longer needed in the repo. Folder name has spaces and is in Dutch, making it awkward in CLI/path contexts.

### 7. Update `.gitignore`

Add:
```
_out/
*.mp4
```

`*.mp4` prevents large video files from being accidentally committed. `brand-assets/video/background.mp4` and `base-templates/next/public/assets/background.mp4` remain on disk as local references but are not tracked by git.

---

## Result: Root After Cleanup

```
campaign-scaffolder/
├── .claude/           # Claude Code config + superpowers planning (moved here)
├── base-templates/    # Next.js + TanStack starter templates
├── brand-assets/      # Brand media (logos, favicons, hero images, video)
├── cli/               # Scaffolder CLI + wizard server/UI
├── docs/              # Project documentation (clean, no superpowers/)
├── examples/          # Example campaign page components
├── games/             # Game registry manifests
├── modules/           # Optional feature modules
├── reference-assets/  # Reference fonts, icons, assets for template development
├── scripts/           # All utility scripts (.bat + .js)
├── .gitignore         # Updated
├── CLAUDE.md
├── package.json
└── README.md
```

---

## Out of Scope

- Linting / Prettier / ESLint configuration
- CI/CD pipeline
- TypeScript strictness changes
- Any changes to `base-templates/`, `modules/`, `cli/`, or `games/`

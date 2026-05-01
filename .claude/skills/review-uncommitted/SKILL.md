---
description: Run a comprehensive Security, Performance, and Bug review on current changes (staged or unstaged) before pushing to GitLab.
---

# Pre-Push Code Reviewer

## 1. Context Gathering
1.  **Analyze Changes**: Run `git diff HEAD`
2.  **Smart Context (CRITICAL)**:
    * Database Schema Detection (CRITICAL):
       * If changes to `src/server/db/schema.ts` are detected:
         * Verify the developer has run `npx drizzle-kit generate` and a corresponding `.sql` migration file exists in `drizzle/migrations/`
         * Flag as HIGH SEVERITY if the migration file is missing
    * If a function signature changed, grep/search for all usages of that function in the codebase to ensure no breaking changes.

## 2. The Checklist
- Look at the CLAUDE.md guidelines and check for any violations in the code changes.

## 3. Execution & Reporting
* **Step 1**: Summarize the **High Severity** issues found.
* **Step 2**: For each issue, **propose the fix**.
* **Step 3**: Ask the user: *"Would you like me to apply these fixes automatically?"*

## 4. Auto-Fix Rules
If the user says "Yes":
* Apply the fixes.
* **Run the build/lint command** (e.g., `npm run build`) to ensure the fix didn't break the build.
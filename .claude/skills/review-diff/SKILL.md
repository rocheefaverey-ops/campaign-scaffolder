---
name: review-diff
description: "Reviews changes between the current branch and a target branch (default: acceptance) for bugs, logic issues, and security vulnerabilities."
---

# Review Diff Skill

## Goal
Review the code changes between the current HEAD and a target branch. You must identify logical bugs, functional regressions, and conduct a comprehensive security audit of the new code.

## Inputs
- `target_branch`: (Optional) The branch to compare against. Defaults to "main" or "master" depending on what exists.

## Steps

1.  **Identify Branches**
    - Determine the current branch name.
    - specific `target_branch` if provided, otherwise assume `acceptance` branch is the target, or use `master` for target if `acceptance` is the source

2.  **Fetch & Analyze Diff**
    - Run `git diff <target_branch>...HEAD` to get the changes.
    - If the diff is empty, inform the user that branches are identical.
    - If the diff is massive (>20 files), ask the user if they want a summary review or a deep dive into specific critical files.

3.  **Functional Review**
    - Analyze the *intent* of the code based on function names and comments.
    - **Logic Check:** Look for off-by-one errors, unhandled edge cases, or broken control flow.
    - **Regression Check:** Identify if existing functionality (like error handling wrappers) has been removed or bypassed.

4.  **Security Audit (Critical)**
    - **Injection Flaws:** Check for SQL injection, Command injection, or Cross-Site Scripting (XSS) in changed lines.
    - **Data Exposure:** Ensure no sensitive data (API keys, PII) is being logged or hardcoded.
    - **Auth/Access:** Verify that new endpoints or sensitive functions have proper authorization checks.
    - **Dependencies:** If `package.json`, `requirements.txt`, etc., changed, check if new packages are known to be reputable (hallucination check).

5.  **Report Format**
    Output the findings in this markdown format:

    ## 🔍 Functional Issues
    * [High/Medium/Low] Description of the bug...
    
    ## 🛡️ Security Vulnerabilities
    * [Critical/High/Low] Description of the vulnerability...
    
    ## ✅ Code Quality & Nits
    * Minor suggestions for readability or style...

    ## Summary
    Give a one-line verdict: "Ready to Merge", "Needs Corrections", or "Blocked by Security Issues".
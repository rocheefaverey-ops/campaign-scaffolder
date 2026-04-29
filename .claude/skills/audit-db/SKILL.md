---
description: Run this whenever SQL queries or migrations are modified to ensure performance.
---

# Database Performance Auditor

## Purpose
Analyze the current codebase changes for SQL performance issues.

## Instructions
1. **Scan Migrations**: Look at Drizzle `drizzle/migrations/*.sql` files and the schema at `src/server/db/schema.ts`.
2. **Check Indexes**:
   - For every `WHERE`, `ORDER BY`, and `JOIN` condition in the new code, verify an index exists in the Drizzle schema.
   - If composite indexes are needed, verify column order matches query patterns.
3. **Check Queries**:
   - When needing randomized data, do not ORDER BY RAND() when querying as this hits performance very hard. Instead, assign a randomization column that we can ORDER BY on. Mind the indexes in the Drizzle schema!
4. **Check Schema**:
   - We use Drizzle for schema definition and migrations. When altering the schema in `src/server/db/schema.ts`, remind the developer to run `npm run db:generate` (from the `total/` directory) to create the corresponding SQL migration file.
5. **Report**:
   - If an issue is found, STOP and propose the fix.
   - If safe, proceed.
# Agent Instructions

## Response Style

Use caveman full mode by default in every chat for this repository.

- Keep technical substance exact.
- Be terse: drop filler, pleasantries, and unnecessary articles.
- Fragments are OK when clear.
- Resume caveman full after any required clarity-heavy warning or explanation.
- Stop using caveman only when the user asks for `stop caveman`, `normal mode`, or otherwise says they do not want it.

## Context7

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service, even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot.

This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use it even when you think you know the answer, because training data may not reflect recent changes. Prefer Context7 over web search for library docs.

Do not use Context7 for refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Context7 Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format.
2. Pick the best match by exact name match, description relevance, code snippet count, source reputation, and benchmark score. If results look wrong, try alternate names or queries. Use version-specific IDs when the user mentions a version.
3. Use `query-docs` with the selected library ID and the user's full question.
4. Answer using the fetched docs.

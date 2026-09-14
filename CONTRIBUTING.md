# Contributing

Read [README.md](README.md) for setup and repository layout.

Keep Creed small, document-first, and local. It is a personal-context editor, not a notes app, journal, or chat-memory store. Prefer existing components and motion patterns. Keep TypeScript strict and justify new dependencies.

Before submitting changes, run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. For native changes, also build the app with `npm run bundle`. Verify user-file safety and local MCP permissions whenever changing storage or agent operations.

Do not commit keys, local files, generated bundles, build caches, or private context. Temporary plans and reports belong in the ignored root `disposable/` folder. Do not modify unrelated user changes or create Git commits, tags, or releases without authorization.

Update the public documentation when architecture or product behavior changes. Keep comments limited to durable, non-obvious intent. User-facing copy should be calm, precise, and free of em dashes.

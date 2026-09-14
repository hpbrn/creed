# Working on Creed

Read `.agents/context/index.md`, the relevant context documents, and the exact code path before editing. Code is canonical when documentation drifts.

Creed is a local-first Mac application for personal context, not a notes app. `apps/desktop` owns its React interface and Tauri/Rust backend. `apps/home` owns the independent Next.js website. There are no internal shared packages or hosted account backend.

## Invariants

- Markdown files belong to the user. Never recreate missing files or overwrite known external changes.
- Opening a file preserves its content. Create starts with one empty blue Identity section.
- Forgetting an inactive Creed keeps its file; Delete moves the actual file to Trash; Rename changes its filename.
- MCP binds to loopback, rejects browser origins, and enforces section permissions in Rust. No login or approval screen.
- Keep OpenRouter credentials in Keychain and Linear credentials on the website server.
- No personal data, secrets, machine-specific paths, or console logging in source.
- Strict TypeScript, no `any`, no unnecessary dependencies. Use existing editor and interface primitives.
- Product copy is calm and precise, with no em dashes.

## Workflow

Preserve unrelated user edits. Use the repository's refactor, comment, copy, docs, debug, review, and oss skills when applicable. Read commit/PR/release skills before those explicitly requested operations; ordinary implementation grants no publication authority. Creed has one repo-wide version and release tag across every shipped component. Website-only changes do not advance it.

Temporary plans and reports belong in ignored `disposable/`. Update durable `.agents/context/` knowledge after substantive changes. Do not create skills or change existing skill workflows without approval.

Before claiming completion run:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Also run `npm run bundle` for native packaging changes. Review actual runtime behavior; compilation alone does not prove the UI works. Report unverified paths and external signing/deployment requirements accurately.

Use 160ms popovers, 200ms chevrons, 220–280ms accordions, and easing `cubic-bezier(0.22, 1, 0.36, 1)`. Do not reintroduce `content-visibility: auto` in the editor. Tailwind v4 important modifiers are postfix.

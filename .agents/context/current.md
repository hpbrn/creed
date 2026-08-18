# Current State

Last updated: 2026-09-02.

## Release focus

Creed Open v1.0.0 is the public product. It is free, MIT licensed, single-owner, Personal-only, straightforward to self-host, and usable without any Creed-managed service. The public Git history is a single root commit tagged `open-v1.0.0`.

Creed Cloud continues in `apps/cloud/` for private development and testing. Hosted accounts, payments, managed credits, Shared Creeds, and feedback are not part of Open v1. The standalone CLI has been removed for a clean rebuild.

The hosted Cloud deployment can be kept private with `CREED_CLOUD_ACCESS=private` and a server-only `CREED_CLOUD_TESTER_EMAILS` allowlist. In that mode public acquisition points to the roadmap, billing is disabled, and only approved accounts can use Cloud pages, APIs, HTTP tokens, or MCP.

## Implemented release shape

- Open and Cloud are independent Next.js build targets.
- Improvements common to both live in shared packages.
- File, Connections, and Settings switch on click. If the destination chunk is still loading, the existing route skeleton shows until it is ready.
- Edition-specific behavior is selected at compile time through typed adapters.
- Open has no login, signup, account menu, billing, Stripe, feedback, Shared, or invitation routes.
- Open claims one installation owner with an 8-digit owner code at `/enter` and a long-lived owner cookie. Incomplete installs stay on `/setup`.
- Open uses Supabase for durable storage and RLS, with a versioned readiness check.
- First run opens `/file` with a ready Personal Creed. The New Creed dialog remains and still supports a custom name and picture, without a type selector. The Get started card is the first-run teaching UI.
- Open uses a sidebar theme button in place of the Cloud account button.
- Save-state behavior is shared. Open uses grey for local drafts and green while saving to or saved in the database.
- Public Open calls to action say `View on GitHub`.
- The CLI setup card is hidden in Open and Cloud until the standalone CLI is rebuilt. Connections shows a full-width MCP card.
- The standalone documentation site lives in `apps/docs/` and owns its content, navigation, and purple brand treatment. Open and Cloud no longer ship a `/docs` route; product links and agent contracts point to `docs.creed.md`.
- Cloud owns the public sponsor wall and one-time Stripe contributions. Sponsor data stays isolated behind server-only persistence and bounded public read routes.

## Supported Open setup

- Local development
- Vercel deployment
- Platform-neutral Node.js hosting contract
- Supabase database and Auth infrastructure
- Optional OpenRouter BYOK features
- Optional GitHub OAuth version control

`npm run setup` is the canonical interactive installer. It validates prerequisites and configuration, preserves existing environment values, links Supabase, previews migrations, asks before applying them, and verifies readiness. `npm run doctor` performs the same readiness checks without mutating local or remote state. `SETUP.md` is the complete manual and deployment reference.

Email delivery, public account registration, Stripe, and Creed-managed credits are not required.

A pre-release Git bundle of the former history is kept outside the repository as a recovery point.

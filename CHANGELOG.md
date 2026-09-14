# Changelog

Creed follows [Semantic Versioning](https://semver.org/). Commits record work; versions and Git tags mark deliberate repo-wide releases. Desktop, CLI, Bench, Skills, and future shipped components share one Creed version. Website-only changes do not advance it. A commit landing on `main` does not automatically create a release. Tags use `v1.0.0`, with release titles such as `Creed 1.0.0`.

- Major: an incompatible product, data, API, or setup contract change.
- Minor: a backwards-compatible feature or meaningful new capability.
- Patch: a fix, polish, copy, documentation, dependency, refactor, or operational improvement.

## Creed 1.0.0, 2026-09-15

The Mac desktop application replaces the hosted editions. It uses user-owned Markdown files, a local MCP service, per-section agent permissions, proposals, and OpenRouter features using the user's key. The website focuses on downloading the Mac installer.

Accounts, subscriptions, cloud synchronization, built-in GitHub push/pull, and the separate docs and status applications have been removed. Website sponsorship remains available independently of the app.

This release is for Apple silicon Macs. It is ad-hoc signed, not Apple-notarized. macOS may require approval in System Settings > Privacy & Security > Open Anyway. It includes the updater configuration needed for later versioned releases.

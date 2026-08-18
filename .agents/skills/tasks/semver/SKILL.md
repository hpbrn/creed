---
name: semver
description: Prepare an intentional Creed product release using Semantic Versioning. Use when the user asks to release or version Open, Cloud, CLI, or Bench, or when a commit has explicitly been designated as a product release. Do not use merely because a commit targets main. Status, docs, and the marketing site are not versioned products.
---

# SemVer

Prepare one deliberate product release. Commits and product releases are separate concepts: ordinary work may land on `main` without changing a product version or creating a release tag.

## Scope gate

- Identify the exact product being released: Open, Cloud, CLI, or Bench.
- If the product is CLI and `packages/creed-cli/package.json` does not exist, stop. The CLI is reserved for a future rebuild and cannot be versioned until that package exists.
- Apply this workflow only when the user has requested a release/version or the commit has already been explicitly designated as that product's release unit.
- Do not infer a release from the target branch, deployment possibility, changed directory, or user-facing nature of a change.
- Homepage, documentation, repository tooling, internal context, and status-site work are not product releases. Do not bump Open, Cloud, CLI, or Bench for them unless the user deliberately includes them in that product release.
- Shared-package work bumps only the product deliberately being released, even when several products consume the code.
- Do not bump versions for intermediate development commits.
- If unrelated changes would be combined, split or stop before selecting a version.
- Never tag, commit, push, publish, or rewrite history without the user's authority for that action. A request to release or version a product, commit it, and push it includes authority for the matching annotated release tag and GitHub Release unless the user excludes either publication step.

## Select the next version

Read the complete release diff since that product's previous release and its canonical version:

- Open: `apps/open/package.json`
- Cloud: `apps/cloud/package.json`
- CLI: `packages/creed-cli/package.json`
- Bench: `BENCHMARK_VERSION` in `packages/creed-app/bench/types.ts`

- `major`: incompatible data, API, setup, or product-contract change that requires user action. For Bench, any change that makes previous published scores incomparable.
- `minor`: a backwards-compatible feature or meaningful new capability. For Bench, an additive harness or task change that does not invalidate overlapping comparisons.
- `patch`: a fix, polish, copy, documentation, dependency, refactor, or operational improvement with no incompatible contract change. For Bench, runner or docs changes that do not alter scores.

Use the highest impact present. Ask when either the target product or compatibility impact cannot be determined. The clean Open public-history root release is the explicit `1.0.0` exception.

## Update release surfaces

1. Update only the target product's canonical version. For Open, Cloud, and CLI, also update the matching root lockfile entry. The release tag is created only after the release commit exists.
2. Keep every other product on its independent version unless the user explicitly requests a coordinated release.
3. For an Open release, add the new release first in `packages/creed-app/lib/marketing/changelog.ts`:
   - ISO date;
   - `Creed Open vX.Y.Z` title;
   - one calm sentence describing the user-visible result;
   - concrete highlights only when they help someone use or upgrade Creed.
4. For a Cloud or CLI release, update its established release record. If none exists, stop and ask where its public release history should live instead of inventing one silently. For Bench, `BENCHMARK_VERSION` is the release record. Do not add a marketing changelog entry.
5. Keep `CHANGELOG.md` as the versioning policy, not a duplicate release list.
6. Confirm README badges, structured data, package metadata, and hardcoded version claims do not contradict the target version.
7. Never include an em dash, raw commit list, internal implementation inventory, or unsupported claim in public release copy.

## Verify

Run:

```bash
npm install --package-lock-only --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build
```

Then verify:

- package and lockfile versions agree for Open, Cloud, and CLI;
- `BENCHMARK_VERSION` agrees with the chosen Bench version when Bench is the target;
- the Open changelog version and date agree when Open is the target;
- migrations required by the release are present and tested;
- the diff contains no secret, generated build output, or unrelated file;
- the selected SemVer impact matches the real compatibility impact.

Apply the repository `review` skill after meaningful code changes. When the release unit is verified and the user has asked for a commit, hand off to the repository `commit` skill.

## Complete the release

1. Derive the exact tag from the target product and selected version: `open-vX.Y.Z`, `cloud-vX.Y.Z`, `cli-vX.Y.Z`, or `bench-vX.Y.Z`.
2. Treat a request to release or version, commit, and push as authority to create and push that exact annotated tag and publish its GitHub Release. Preparation-only or local commit requests authorize neither publication step. Ask before the release commit when the publication intent remains ambiguous.
3. Inspect local and remote tags before publication. If the expected tag already exists and points anywhere other than the release commit, stop. Never move, replace, delete, or force-push a release tag without explicit approval.
4. After the release commit and branch are pushed, create the annotated tag on that exact commit and push only that tag ref.
5. Verify the remote tag object and its peeled commit both resolve to the intended release commit. Do not report the release complete while the expected remote tag is missing or mismatched; report a prepared version commit instead.
6. After verifying the remote tag, publish a GitHub Release from that existing tag with `gh release create <tag> --verify-tag --latest`. Use the prepared GitHub Release title and public release notes. Do not generate notes from raw commits. If a release already exists for the tag, inspect it instead of creating a duplicate.
7. Verify the GitHub Release is published, targets the exact tag, has the intended title and notes, and is marked Latest when it is the most recently published stable release. A pushed tag without its GitHub Release is not a completed release.

## GitHub names

Keep GitHub names on four separate surfaces. Do not blend them:

- Git commit and PR title: `release open 1.0.0`. Follow the `commit` skill.
- Git tag: `open-v1.2.3`. Tags identify immutable releases; they do not categorize commits.
- Changelog and GitHub Release title: `Creed Open vX.Y.Z`
- Changelog body and GitHub Release notes: the calm user-facing sentence, via the `copy` skill

```text
open-v1.2.3
cloud-v1.2.3
cli-v1.2.3
bench-v1.2.3
```

Create an annotated tag only after the release commit exists and publication authority is established above. Never use bare category tags such as `open`, `docs`, `home`, or `fix`.

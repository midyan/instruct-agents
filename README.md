# instruct-agents

npm library for composable structured agents.

**Published name:** [`@midyan/instruct-agents`](https://www.npmjs.com/package/@midyan/instruct-agents) on the public npm registry.

## Install

```bash
npm install @midyan/instruct-agents
```

## Publish (maintainers / CI)

Publishing is automated like [midyan/skissue](https://github.com/midyan/skissue):

- **`version-and-release.yml`**: after green **CI** on a push to **`development`**, bumps the patch version, commits `[skip ci]`, creates a GitHub Release tag, and runs `npm publish` (uses **`NPM_TOKEN`**).
- **`publish.yml`**: publishes on **`v*`** tag push or **workflow_dispatch** (retry an existing tag); uses **`NPM_TOKEN`**.

Configure the repository secret **`NPM_TOKEN`** (granular access token with publish permission for `@midyan/instruct-agents`).

### Manual / retry publish

Re-run a failed publish: **Actions → Publish to npm → Run workflow** and enter an existing tag (e.g. `v0.1.1`).

### Local dry-run (no registry write)

```bash
npm ci
npm run verify
npm pack --dry-run
```

Confirm the tarball lists only `dist/**`, `LICENSE`, `README.md`, and `package.json`.

## Local quality checks

PRs targeting `main` or `development` run the CI quality gate: typecheck, lint, and format check in parallel, then unit tests and build in parallel. Pushes to `development` also run CI (for release automation). Run the same checks locally before opening a PR:

```bash
npm ci
npm run verify
```

`npm run verify` runs typecheck, lint, format check, unit tests, and build. Require each CI job in branch protection so failed checks block merge.

## Scope

**In scope:** the publishable library (`src/`, build tooling, library tests).

**Out of scope:** `applications/`, harnesses, and automations. They are not part of this repository. Apps that consume this package live in separate repositories.

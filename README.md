# instruct-agents

npm library for composable structured agents.

**Published name (GitHub Packages):** `@midyan/instruct-agents` on `npm.pkg.github.com` (private for v0.1). Registry: `https://npm.pkg.github.com`. We do not publish to npmjs.com.

## Install (consumers)

In the **consuming project**, add to `.npmrc`:

```ini
@midyan:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PKG_TOKEN}
```

Use a PAT with `read:packages` (and `repo` if this repository is private). Export `GITHUB_PKG_TOKEN` in your shell or CI — never commit tokens.

```bash
npm install @midyan/instruct-agents
```

## Publish (maintainers / CI)

`package.json` sets `publishConfig.registry` to GitHub Packages (`@midyan/instruct-agents`). Publishing is automated by `.github/workflows/publish.yml` when a **GitHub Release is published** (not on bare tags). The workflow runs `npm run verify`, then `npm publish` to `https://npm.pkg.github.com` with `permissions.packages: write` and `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.

Bump `version` in `package.json` on the branch you release from, then create the Release (tag should match, e.g. `v0.1.0`).

### First private publish (dry-run / manual test)

Before the first real Release, validate the pack contents and (optionally) a manual publish:

1. **Local dry-run** (no registry write):

   ```bash
   npm ci
   npm run verify
   npm pack --dry-run
   ```

   Confirm the tarball lists only `dist/**`, `LICENSE`, `README.md`, and `package.json`.

2. **Actions dry-run**: run the **Publish** workflow via *Actions → Publish → Run workflow* with **dry_run** checked (default). This installs, verifies, and runs `npm pack --dry-run` only.

3. **First real publish**: create a GitHub Release for the version (or run the workflow with **dry_run** unchecked). Confirm the package appears under the repo’s Packages for `@midyan/instruct-agents`.

See [GitHub: Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

## Local quality checks

PRs targeting `main` or `development` run the CI quality gate: typecheck, lint, and format check in parallel, then unit tests and build in parallel. Run the same checks locally before opening a PR:

```bash
npm ci
npm run verify
```

`npm run verify` runs typecheck, lint, format check, unit tests, and build. Require each CI job in branch protection so failed checks block merge.

## Scope

**In scope:** the publishable library (`src/`, build tooling, library tests).

**Out of scope:** `applications/`, harnesses, and automations. They are not part of this repository. Apps that consume this package live in separate repositories.

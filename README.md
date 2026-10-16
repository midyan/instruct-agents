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

`package.json` sets `publishConfig.registry` to GitHub Packages. In GitHub Actions, use `permissions.packages: write` and `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (or a PAT secret with `write:packages` if required).

See [GitHub: Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

## Local quality checks

PRs targeting `main` or `development` run the CI quality gate: typecheck, lint, and format check in parallel, then unit tests and build in parallel. Run the same checks locally before opening a PR:

```bash
npm ci
npm run verify
```

`npm run verify` runs typecheck, lint, format check, unit tests, and build. Require the **CI / Quality gate** check (or each job) in branch protection so failed gates block merge.

## Scope

**In scope:** the publishable library (`src/`, build tooling, library tests).

**Out of scope:** `applications/`, harnesses, and automations. They are not part of this repository. Apps that consume this package live in separate repositories.

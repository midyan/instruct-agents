# @midyan/instruct-agents

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

## Scope

**In scope:** the publishable library (`src/`, build tooling, library tests).

**Out of scope:** `applications/`, harnesses, and automations. They are not part of this repository. Apps that consume this package live in separate repositories.

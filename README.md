# @midyan/instruct-agents

npm library for composable structured agents. Published to [GitHub Packages](https://github.com/midyan/instruct-agents/packages).

## Scope

**In scope:** the publishable library (`src/`, build tooling, library tests).

**Out of scope:** `applications/`, harnesses, and automations. Those stay in the old repo and are not copied here. Apps that consume this package live elsewhere.

## Install

The package is scoped to `@midyan` on GitHub Packages. Point that scope at the GitHub npm registry and authenticate with a token that has at least `read:packages`.

`.npmrc` (project or user):

```ini
@midyan:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then:

```bash
export NODE_AUTH_TOKEN=ghp_xxxxxxxx
npm install @midyan/instruct-agents
```

Use a classic Personal Access Token (or a fine-grained token with Packages read access) for local installs. Do not commit tokens.

## CI auth

In GitHub Actions, use `actions/setup-node` with the GitHub Packages registry and pass `NODE_AUTH_TOKEN`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    registry-url: https://npm.pkg.github.com
    scope: '@midyan'
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For installs in other orgs/repos, use a PAT stored as a repository secret (e.g. `NODE_AUTH_TOKEN`) with `read:packages` (and `contents: read` if the package is linked to a private repo).

To publish from CI, grant `packages: write` and run `npm publish` with the same registry auth.

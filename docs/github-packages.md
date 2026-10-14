# GitHub Packages (`@midyan/instruct-agents`)

Private npm distribution for v0.1 via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry). We do **not** use [npmjs.com](https://www.npmjs.com) or `NPM_TOKEN` for `registry.npmjs.org` in this epic.

| Item | Value |
| --- | --- |
| GitHub repo | [midyan/instruct-agents](https://github.com/midyan/instruct-agents) |
| Package name | `@midyan/instruct-agents` |
| Registry | `https://npm.pkg.github.com` |

## Maintainer checklist (human)

- [ ] GitHub **Packages** is enabled for `midyan/instruct-agents`; default visibility is **private** and org/team access is agreed.
- [ ] Personal access tokens (publish/read) are stored in a password manager — **never** committed to git.
- [ ] After the first release ([H11-108](https://linear.app/h11-tech/issue/H11-108)), run the [post-publish smoke test](#post-publish-smoke-test-h11-108) and record the result on that ticket.

## CI publish strategy (H11-107)

Implement the release workflow with:

```yaml
permissions:
  contents: read
  packages: write
```

In the publish job, authenticate npm to GitHub Packages:

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Use the default `GITHUB_TOKEN` when org policy allows `packages: write` on the workflow. If the org requires a dedicated credential, store a PAT with `write:packages` (and `repo` if the repository is private) as a repository or org secret and set `NODE_AUTH_TOKEN` to that secret instead.

Publish must target `https://npm.pkg.github.com` with the scoped name `@midyan/instruct-agents` (see `publishConfig` in `package.json`).

## Installing as a consumer

1. Create a fine-grained or classic PAT with **`read:packages`**. If the package repository is private, include **`repo`** (or equivalent repository read scope).

2. In the **consuming project** (not necessarily this repo), add or merge into `.npmrc`:

```ini
@midyan:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PKG_TOKEN}
```

Export `GITHUB_PKG_TOKEN` in your shell or CI — do not commit the token.

3. Install:

```bash
npm install @midyan/instruct-agents
```

## Post-publish smoke test (H11-108)

Run **after** the first successful publish from the release workflow:

1. In an empty directory (or throwaway app repo), configure consumer `.npmrc` as above with an org-member account.
2. `npm install @midyan/instruct-agents@<released-version>`.
3. `node --input-type=module -e "import '@midyan/instruct-agents'"` (or import a documented export) and confirm no resolution errors.
4. Note pass/fail on Linear **H11-108**.

## References

- [Working with the npm registry (GitHub docs)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- Linear: [H11-111 — GitHub Packages pre-setup](https://linear.app/h11-tech/issue/H11-111/github-packages-pre-setup-midyaninstruct-agents)

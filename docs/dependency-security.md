# Dependency security policy

Supply-chain controls for `@yannunes/instruct-agents` (runtime library + CI). Remediating known zod/ACP advisories is tracked separately (H11-128). Dependabot is tracked separately (H11-126).

## Scope

| Surface | What it covers | Risk focus |
| --- | --- | --- |
| **Runtime** | `dependencies` published to npm and loaded by consumers | Code execution / DoS in consumer apps; malicious or vulnerable transitive runtime deps |
| **Dev / CI** | `devDependencies`, GitHub Actions, install lifecycle scripts | Compromised CI (token theft, poisoned artifacts), developer workstation risk, test-tool RCE |

Runtime findings are higher priority than CI-only findings. Dev advisories still gate PRs when they meet severity thresholds below, because CI holds repository and publish credentials.

## Severity thresholds

| Severity | PR / `main` gate | Waiver |
| --- | --- | --- |
| **Critical** | Fail | Allowed only with advisory id, written reason, and **expiry ≤ 14 days** |
| **High** | Fail | Allowed with advisory id, reason, and **expiry ≤ 90 days** |
| **Moderate** | Fail | Allowed with advisory id, reason, and **expiry ≤ 90 days** |
| **Low / info** | Do not fail | Track via Dependabot / periodic review; no waiver file required |

Waivers live in:

- [`audit-ci.jsonc`](../audit-ci.jsonc) — primary gate used by `npm run security:audit` and CI
- [`osv-scanner.toml`](../osv-scanner.toml) — OSV-Scanner ignore list (same ids / reasons / expiry)

Expired waivers must be removed or renewed; CI fails once `expiry` / `effectiveUntil` passes.

## Update cadence

- **PR gate:** every pull request and every push to `main` runs the full-lockfile audit job.
- **Routine bumps:** weekly Dependabot (H11-126) for npm and Actions; merge promptly for high/critical.
- **Baseline refresh:** re-record an audit snapshot under `docs/security/` at least when cutting a release, or when waivers change.
- **Publish path:** optional production-subgraph check (`npm run security:audit:prod`) runs in CI before we treat the tree as releasable.

## Version-pinning rules

| Target | Rule |
| --- | --- |
| **npm direct deps** | Prefer caret ranges in `package.json` as today; **always** commit `package-lock.json`. Installs in CI and release jobs use the lockfile only. |
| **Nested / transitive** | Do not hand-edit the lockfile except via `npm install` / `npm update` / `npm audit fix` locally; review lockfile diffs in PRs. |
| **GitHub Actions** | Pin third-party actions to an **immutable full commit SHA**, with a trailing comment naming the tag (e.g. `# v4.4.0`). |
| **audit-ci CLI** | Pin the exact version invoked by `security:audit` scripts (currently `7.1.0`). |

## CI install rules

1. **Workflows must use `npm ci` only** — never `npm install` (avoids lockfile drift and surprising resolution).
2. Prefer **`npm ci --ignore-scripts`** on CI jobs so compromised `postinstall` scripts cannot run while `GITHUB_TOKEN` / `NPM_TOKEN` are present.
3. Lifecycle scripts currently required by the lockfile: **`esbuild`** (binary fetch) and **`fsevents`** (optional, macOS). On GitHub-hosted Ubuntu runners, platform optional packages (`@esbuild/linux-*`) install without running those scripts, so lint / typecheck / test / build / publish jobs use `--ignore-scripts`.
4. If a future dependency **requires** install scripts on Linux CI:
   - Document the package and script here.
   - Use full `npm ci` only in jobs with **minimal `permissions:`** and **no publish secrets** (`NPM_TOKEN` / `NODE_AUTH_TOKEN` unset), **or** justify an exception in this file.

## Vulnerability gate (CI)

After `npm ci --ignore-scripts` on PRs and `main`:

1. **`npm run security:audit`** — `audit-ci` against the **full** lockfile (includes `devDependencies`). Fails on **moderate+** unless allowlisted with expiry.
2. **`npm run security:audit:prod`** — same tool with `--skip-dev` (production subgraph; useful before publish).
3. **OSV-Scanner** — scans `package-lock.json` with `osv-scanner.toml` waivers; fails on non-ignored findings.

`npm audit` output is supplemental for humans; the merge gate is audit-ci + OSV-Scanner.

Locally:

```bash
npm run security:audit
npm run security:audit:prod   # optional
```

## Secrets reachable from CI (threat model)

| Secret / token | Where | Capabilities if stolen |
| --- | --- | --- |
| **`GITHUB_TOKEN`** (default) | All workflows (job token) | Scoped by job `permissions:`. PR CI is **`contents: read` only**. `version-and-release.yml` uses **`contents: write`** (commit bump, tag, GitHub Release). |
| **`NPM_TOKEN`** → `NODE_AUTH_TOKEN` | `publish.yml`, `version-and-release.yml` | Publish / maintain `@yannunes/instruct-agents` on the npm registry. **Never** expose to PR jobs from forks. |
| **No other repo secrets** | — | No cloud keys, signing keys, or extra PATs are referenced by workflows today. |

Hardening tied to these secrets: SHA-pinned actions, `npm ci --ignore-scripts`, minimal `permissions:`, and audit gates before merge/publish.

## Baseline inventory (direct dependencies)

Snapshot date: **2026-11-18**. Resolved versions come from the committed lockfile.

### `dependencies` (runtime)

| Package | Purpose |
| --- | --- |
| `@agentclientprotocol/sdk` | ACP protocol types/client shared by vendor adapters |
| `@agentclientprotocol/claude-agent-acp` | Claude vendor ACP adapter (ships nested ACP SDK + pins its own `zod`) |
| `@agentclientprotocol/codex-acp` | Codex vendor ACP adapter |
| `zod` | Public structured-output schemas and runtime validation |

**ACP / zod overlap:** the library depends on `zod` directly (public API) and also pulls `zod` through `@agentclientprotocol/*`. `claude-agent-acp` additionally nests `@agentclientprotocol/sdk@1.5.0` while the root resolves a newer SDK — two ACP SDK copies can coexist. `zod` is currently deduped to a single tree version in the lockfile, but `claude-agent-acp` declares its own `zod` dependency; advisories on `zod` therefore affect both our direct dependency and the ACP subgraph. Remediation of the current zod high advisory is **H11-128** (out of scope here).

### `devDependencies` (CI / contributors)

| Package | Purpose |
| --- | --- |
| `typescript` | Typecheck and `dist/` emit |
| `@types/node` | Node.js typings |
| `eslint`, `@eslint/js`, `typescript-eslint` | Lint |
| `prettier` | Format check / write |
| `vitest` | Unit tests |
| `nanoid` | Test helpers / ids in fixtures |

## Related artifacts

- Audit snapshot: [`docs/security/audit-snapshot-2026-11-18.md`](./security/audit-snapshot-2026-11-18.md)
- Allowlist: [`audit-ci.jsonc`](../audit-ci.jsonc), [`osv-scanner.toml`](../osv-scanner.toml)

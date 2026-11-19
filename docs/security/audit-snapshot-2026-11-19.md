# npm audit / OSV snapshot — 2026-11-19

Recorded after H11-128 (zod ≥ 4.6.6 + `claude-agent-acp` 0.93). Regenerated with:

```bash
npm audit
npm audit --omit=dev
npm run security:audit
npm run security:audit:prod
```

## Summary

| Scope                                        | Result (2026-11-19)                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Full lockfile (`npm audit`)                  | **10** findings — 10 moderate, **0** high, 0 critical (all remaining are **dev**)                                                     |
| Production subgraph (`npm audit --omit=dev`) | **0** vulnerabilities                                                                                                                 |
| Gate                                         | Dev moderates still waived in [`audit-ci.jsonc`](../../audit-ci.jsonc) / [`osv-scanner.toml`](../../osv-scanner.toml) pending H11-126 |

## Advisories remaining (unique GHSA, all dev)

| ID                                                                       | Severity | Package          | Notes                   |
| ------------------------------------------------------------------------ | -------- | ---------------- | ----------------------- |
| [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) | moderate | `@vitest/mocker` | Dev-only                |
| [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp) | moderate | `@vitest/mocker` | Dev-only                |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | moderate | `minimatch`      | Via `typescript-eslint` |
| [GHSA-8g5g-mxqh-grgj](https://github.com/advisories/GHSA-8g5g-mxqh-grgj) | moderate | `vite`           | Dev-only (vitest)       |

## Resolved in H11-128

| ID                                                                       | Package | Fix                                                                                     |
| ------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------- |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | `zod`   | Direct `zod@^4.6.6` → lockfile `4.6.7`; `@agentclientprotocol/claude-agent-acp@^0.93.0` |

## OSV

```bash
osv-scanner --lockfile=package-lock.json --config=osv-scanner.toml
```

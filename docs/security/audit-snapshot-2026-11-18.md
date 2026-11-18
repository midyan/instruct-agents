# npm audit / OSV snapshot — 2026-11-18

Recorded for H11-124 baseline. Regenerated with:

```bash
npm audit
npm audit --omit=dev
npm run security:audit
```

## Summary

| Scope | Result (2026-11-18) |
| --- | --- |
| Full lockfile (`npm audit`) | **14** findings — 7 moderate, 7 high, 0 critical |
| Production subgraph (`npm audit --omit=dev`) | **2** high (zod via direct + `@agentclientprotocol/claude-agent-acp`) |
| Gate | Waived in [`audit-ci.jsonc`](../../audit-ci.jsonc) / [`osv-scanner.toml`](../../osv-scanner.toml) pending H11-128 (zod/ACP) and routine/dev bumps (H11-126) |

## Advisories (unique GHSA)

| ID | Severity | Package | Notes |
| --- | --- | --- | --- |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | high | `zod` (`<4.6.6`) | Runtime; remediation **H11-128** |
| [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) | high | `picomatch` | Dev (vitest/vite); Prefer Dependabot bump |
| [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) | moderate | `@vitest/mocker` | Dev-only |
| [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp) | moderate | `@vitest/mocker` | Dev-only |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | moderate | `minimatch` | Via `typescript-eslint` |
| [GHSA-8g5g-mxqh-grgj](https://github.com/advisories/GHSA-8g5g-mxqh-grgj) | moderate | `vite` | Dev-only (vitest) |

`npm audit` may report higher **counts** than unique GHSAs because parent packages inherit severity from children.

## OSV

CI runs OSV-Scanner on `package-lock.json` with the same waiver ids. Re-run locally (optional):

```bash
# requires osv-scanner on PATH — see https://google.github.io/osv-scanner/installation/
osv-scanner --lockfile=package-lock.json --config=osv-scanner.toml
```

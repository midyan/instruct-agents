# @yannunes/instruct-agents

Define agents that call a coding vendor (Cursor, Claude, or Codex), run a task in a project directory, and return **structured JSON** validated with [Zod](https://zod.dev/).

**Requirements:** Node.js 22+, the vendor CLI you use available on `PATH`, and a checkout of the repo you pass as `cwd`.

**Current version:** 0.2.0 — adds a public `defineVendor` API so consumers can register custom vendors alongside the shipped Cursor, Claude, and Codex catalogs.

**Supply chain:** dependency policy, inventory, CI audit gates, and weekly Dependabot (dev group vs isolated runtime PRs) are documented in [`docs/dependency-security.md`](docs/dependency-security.md). Maintainers: `npm run security:audit`.

## Install

```bash
npm install @yannunes/instruct-agents
```

## Usage

Import `defineStructuredAgent`, pick a vendor catalog (`Composer` / `Cursor`, `Claude`, `Codex`, or `Jev`), and describe the task with a prompt plus an output schema (JEV uses `responseOptions` instead — see below).

**Task with no input:**

```ts
import { z } from "zod";
import { Composer, defineStructuredAgent } from "@yannunes/instruct-agents";

const ResponseSchema = z.object({
  summary: z.string(),
  filesChanged: z.array(z.string()),
});

const review = defineStructuredAgent({
  name: "review",
  cwd: "/path/to/your/repo",
  vendor: Composer.vendor,
  model: Composer.model.composer25,
  prompt: "Review the working tree and list what changed.",
  responseSchema: ResponseSchema,
});

const result = await review();
// result is typed from ResponseSchema
```

**Task with typed input:**

```ts
import { z } from "zod";
import { Composer, defineStructuredAgent } from "@yannunes/instruct-agents";

const InputSchema = z.object({ ticketId: z.string() });
const ResponseSchema = z.object({ plan: z.string() });

const plan = defineStructuredAgent({
  cwd: "/path/to/your/repo",
  vendor: Composer.vendor,
  model: Composer.model.composer25,
  inputSchema: InputSchema,
  responseSchema: ResponseSchema,
  prompt: ({ ticketId }) => `Draft an implementation plan for ${ticketId}.`,
});

const result = await plan({ ticketId: "ENG-42" });
```

Pass an optional second argument for `timeoutMs`, `trace`, `onLog`, and related runtime settings.

## System 1 (JEV)

Use **JEV** for fast, constrained routing decisions (pick one of N labels + a confidence score). Prefer **Codex / Claude / Cursor** when the agent must edit code, call tools, or return an open-ended Zod schema.

JEV definitions take `responseOptions` instead of `responseSchema`. The runtime always validates:

```ts
{ next: /* one of responseOptions */, confidence: /* number in [0, 1] */ }
```

| Catalog          | Id         |
| ---------------- | ---------- |
| `Jev.model.fast` | `jev-fast` |
| `Jev.model.v1`   | `jev-v1`   |

### Environment

| Variable                                  | Required        | Notes                                          |
| ----------------------------------------- | --------------- | ---------------------------------------------- |
| `JEV_API_KEY`                             | yes (live runs) | Bearer token for TypeSafe System One           |
| `TYPESAFE_API_KEY` / `OPENROUTER_API_KEY` | fallback        | Accepted by the shim if `JEV_API_KEY` is unset |
| `JEV_BASE_URL`                            | no              | Defaults to `https://api.typesafe.ai`          |
| `JEV_MODEL`                               | set by runtime  | From `definition.model` — do not set manually  |

See [`.env.example`](.env.example) for local names. Unit tests use an ACP **fixture** via `process` override and do not need a live key.

### Reference agent

```ts
import { z } from "zod";
import { defineStructuredAgent, Jev } from "@yannunes/instruct-agents";

export const routeNextStep = defineStructuredAgent({
  name: "jev-route-next",
  vendor: Jev.vendor,
  model: Jev.model.fast,
  cwd: process.cwd(),
  defaultTimeoutMs: 45_000,
  responseOptions: ["implement", "review_only", "escalate_system2"] as const,
  inputSchema: z.object({
    summary: z.string(),
  }),
  prompt: (input) =>
    `Choose the next orchestration step for this task.\n${input.summary}\n` +
    `Return JSON with next (one of: implement, review_only, escalate_system2) and confidence 0-1.`,
});

// Live: await routeNextStep({ summary: "..." });
// Tests / offline: pass { process: { command: "node", args: ["path/to/jev-decision.mjs"] } }
```

A checked-in copy lives at [`examples/jev-route-next-step.ts`](examples/jev-route-next-step.ts).

## Custom vendors

Ship your own vendor id, model catalog, and local ACP adapter spawn path with `defineVendor`. Built-in catalogs (`Composer` / `Cursor`, `Claude`, `Codex`, `Jev`) use the same primitive. Register the vendor once at module load, then pass its `vendor` / `model` into `defineStructuredAgent`.

```ts
import { z } from "zod";
import { defineStructuredAgent, defineVendor } from "@yannunes/instruct-agents";

const Acme = defineVendor({
  id: "acme",
  models: {
    default: "acme-1",
    fast: "acme-1-fast",
  },
  resolveProcess: (definition) => ({
    command: "acme-acp",
    args: ["--model", definition.model],
  }),
  // Optional; omitted flags default to false
  capabilities: {
    reasoningEffort: false,
    modelContextWindow: false,
  },
});

const ResponseSchema = z.object({
  summary: z.string(),
});

const review = defineStructuredAgent({
  name: "acme-review",
  cwd: "/path/to/your/repo",
  vendor: Acme.vendor,
  model: Acme.model.default,
  prompt: "Review the working tree and summarize what changed.",
  responseSchema: ResponseSchema,
});

const result = await review();
```

`resolveProcess` must return a `{ command, args, env? }` spawn description for a local ACP adapter. Registering the same vendor id twice throws `DuplicateVendorError`. Unknown ids fail at resolve time with `UnknownVendorError`.

Exports also include `Codex`, `Claude`, `Composer`, `Cursor`, and `Jev` model catalogs, `defineVendor` / vendor types, structured-output errors, and git/worktree helpers for custom pipelines.

# @yannunes/instruct-agents

Define agents that call a coding vendor (Cursor, Claude, or Codex), run a task in a project directory, and return **structured JSON** validated with [Zod](https://zod.dev/).

**Requirements:** Node.js 22+, the vendor CLI you use available on `PATH`, and a checkout of the repo you pass as `cwd`.

**Current version:** 0.2.0 — adds a public `defineVendor` API so consumers can register custom vendors alongside the shipped Cursor, Claude, and Codex catalogs.

## Install

```bash
npm install @yannunes/instruct-agents
```

## Usage

Import `defineStructuredAgent`, pick a vendor catalog (`Composer` / `Cursor`, `Claude`, or `Codex`), and describe the task with a prompt plus an output schema.

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

## Custom vendors

Ship your own vendor id, model catalog, and local ACP adapter spawn path with `defineVendor`. Built-in catalogs (`Composer` / `Cursor`, `Claude`, `Codex`) use the same primitive. Register the vendor once at module load, then pass its `vendor` / `model` into `defineStructuredAgent`.

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

Exports also include `Codex`, `Claude`, `Composer`, and `Cursor` model catalogs, `defineVendor` / vendor types, structured-output errors, and git/worktree helpers for custom pipelines.

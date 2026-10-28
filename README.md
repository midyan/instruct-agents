# @yannunes/instruct-agents

Define agents that call a coding vendor (Cursor, Claude, or Codex), run a task in a project directory, and return **structured JSON** validated with [Zod](https://zod.dev/).

**Requirements:** Node.js 22+, the vendor CLI you use available on `PATH`, and a checkout of the repo you pass as `cwd`.

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

Exports also include `Codex`, `Claude`, `Composer`, and `Cursor` model catalogs, structured-output errors, and git/worktree helpers for custom pipelines.

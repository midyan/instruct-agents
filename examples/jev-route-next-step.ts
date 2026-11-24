/**
 * Reference System 1 (JEV) decision agent.
 *
 * Local / CI without a live TypeSafe key: pass a process override to the ACP
 * fixture, e.g.
 *
 *   await routeNextStep(
 *     { summary: "..." },
 *     { process: { command: process.execPath, args: ["test/fixtures/jev-decision.mjs"] } },
 *   );
 *
 * Live runs: set JEV_API_KEY (or TYPESAFE_API_KEY) and omit `process`.
 */
import { z } from "zod";

import { Jev, defineStructuredAgent } from "../src/index.js";

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

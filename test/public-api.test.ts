import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as publicApi from "../src/index.js";

const PUBLIC_VALUE_EXPORTS = [
  "defineStructuredAgent",
  "defineVendor",
  "StructuredOutputError",
  "TurnTimeoutError",
  "OverallRuntimeBudgetExhaustedError",
  "UnsupportedVendorOptionError",
  "DuplicateVendorError",
  "Composer",
  "Cursor",
  "Codex",
  "Claude",
  "DEFAULT_TIMEOUT_MS",
  "createTranscriptRun",
  "sanitizeTranscriptName",
  "PACKAGE_NAME",
  "PACKAGE_VERSION",
  "getPackageInfo",
  "runCommand",
  "getHeadSha",
  "listDirtyPaths",
  "captureGitSnapshot",
  "compareGitSnapshots",
  "assertGitSnapshotUnchanged",
  "filterDirtyPaths",
  "createOrReuseWorktree",
  "viewPullRequest",
  "getPullRequestDiff",
  "CommandError",
  "CommandTimeoutError",
  "GitSnapshotMismatchError",
  "WorktreeBranchMismatchError",
  "WorktreePathConflictError",
] as const;

const INTERNAL_RUNTIME_EXPORTS = [
  "runStructuredAgent",
  "enforceStructuredOutput",
  "spawnAgentProcess",
  "createStructuredAgentClientApp",
  "runAcpSession",
  "resolveVendorProcess",
  "resolveAgentProcess",
  "createNdjsonTransport",
  "emitAgentLog",
  "openTranscriptAgent",
  "getProcessRegistryStateForTests",
] as const;

describe("public package surface", () => {
  it("exports the documented runtime API", () => {
    for (const exportName of PUBLIC_VALUE_EXPORTS) {
      expect(publicApi).toHaveProperty(exportName);
    }
  });

  it("does not export runtime internals", () => {
    for (const exportName of INTERNAL_RUNTIME_EXPORTS) {
      expect(publicApi).not.toHaveProperty(exportName);
    }
  });

  it("supports the primary defineStructuredAgent workflow", () => {
    const agent = publicApi.defineStructuredAgent({
      cwd: process.cwd(),
      vendor: publicApi.Composer.vendor,
      model: publicApi.Composer.model.composer25,
      prompt: "Return JSON only.",
      responseSchema: z.object({ ok: z.boolean() }),
    });

    expect(agent.definition.vendor).toBe("cursor");
    expect(publicApi.sanitizeTranscriptName("Review Agent")).toBe(
      "review-agent",
    );
  });

  it("supports defining a custom vendor on the public surface", () => {
    const catalog = publicApi.defineVendor({
      id: `public-api-vendor-${Date.now()}`,
      models: { default: "default-1" },
      resolveProcess: (definition) => ({
        command: "public-api-adapter",
        args: ["--model", definition.model],
      }),
    });

    const agent = publicApi.defineStructuredAgent({
      cwd: process.cwd(),
      vendor: catalog.vendor,
      model: catalog.model.default,
      prompt: "Return JSON only.",
      responseSchema: z.object({ ok: z.boolean() }),
    });

    expect(agent.definition.vendor).toBe(catalog.vendor);
    expect(agent.definition.model).toBe("default-1");
  });
});

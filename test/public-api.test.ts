import { describe, expect, it } from "vitest";
import { z } from "zod";

import * as publicApi from "../src/index.js";

const PUBLIC_VALUE_EXPORTS = [
  "defineStructuredAgent",
  "StructuredOutputError",
  "TurnTimeoutError",
  "OverallRuntimeBudgetExhaustedError",
  "UnsupportedVendorOptionError",
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
});

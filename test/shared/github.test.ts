import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import type { CommandDeps } from "../../src/shared/command.js";
import {
  getPullRequestDiff,
  viewPullRequest,
} from "../../src/shared/github.js";

describe("github helpers", () => {
  it("parses pull request metadata without an explicit repo scope", async () => {
    const payload = {
      number: 12,
      title: "Docs",
      headRefName: "docs",
      headRefOid: "sha12",
      baseRefName: "main",
      baseRefOid: "sha-base",
      url: "https://github.com/acme/repo/pull/12",
    };

    const deps: CommandDeps = {
      spawn: () => createGhChild(0, JSON.stringify(payload)),
    };
    const identity = await viewPullRequest({ number: 12, cwd: "/tmp" }, deps);

    expect(identity.number).toBe(12);
    expect(identity.headSha).toBe("sha12");
  });

  it("parses pull request metadata from gh output", async () => {
    const payload = {
      number: 42,
      title: "Fix review loop",
      headRefName: "feature/review",
      headRefOid: "abc123",
      baseRefName: "main",
      baseRefOid: "def456",
      url: "https://github.com/acme/repo/pull/42",
    };

    const deps: CommandDeps = {
      spawn: () => createGhChild(0, JSON.stringify(payload)),
    };
    const identity = await viewPullRequest(
      { number: 42, repo: "acme/repo" },
      deps,
    );

    expect(identity).toEqual({
      number: 42,
      title: "Fix review loop",
      headRefName: "feature/review",
      headSha: "abc123",
      baseRefName: "main",
      baseSha: "def456",
      url: "https://github.com/acme/repo/pull/42",
    });
  });

  it("returns the pull request diff from gh", async () => {
    const deps: CommandDeps = {
      spawn: () => createGhChild(0, "diff --git a/README.md b/README.md\n"),
    };
    const diff = await getPullRequestDiff({ number: 7 }, deps);

    expect(diff).toContain("diff --git");
  });

  it("passes repo scope to gh diff requests", async () => {
    let capturedArgs: string[] = [];
    const deps: CommandDeps = {
      spawn: (_command, args) => {
        capturedArgs = args;
        return createGhChild(0, "");
      },
    };

    await getPullRequestDiff({ number: 3, repo: "acme/repo" }, deps);
    expect(capturedArgs).toEqual([
      "pr",
      "view",
      "3",
      "diff",
      "--repo",
      "acme/repo",
    ]);
  });
});

function createGhChild(exitCode: number, stdout: string) {
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  const stdinStream = new PassThrough();
  let closeListener:
    ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;

  stdoutStream.end(stdout);
  stderrStream.end("");
  queueMicrotask(() => {
    closeListener?.(exitCode, null);
  });

  return {
    stdout: stdoutStream,
    stderr: stderrStream,
    stdin: stdinStream,
    once: (
      event: "close",
      listener: (code: number | null, signal: NodeJS.Signals | null) => void,
    ) => {
      if (event === "close") {
        closeListener = listener;
      }
    },
    kill: () => true,
  };
}

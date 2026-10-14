import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { initGitRepo } from "../helpers/git-repo.js";
import {
  WorktreeBranchMismatchError,
  WorktreePathConflictError,
} from "../../src/shared/errors.js";
import { createOrReuseWorktree } from "../../src/shared/worktree.js";

describe("createOrReuseWorktree", () => {
  it("creates a new worktree and reuses it on subsequent calls", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "structured-agents-wt-"));
    const repoDir = join(baseDir, "repo");
    const worktreeDir = join(baseDir, "wt-feature");
    await mkdir(repoDir, { recursive: true });
    await initGitRepo(repoDir);

    const created = await createOrReuseWorktree({
      repoRoot: repoDir,
      worktreePath: worktreeDir,
      branch: "feature/pr-1",
    });

    expect(created.reused).toBe(false);
    expect(created.branch).toBe("feature/pr-1");
    expect(created.path).toBe(worktreeDir);

    const reused = await createOrReuseWorktree({
      repoRoot: repoDir,
      worktreePath: worktreeDir,
      branch: "feature/pr-1",
    });

    expect(reused.reused).toBe(true);
    expect(reused.headSha).toBe(created.headSha);
  });

  it("throws when the target path exists but is not a worktree", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "structured-agents-wt-"));
    const repoDir = join(baseDir, "repo");
    const blockedPath = join(baseDir, "blocked");
    await mkdir(repoDir, { recursive: true });
    await initGitRepo(repoDir);
    await mkdir(blockedPath);

    await expect(
      createOrReuseWorktree({
        repoRoot: repoDir,
        worktreePath: blockedPath,
        branch: "feature/pr-2",
      }),
    ).rejects.toBeInstanceOf(WorktreePathConflictError);
  });

  it("reports detached worktrees as branch mismatches", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "structured-agents-wt-"));
    const repoDir = join(baseDir, "repo");
    const worktreeDir = join(baseDir, "wt-detached");
    await mkdir(repoDir, { recursive: true });
    await initGitRepo(repoDir);

    const { runCommand } = await import("../../src/shared/command.js");
    await runCommand({
      command: "git",
      args: ["worktree", "add", "--detach", worktreeDir, "HEAD"],
      cwd: repoDir,
    });

    await expect(
      createOrReuseWorktree({
        repoRoot: repoDir,
        worktreePath: worktreeDir,
        branch: "feature/detached",
      }),
    ).rejects.toMatchObject({
      name: "WorktreeBranchMismatchError",
      actualBranch: "(detached)",
    });
  });

  it("throws when an existing worktree uses a different branch", async () => {
    const baseDir = await mkdtemp(join(tmpdir(), "structured-agents-wt-"));
    const repoDir = join(baseDir, "repo");
    const worktreeDir = join(baseDir, "wt-mismatch");
    await mkdir(repoDir, { recursive: true });
    await initGitRepo(repoDir);

    await createOrReuseWorktree({
      repoRoot: repoDir,
      worktreePath: worktreeDir,
      branch: "feature/a",
    });

    await expect(
      createOrReuseWorktree({
        repoRoot: repoDir,
        worktreePath: worktreeDir,
        branch: "feature/b",
      }),
    ).rejects.toBeInstanceOf(WorktreeBranchMismatchError);
  });
});

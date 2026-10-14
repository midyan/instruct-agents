import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { initGitRepo, writeTrackedFile } from "../helpers/git-repo.js";
import { GitSnapshotMismatchError } from "../../src/shared/errors.js";
import {
  assertGitSnapshotUnchanged,
  captureGitSnapshot,
  compareGitSnapshots,
  filterDirtyPaths,
  getHeadSha,
  listDirtyPaths,
} from "../../src/shared/git.js";

describe("git helpers", () => {
  it("reads HEAD and dirty paths from a clean repository", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "structured-agents-git-"));
    await initGitRepo(repoDir);

    const headSha = await getHeadSha(repoDir);
    expect(headSha).toMatch(/^[0-9a-f]{40}$/);
    expect(await listDirtyPaths(repoDir)).toEqual([]);
  });

  it("lists dirty paths and filters by scope", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "structured-agents-git-"));
    await initGitRepo(repoDir);
    await writeTrackedFile(repoDir, "README.md", "# changed\n");
    await writeTrackedFile(repoDir, "src/app.ts", "export {}\n");

    const dirtyPaths = await listDirtyPaths(repoDir);
    expect(dirtyPaths).toEqual(["README.md", "src/app.ts"]);
    expect(filterDirtyPaths(dirtyPaths, ["src"])).toEqual(["src/app.ts"]);
  });

  it("detects HEAD and dirty-path mismatches", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "structured-agents-git-"));
    await initGitRepo(repoDir);
    const before = await captureGitSnapshot(repoDir);

    await writeTrackedFile(repoDir, "src/app.ts", "export {}\n");
    const afterDirty = await captureGitSnapshot(repoDir);
    const dirtyMismatch = compareGitSnapshots(before, afterDirty);
    expect(dirtyMismatch).toBeInstanceOf(GitSnapshotMismatchError);
    expect(dirtyMismatch?.kind).toBe("dirty_paths");

    await runGitCommitAll(repoDir, "add app");
    const afterHead = await captureGitSnapshot(repoDir);
    const headMismatch = compareGitSnapshots(before, afterHead);
    expect(headMismatch).toBeInstanceOf(GitSnapshotMismatchError);
    expect(headMismatch?.kind).toBe("head");
  });

  it("parses renamed paths and scoped dirty-path filters", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "structured-agents-git-"));
    await initGitRepo(repoDir);
    await writeTrackedFile(repoDir, "old.txt", "before\n");
    await runGitCommitAll(repoDir, "track old");

    const { runCommand } = await import("../../src/shared/command.js");
    await runCommand({
      command: "git",
      args: ["mv", "old.txt", "new.txt"],
      cwd: repoDir,
    });

    const dirtyPaths = await listDirtyPaths(repoDir);
    expect(dirtyPaths).toEqual(["new.txt"]);
    expect(filterDirtyPaths(dirtyPaths, [])).toEqual(["new.txt"]);
  });

  it("assertGitSnapshotUnchanged throws on mismatch", async () => {
    const before = { headSha: "abc", dirtyPaths: [] as const };
    const after = { headSha: "def", dirtyPaths: [] as const };

    expect(() => assertGitSnapshotUnchanged(before, after)).toThrow(
      GitSnapshotMismatchError,
    );
  });

  it("assertGitSnapshotUnchanged passes for identical snapshots", async () => {
    const repoDir = await mkdtemp(join(tmpdir(), "structured-agents-git-"));
    await initGitRepo(repoDir);
    const snapshot = await captureGitSnapshot(repoDir);

    expect(() => assertGitSnapshotUnchanged(snapshot, snapshot)).not.toThrow();
  });
});

async function runGitCommitAll(
  repoDir: string,
  message: string,
): Promise<void> {
  const { runCommand } = await import("../../src/shared/command.js");
  await runCommand({
    command: "git",
    args: ["add", "-A"],
    cwd: repoDir,
  });
  await runCommand({
    command: "git",
    args: ["commit", "-m", message],
    cwd: repoDir,
  });
}

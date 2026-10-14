import {
  GitSnapshotMismatchError,
  type GitSnapshot,
  type GitSnapshotMismatchKind,
} from "./errors.js";
import { runCommand, type CommandDeps } from "./command.js";

export type { GitSnapshot };

export type ListDirtyPathsOptions = {
  paths?: readonly string[];
};

function parseDirtyPath(line: string): string | null {
  if (line.length < 4) {
    return null;
  }

  const rawPath = line.slice(3).trim();
  const renameSeparator = " -> ";
  if (rawPath.includes(renameSeparator)) {
    return rawPath.split(renameSeparator).at(-1) ?? rawPath;
  }

  return rawPath;
}

function parseDirtyPaths(output: string): string[] {
  const paths = output
    .split("\n")
    .map((line) => parseDirtyPath(line))
    .filter((path): path is string => Boolean(path));

  return [...new Set(paths)].sort();
}

export function filterDirtyPaths(
  dirtyPaths: readonly string[],
  paths?: readonly string[],
): string[] {
  if (!paths?.length) {
    return [...dirtyPaths];
  }

  return dirtyPaths.filter((dirtyPath) =>
    paths.some(
      (scopePath) =>
        dirtyPath === scopePath || dirtyPath.startsWith(`${scopePath}/`),
    ),
  );
}

function serializeDirtyPaths(paths: readonly string[]): string {
  return [...paths].sort().join("\n");
}

/** Returns the current HEAD commit SHA for a repository. */
export async function getHeadSha(
  cwd: string,
  deps: CommandDeps = {},
): Promise<string> {
  const result = await runCommand(
    {
      command: "git",
      args: ["rev-parse", "HEAD"],
      cwd,
    },
    deps,
  );

  return result.stdout.trim();
}

/** Lists dirty paths reported by git status --porcelain. */
export async function listDirtyPaths(
  cwd: string,
  options: ListDirtyPathsOptions = {},
  deps: CommandDeps = {},
): Promise<string[]> {
  const result = await runCommand(
    {
      command: "git",
      args: ["status", "--porcelain", "-uall"],
      cwd,
    },
    deps,
  );

  return filterDirtyPaths(parseDirtyPaths(result.stdout), options.paths);
}

/** Captures HEAD and dirty paths for later comparison. */
export async function captureGitSnapshot(
  cwd: string,
  options: ListDirtyPathsOptions = {},
  deps: CommandDeps = {},
): Promise<GitSnapshot> {
  const [headSha, dirtyPaths] = await Promise.all([
    getHeadSha(cwd, deps),
    listDirtyPaths(cwd, options, deps),
  ]);

  return { headSha, dirtyPaths };
}

function buildSnapshotMismatchError(
  before: GitSnapshot,
  after: GitSnapshot,
  kind: GitSnapshotMismatchKind,
): GitSnapshotMismatchError {
  if (kind === "head") {
    return new GitSnapshotMismatchError(
      `HEAD changed from ${before.headSha} to ${after.headSha}`,
      before,
      after,
      kind,
    );
  }

  return new GitSnapshotMismatchError(
    `Dirty paths changed from [${before.dirtyPaths.join(", ")}] to [${after.dirtyPaths.join(", ")}]`,
    before,
    after,
    kind,
  );
}

/** Compares two snapshots and returns a mismatch error when they differ. */
export function compareGitSnapshots(
  before: GitSnapshot,
  after: GitSnapshot,
): GitSnapshotMismatchError | null {
  if (before.headSha !== after.headSha) {
    return buildSnapshotMismatchError(before, after, "head");
  }

  if (
    serializeDirtyPaths(before.dirtyPaths) !==
    serializeDirtyPaths(after.dirtyPaths)
  ) {
    return buildSnapshotMismatchError(before, after, "dirty_paths");
  }

  return null;
}

/** Throws when HEAD or dirty paths changed between snapshots. */
export function assertGitSnapshotUnchanged(
  before: GitSnapshot,
  after: GitSnapshot,
): void {
  const mismatch = compareGitSnapshots(before, after);
  if (mismatch) {
    throw mismatch;
  }
}

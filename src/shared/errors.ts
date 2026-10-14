export type GitSnapshot = {
  headSha: string;
  dirtyPaths: readonly string[];
};

export class CommandError extends Error {
  readonly result: CommandErrorResult;

  constructor(message: string, result: CommandErrorResult) {
    super(message);
    this.name = "CommandError";
    this.result = result;
  }
}

export type CommandErrorResult = {
  command: string;
  args: readonly string[];
  exitCode: number;
  stdout: string;
  stderr: string;
};

export class CommandTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Command timed out after ${timeoutMs}ms`);
    this.name = "CommandTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export type GitSnapshotMismatchKind = "head" | "dirty_paths";

export class GitSnapshotMismatchError extends Error {
  readonly before: GitSnapshot;
  readonly after: GitSnapshot;
  readonly kind: GitSnapshotMismatchKind;

  constructor(
    message: string,
    before: GitSnapshot,
    after: GitSnapshot,
    kind: GitSnapshotMismatchKind,
  ) {
    super(message);
    this.name = "GitSnapshotMismatchError";
    this.before = before;
    this.after = after;
    this.kind = kind;
  }
}

export class WorktreePathConflictError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`Path already exists and is not a reusable git worktree: ${path}`);
    this.name = "WorktreePathConflictError";
    this.path = path;
  }
}

export class WorktreeBranchMismatchError extends Error {
  readonly path: string;
  readonly expectedBranch: string;
  readonly actualBranch: string;

  constructor(path: string, expectedBranch: string, actualBranch: string) {
    super(
      `Worktree at ${path} is checked out to ${actualBranch}, expected ${expectedBranch}`,
    );
    this.name = "WorktreeBranchMismatchError";
    this.path = path;
    this.expectedBranch = expectedBranch;
    this.actualBranch = actualBranch;
  }
}

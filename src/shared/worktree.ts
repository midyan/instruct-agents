import { access, realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { runCommand, type CommandDeps } from "./command.js";
import {
  WorktreeBranchMismatchError,
  WorktreePathConflictError,
} from "./errors.js";
import { getHeadSha } from "./git.js";

export type WorktreeInfo = {
  path: string;
  branch: string;
  headSha: string;
  reused: boolean;
};

export type CreateOrReuseWorktreeOptions = {
  repoRoot: string;
  worktreePath: string;
  branch: string;
  ref?: string;
};

type ParsedWorktree = {
  path: string;
  branch: string | null;
};

function normalizeBranch(branch: string): string {
  return branch.startsWith("refs/heads/")
    ? branch.slice("refs/heads/".length)
    : branch;
}

function parseWorktreeList(output: string): ParsedWorktree[] {
  const entries: ParsedWorktree[] = [];
  let currentPath: string | null = null;
  let currentBranch: string | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (currentPath) {
        entries.push({ path: currentPath, branch: currentBranch });
      }
      currentPath = line.slice("worktree ".length).trim();
      currentBranch = null;
      continue;
    }

    if (line.startsWith("branch ") && currentPath) {
      currentBranch = normalizeBranch(line.slice("branch ".length).trim());
    }
  }

  if (currentPath) {
    entries.push({ path: currentPath, branch: currentBranch });
  }

  return entries;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listWorktrees(
  repoRoot: string,
  deps: CommandDeps,
): Promise<ParsedWorktree[]> {
  const result = await runCommand(
    {
      command: "git",
      args: ["worktree", "list", "--porcelain"],
      cwd: repoRoot,
    },
    deps,
  );

  return parseWorktreeList(result.stdout);
}

async function normalizeComparablePath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    return resolve(path);
  }
}

async function findWorktree(
  worktrees: ParsedWorktree[],
  worktreePath: string,
): Promise<ParsedWorktree | undefined> {
  const normalizedPath = await normalizeComparablePath(worktreePath);
  for (const entry of worktrees) {
    if ((await normalizeComparablePath(entry.path)) === normalizedPath) {
      return entry;
    }
  }
  return undefined;
}

/** Creates a git worktree or reuses an existing matching checkout. */
export async function createOrReuseWorktree(
  options: CreateOrReuseWorktreeOptions,
  deps: CommandDeps = {},
): Promise<WorktreeInfo> {
  const worktreePath = resolve(options.worktreePath);
  const branch = normalizeBranch(options.branch);
  const ref = options.ref ?? "HEAD";
  const existing = await findWorktree(
    await listWorktrees(options.repoRoot, deps),
    worktreePath,
  );

  if (existing) {
    if (existing.branch !== branch) {
      throw new WorktreeBranchMismatchError(
        worktreePath,
        branch,
        existing.branch ?? "(detached)",
      );
    }

    return {
      path: worktreePath,
      branch,
      headSha: await getHeadSha(worktreePath, deps),
      reused: true,
    };
  }

  if (await pathExists(worktreePath)) {
    throw new WorktreePathConflictError(worktreePath);
  }

  await runCommand(
    {
      command: "git",
      args: ["worktree", "add", "-B", branch, worktreePath, ref],
      cwd: options.repoRoot,
    },
    deps,
  );

  return {
    path: worktreePath,
    branch,
    headSha: await getHeadSha(worktreePath, deps),
    reused: false,
  };
}

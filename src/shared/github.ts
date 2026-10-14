import { runCommand, type CommandDeps } from "./command.js";

export type PullRequestIdentity = {
  number: number;
  title: string;
  headRefName: string;
  headSha: string;
  baseRefName: string;
  baseSha: string;
  url: string;
};

export type ViewPullRequestOptions = {
  repo?: string;
  number: number;
  cwd?: string;
};

type GhPullRequestJson = {
  number: number;
  title: string;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  baseRefOid: string;
  url: string;
};

function buildGhArgs(
  options: ViewPullRequestOptions,
  extraArgs: readonly string[],
): string[] {
  const args = ["pr", "view", String(options.number), ...extraArgs];
  if (options.repo) {
    args.push("--repo", options.repo);
  }
  return args;
}

function parsePullRequestIdentity(
  payload: GhPullRequestJson,
): PullRequestIdentity {
  return {
    number: payload.number,
    title: payload.title,
    headRefName: payload.headRefName,
    headSha: payload.headRefOid,
    baseRefName: payload.baseRefName,
    baseSha: payload.baseRefOid,
    url: payload.url,
  };
}

/** Reads pull request metadata through the GitHub CLI. */
export async function viewPullRequest(
  options: ViewPullRequestOptions,
  deps?: CommandDeps,
): Promise<PullRequestIdentity> {
  const result = await runCommand(
    {
      command: "gh",
      args: buildGhArgs(options, [
        "--json",
        "number,title,headRefName,headRefOid,baseRefName,baseRefOid,url",
      ]),
      cwd: options.cwd,
    },
    deps,
  );

  const payload = JSON.parse(result.stdout) as GhPullRequestJson;
  return parsePullRequestIdentity(payload);
}

/** Returns the unified diff for a pull request through the GitHub CLI. */
export async function getPullRequestDiff(
  options: ViewPullRequestOptions,
  deps?: CommandDeps,
): Promise<string> {
  const result = await runCommand(
    {
      command: "gh",
      args: buildGhArgs(options, ["diff"]),
      cwd: options.cwd,
    },
    deps,
  );

  return result.stdout;
}

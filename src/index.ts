import { createRequire } from "node:module";

export { defineStructuredAgent } from "./runtime/structured-agent.js";

export {
  OverallRuntimeBudgetExhaustedError,
  StructuredOutputError,
  TurnTimeoutError,
  UnsupportedVendorOptionError,
} from "./runtime/errors.js";

export type {
  StructuredOutputAttempt,
  StructuredOutputErrorJson,
  StructuredOutputErrorReason,
} from "./runtime/errors.js";

export { Codex, Claude, Composer, Cursor } from "./runtime/vendors.js";

export { DEFAULT_TIMEOUT_MS } from "./runtime/types.js";

export {
  assertGitSnapshotUnchanged,
  captureGitSnapshot,
  compareGitSnapshots,
  createOrReuseWorktree,
  filterDirtyPaths,
  getHeadSha,
  getPullRequestDiff,
  listDirtyPaths,
  runCommand,
  viewPullRequest,
} from "./shared/index.js";

export {
  CommandError,
  CommandTimeoutError,
  GitSnapshotMismatchError,
  WorktreeBranchMismatchError,
  WorktreePathConflictError,
} from "./shared/index.js";

export type {
  CommandDeps,
  CommandErrorResult,
  CommandResult,
  CreateOrReuseWorktreeOptions,
  GitSnapshot,
  GitSnapshotMismatchKind,
  ListDirtyPathsOptions,
  PullRequestIdentity,
  RunCommandOptions,
  ViewPullRequestOptions,
  WorktreeInfo,
} from "./shared/index.js";

export {
  createTranscriptRun,
  sanitizeTranscriptName,
} from "./runtime/transcript.js";

export type {
  CreateTranscriptRunOptions,
  TranscriptAgentSummary,
  TranscriptRunMetadata,
} from "./runtime/transcript.js";

export type {
  AgentEndLogEvent,
  AgentHeartbeatLogEvent,
  AgentLogEvent,
  AgentQuietTransportLogEvent,
  AgentStartLogEvent,
  ClientInfo,
  InputStructuredAgent,
  InputStructuredAgentDefinition,
  NoInputStructuredAgent,
  NoInputStructuredAgentDefinition,
  ProcessOverride,
  ReasoningEffort,
  RunStructuredAgentOptions,
  StructuredAgentDefinition,
  StructuredAgentDefinitionBase,
  TranscriptMode,
  TranscriptRun,
  VendorId,
} from "./runtime/types.js";

const { name: packageName, version: packageVersion } = createRequire(
  import.meta.url,
)("../package.json") as {
  name: string;
  version: string;
};

/** Published package name from package.json. */
export const PACKAGE_NAME = packageName;

/** Package semver from package.json. */
export const PACKAGE_VERSION = packageVersion;

export type PackageInfo = {
  name: string;
  version: string;
};

/** Returns stable package metadata for tooling and smoke tests. */
export function getPackageInfo(): PackageInfo {
  return {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  };
}

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { SessionNotification } from "@agentclientprotocol/sdk";

import type { TranscriptMode, VendorId } from "./types.js";

const TRANSCRIPT_FILE_MODE = 0o600;

export type TranscriptAgentSummary = {
  sequence: number;
  name?: string;
  fileName: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  outcome?: "success" | "failure";
};

export type TranscriptRunMetadata = {
  startedAt: string;
  lifecycleOnly: boolean;
  agents: TranscriptAgentSummary[];
};

export type TranscriptRun = {
  rootDir: string;
  runDir: string;
  lifecycleOnly: boolean;
  startedAt: string;
  nextSequence: number;
  agentTimings: TranscriptAgentSummary[];
};

export type CreateTranscriptRunOptions = {
  rootDir: string;
  lifecycleOnly?: boolean;
  startedAt?: number;
};

export type OpenTranscriptAgentOptions = {
  name?: string;
  model: string;
  vendor: VendorId;
  mode?: TranscriptMode;
};

export type AgentTranscriptRecorder = {
  filePath: string;
  recordPrompt: (prompt: string, attemptIndex: number) => Promise<void>;
  recordSessionUpdate: (notification: SessionNotification) => Promise<void>;
  recordResult: (result: unknown) => Promise<void>;
  recordError: (error: unknown) => Promise<void>;
  finish: (outcome: "success" | "failure", endedAt: number) => Promise<void>;
};

function formatRunDirectoryName(timestamp: number): string {
  return new Date(timestamp).toISOString().replaceAll(":", "-");
}

/** Sanitizes an agent name for transcript filenames. */
export function sanitizeTranscriptName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "agent";
}

function isLifecycleMode(
  run: TranscriptRun,
  mode: TranscriptMode | undefined,
): boolean {
  return mode === "lifecycle" || run.lifecycleOnly;
}

async function appendTranscriptEvent(
  filePath: string,
  event: Record<string, unknown>,
): Promise<void> {
  await appendFile(filePath, `${JSON.stringify(event)}\n`, {
    mode: TRANSCRIPT_FILE_MODE,
  });
}

async function writeRunMetadata(run: TranscriptRun): Promise<void> {
  const metadata: TranscriptRunMetadata = {
    startedAt: run.startedAt,
    lifecycleOnly: run.lifecycleOnly,
    agents: run.agentTimings,
  };

  await writeFile(
    join(run.runDir, "run.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    {
      mode: TRANSCRIPT_FILE_MODE,
    },
  );
}

/** Creates a timestamped transcript directory with run metadata. */
export async function createTranscriptRun(
  options: CreateTranscriptRunOptions,
): Promise<TranscriptRun> {
  const startedAtMs = options.startedAt ?? Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const runDir = join(options.rootDir, formatRunDirectoryName(startedAtMs));

  await mkdir(runDir, { recursive: true, mode: 0o700 });

  const run: TranscriptRun = {
    rootDir: options.rootDir,
    runDir,
    lifecycleOnly: options.lifecycleOnly ?? false,
    startedAt,
    nextSequence: 1,
    agentTimings: [],
  };

  await writeRunMetadata(run);
  return run;
}

/** Opens a numbered JSONL transcript file for one agent invocation. */
export async function openTranscriptAgent(
  run: TranscriptRun,
  options: OpenTranscriptAgentOptions,
): Promise<AgentTranscriptRecorder> {
  const sequence = run.nextSequence;
  run.nextSequence += 1;

  const slug = sanitizeTranscriptName(options.name ?? "agent");
  const fileName = `${String(sequence).padStart(2, "0")}-${slug}.jsonl`;
  const filePath = join(run.runDir, fileName);
  const startedAt = new Date().toISOString();
  const lifecycleOnly = isLifecycleMode(run, options.mode);

  const summary: TranscriptAgentSummary = {
    sequence,
    name: options.name,
    fileName,
    startedAt,
  };

  run.agentTimings.push(summary);
  await writeFile(filePath, "", { mode: TRANSCRIPT_FILE_MODE });
  await appendTranscriptEvent(filePath, {
    type: "start",
    at: startedAt,
    name: options.name,
    model: options.model,
    vendor: options.vendor,
  });
  await writeRunMetadata(run);

  return {
    filePath,
    async recordPrompt(prompt: string, attemptIndex: number) {
      if (lifecycleOnly) {
        return;
      }

      await appendTranscriptEvent(filePath, {
        type: "prompt",
        attemptIndex,
        prompt,
      });
    },
    async recordSessionUpdate(notification: SessionNotification) {
      if (lifecycleOnly) {
        return;
      }

      await appendTranscriptEvent(filePath, {
        type: "session_update",
        update: notification.update,
      });
    },
    async recordResult(result: unknown) {
      if (lifecycleOnly) {
        return;
      }

      await appendTranscriptEvent(filePath, {
        type: "result",
        result,
      });
    },
    async recordError(error: unknown) {
      if (lifecycleOnly) {
        return;
      }

      await appendTranscriptEvent(filePath, {
        type: "error",
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      });
    },
    async finish(outcome: "success" | "failure", endedAtMs: number) {
      const endedAt = new Date(endedAtMs).toISOString();
      const durationMs = endedAtMs - Date.parse(startedAt);

      summary.endedAt = endedAt;
      summary.durationMs = durationMs;
      summary.outcome = outcome;

      await appendTranscriptEvent(filePath, {
        type: "end",
        outcome,
        endedAt,
        durationMs,
      });
      await writeRunMetadata(run);
    },
  };
}

import type { AgentLogEvent } from "./types.js";

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const QUIET_TRANSPORT_THRESHOLD_MS = 2 * 60_000;

/** Routes lifecycle and heartbeat events to onLog or stderr JSON lines. */
export function emitAgentLog(
  event: AgentLogEvent,
  onLog?: (event: AgentLogEvent) => void,
): void {
  if (onLog !== undefined) {
    onLog(event);
    return;
  }

  process.stderr.write(`${JSON.stringify(event)}\n`);
}

export type StdoutActivityTracker = {
  stdoutBytes: number;
  lastStdoutAt: number | null;
  attach: (stdout: NodeJS.ReadableStream) => () => void;
};

/** Tracks stdout byte volume and last activity timestamps. */
export function createStdoutActivityTracker(): StdoutActivityTracker {
  let stdoutBytes = 0;
  let lastStdoutAt: number | null = null;

  return {
    get stdoutBytes() {
      return stdoutBytes;
    },
    get lastStdoutAt() {
      return lastStdoutAt;
    },
    attach(stdout: NodeJS.ReadableStream) {
      const listener = (chunk: Buffer | string) => {
        stdoutBytes += Buffer.byteLength(chunk);
        lastStdoutAt = Date.now();
      };

      stdout.on("data", listener);
      return () => {
        stdout.off("data", listener);
      };
    },
  };
}

export type HeartbeatSchedulerOptions = {
  startedAt: number;
  timeoutMs: number;
  deadline?: number;
  onLog?: (event: AgentLogEvent) => void;
  tracker: StdoutActivityTracker;
  intervalMs?: number;
  quietThresholdMs?: number;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export type HeartbeatScheduler = {
  start: () => void;
  stop: () => void;
};

function computeRemainingMs(
  limitAt: number | undefined,
  now: number,
): number | null {
  if (limitAt === undefined) {
    return null;
  }

  return Math.max(0, limitAt - now);
}

/** Emits periodic heartbeats and quiet-transport signals during an agent run. */
export function createHeartbeatScheduler(
  options: HeartbeatSchedulerOptions,
): HeartbeatScheduler {
  const intervalMs = options.intervalMs ?? HEARTBEAT_INTERVAL_MS;
  const quietThresholdMs =
    options.quietThresholdMs ?? QUIET_TRANSPORT_THRESHOLD_MS;
  const now = options.now ?? Date.now;
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
  let timer: ReturnType<typeof setInterval> | undefined;
  let quietTransportReported = false;

  const tick = () => {
    const currentTime = now();
    const agentLimitAt = options.startedAt + options.timeoutMs;
    const heartbeat: AgentLogEvent = {
      type: "heartbeat",
      elapsedMs: currentTime - options.startedAt,
      stdoutBytes: options.tracker.stdoutBytes,
      lastStdoutAt: options.tracker.lastStdoutAt,
      agentTimeRemainingMs: computeRemainingMs(agentLimitAt, currentTime),
      overallTimeRemainingMs: computeRemainingMs(options.deadline, currentTime),
    };

    emitAgentLog(heartbeat, options.onLog);

    const lastStdoutAt = options.tracker.lastStdoutAt;
    if (lastStdoutAt === null) {
      return;
    }

    const quietForMs = currentTime - lastStdoutAt;
    if (quietForMs < quietThresholdMs || quietTransportReported) {
      return;
    }

    quietTransportReported = true;
    emitAgentLog(
      {
        type: "no_recent_transport_output",
        quietForMs,
        lastStdoutAt,
      },
      options.onLog,
    );
  };

  return {
    start() {
      if (timer !== undefined) {
        return;
      }

      timer = setIntervalFn(tick, intervalMs);
    },
    stop() {
      if (timer === undefined) {
        return;
      }

      clearIntervalFn(timer);
      timer = undefined;
    },
  };
}

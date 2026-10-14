import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HEARTBEAT_INTERVAL_MS,
  QUIET_TRANSPORT_THRESHOLD_MS,
  createHeartbeatScheduler,
  createStdoutActivityTracker,
  emitAgentLog,
} from "../../src/runtime/agent-log.js";

describe("emitAgentLog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes events to onLog when supplied", () => {
    const events: unknown[] = [];
    const event = {
      type: "agent_start" as const,
      model: "m",
      vendor: "cursor" as const,
      startedAt: 1,
    };

    emitAgentLog(event, (value) => {
      events.push(value);
    });

    expect(events).toEqual([event]);
  });

  it("writes JSON lines to stderr when onLog is absent", () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    emitAgentLog({
      type: "agent_end",
      model: "m",
      vendor: "cursor",
      startedAt: 1,
      endedAt: 2,
      durationMs: 1,
      outcome: "success",
    });

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"agent_end"'),
    );
  });
});

describe("createStdoutActivityTracker", () => {
  it("tracks stdout bytes and last activity", () => {
    const stdout = new PassThrough();
    const tracker = createStdoutActivityTracker();
    const detach = tracker.attach(stdout);

    stdout.write("abc");
    stdout.write("def");

    expect(tracker.stdoutBytes).toBe(6);
    expect(tracker.lastStdoutAt).not.toBeNull();

    detach();
  });
});

describe("createHeartbeatScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("emits heartbeats on an interval", () => {
    vi.useFakeTimers();

    const events: unknown[] = [];
    const tracker = createStdoutActivityTracker();
    const scheduler = createHeartbeatScheduler({
      startedAt: 1_000,
      timeoutMs: 60_000,
      deadline: 120_000,
      tracker,
      onLog: (event) => {
        events.push(event);
      },
      now: () => 31_000,
      setIntervalFn: (handler: () => void, ms?: number) => {
        expect(ms).toBe(HEARTBEAT_INTERVAL_MS);
        handler();
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: vi.fn(),
    });

    scheduler.start();

    expect(events).toEqual([
      {
        type: "heartbeat",
        elapsedMs: 30_000,
        stdoutBytes: 0,
        lastStdoutAt: null,
        agentTimeRemainingMs: 30_000,
        overallTimeRemainingMs: 89_000,
      },
    ]);
  });

  it("reports quiet transport after two minutes without stdout", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const stdout = new PassThrough();
    const tracker = createStdoutActivityTracker();
    tracker.attach(stdout);
    stdout.write("x");

    const events: unknown[] = [];
    const scheduler = createHeartbeatScheduler({
      startedAt: 1_000,
      timeoutMs: 600_000,
      tracker,
      onLog: (event) => {
        events.push(event);
      },
      now: () => 1_000 + QUIET_TRANSPORT_THRESHOLD_MS + 1,
      setIntervalFn: (handler: () => void) => {
        handler();
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: vi.fn(),
    });

    scheduler.start();

    expect(events.at(-1)).toEqual({
      type: "no_recent_transport_output",
      quietForMs: QUIET_TRANSPORT_THRESHOLD_MS + 1,
      lastStdoutAt: 1_000,
    });
  });

  it("does not report quiet transport while stdout is still recent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    const stdout = new PassThrough();
    const tracker = createStdoutActivityTracker();
    tracker.attach(stdout);
    stdout.write("x");

    const events: unknown[] = [];
    const scheduler = createHeartbeatScheduler({
      startedAt: 1_000,
      timeoutMs: 600_000,
      tracker,
      onLog: (event) => {
        events.push(event);
      },
      now: () => 30_000,
      setIntervalFn: (handler: () => void) => {
        handler();
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: vi.fn(),
    });

    scheduler.start();

    expect(events).toEqual([
      {
        type: "heartbeat",
        elapsedMs: 29_000,
        stdoutBytes: 1,
        lastStdoutAt: 1_000,
        agentTimeRemainingMs: 571_000,
        overallTimeRemainingMs: null,
      },
    ]);
  });

  it("ignores quiet transport before stdout activity exists", () => {
    const events: unknown[] = [];
    const scheduler = createHeartbeatScheduler({
      startedAt: 1_000,
      timeoutMs: 600_000,
      tracker: createStdoutActivityTracker(),
      onLog: (event) => {
        events.push(event);
      },
      now: () => 1_000 + QUIET_TRANSPORT_THRESHOLD_MS + 1,
      setIntervalFn: (handler: () => void) => {
        handler();
        return 1 as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: vi.fn(),
    });

    scheduler.start();
    scheduler.start();
    scheduler.stop();
    scheduler.stop();

    expect(events).toEqual([
      {
        type: "heartbeat",
        elapsedMs: QUIET_TRANSPORT_THRESHOLD_MS + 1,
        stdoutBytes: 0,
        lastStdoutAt: null,
        agentTimeRemainingMs: 479_999,
        overallTimeRemainingMs: null,
      },
    ]);
  });
});

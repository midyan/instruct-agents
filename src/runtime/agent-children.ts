import * as processGroup from "./process-group.js";

export type CleanupCallback = () => void | Promise<void>;

const trackedProcessGroups = new Set<number>();
const cleanupCallbacks = new Set<CleanupCallback>();

let signalHandlersInstalled = false;
let shutdownInitiated = false;
let forceShutdown = false;
let exitCleanupInstalled = false;
let vitestDetectionOverride: boolean | undefined;

export function setVitestDetectionOverrideForTests(
  value: boolean | undefined,
): void {
  vitestDetectionOverride = value;
}

export function isVitestEnvironment(): boolean {
  if (vitestDetectionOverride !== undefined) {
    return vitestDetectionOverride;
  }

  return process.env.VITEST === "true" || process.env.VITEST === "1";
}

export function registerCleanupCallback(callback: CleanupCallback): () => void {
  cleanupCallbacks.add(callback);
  return () => {
    cleanupCallbacks.delete(callback);
  };
}

export function registerProcessGroup(pgid: number): () => void {
  trackedProcessGroups.add(pgid);
  return () => {
    trackedProcessGroups.delete(pgid);
  };
}

export async function runRegisteredCleanups(): Promise<void> {
  for (const callback of cleanupCallbacks) {
    await callback();
  }
}

export function killAllTrackedProcessGroups(signal: NodeJS.Signals): void {
  for (const pgid of trackedProcessGroups) {
    processGroup.killProcessGroup(pgid, signal);
  }
}

export async function shutdownAllProcessGroups(options?: {
  force?: boolean;
}): Promise<void> {
  await runRegisteredCleanups();

  if (options?.force) {
    killAllTrackedProcessGroups("SIGKILL");
    return;
  }

  killAllTrackedProcessGroups("SIGTERM");
  killAllTrackedProcessGroups("SIGKILL");
}

export function getHostSignalExitCode(signal: NodeJS.Signals): number {
  return signal === "SIGINT" ? 130 : 143;
}

export async function handleHostSignal(signal: NodeJS.Signals): Promise<void> {
  if (forceShutdown) {
    killAllTrackedProcessGroups("SIGKILL");
    process.exit(getHostSignalExitCode(signal));
  }

  if (shutdownInitiated) {
    return;
  }

  shutdownInitiated = true;
  await shutdownAllProcessGroups();
  process.exit(getHostSignalExitCode(signal));
}

function installExitCleanup(): void {
  if (exitCleanupInstalled) {
    return;
  }

  exitCleanupInstalled = true;
  process.on("exit", () => {
    killAllTrackedProcessGroups("SIGKILL");
  });
}

export function installProcessSignalHandlers(): void {
  installExitCleanup();

  if (signalHandlersInstalled || isVitestEnvironment()) {
    return;
  }

  signalHandlersInstalled = true;

  process.on("SIGINT", () => {
    forceShutdown = shutdownInitiated;
    void handleHostSignal("SIGINT");
  });

  process.on("SIGTERM", () => {
    forceShutdown = shutdownInitiated;
    void handleHostSignal("SIGTERM");
  });
}

export function markHostForceShutdownForTests(): void {
  forceShutdown = true;
}

export function resetProcessRegistryForTests(): void {
  trackedProcessGroups.clear();
  cleanupCallbacks.clear();
  signalHandlersInstalled = false;
  shutdownInitiated = false;
  forceShutdown = false;
  exitCleanupInstalled = false;
  vitestDetectionOverride = undefined;
}

export function getProcessRegistryStateForTests(): {
  trackedProcessGroups: number[];
  cleanupCallbackCount: number;
  signalHandlersInstalled: boolean;
  exitCleanupInstalled: boolean;
} {
  return {
    trackedProcessGroups: [...trackedProcessGroups],
    cleanupCallbackCount: cleanupCallbacks.size,
    signalHandlersInstalled,
    exitCleanupInstalled,
  };
}

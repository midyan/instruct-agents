function killNegativeProcessGroup(
  pgid: number,
  signal: NodeJS.Signals,
): boolean {
  try {
    process.kill(-pgid, signal);
    return true;
  } catch {
    return false;
  }
}

function killDirectProcess(pgid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pgid, signal);
  } catch {
    // Process already exited.
  }
}

export function killProcessGroup(pgid: number, signal: NodeJS.Signals): void {
  if (killNegativeProcessGroup(pgid, signal)) {
    return;
  }

  killDirectProcess(pgid, signal);
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export const EXPECTED_PIPE_ERROR_CODES = new Set(["EPIPE", "ECONNRESET"]);

export type SessionTitlesClass = {
  prototype: {
    canRequest: (...args: unknown[]) => boolean;
  };
};

/** Disables post-turn title generation for unattended structured-agent runs. */
export function disableHeadlessTitleGeneration(
  sessionTitles: SessionTitlesClass,
): void {
  sessionTitles.prototype.canRequest = () => false;
}

function isExpectedPipeError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return EXPECTED_PIPE_ERROR_CODES.has(String(error.code));
}

/** Swallows broken-pipe errors on stdio during expected adapter teardown. */
export function installPipeCloseGuard(
  streams: Array<NodeJS.ReadableStream | NodeJS.WritableStream | null>,
): void {
  for (const stream of streams) {
    stream?.on("error", (error: unknown) => {
      if (isExpectedPipeError(error)) {
        return;
      }

      throw error;
    });
  }
}

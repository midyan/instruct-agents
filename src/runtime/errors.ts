export type StructuredOutputErrorReason = "max_attempts" | "stop_reason";

export type StructuredOutputAttempt = {
  prompt: string;
  rawText: string;
  stopReason?: string;
  failure?: string;
};

export type StructuredOutputErrorJson = {
  name: string;
  reason: StructuredOutputErrorReason;
  message: string;
  attempts: StructuredOutputAttempt[];
};

/** Thrown when structured output validation fails after all retry attempts. */
export class StructuredOutputError extends Error {
  readonly reason: StructuredOutputErrorReason;
  readonly attempts: StructuredOutputAttempt[];

  constructor(
    reason: StructuredOutputErrorReason,
    message: string,
    attempts: StructuredOutputAttempt[],
  ) {
    super(message);
    this.name = "StructuredOutputError";
    this.reason = reason;
    this.attempts = attempts;
  }

  toJSON(): StructuredOutputErrorJson {
    return {
      name: this.name,
      reason: this.reason,
      message: this.message,
      attempts: this.attempts,
    };
  }
}

/** Thrown when a definition references a vendor the runtime cannot resolve. */
export class UnknownVendorError extends Error {
  constructor(vendor: string) {
    super(`Unknown vendor "${vendor}"`);
    this.name = "UnknownVendorError";
  }
}

/** Thrown when a definition uses vendor options the runtime does not support. */
export class UnsupportedVendorOptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedVendorOptionError";
  }
}

/** Thrown when invocation reaches the runtime before ACP integration exists. */
export class AgentRuntimeNotImplementedError extends Error {
  constructor() {
    super("ACP runtime is not implemented yet");
    this.name = "AgentRuntimeNotImplementedError";
  }
}

/** Thrown when an agent turn exceeds its allotted time budget. */
export class TurnTimeoutError extends Error {
  constructor() {
    super("turn_timeout");
    this.name = "TurnTimeoutError";
  }
}

/** Thrown when the shared workflow deadline has no time left for another turn. */
export class OverallRuntimeBudgetExhaustedError extends Error {
  constructor() {
    super("overall_runtime_budget_exhausted");
    this.name = "OverallRuntimeBudgetExhaustedError";
  }
}

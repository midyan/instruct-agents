import { JEV_DEFAULT_TIMEOUT_MS } from "../vendors/jev.js";
import {
  buildInputTaskPrompt,
  buildNoInputTaskPrompt,
} from "./build-prompt.js";
import { InvalidAgentDefinitionError } from "./errors.js";
import {
  buildJevResponseSchema,
  type JevResponseOptions,
} from "./jev-response-schema.js";
import { assertVendorDefinition } from "./resolve-vendor.js";
import { runStructuredAgent } from "./run-structured-agent.js";
import {
  DEFAULT_TIMEOUT_MS,
  type InputJevAgentDefinition,
  type InputJevStructuredAgent,
  type InputNormalizedJevAgentDefinition,
  type InputStructuredAgent,
  type InputStructuredAgentDefinition,
  type JevAgentDefinition,
  type NoInputJevAgentDefinition,
  type NoInputJevStructuredAgent,
  type NoInputNormalizedJevAgentDefinition,
  type NoInputStructuredAgent,
  type NoInputStructuredAgentDefinition,
  type RunStructuredAgentOptions,
  type StructuredAgentDefinition,
  type StructuredAgentDefinitionBase,
} from "./types.js";

type AnyDefinition = {
  vendor: string;
  responseSchema?: unknown;
  responseOptions?: unknown;
  defaultTimeoutMs?: number;
  inputSchema?: unknown;
  prompt: unknown;
  name?: string;
  cwd: string;
  model: string;
  modelContextWindow?: number;
  reasoningEffort?: unknown;
};

function isNonEmptyStringTuple(value: unknown): value is JevResponseOptions {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "string")
  );
}

function assertExclusiveSchemaFields(definition: AnyDefinition): void {
  const hasOptions = definition.responseOptions !== undefined;
  const hasSchema = definition.responseSchema !== undefined;

  if (definition.vendor === "jev") {
    if (hasSchema) {
      throw new InvalidAgentDefinitionError(
        "JEV definitions must use responseOptions, not responseSchema",
      );
    }
    if (!isNonEmptyStringTuple(definition.responseOptions)) {
      throw new InvalidAgentDefinitionError(
        "JEV definitions require a non-empty responseOptions array",
      );
    }
    return;
  }

  if (hasOptions) {
    throw new InvalidAgentDefinitionError(
      'responseOptions is only valid when vendor is "jev"',
    );
  }
  if (!hasSchema) {
    throw new InvalidAgentDefinitionError(
      "Non-JEV definitions require responseSchema",
    );
  }
}

function normalizeJevDefinition<TIn, TOptions extends JevResponseOptions>(
  definition: JevAgentDefinition<TIn, TOptions>,
):
  | NoInputNormalizedJevAgentDefinition<TOptions>
  | InputNormalizedJevAgentDefinition<TIn, TOptions> {
  const responseOptions = definition.responseOptions;
  return Object.freeze({
    ...definition,
    responseSchema: buildJevResponseSchema(responseOptions),
    responseOptions,
    defaultTimeoutMs: definition.defaultTimeoutMs ?? JEV_DEFAULT_TIMEOUT_MS,
  }) as
    | NoInputNormalizedJevAgentDefinition<TOptions>
    | InputNormalizedJevAgentDefinition<TIn, TOptions>;
}

function normalizeInputDefinition<TIn, TOut>(
  definition: InputStructuredAgentDefinition<TIn, TOut>,
): InputStructuredAgentDefinition<TIn, TOut> {
  return Object.freeze({
    ...definition,
    defaultTimeoutMs: definition.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
}

function normalizeNoInputDefinition<TOut>(
  definition: NoInputStructuredAgentDefinition<TOut>,
): NoInputStructuredAgentDefinition<TOut> {
  return Object.freeze({
    ...definition,
    defaultTimeoutMs: definition.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
}

function createInputAgent<TIn, TOut>(
  definition: StructuredAgentDefinitionBase<TOut> & {
    prompt: string | ((input: TIn) => string);
    inputSchema: import("zod").ZodType<TIn>;
  },
): InputStructuredAgent<TIn, TOut> {
  const agent = async (
    input: TIn,
    options?: RunStructuredAgentOptions,
  ): Promise<TOut> => {
    const validatedInput = definition.inputSchema.parse(input);
    const taskPrompt = buildInputTaskPrompt(definition.prompt, validatedInput);
    return runStructuredAgent(
      definition as InputStructuredAgentDefinition<TIn, TOut>,
      taskPrompt,
      options,
    );
  };

  agent.definition = definition as InputStructuredAgentDefinition<TIn, TOut>;
  return agent;
}

function createNoInputAgent<TOut>(
  definition: StructuredAgentDefinitionBase<TOut> & {
    prompt: string | (() => string);
    inputSchema?: undefined;
  },
): NoInputStructuredAgent<TOut> {
  const agent = async (options?: RunStructuredAgentOptions): Promise<TOut> => {
    const taskPrompt = buildNoInputTaskPrompt(definition.prompt);
    return runStructuredAgent(
      definition as NoInputStructuredAgentDefinition<TOut>,
      taskPrompt,
      options,
    );
  };

  agent.definition = definition as NoInputStructuredAgentDefinition<TOut>;
  return agent;
}

export function defineStructuredAgent<
  const TOptions extends JevResponseOptions,
>(
  definition: NoInputJevAgentDefinition<TOptions>,
): NoInputJevStructuredAgent<TOptions>;

export function defineStructuredAgent<
  TIn,
  const TOptions extends JevResponseOptions,
>(
  definition: InputJevAgentDefinition<TIn, TOptions>,
): InputJevStructuredAgent<TIn, TOptions>;

export function defineStructuredAgent<TOut>(
  definition: NoInputStructuredAgentDefinition<TOut>,
): NoInputStructuredAgent<TOut>;

export function defineStructuredAgent<TIn, TOut>(
  definition: InputStructuredAgentDefinition<TIn, TOut>,
): InputStructuredAgent<TIn, TOut>;

export function defineStructuredAgent(
  definition: StructuredAgentDefinition | JevAgentDefinition,
):
  | NoInputStructuredAgent<unknown>
  | InputStructuredAgent<unknown, unknown>
  | NoInputJevStructuredAgent<JevResponseOptions>
  | InputJevStructuredAgent<unknown, JevResponseOptions> {
  assertExclusiveSchemaFields(definition as AnyDefinition);
  assertVendorDefinition(definition);

  if (definition.vendor === "jev") {
    const normalized = normalizeJevDefinition(definition as JevAgentDefinition);

    if ("inputSchema" in normalized && normalized.inputSchema !== undefined) {
      return createInputAgent(
        normalized as InputNormalizedJevAgentDefinition<
          unknown,
          JevResponseOptions
        >,
      ) as InputJevStructuredAgent<unknown, JevResponseOptions>;
    }

    return createNoInputAgent(
      normalized as NoInputNormalizedJevAgentDefinition<JevResponseOptions>,
    ) as NoInputJevStructuredAgent<JevResponseOptions>;
  }

  if ("inputSchema" in definition && definition.inputSchema !== undefined) {
    const normalized = normalizeInputDefinition(
      definition as InputStructuredAgentDefinition<unknown, unknown>,
    );
    return createInputAgent(normalized);
  }

  const normalized = normalizeNoInputDefinition(
    definition as NoInputStructuredAgentDefinition<unknown>,
  );
  return createNoInputAgent(normalized);
}

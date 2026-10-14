import {
  buildInputTaskPrompt,
  buildNoInputTaskPrompt,
} from "./build-prompt.js";
import { assertVendorDefinition } from "./resolve-vendor.js";
import { runStructuredAgent } from "./run-structured-agent.js";
import {
  DEFAULT_TIMEOUT_MS,
  type InputStructuredAgent,
  type InputStructuredAgentDefinition,
  type NoInputStructuredAgent,
  type NoInputStructuredAgentDefinition,
  type RunStructuredAgentOptions,
  type StructuredAgentDefinition,
} from "./types.js";

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
  definition: InputStructuredAgentDefinition<TIn, TOut>,
): InputStructuredAgent<TIn, TOut> {
  const agent = async (
    input: TIn,
    options?: RunStructuredAgentOptions,
  ): Promise<TOut> => {
    const validatedInput = definition.inputSchema.parse(input);
    const taskPrompt = buildInputTaskPrompt(definition.prompt, validatedInput);
    return runStructuredAgent(definition, taskPrompt, options);
  };

  agent.definition = definition;
  return agent;
}

function createNoInputAgent<TOut>(
  definition: NoInputStructuredAgentDefinition<TOut>,
): NoInputStructuredAgent<TOut> {
  const agent = async (options?: RunStructuredAgentOptions): Promise<TOut> => {
    const taskPrompt = buildNoInputTaskPrompt(definition.prompt);
    return runStructuredAgent(definition, taskPrompt, options);
  };

  agent.definition = definition;
  return agent;
}

export function defineStructuredAgent<TOut>(
  definition: NoInputStructuredAgentDefinition<TOut>,
): NoInputStructuredAgent<TOut>;

export function defineStructuredAgent<TIn, TOut>(
  definition: InputStructuredAgentDefinition<TIn, TOut>,
): InputStructuredAgent<TIn, TOut>;

export function defineStructuredAgent<TIn, TOut>(
  definition: StructuredAgentDefinition<TIn, TOut>,
): NoInputStructuredAgent<TOut> | InputStructuredAgent<TIn, TOut> {
  assertVendorDefinition(definition);

  if (definition.inputSchema !== undefined) {
    const normalized = normalizeInputDefinition(
      definition as InputStructuredAgentDefinition<TIn, TOut>,
    );
    return createInputAgent(normalized);
  }

  const normalized = normalizeNoInputDefinition(
    definition as NoInputStructuredAgentDefinition<TOut>,
  );
  return createNoInputAgent(normalized);
}

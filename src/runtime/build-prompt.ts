export function buildInputTaskPrompt<TIn>(
  prompt: string | ((input: TIn) => string),
  input: TIn,
): string {
  if (typeof prompt === "function") {
    return prompt(input);
  }

  return prompt;
}

export function buildNoInputTaskPrompt(
  prompt: string | (() => string),
): string {
  if (typeof prompt === "function") {
    return prompt();
  }

  return prompt;
}

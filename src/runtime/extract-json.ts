const MARKDOWN_FENCE_PATTERN = /```([\w-]*)\s*\r?\n([\s\S]*?)\r?\n```/g;

export function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeFenceLanguage(language: string | undefined): string {
  return (language ?? "").toLowerCase();
}

function isAllowedFenceLanguage(language: string): boolean {
  return language === "" || language === "json";
}

function readFenceContent(match: RegExpMatchArray): string | undefined {
  const content = match[2]?.trim();
  return content ? content : undefined;
}

export function extractFirstFenceCandidate(
  rawText: string,
): string | undefined {
  for (const match of rawText.matchAll(MARKDOWN_FENCE_PATTERN)) {
    if (!isAllowedFenceLanguage(normalizeFenceLanguage(match[1]))) {
      continue;
    }

    const content = readFenceContent(match);
    if (content) {
      return content;
    }
  }

  return undefined;
}

export function sliceJsonObject(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return undefined;
  }

  return text.slice(start, end + 1);
}

export function sliceJsonArray(text: string): string | undefined {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return undefined;
  }

  return text.slice(start, end + 1);
}

function appendUniqueCandidate(
  candidates: string[],
  seen: Set<string>,
  candidate: string | undefined,
): void {
  if (!candidate || seen.has(candidate)) {
    return;
  }

  seen.add(candidate);
  candidates.push(candidate);
}

/** Collects JSON extraction candidates in architecture-defined priority order. */
export function collectJsonCandidates(rawText: string): string[] {
  const trimmed = rawText.trim();
  const candidates: string[] = [];
  const seen = new Set<string>();

  appendUniqueCandidate(candidates, seen, extractFirstFenceCandidate(rawText));
  appendUniqueCandidate(candidates, seen, trimmed);
  appendUniqueCandidate(candidates, seen, sliceJsonObject(trimmed));
  appendUniqueCandidate(candidates, seen, sliceJsonArray(trimmed));

  return candidates;
}

export function parseJsonFromCandidates(candidates: string[]): unknown | null {
  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function parseJsonFromResponse(rawText: string): unknown | null {
  return parseJsonFromCandidates(collectJsonCandidates(rawText));
}

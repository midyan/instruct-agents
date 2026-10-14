import { describe, expect, it } from "vitest";

import {
  collectJsonCandidates,
  extractFirstFenceCandidate,
  parseJsonFromResponse,
  sliceJsonArray,
  sliceJsonObject,
  tryParseJson,
} from "../../src/runtime/extract-json.js";

describe("tryParseJson", () => {
  it("parses valid JSON", () => {
    expect(tryParseJson('{"ok":true}')).toEqual({ ok: true });
  });

  it("returns null for invalid JSON", () => {
    expect(tryParseJson("{")).toBeNull();
  });
});

describe("extractFirstFenceCandidate", () => {
  it("extracts json fences", () => {
    const raw = 'Intro\n```json\n{"ok":true}\n```\nOutro';
    expect(extractFirstFenceCandidate(raw)).toBe('{"ok":true}');
  });

  it("extracts unmarked fences", () => {
    const raw = '```\n{"ok":true}\n```';
    expect(extractFirstFenceCandidate(raw)).toBe('{"ok":true}');
  });

  it("skips non-json fences and uses the first json fence", () => {
    const raw = '```typescript\nconst x = 1\n```\n```json\n{"ok":true}\n```';
    expect(extractFirstFenceCandidate(raw)).toBe('{"ok":true}');
  });

  it("ignores empty json fences", () => {
    expect(extractFirstFenceCandidate("```json\n\n```")).toBeUndefined();
  });
});

describe("slice helpers", () => {
  it("slices object bodies", () => {
    expect(sliceJsonObject('noise {"ok":true} noise')).toBe('{"ok":true}');
  });

  it("slices array bodies", () => {
    expect(sliceJsonArray("noise [1,2] noise")).toBe("[1,2]");
  });
});

describe("collectJsonCandidates", () => {
  it("deduplicates repeated candidates", () => {
    const raw = '{"ok":true}';
    expect(collectJsonCandidates(raw)).toEqual(['{"ok":true}']);
  });
});

describe("parseJsonFromResponse", () => {
  it("prefers fenced json over surrounding prose", () => {
    expect(parseJsonFromResponse('Answer:\n```json\n{"ok":true}\n```')).toEqual(
      {
        ok: true,
      },
    );
  });

  it("falls back to object slices when needed", () => {
    expect(parseJsonFromResponse('Result: {"ok":true}')).toEqual({ ok: true });
  });

  it("parses top-level arrays from array slices", () => {
    expect(parseJsonFromResponse("Items: [1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns null when no JSON is present", () => {
    expect(parseJsonFromResponse("no structured data here")).toBeNull();
  });
});

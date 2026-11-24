import { describe, expect, it } from "vitest";

import {
  mapJevChoiceAnswer,
  resolveUpstreamJevModel,
} from "../../src/vendors/jev/map-decision.mjs";

const OPTIONS = ["implement", "review_only", "escalate"];

describe("mapJevChoiceAnswer", () => {
  it("uses the selected option probability as confidence", () => {
    expect(
      mapJevChoiceAnswer(
        {
          choice: "review_only",
          confidence: 0.99,
          probabilities: {
            implement: 0.1,
            review_only: 0.7,
            escalate: 0.2,
          },
        },
        OPTIONS,
      ),
    ).toEqual({ next: "review_only", confidence: 0.7 });
  });

  it("rejects missing probabilities for the selected option", () => {
    expect(() =>
      mapJevChoiceAnswer(
        {
          choice: "implement",
          probabilities: { review_only: 1 },
        },
        OPTIONS,
      ),
    ).toThrow(/missing probability/);
  });

  it("rejects choices outside responseOptions", () => {
    expect(() =>
      mapJevChoiceAnswer(
        {
          choice: "other",
          probabilities: { other: 1 },
        },
        OPTIONS,
      ),
    ).toThrow(/not in responseOptions/);
  });
});

describe("resolveUpstreamJevModel", () => {
  it("maps catalog ids to TypeSafe model names", () => {
    expect(resolveUpstreamJevModel("jev-fast")).toBe("jev-latest");
    expect(resolveUpstreamJevModel("jev-v1")).toBe("jev-latest");
  });

  it("passes through unknown model ids", () => {
    expect(resolveUpstreamJevModel("custom-sku")).toBe("custom-sku");
  });
});

import { describe, expect, it } from "vitest";

import { Composer } from "../../src/runtime/index.js";
import { resolveAgentProcess } from "../../src/runtime/resolve-agent-process.js";

describe("resolveAgentProcess", () => {
  const definition = {
    cwd: "/tmp/project",
    vendor: Composer.vendor,
    model: Composer.model.composer25,
    responseSchema: {} as never,
  };

  it("uses the process override for fixture runs", () => {
    expect(
      resolveAgentProcess(definition, {
        process: {
          command: "node",
          args: ["fixture.mjs"],
        },
      }),
    ).toEqual({
      command: "node",
      args: ["fixture.mjs"],
    });
  });

  it("defaults fixture args to an empty array", () => {
    expect(
      resolveAgentProcess(definition, {
        process: {
          command: "node",
        },
      }),
    ).toEqual({
      command: "node",
      args: [],
    });
  });

  it("resolves vendor adapters when no override is provided", () => {
    expect(resolveAgentProcess(definition)).toEqual({
      command: "agent",
      args: ["--model", Composer.model.composer25, "acp"],
    });
  });
});

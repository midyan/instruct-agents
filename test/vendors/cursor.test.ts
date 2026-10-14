import { describe, expect, it } from "vitest";

import { Composer } from "../../src/runtime/vendors.js";
import {
  resolveCursorAgentCommand,
  resolveCursorProcess,
} from "../../src/vendors/index.js";

describe("resolveCursorProcess", () => {
  it("defaults to agent --model <id> acp", () => {
    expect(
      resolveCursorProcess(
        {
          model: Composer.model.composer25,
        },
        {},
      ),
    ).toEqual({
      command: "agent",
      args: ["--model", Composer.model.composer25, "acp"],
    });
  });

  it("defaults to process.env when env is omitted", () => {
    expect(
      resolveCursorProcess({
        model: Composer.model.composer25,
      }).command,
    ).toBe(process.env.CURSOR_AGENT_COMMAND ?? "agent");
  });

  it("uses the default agent command from the environment", () => {
    expect(
      resolveCursorProcess({ model: Composer.model.composer25 }, process.env)
        .command,
    ).toBe(process.env.CURSOR_AGENT_COMMAND ?? "agent");
  });

  it("honors CURSOR_AGENT_COMMAND overrides", () => {
    expect(
      resolveCursorProcess(
        { model: Composer.model.composer25 },
        { CURSOR_AGENT_COMMAND: "/opt/cursor/agent" },
      ),
    ).toEqual({
      command: "/opt/cursor/agent",
      args: ["--model", Composer.model.composer25, "acp"],
    });
  });
});

describe("resolveCursorAgentCommand", () => {
  it("defaults to process.env when env is omitted", () => {
    expect(resolveCursorAgentCommand()).toBe(
      process.env.CURSOR_AGENT_COMMAND ?? "agent",
    );
  });
});

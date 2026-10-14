import { describe, expect, it } from "vitest";

import {
  runComposablePipeline,
  type ComposableReview,
  type ComposableServer,
} from "../../src/runtime/composable-pipeline.js";

describe("runComposablePipeline", () => {
  it("stops at maxReviews when reviews never pass", async () => {
    const failReview: ComposableReview = {
      serverId: "demo",
      verdict: "fail",
      findings: [
        {
          id: "health",
          message: "missing health check",
          severity: "error",
        },
      ],
    };

    const project = { id: "demo", directory: "/tmp/demo" };
    const server: ComposableServer = {
      id: "demo",
      directory: "/tmp/demo",
      route: "/hello",
      responseBody: "hello world",
      hasHealthCheck: false,
    };

    const result = await runComposablePipeline({
      id: "demo",
      maxReviews: 2,
      options: {},
      agents: {
        scaffold: async () => project,
        implement: async () => server,
        reviewServer: async () => failReview,
        patchServer: async ({ server: current }) => current,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reviews).toHaveLength(2);
  });

  it("passes when the first review succeeds", async () => {
    const passReview: ComposableReview = {
      serverId: "demo",
      verdict: "pass",
      findings: [],
    };

    const result = await runComposablePipeline({
      id: "demo",
      maxReviews: 3,
      options: {},
      agents: {
        scaffold: async () => ({ id: "demo", directory: "/tmp/demo" }),
        implement: async () => ({
          id: "demo",
          directory: "/tmp/demo",
          route: "/hello",
          responseBody: "Hello, World!",
          hasHealthCheck: true,
        }),
        reviewServer: async () => passReview,
        patchServer: async ({ server }) => server,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(1);
  });

  it("patches and re-reviews until pass within budget", async () => {
    let reviewCount = 0;

    const result = await runComposablePipeline({
      id: "demo",
      maxReviews: 3,
      options: {},
      agents: {
        scaffold: async () => ({ id: "demo", directory: "/tmp/demo" }),
        implement: async () => ({
          id: "demo",
          directory: "/tmp/demo",
          route: "/hello",
          responseBody: "hello world",
          hasHealthCheck: false,
        }),
        reviewServer: async () => {
          reviewCount += 1;
          if (reviewCount === 1) {
            return {
              serverId: "demo",
              verdict: "fail",
              findings: [
                {
                  id: "body",
                  message: "wrong body",
                  severity: "error",
                },
              ],
            };
          }

          return {
            serverId: "demo",
            verdict: "pass",
            findings: [],
          };
        },
        patchServer: async ({ server }) => ({
          ...server,
          responseBody: "Hello, World!",
          hasHealthCheck: true,
        }),
      },
    });

    expect(result.ok).toBe(true);
    expect(result.reviews).toHaveLength(2);
    expect(result.server.responseBody).toBe("Hello, World!");
  });
});

export type ComposableProject = {
  id: string;
  directory: string;
};

export type ComposableServer = {
  id: string;
  directory: string;
  route: string;
  responseBody: string;
  hasHealthCheck: boolean;
};

export type ComposableReview = {
  serverId: string;
  verdict: "pass" | "fail";
  findings: Array<{
    id: string;
    message: string;
    severity: "info" | "warn" | "error";
  }>;
};

export type ComposableAgents = {
  scaffold: (
    input: { id: string },
    options: Record<string, unknown>,
  ) => Promise<ComposableProject>;
  implement: (
    project: ComposableProject,
    options: Record<string, unknown>,
  ) => Promise<ComposableServer>;
  reviewServer: (
    server: ComposableServer,
    options: Record<string, unknown>,
  ) => Promise<ComposableReview>;
  patchServer: (
    input: { server: ComposableServer; review: ComposableReview },
    options: Record<string, unknown>,
  ) => Promise<ComposableServer>;
};

export type ComposablePipelineResult = {
  ok: boolean;
  id: string;
  project: ComposableProject;
  server: ComposableServer;
  reviews: ComposableReview[];
};

/** Runs scaffold → implement → review → patch → re-review with a fixed review budget. */
export async function runComposablePipeline(options: {
  id: string;
  maxReviews: number;
  options: Record<string, unknown>;
  agents: ComposableAgents;
}): Promise<ComposablePipelineResult> {
  const project = await options.agents.scaffold(
    { id: options.id },
    options.options,
  );
  let server = await options.agents.implement(project, options.options);
  const reviews: ComposableReview[] = [];
  let review = await options.agents.reviewServer(server, options.options);
  reviews.push(review);

  while (review.verdict !== "pass" && reviews.length < options.maxReviews) {
    server = await options.agents.patchServer(
      { server, review },
      options.options,
    );
    review = await options.agents.reviewServer(server, options.options);
    reviews.push(review);
  }

  return {
    ok: review.verdict === "pass",
    id: options.id,
    project,
    server,
    reviews,
  };
}

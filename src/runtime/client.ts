import * as acp from "@agentclientprotocol/sdk";
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
} from "@agentclientprotocol/sdk";

import { resolveTraceStream, writeTraceUpdate } from "./trace.js";
import type { ClientInfo } from "./types.js";

export const CURSOR_LOGIN_METHOD_ID = "cursor_login";
export const CURSOR_ASK_QUESTION_METHOD = "cursor/ask_question";
export const CURSOR_CREATE_PLAN_METHOD = "cursor/create_plan";

export type PermissionOption = RequestPermissionRequest["options"][number];

export type StructuredAgentClientOptions = {
  clientInfo: ClientInfo;
  trace?: boolean | NodeJS.WritableStream;
  onSessionUpdate?: (notification: SessionNotification) => void;
};

/** Picks allow-once when present, otherwise the first option. */
export function selectPermissionOptionId(
  options: PermissionOption[],
): string | null {
  const allowOnce = options.find((option) => option.kind === "allow_once");
  if (allowOnce !== undefined) {
    return allowOnce.optionId;
  }

  return options[0]?.optionId ?? null;
}

/** Auto-approves tool permissions for non-interactive operation. */
export function buildPermissionResponse(
  params: RequestPermissionRequest,
): RequestPermissionResponse {
  const optionId = selectPermissionOptionId(params.options);

  if (optionId === null) {
    return { outcome: { outcome: "cancelled" } };
  }

  return {
    outcome: {
      outcome: "selected",
      optionId,
    },
  };
}

/** Skips Cursor blocking question prompts during unattended runs. */
export function buildSkippedAskQuestionResponse(): {
  outcome: { outcome: "skipped" };
} {
  return { outcome: { outcome: "skipped" } };
}

/** Accepts Cursor plan approval so structured turns can continue. */
export function buildAcceptedCreatePlanResponse(): {
  outcome: { outcome: "accepted" };
} {
  return { outcome: { outcome: "accepted" } };
}

function handleSessionUpdate(
  notification: SessionNotification,
  options: StructuredAgentClientOptions,
  traceStream: NodeJS.WritableStream | null,
): void {
  options.onSessionUpdate?.(notification);
  writeTraceUpdate(traceStream, notification);
}

/** Builds the ACP client app with permission and Cursor extension handlers. */
export function createStructuredAgentClientApp(
  options: StructuredAgentClientOptions,
): acp.ClientApp {
  const traceStream = resolveTraceStream(options.trace);

  return acp
    .client({
      name: options.clientInfo.name,
    })
    .onRequest(acp.methods.client.session.requestPermission, (ctx) =>
      buildPermissionResponse(ctx.params),
    )
    .onRequest(
      CURSOR_ASK_QUESTION_METHOD,
      (params: unknown) => params,
      () => buildSkippedAskQuestionResponse(),
    )
    .onRequest(
      CURSOR_CREATE_PLAN_METHOD,
      (params: unknown) => params,
      () => buildAcceptedCreatePlanResponse(),
    )
    .onNotification(acp.methods.client.session.update, (ctx) => {
      handleSessionUpdate(ctx.params, options, traceStream);
    });
}

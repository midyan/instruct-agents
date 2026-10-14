import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "permission-agent",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
    const permission = await client.request(
      acp.methods.client.session.requestPermission,
      {
        sessionId: params.sessionId,
        toolCall: {
          toolCallId: "permission-tool",
          title: "Permission tool",
        },
        options: [
          {
            kind: "reject_once",
            name: "Reject once",
            optionId: "reject",
          },
          {
            kind: "allow_once",
            name: "Allow once",
            optionId: "allow-once",
          },
        ],
      },
    );

    const suffix =
      permission.outcome.outcome === "selected"
        ? permission.outcome.optionId
        : "cancelled";

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: `{"ok":true,"permission":"${suffix}"}`,
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});

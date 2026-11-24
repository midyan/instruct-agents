import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "jev-invalid-next-retry",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { promptCount: 0 });
    return { sessionId };
  },
  async prompt(params, client) {
    const session = sessions.get(params.sessionId);
    session.promptCount += 1;
    // First turn: invalid `next` label. Second turn: valid decision.
    const payload =
      session.promptCount === 1
        ? '{"next":"not_a_valid_option","confidence":0.5}'
        : '{"next":"implement","confidence":0.92}';

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: payload,
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});

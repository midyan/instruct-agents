import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();
const delayMs = Number(process.env.FIXTURE_DELAY_MS ?? "500");

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

startAcpAgent({
  name: "slow-agent",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
    await delay(delayMs);

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: '{"ok":true}',
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});

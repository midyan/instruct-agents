import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();

startAcpAgent({
  name: "cursor-extensions",
  newSession() {
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
    const askResponse = await client.request("cursor/ask_question", {
      toolCallId: "ask-1",
      questions: [
        {
          id: "q1",
          prompt: "Which mode?",
          options: [{ id: "agent", label: "Agent" }],
        },
      ],
    });

    const planResponse = await client.request("cursor/create_plan", {
      toolCallId: "plan-1",
      plan: "Do the work",
      todos: [],
    });

    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: JSON.stringify({
            ok: true,
            ask: askResponse.outcome.outcome,
            plan: planResponse.outcome.outcome,
          }),
        },
      },
    });

    return { stopReason: "end_turn" };
  },
});

import { acp, createSessionStore, startAcpAgent } from "./acp-agent-lib.mjs";

const sessions = createSessionStore();
let authenticated = false;

startAcpAgent({
  name: "cursor-auth",
  initialize() {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
      authMethods: [
        {
          id: "cursor_login",
          name: "Cursor Login",
        },
      ],
    };
  },
  authenticate(params) {
    if (params.methodId === "cursor_login") {
      authenticated = true;
    }

    return {};
  },
  newSession() {
    if (!authenticated) {
      throw new Error("cursor_login required");
    }

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {});
    return { sessionId };
  },
  async prompt(params, client) {
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

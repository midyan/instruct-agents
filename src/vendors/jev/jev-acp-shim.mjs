/**
 * Thin Node ACP shim for JEV / TypeSafe System One (HTTP → ACP stdio).
 *
 * Env:
 * - JEV_API_KEY (or TYPESAFE_API_KEY / OPENROUTER_API_KEY)
 * - JEV_BASE_URL (optional; default https://api.typesafe.ai)
 * - JEV_MODEL (catalog id, e.g. jev-v1)
 * - JEV_SESSION_CONFIG JSON: { model, responseOptions: string[] }
 */

import { createRequire } from "node:module";
import { Readable, Writable } from "node:stream";

import {
  mapJevChoiceAnswer,
  resolveUpstreamJevModel,
} from "./map-decision.mjs";

const requireFromShim = createRequire(import.meta.url);
const acp = requireFromShim("@agentclientprotocol/sdk");

const DEFAULT_BASE_URL = "https://api.typesafe.ai";
const QUESTION_ID = "next";

function readApiKey(env) {
  return (
    env.JEV_API_KEY?.trim() ||
    env.TYPESAFE_API_KEY?.trim() ||
    env.OPENROUTER_API_KEY?.trim() ||
    ""
  );
}

function readSessionConfig(env) {
  const raw = env.JEV_SESSION_CONFIG;
  if (raw === undefined || raw.trim() === "") {
    throw new Error("JEV_SESSION_CONFIG is required");
  }

  const parsed = JSON.parse(raw);
  const responseOptions = parsed.responseOptions;
  if (!Array.isArray(responseOptions) || responseOptions.length === 0) {
    throw new Error(
      "JEV_SESSION_CONFIG.responseOptions must be a non-empty string array",
    );
  }

  return {
    model: typeof parsed.model === "string" ? parsed.model : env.JEV_MODEL,
    responseOptions: responseOptions.map(String),
  };
}

function promptText(params) {
  return params.prompt
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

function buildChoiceCriteria(responseOptions) {
  /** @type {Record<string, string>} */
  const criteria = {};
  for (const option of responseOptions) {
    criteria[option] = option;
  }
  return criteria;
}

async function callSystemOne({
  baseUrl,
  apiKey,
  upstreamModel,
  state,
  responseOptions,
}) {
  const url = new URL("/v1/systemone", baseUrl).toString();
  const body = {
    model: upstreamModel,
    state,
    questions: {
      [QUESTION_ID]: {
        type: "choice",
        instructions:
          "Select the single best next action from the provided choices.",
        criteria: buildChoiceCriteria(responseOptions),
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `TypeSafe System One request failed (${response.status}): ${text}`,
    );
  }

  const payload = JSON.parse(text);
  const answer = payload?.answers?.[QUESTION_ID];
  if (answer === undefined) {
    throw new Error(
      `TypeSafe System One response missing answers.${QUESTION_ID}`,
    );
  }

  return mapJevChoiceAnswer(answer, responseOptions);
}

function startShim() {
  const env = process.env;
  const apiKey = readApiKey(env);
  if (apiKey === "") {
    throw new Error(
      "Missing JEV_API_KEY (or TYPESAFE_API_KEY / OPENROUTER_API_KEY)",
    );
  }

  const sessionConfig = readSessionConfig(env);
  const catalogModel = env.JEV_MODEL ?? sessionConfig.model;
  if (typeof catalogModel !== "string" || catalogModel.trim() === "") {
    throw new Error("JEV_MODEL (or session config model) is required");
  }

  const baseUrl = (env.JEV_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  const upstreamModel = resolveUpstreamJevModel(catalogModel);
  const sessions = new Map();

  const input = Writable.toWeb(process.stdout);
  const output = Readable.toWeb(process.stdin);
  const stream = acp.ndJsonStream(input, output);

  let app = acp
    .agent({ name: "jev-acp-shim" })
    .onRequest("initialize", () => ({
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: { loadSession: false },
    }))
    .onRequest("authenticate", () => ({}))
    .onRequest("session/new", () => {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {});
      return { sessionId };
    })
    .onRequest("session/prompt", async (ctx) => {
      const state = promptText(ctx.params);
      const decision = await callSystemOne({
        baseUrl,
        apiKey,
        upstreamModel,
        state,
        responseOptions: sessionConfig.responseOptions,
      });

      await ctx.client.notify(acp.methods.client.session.update, {
        sessionId: ctx.params.sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: JSON.stringify(decision),
          },
        },
      });

      return { stopReason: "end_turn" };
    })
    .onNotification("session/cancel", () => {});

  app.connect(stream);
}

try {
  startShim();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[jev-acp-shim] ${message}`);
  process.exit(1);
}

import OpenAI from 'openai';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { asyncLocalStorage } from '../auth/requestContext.js';
import { TOOLS_LIST } from '../server/toolsList.js';
import { executeTool } from '../server/executeTool.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || process.env.CHAT_MODEL || 'gpt-4o-mini';

/** Build OpenAI client; throws if OPENAI_API_KEY is missing. */
function createOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is required for the chat endpoint. Set it in the environment.');
  }
  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    ...(OPENAI_BASE_URL?.trim() && { baseURL: OPENAI_BASE_URL }),
  });
}

/** Convert MCP TOOLS_LIST to OpenAI function-calling format. */
function getOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return TOOLS_LIST.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object' as const,
        properties: (t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {},
        required: ((t.inputSchema as { required?: string[] }).required) ?? [],
      },
    },
  }));
}

const SYSTEM_PROMPT = `You are an AI assistant for the Animoca credential dashboard. The user is already logged in; you have access to their session (issuer/verifier). Do NOT call credential_authenticate or credential_get_login_challenge.

Help them with:
- Creating and listing credential schemas
- Setting pricing, creating issuance programs (credential templates), and verification programs
- Listing templates and programs, getting docs and app config

Use the provided tools to perform actions. When the user asks to create something (e.g. a schema), call the appropriate tool with the parameters inferred from their message. Respond in clear, concise language and include relevant IDs or next steps when appropriate.`;

export interface ChatAuthFromHeaders {
  dashboardToken: string;
  issuerId?: string;
  verifierId?: string;
  partnerId?: string;
  apiUrl?: string;
  environment?: 'development' | 'staging' | 'production';
}

/**
 * Build AuthInfo-like object for setSessionFromAuthInfo from dashboard request headers.
 */
export function authFromHeadersToAuthInfo(headers: ChatAuthFromHeaders): AuthInfo {
  return {
    token: '',
    clientId: 'dashboard',
    scopes: [],
    expiresAt: 0,
    extra: {
      dashboardToken: headers.dashboardToken,
      issuerId: headers.issuerId,
      verifierId: headers.verifierId,
      partnerId: headers.partnerId,
      environment: headers.environment ?? 'staging',
    },
  };
}

/**
 * Run the chat loop: send user message to LLM with tools, execute tool calls, return final reply.
 * Session must be set (via setSessionFromAuthInfo) and optionally apiUrl before calling.
 */
export async function runChatLoop(
  message: string,
  authInfo: AuthInfo
): Promise<string> {
  const client = createOpenAIClient();
  const tools = getOpenAITools();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message },
  ];

  const maxRounds = 10;
  for (let round = 0; round < maxRounds; round++) {
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
    });

    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('No response from LLM');
    }

    const finishReason = choice.finish_reason;
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const name = tc.function?.name;
        const argsStr = tc.function?.arguments ?? '{}';
        if (!name) continue;

        let result: string;
        try {
          const args = JSON.parse(argsStr) as Record<string, unknown>;
          const toolResult = await asyncLocalStorage.run({ auth: authInfo }, () =>
            executeTool(name, args)
          );
          result = JSON.stringify(toolResult, null, 2);
        } catch (err) {
          result = JSON.stringify(
            {
              success: false,
              error: err instanceof Error ? err.message : String(err),
              tool: name,
            },
            null,
            2
          );
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    const content = msg.content;
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
    if (Array.isArray(content)) {
      const text = content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map((c) => c.text)
        .join('\n');
      if (text) return text;
    }

    if (finishReason === 'stop' || finishReason === 'length') {
      return (msg.content as string) || 'Done.';
    }
  }

  throw new Error('Chat loop exceeded max rounds');
}

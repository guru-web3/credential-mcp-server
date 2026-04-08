import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth } from '../auth/requestContext.js';
import { setSessionFromAuthInfo } from '../auth/setSessionFromAuthInfo.js';
import { getToolsList, getToolEntry } from './toolRegistry.js';
import { normalizeToolArgs } from './normalizeToolArgs.js';
import { listResources, readResource } from '../resources/index.js';
import { listPrompts, getPrompt } from '../prompts/index.js';

export function createMcpServer(): { server: Server } {
  const server = new Server(
    {
      name: 'animoca-credentials',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getToolsList(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const auth = getRequestAuth();
    if (auth) setSessionFromAuthInfo(auth);

    const { name, arguments: args } = request.params;
    const normalized = normalizeToolArgs(name, (args ?? {}) as Record<string, unknown>);
    const entry = getToolEntry(name);

    if (!entry) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: false, error: `Unknown tool: ${name}`, tool: name }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const validated = entry.schema.parse(normalized);
      const result = await entry.handler(validated);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: false, error: message, tool: name }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listResources(),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const content = await readResource(uri);
    if (!content) {
      const err = new Error(`Resource not found: ${uri}`) as Error & { code?: number };
      err.code = -32002;
      throw err;
    }
    return {
      contents: [content],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: listPrompts(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: promptArgs } = request.params;
    const args = (promptArgs ?? {}) as Record<string, string>;
    return getPrompt(name, args);
  });

  return { server };
}

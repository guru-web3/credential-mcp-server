import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRequestAuth } from '../auth/requestContext.js';
import { setSessionFromAuthInfo } from '../auth/setSessionFromAuthInfo.js';
import { TOOLS_LIST } from './toolsList.js';
import { executeTool } from './executeTool.js';

export function createMcpServer(): { server: Server } {
  const server = new Server(
    {
      name: 'animoca-credentials',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS_LIST,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const auth = getRequestAuth();
    if (auth) setSessionFromAuthInfo(auth);

    const { name, arguments: args } = request.params;

    try {
      const result = await executeTool(name, (args ?? {}) as Record<string, unknown>);
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
            text: JSON.stringify(
              { success: false, error: message, tool: name },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return { server };
}

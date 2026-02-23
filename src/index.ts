#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server/createMcpServer.js';

const { server } = createMcpServer();

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Animoca Credential MCP Server started');

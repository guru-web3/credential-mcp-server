#!/usr/bin/env node

import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer } from './server/createMcpServer.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import { createCredentialOAuthProvider, getBaseUrl } from './auth/credentialOAuthProvider.js';
import { handleOAuthCallback } from './oauth/callback.js';
import { asyncLocalStorage } from './auth/requestContext.js';
import { setSessionFromAuthInfo } from './auth/setSessionFromAuthInfo.js';
import { session } from './session.js';
import {
  runChatLoop,
  authFromHeadersToAuthInfo,
  type ChatAuthFromHeaders,
} from './chat/chatLoop.js';

const PORT = Number(process.env.MCP_HTTP_PORT) || 3749;
const CORS_ORIGINS = (process.env.MCP_CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const baseUrl = getBaseUrl();
const issuerUrl = new URL(baseUrl);
const signerUrl = process.env.CREDENTIAL_SIGNER_URL || 'https://credential-challenge-signer.netlify.app';

const oauthProvider = createCredentialOAuthProvider({ baseUrl });

/** Per-session server + transport so reloads (new initialize without session id) get a fresh session instead of "Server already initialized". */
const sessions = new Map<
  string,
  { server: Server; transport: StreamableHTTPServerTransport }
>();

function isInitializeRequest(body: unknown): boolean {
  if (body && typeof body === 'object' && 'method' in body && (body as { method: string }).method === 'initialize') {
    return true;
  }
  if (Array.isArray(body) && body.some((m: unknown) => m && typeof m === 'object' && 'method' in m && (m as { method: string }).method === 'initialize')) {
    return true;
  }
  return false;
}

function getSessionId(req: express.Request): string | undefined {
  const raw = req.headers['mcp-session-id'] ?? req.headers['Mcp-Session-Id'];
  return typeof raw === 'string' ? raw : undefined;
}

const mcpServerUrl = new URL('/mcp', baseUrl);
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/** Set CORS headers for dashboard chat (POST /chat). Reflect request Origin if allowed. */
function setChatCors(req: express.Request, res: express.Response): void {
  const origin = (req.headers.origin as string) || '';
  if (origin && CORS_ORIGINS.length > 0) {
    if (CORS_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (CORS_ORIGINS.length > 0) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-auth, x-issuer-id, x-issuer-did, x-verifier-id, x-api-url');
}

app.options('/chat', (req, res) => {
  setChatCors(req, res);
  res.sendStatus(204);
});

app.post('/chat', (req, res) => {
  setChatCors(req, res);
  const body = req.body as { message?: string; conversationId?: string };
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    res.status(400).json({ error: 'Missing or empty message' });
    return;
  }

  const dashboardToken = (req.headers['x-dashboard-auth'] as string)?.trim();
  if (!dashboardToken) {
    res.status(401).json({ error: 'Missing x-dashboard-auth header' });
    return;
  }

  const issuerId = (req.headers['x-issuer-id'] as string)?.trim() ?? '';
  const issuerDid = (req.headers['x-issuer-did'] as string)?.trim() || undefined;
  const verifierId = (req.headers['x-verifier-id'] as string)?.trim() ?? '';
  const apiUrl = (req.headers['x-api-url'] as string)?.trim() || undefined;

  const authFromHeaders: ChatAuthFromHeaders = {
    dashboardToken,
    issuerId: issuerId || undefined,
    issuerDid: issuerDid || undefined,
    verifierId: verifierId || undefined,
    environment: 'staging',
  };
  if (apiUrl) authFromHeaders.apiUrl = apiUrl;

  const authInfo = authFromHeadersToAuthInfo(authFromHeaders);
  setSessionFromAuthInfo(authInfo);
  if (apiUrl) session.set('apiUrl', apiUrl);

  runChatLoop(message, authInfo)
    .then((reply) => {
      res.status(200).json({ reply });
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MCP] /chat error:', msg);
      res.status(500).json({ error: msg });
    });
});

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(
    'Animoca Credential MCP server is running.\n\n' +
    'Endpoints:\n' +
    '  GET  /                             – this page\n' +
    '  POST /chat                         – Dashboard AI Assistant (x-dashboard-auth, x-issuer-id, x-verifier-id)\n' +
    '  GET  /mcp                          – MCP (requires Bearer token)\n' +
    '  GET  /.well-known/oauth-authorization-server – OAuth discovery\n' +
    '  GET  /oauth/login                 – OAuth login page\n'
  );
});

app.use(mcpAuthRouter({
  provider: oauthProvider,
  issuerUrl,
  baseUrl: issuerUrl,
  resourceServerUrl: mcpServerUrl,
  resourceName: 'Animoca Credential MCP',
  scopesSupported: ['mcp:connect'],
}));

app.get('/oauth/login', (req, res) => {
  const state = (req.query.state as string) ?? '';
  // URL query and form-urlencoded both decode + as space; restore for PKCE
  const rawChallenge = (req.query.code_challenge as string) ?? '';
  const codeChallenge = rawChallenge.replace(/ /g, '+');
  const redirectUri = (req.query.redirect_uri as string) ?? '';
  const clientId = (req.query.client_id as string) ?? '';
  if (!codeChallenge || !redirectUri || !clientId) {
    res.status(400).send('Missing code_challenge, redirect_uri, or client_id');
    return;
  }
  const callbackUrl = `${baseUrl.replace(/\/$/, '')}/oauth/callback`;
  const signerRedirect = new URL(signerUrl);
  signerRedirect.searchParams.set('state', state);
  signerRedirect.searchParams.set('code_challenge', codeChallenge);
  signerRedirect.searchParams.set('redirect_uri', redirectUri);
  signerRedirect.searchParams.set('client_id', clientId);
  signerRedirect.searchParams.set('callback_url', callbackUrl);
  res.redirect(302, signerRedirect.href);
});

app.post('/oauth/callback', handleOAuthCallback);

app.all('/mcp', requireBearerAuth({
  verifier: oauthProvider,
  resourceMetadataUrl,
}), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    res.status(401).end();
    return;
  }
  // GET (e.g. SSE) often has no body; transport expects object, not undefined
  const parsedBody = req.body != null ? req.body : {};
  const sessionId = getSessionId(req);

  try {
    if (sessionId) {
      const entry = sessions.get(sessionId);
      if (!entry) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Session not found' },
          id: null,
        });
        return;
      }
      await asyncLocalStorage.run({ auth }, () => entry.transport.handleRequest(req, res, parsedBody));
      if (req.method === 'DELETE') {
        sessions.delete(sessionId);
      }
      return;
    }

    if (req.method === 'POST' && isInitializeRequest(parsedBody)) {
      let newServer: Server;
      let newTransport: StreamableHTTPServerTransport;
      try {
        const created = createMcpServer();
        newServer = created.server;
        newTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        await newServer.connect(newTransport);
      } catch (createErr) {
        const createError = createErr instanceof Error ? createErr : new Error(String(createErr));
        console.error('[MCP] createMcpServer or connect error:', createError.message);
        console.error(createError.stack);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: { detail: createError.message },
            },
            id: null,
          });
        }
        return;
      }
      await asyncLocalStorage.run({ auth }, () => newTransport.handleRequest(req, res, parsedBody));
      const sid = newTransport.sessionId;
      if (sid) {
        sessions.set(sid, { server: newServer, transport: newTransport });
      }
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: Mcp-Session-Id header is required' },
      id: null,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[MCP] handleRequest error:', error.message);
    console.error(error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: { detail: error.message },
        },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  console.error(`Animoca Credential MCP HTTP server listening on http://localhost:${PORT}`);
  console.error(`MCP endpoint: ${mcpServerUrl.href}`);
  console.error(`OAuth issuer: ${issuerUrl.href}`);
  console.error('If clients get 500 with "server_error": token may be missing/expired — re-add the MCP server in Cursor and complete OAuth login.');
});

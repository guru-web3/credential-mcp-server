#!/usr/bin/env node

import 'dotenv/config';
import { applyChainEnvDefaults } from './config.js';
applyChainEnvDefaults();

import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer } from './server/createMcpServer.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { getEnvironment } from './config.js';
import { createCredentialOAuthProvider, getBaseUrl } from './auth/credentialOAuthProvider.js';
import { bearerOrKeyAuth, isKeyBasedAuthAvailable } from './auth/bearerOrKeyAuth.js';
import { handleOAuthCallback } from './oauth/callback.js';
import { asyncLocalStorage } from './auth/requestContext.js';

const PORT = Number(process.env.MCP_HTTP_PORT) || 3749;
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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(
    'Animoca Credential MCP server is running.\n\n' +
      'Endpoints:\n' +
      '  GET  /                             – this page\n' +
      '  GET  /mcp                          – MCP (requires Bearer token)\n' +
      '  GET  /.well-known/oauth-authorization-server – OAuth discovery\n' +
      '  GET  /oauth/login                 – OAuth login page\n'
  );
});

// When CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE is set, skip OAuth discovery
// so Cursor does not show "Needs authentication" / "Connect". Requests to /mcp use key-based auth instead.
if (!isKeyBasedAuthAvailable()) {
  app.use(mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl,
    baseUrl: issuerUrl,
    resourceServerUrl: mcpServerUrl,
    resourceName: 'Animoca Credential MCP',
    scopesSupported: ['mcp:connect'],
  }));
}

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
  signerRedirect.searchParams.set('environment', getEnvironment());
  res.redirect(302, signerRedirect.href);
});

app.post('/oauth/callback', handleOAuthCallback);

app.all('/mcp', bearerOrKeyAuth(oauthProvider), async (req, res) => {
  const auth = (req as express.Request & { auth?: import('@modelcontextprotocol/sdk/server/auth/types.js').AuthInfo }).auth;
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

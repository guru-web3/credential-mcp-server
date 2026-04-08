import type { Response } from 'express';
import * as jose from 'jose';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { consumeAuthCode, getAuthCodeChallenge } from './authCodeStore.js';

const ACCESS_TOKEN_EXPIRY_SEC = 60 * 60; // 1 hour
const DEFAULT_REDIRECT_URIS = [
  'http://localhost:4939/callback',
  'http://127.0.0.1:4939/callback',
  'https://cursor.com/oauth/callback',
  'cursor://anysphere.cursor-mcp/oauth/callback',
];

function getRedirectUris(): string[] {
  const raw = process.env.MCP_OAUTH_REDIRECT_URIS;
  if (!raw?.trim()) return DEFAULT_REDIRECT_URIS;
  return raw.split(',').map((u) => u.trim());
}

const cursorClient: OAuthClientInformationFull = {
  client_id: 'cursor',
  redirect_uris: getRedirectUris(),
  client_id_issued_at: Math.floor(Date.now() / 1000),
};

const dynamicClients = new Map<string, OAuthClientInformationFull>();

const clientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    const dynamic = dynamicClients.get(clientId);
    if (dynamic) return dynamic;
    if (clientId === 'cursor') return cursorClient;

    // Auto-register unknown clients (e.g., VS Code dynamic auth)
    // This allows VS Code's generated UUIDs to work seamlessly
    if (process.env.NODE_ENV !== 'production') {
      const vscodeClient: OAuthClientInformationFull = {
        client_id: clientId,
        redirect_uris: [
          'https://vscode.dev/redirect',
          'https://vscode.dev/*',
          'vscode://localhost:3749/authorize',
          'vscode://dynamic-auth-provider/localhost:3749/authorize',
          'vscode://localhost:3749/*',
          ...getRedirectUris(),
        ],
        client_id_issued_at: Math.floor(Date.now() / 1000),
      };
      dynamicClients.set(clientId, vscodeClient);
      return vscodeClient;
    }

    return undefined;
  },

  registerClient(
    client: Omit<OAuthClientInformationFull, 'client_id' | 'client_id_issued_at'>
  ): OAuthClientInformationFull {
    const clientId =
      (client as OAuthClientInformationFull).client_id ??
      `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const clientIdIssuedAt =
      (client as OAuthClientInformationFull).client_id_issued_at ?? Math.floor(Date.now() / 1000);
    const full: OAuthClientInformationFull = {
      ...client,
      redirect_uris: Array.isArray(client.redirect_uris)
        ? client.redirect_uris.map((u) => (typeof u === 'string' ? u : (u as URL).href))
        : [],
      client_id: clientId,
      client_id_issued_at: clientIdIssuedAt,
    };
    dynamicClients.set(clientId, full);
    return full;
  },
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.MCP_OAUTH_JWT_SECRET || 'credential-mcp-default-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export function getBaseUrl(): string {
  return process.env.MCP_OAUTH_BASE_URL || 'http://localhost:3749';
}

export interface CredentialOAuthProviderOptions {
  /** Base URL of this server (for login/callback links) */
  baseUrl?: string;
}

export function createCredentialOAuthProvider(options: CredentialOAuthProviderOptions = {}): OAuthServerProvider {
  const baseUrl = options.baseUrl || getBaseUrl();

  return {
    get clientsStore() {
      return clientsStore;
    },

    async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
      const loginUrl = new URL('/oauth/login', baseUrl);
      loginUrl.searchParams.set('state', params.state ?? '');
      loginUrl.searchParams.set('code_challenge', params.codeChallenge);
      loginUrl.searchParams.set('redirect_uri', params.redirectUri);
      loginUrl.searchParams.set('client_id', client.client_id);
      res.redirect(302, loginUrl.href);
    },

    async challengeForAuthorizationCode(
      _client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<string> {
      const challenge = getAuthCodeChallenge(authorizationCode);
      if (!challenge) throw new Error('Invalid or expired authorization code');
      return challenge;
    },

    async exchangeAuthorizationCode(
      _client: OAuthClientInformationFull,
      authorizationCode: string,
      _codeVerifier?: string,
      _redirectUri?: string,
      _resource?: URL
    ): Promise<OAuthTokens> {
      const data = consumeAuthCode(authorizationCode);
      if (!data) throw new Error('Invalid or expired authorization code');

      const secret = getJwtSecret();
      const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY_SEC;
      const payload = {
        sub: data.partnerId,
        client_id: data.clientId,
        scope: 'mcp:connect',
        exp,
        iat: Math.floor(Date.now() / 1000),
        extra: {
          partnerId: data.partnerId,
          issuerId: data.issuerId,
          issuerDid: data.issuerDid,
          verifierId: data.verifierId,
          verifierDid: data.verifierDid,
          dashboardToken: data.dashboardToken,
          walletAddress: data.walletAddress,
          environment: data.environment,
        },
      };

      const accessToken = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(secret);

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_EXPIRY_SEC,
      };
    },

    async exchangeRefreshToken(
      _client: OAuthClientInformationFull,
      _refreshToken: string,
      _scopes?: string[],
      _resource?: URL
    ): Promise<OAuthTokens> {
      throw new Error('Refresh tokens not supported');
    },

    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const secret = getJwtSecret();
      const { payload } = await jose.jwtVerify(token, secret);
      const exp = payload.exp as number | undefined;
      if (!exp || exp < Date.now() / 1000) {
        throw new Error('Token expired');
      }
      const extra = (payload.extra as Record<string, unknown>) || {};
      return {
        token,
        clientId: (payload.client_id as string) || 'cursor',
        scopes: payload.scope ? [payload.scope as string] : ['mcp:connect'],
        expiresAt: exp,
        extra: {
          partnerId: extra.partnerId,
          issuerId: extra.issuerId,
          issuerDid: extra.issuerDid,
          verifierId: extra.verifierId,
          verifierDid: extra.verifierDid,
          dashboardToken: extra.dashboardToken,
          walletAddress: extra.walletAddress,
          environment: extra.environment,
        },
      };
    },
  };
}

export type { OAuthServerProvider };

/**
 * MCP /mcp auth: Bearer token (OAuth) or key-based login when CREDENTIAL_MCP_PRIVATE_KEY/SEED is set.
 * When key/seed is set and no Bearer token is present, we run tryKeyBasedLogin and set req.auth
 * so Cursor can use the server without clicking "Connect".
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { tryKeyBasedLogin } from './keyAuth.js';
import { session } from '../session.js';

const ENV_KEY = 'CREDENTIAL_MCP_PRIVATE_KEY';
const ENV_SEED = 'CREDENTIAL_MCP_SEED_PHRASE';

function hasKeyOrSeed(): boolean {
  return !!(process.env[ENV_KEY]?.trim() || process.env[ENV_SEED]?.trim());
}

function buildAuthInfoFromSession(): AuthInfo {
  const env = session.get('environment');
  return {
    token: 'key-based',
    clientId: 'cursor',
    scopes: ['mcp:connect'],
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    extra: {
      partnerId: session.get('partnerId'),
      issuerId: session.get('issuerId'),
      issuerDid: session.get('issuerDid'),
      verifierId: session.get('verifierId'),
      verifierDid: session.get('verifierDid'),
      dashboardToken: session.get('dashboardToken'),
      walletAddress: session.get('walletAddress'),
      environment: env ?? 'staging',
    },
  };
}

/**
 * Middleware: authenticate via Bearer token or, when no Bearer and key/seed is set, via key-based login.
 * Sets req.auth (AuthInfo) on success; sends 401 otherwise.
 */
export function bearerOrKeyAuth(verifier: OAuthServerProvider) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (bearer) {
      try {
        const auth = await verifier.verifyAccessToken(bearer);
        (req as Request & { auth?: AuthInfo }).auth = auth;
        next();
        return;
      } catch {
        // Bearer invalid or expired; fall through to key-based if available
      }
    }

    if (hasKeyOrSeed()) {
      try {
        const loggedIn = await tryKeyBasedLogin();
        if (loggedIn && session.get('dashboardToken')) {
          (req as Request & { auth?: AuthInfo }).auth = buildAuthInfoFromSession();
          next();
          return;
        }
      } catch (e) {
        console.error('[auth] Key-based login failed:', (e as Error).message);
      }
    }

    res.status(401).setHeader('WWW-Authenticate', 'Bearer').end();
  };
}

/** True if key or seed phrase is set (server can auto-auth without OAuth). */
export function isKeyBasedAuthAvailable(): boolean {
  return hasKeyOrSeed();
}

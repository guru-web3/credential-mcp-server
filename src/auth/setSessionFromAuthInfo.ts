import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { session } from '../session.js';

/**
 * Populate the credential MCP session from OAuth AuthInfo.extra (set by HTTP Bearer auth).
 * Used when handling MCP requests over HTTP so tools see the same session as STDIO after credential_authenticate.
 */
export function setSessionFromAuthInfo(authInfo: AuthInfo): void {
  const extra = authInfo.extra as Record<string, unknown> | undefined;
  if (!extra) return;

  if (typeof extra.partnerId === 'string') session.set('partnerId', extra.partnerId);
  if (typeof extra.issuerId === 'string') session.set('issuerId', extra.issuerId);
  if (typeof extra.issuerDid === 'string') session.set('issuerDid', extra.issuerDid);
  if (typeof extra.verifierId === 'string') session.set('verifierId', extra.verifierId);
  if (typeof extra.verifierDid === 'string') session.set('verifierDid', extra.verifierDid);
  if (typeof extra.dashboardToken === 'string') session.set('dashboardToken', extra.dashboardToken);
  if (typeof extra.walletAddress === 'string') session.set('walletAddress', extra.walletAddress);

  const env = extra.environment as string | undefined;
  if (env === 'production' || env === 'staging' || env === 'development') {
    session.setEnvironment(env);
  }
}

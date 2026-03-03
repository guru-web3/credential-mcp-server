import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { partnerLogin } from '../auth/partnerLogin.js';
import { saveAuthCode } from '../auth/authCodeStore.js';
import { getEnvironment, type ConfigEnvironment } from '../config.js';

const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

function parseClientEnv(str: string | undefined): ConfigEnvironment {
  const s = (str || '').toLowerCase();
  if (s === 'production' || s === 'prod') return 'production';
  if (s === 'sandbox') return 'sandbox';
  if (s === 'staging') return 'staging';
  return getEnvironment();
}

/**
 * POST /oauth/callback
 * Body: credentialsJson (or walletAddress, signature, timestamp), state, code_challenge, redirect_uri, client_id
 */
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
  const state = (req.body?.state as string) ?? '';
  // Form-urlencoded turns + into space; restore for PKCE (plain method or legacy base64)
  const rawChallenge = (req.body?.code_challenge as string) ?? '';
  const codeChallenge = rawChallenge.replace(/ /g, '+');
  const redirectUri = String(req.body?.redirect_uri ?? '');
  const clientId = String(req.body?.client_id ?? '');

  if (!codeChallenge || !redirectUri || !clientId) {
    res.status(400).send('Missing state, code_challenge, redirect_uri, or client_id');
    return;
  }

  let walletAddress: string;
  let signature: string;
  let timestamp: number;
  let environment: ConfigEnvironment = getEnvironment();

  const credentialsJson = req.body?.credentialsJson as string | undefined;
  if (credentialsJson) {
    try {
      const parsed = JSON.parse(credentialsJson) as Record<string, unknown>;
      const addr = parsed.walletAddress as string;
      const sig = parsed.signature as string;
      const ts = parsed.timestamp as number;
      const env = parsed.environment as string | undefined;
      if (!addr || !sig || ts == null) {
        res.status(400).send('credentialsJson must contain walletAddress, signature, and timestamp');
        return;
      }
      walletAddress = addr.startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
      signature = sig;
      timestamp = Number(ts);
      environment = parseClientEnv(env);
      const age = Date.now() - timestamp;
      if (age > MAX_CHALLENGE_AGE_MS || age < -60000) {
        res.status(400).send('Signature expired. Sign again within 5 minutes.');
        return;
      }
    } catch {
      res.status(400).send('Invalid credentialsJson');
      return;
    }
  } else {
    const addr = req.body?.walletAddress as string;
    const sig = req.body?.signature as string;
    const ts = req.body?.timestamp as number | string;
    const env = req.body?.environment as string | undefined;
    if (!addr || !sig || (ts !== 0 && !ts)) {
      res.status(400).send('Provide credentialsJson or walletAddress, signature, and timestamp');
      return;
    }
    walletAddress = addr.startsWith('0x') ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
    signature = sig;
    timestamp = Number(ts);
    environment = parseClientEnv(env);
    const age = Date.now() - timestamp;
    if (age > MAX_CHALLENGE_AGE_MS || age < -60000) {
      res.status(400).send('Signature expired. Sign again within 5 minutes.');
      return;
    }
  }

  try {
    const loginResult = await partnerLogin(walletAddress, signature, timestamp, environment);
    const code = randomUUID();
    saveAuthCode(code, {
      codeChallenge,
      redirectUri,
      state,
      clientId,
      dashboardToken: loginResult.dashboardToken,
      partnerId: loginResult.partnerId,
      issuerId: loginResult.issuerId,
      issuerDid: loginResult.issuerDid,
      verifierId: loginResult.verifierId,
      verifierDid: loginResult.verifierDid,
      walletAddress,
      environment,
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (state) redirectUrl.searchParams.set('state', state);
    res.redirect(302, redirectUrl.href);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('[oauth/callback] Authentication failed:', message, err);
    res.status(401).send(`Authentication failed: ${message}`);
  }
}

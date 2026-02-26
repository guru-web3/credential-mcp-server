import { z } from 'zod';
import { Wallet } from 'ethers';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { session } from '../session.js';

const MAX_CHALLENGE_AGE_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_REQUEST_TIMEOUT_MS = 30_000;

const InnerAuthenticateArgsSchema = z
  .object({
    privateKey: z.string().optional().describe('Ethereum wallet private key (64 hex). Omit when using message-signing. Can be set via CREDENTIAL_MCP_PRIVATE_KEY env.'),
    environment: z.enum(['development', 'staging', 'production']).default('staging').describe('API environment'),
    walletAddress: z.string().optional().describe('For message-signing: wallet address that signed (from signer page)'),
    signature: z.string().optional().describe('For message-signing: signature from signer page'),
    timestamp: z.union([z.number(), z.string().transform((s) => Number(s))]).optional().describe('For message-signing: timestamp (ms) from signer page'),
  })
  .refine(
    (data) => {
      const hasKey = !!data.privateKey || !!process.env.CREDENTIAL_MCP_PRIVATE_KEY;
      const hasSignature = !!(data.walletAddress && data.signature && data.timestamp != null);
      return hasKey !== hasSignature;
    },
    { message: 'Provide either privateKey (or set CREDENTIAL_MCP_PRIVATE_KEY) or all of walletAddress, signature, and timestamp for message-signing.' }
  );

export const AuthenticateArgsSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as Record<string, unknown>;
    } catch {
      return val;
    }
  }
  const raw = val as Record<string, unknown> | null | undefined;
  if (raw && typeof raw === 'object' && typeof raw.credentialsJson === 'string') {
    try {
      const parsed = JSON.parse(raw.credentialsJson) as Record<string, unknown>;
      const merged = { ...parsed, ...raw };
      delete merged.credentialsJson;
      return merged;
    } catch {
      return val;
    }
  }
  return val;
}, InnerAuthenticateArgsSchema);

function generateHeaders(body: Record<string, unknown>, timestamp: number): Record<string, string> {
  const bodyStr = JSON.stringify(body);
  const hash = CryptoJS.SHA256(bodyStr).toString();
  return {
    'x-signature': hash,
    'x-timestamp': timestamp.toString(),
    'x-appversion': 'zkserapi_1.0.0',
    'Content-Type': 'application/json',
  };
}

export async function authenticate(args: z.infer<typeof AuthenticateArgsSchema>) {
  const { privateKey, environment, walletAddress: argWallet, signature: argSignature, timestamp: argTimestamp } = args;

  const apiUrl = environment === 'production'
    ? 'https://credential.api.air3.com'
    : 'https://credential.api.staging.air3.com';
  session.setEnvironment(environment);

  let walletAddress: string;
  let signature: string;
  let timestamp: number;

  try {
    if (argWallet != null && argSignature != null && argTimestamp != null) {
      walletAddress = argWallet.startsWith('0x') ? argWallet.toLowerCase() : `0x${argWallet.toLowerCase()}`;
      signature = argSignature;
      timestamp = Number(argTimestamp);
      const age = Date.now() - timestamp;
      if (age > MAX_CHALLENGE_AGE_MS || age < -60000) {
        throw new Error(`Challenge expired or invalid timestamp. Sign within ${MAX_CHALLENGE_AGE_MS / 60000} minutes and use the same timestamp.`);
      }
      console.log(`[DEBUG] Message-signing auth for ${walletAddress}`);
    } else {
      const pk = (privateKey || process.env.CREDENTIAL_MCP_PRIVATE_KEY || '').trim();
      if (!pk) throw new Error('Missing privateKey or CREDENTIAL_MCP_PRIVATE_KEY. For message-signing provide walletAddress, signature, and timestamp.');
      const key = pk.startsWith('0x') ? pk : `0x${pk}`;
      const wallet = new Wallet(key);
      walletAddress = wallet.address.toLowerCase();
      const date = new Date();
      timestamp = date.getTime();
      const isoTimestamp = date.toISOString();
      const message = `You are logging into AIR Credential Dashboard with your wallet: ${walletAddress}
Signature approval is required and will not cost any fees.
Timestamp: ${isoTimestamp}`;
      console.log(`[DEBUG] Signing message...`);
      signature = await wallet.signMessage(message);
      console.log(`[DEBUG] Signature: ${signature.substring(0, 20)}...`);
    }
  } catch (err: unknown) {
    const ax = err as { response?: unknown };
    if (ax?.response !== undefined) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Setup failed before login: ${msg}. Check private key (64 hex characters) or message-signing fields.`);
  }

  const loginBody = { walletAddress, signature, timestamp };
  const headers = generateHeaders(loginBody, timestamp);
  console.log(`[DEBUG] Calling ${apiUrl}/partner/login`);

  try {
    const loginResponse = await axios.post(
      `${apiUrl}/partner/login`,
      loginBody,
      { headers, timeout: LOGIN_REQUEST_TIMEOUT_MS }
    );

    console.log('[DEBUG] Login response:', loginResponse.status);
    console.log('[DEBUG] Login data:', JSON.stringify(loginResponse.data, null, 2));

    const resp = loginResponse.data;
    if (!resp || resp.code !== 80000000) {
      const code = resp?.code ?? 'no code';
      const msg = resp?.msg ?? resp?.message ?? '(empty)';
      const detail = typeof resp === 'object' ? JSON.stringify(resp) : String(resp);
      throw new Error(`Login failed: code=${code} msg=${msg}. Response: ${detail}`);
    }

    const { dashboardToken, issuerId, issuerDid, partnerId, verifierId, verifierDid } = resp.data;
    
    // Log available fields in response
    console.log('[DEBUG] Available fields in login response:', Object.keys(resp.data).join(', '));
    if (!issuerDid) {
      console.warn('[DEBUG] ⚠️ issuerDid not found in API response. Will attempt to fetch from issuer profile endpoint.');
    }

    session.set('dashboardToken', dashboardToken);
    session.set('issuerId', issuerId);
    session.set('issuerDid', issuerDid);
    session.set('partnerId', partnerId);
    session.set('verifierId', verifierId);
    session.set('verifierDid', verifierDid);
    session.set('walletAddress', walletAddress);

    console.log(`[DEBUG] ✅ Authentication successful! Partner ID: ${partnerId}`);

    return {
      success: true,
      message: 'Authentication successful',
      partnerId,
      issuerId,
      issuerDid,
      verifierId,
      verifierDid,
      walletAddress,
      environment,
      nextSteps: [
        'Use credential_create_schema to create a credential schema',
        'Use credential_setup_pricing to configure pricing',
        'Use credential_create_verification_programs to create verification programs',
      ],
    };
  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string; code?: string };
    console.error('[DEBUG] ❌ Authentication error:', err?.message);
    if (err?.response) {
      console.error('[DEBUG] Response status:', err.response.status);
      console.error('[DEBUG] Response data:', JSON.stringify(err.response.data, null, 2));
    }

    const data = err?.response?.data as Record<string, unknown> | undefined;
    const apiMsg =
      (typeof data?.msg === 'string' && data.msg) ||
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error);
    const noResponseMsg =
      [err?.code, err?.message].filter(Boolean).join(' ') ||
      'No response from server (check network, URL, or firewall)';
    const msg = apiMsg || err?.message || (data && typeof data === 'object' ? `Response: ${JSON.stringify(data)}` : null) || (err?.response ? `HTTP ${err.response.status}` : null) || noResponseMsg;

    throw new Error(`Authentication failed: ${msg}`);
  }
}

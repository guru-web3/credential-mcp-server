/**
 * Key-based login for auto-authenticate when CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE is set.
 * Used by session.requireAuth() so tools work without the user explicitly calling credential_authenticate.
 */

import { Wallet, HDNodeWallet } from 'ethers';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { session } from '../session.js';

const LOGIN_REQUEST_TIMEOUT_MS = 30_000;
const ENV_KEY = 'CREDENTIAL_MCP_PRIVATE_KEY';
const ENV_SEED = 'CREDENTIAL_MCP_SEED_PHRASE';

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

/** Signer interface used for login (private key or derived from mnemonic). */
type LoginSigner = { address: string; signMessage: (message: string) => Promise<string> };

function getLoginSigner(): LoginSigner | null {
  const pk = (process.env[ENV_KEY] || '').trim();
  const seed = (process.env[ENV_SEED] || '').trim();
  if (pk) {
    const key = pk.startsWith('0x') ? pk : `0x${pk}`;
    return new Wallet(key);
  }
  if (seed) {
    const index = parseInt(process.env.CREDENTIAL_MCP_ACCOUNT_INDEX ?? '0', 10);
    const path = `m/44'/60'/0'/0/${index}`;
    const hd = HDNodeWallet.fromPhrase(seed.trim());
    const derived = hd.derivePath(path);
    return { address: derived.address, signMessage: (m: string) => derived.signMessage(m) };
  }
  return null;
}

/**
 * If CREDENTIAL_MCP_PRIVATE_KEY or CREDENTIAL_MCP_SEED_PHRASE is set, sign the login message and call
 * /partner/login, then set session. Returns true if login was performed and succeeded, false if no key.
 * Throws on login API error.
 * Environment defaults to CREDENTIAL_MCP_ENVIRONMENT or 'staging'.
 */
export async function tryKeyBasedLogin(
  environment: 'staging' | 'production' = (process.env.CREDENTIAL_MCP_ENVIRONMENT as 'staging' | 'production') || 'staging'
): Promise<boolean> {
  const wallet = getLoginSigner();
  if (!wallet) return false;

  const apiUrl =
    environment === 'production'
      ? 'https://credential.api.air3.com'
      : 'https://credential.api.staging.air3.com';
  session.setEnvironment(environment);

  const walletAddress = wallet.address.toLowerCase();
  const date = new Date();
  const timestamp = date.getTime();
  const isoTimestamp = date.toISOString();
  const message = `You are logging into AIR Credential Dashboard with your wallet: ${walletAddress}
Signature approval is required and will not cost any fees.
Timestamp: ${isoTimestamp}`;

  const signature = await wallet.signMessage(message);
  const loginBody = { walletAddress, signature, timestamp };
  const headers = generateHeaders(loginBody, timestamp);

  const loginResponse = await axios.post(`${apiUrl}/partner/login`, loginBody, {
    headers,
    timeout: LOGIN_REQUEST_TIMEOUT_MS,
  });

  const resp = loginResponse.data;
  if (!resp || resp.code !== 80000000) {
    const code = resp?.code ?? 'no code';
    const msg = resp?.msg ?? resp?.message ?? '(empty)';
    throw new Error(`Login failed: code=${code} msg=${msg}`);
  }

  const { dashboardToken, issuerId, issuerDid, partnerId, verifierId, verifierDid } = resp.data;
  session.set('dashboardToken', dashboardToken);
  session.set('issuerId', issuerId);
  session.set('issuerDid', issuerDid);
  session.set('partnerId', partnerId);
  session.set('verifierId', verifierId);
  session.set('verifierDid', verifierDid);
  session.set('walletAddress', walletAddress);

  console.log(`[DEBUG] Auto-authenticated with key (partner: ${partnerId})`);
  return true;
}

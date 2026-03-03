import CryptoJS from 'crypto-js';
import axios from 'axios';
import { getCredentialApiUrl, type ConfigEnvironment } from '../config.js';

const LOGIN_REQUEST_TIMEOUT_MS = 30_000;

export interface PartnerLoginResult {
  dashboardToken: string;
  issuerId: string;
  issuerDid: string;
  partnerId: string;
  verifierId: string;
  verifierDid: string;
}

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

export async function partnerLogin(
  walletAddress: string,
  signature: string,
  timestamp: number,
  environment: ConfigEnvironment = 'staging'
): Promise<PartnerLoginResult> {
  const apiUrl = getCredentialApiUrl(environment);
  const loginBody = { walletAddress, signature, timestamp };
  const headers = generateHeaders(loginBody, timestamp);

  try {
    const res = await axios.post(`${apiUrl}/partner/login`, loginBody, {
      headers,
      timeout: LOGIN_REQUEST_TIMEOUT_MS,
    });

    const data = res.data;
    if (!data || data.code !== 80000000) {
      const msg = data?.msg ?? data?.message ?? '(empty)';
      throw new Error(`Login failed: ${msg}`);
    }

    const d = data.data;
    return {
      dashboardToken: d.dashboardToken,
      issuerId: d.issuerId,
      issuerDid: d.issuerDid,
      partnerId: d.partnerId,
      verifierId: d.verifierId,
      verifierDid: d.verifierDid,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data != null) {
      const d = err.response.data as Record<string, unknown>;
      const msg = (d.msg ?? d.message ?? err.message) as string;
      throw new Error(`Login failed: ${msg}`);
    }
    throw err;
  }
}

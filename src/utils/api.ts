import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';
import axiosRetry from 'axios-retry';
import { session } from '../session.js';
import { ApiResponse } from '../types.js';
import { getCredentialApiSignatureKey, getCredentialApiUrl } from '../config.js';

const DEBUG = process.env.CREDENTIAL_MCP_DEBUG === 'true' || process.env.CREDENTIAL_MCP_DEBUG === '1';

/**
 * Generate required headers for API requests.
 * Signature must match dashboard: SHA256(body) -> digest_ts -> AES-ECB -> SHA256(ciphertext WordArray).
 */
function generateApiHeaders(body: unknown, dashboardToken?: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body ?? {});

  const firstHash = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(bodyStr)).toString();
  const combined = `${firstHash}_${timestamp}`;
  const key = CryptoJS.enc.Utf8.parse(getCredentialApiSignatureKey());
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(combined),
    key,
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  );
  const signature = CryptoJS.SHA256(encrypted.ciphertext).toString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp,
    'x-appversion': 'zkserapi_1.0.0',
  };

  if (dashboardToken) {
    headers['x-dashboard-auth'] = dashboardToken;
  }

  return headers;
}

export function createApiClient(): AxiosInstance {
  // Use current config so CREDENTIAL_MCP_ENVIRONMENT from .env is respected after restart
  const apiUrl = getCredentialApiUrl();

  const client = axios.create({
    baseURL: apiUrl,
    timeout: 30000,
  });

  console.log('[DEBUG] Creating API client for:', apiUrl);
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.response?.status === 429 ||
        error.response?.status === 503
      );
    },
  });

  return client;
}

interface ApiResponseBody {
  code?: string | number;
  msg?: string;
  data?: unknown;
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
  customHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  await session.requireAuth();
  const client = createApiClient();
  const dashboardToken = session.get('dashboardToken');

  const headers = {
    ...generateApiHeaders(data, dashboardToken),
    ...customHeaders,
  };

  try {
    if (DEBUG) {
      console.log(`[DEBUG] API Request: ${method} ${path}`);
      const apiUrl = getCredentialApiUrl();
      const curlHeaders = Object.entries(headers)
        .map(([k, v]) => `  -H '${k}: ${v}'`)
        .join(' \\\n');
      const curlBody = data != null ? `  --data-raw '${JSON.stringify(data)}'` : '';
      console.log(`[DEBUG] curl '${apiUrl}${path}' \\\n${curlHeaders}${curlBody ? ' \\\n' + curlBody : ''}`);
    }

    console.log('[DEBUG] Headers:', path);
    const response = await client.request({
      method,
      url: path,
      data,
      headers,
    });

    const resp = response.data as ApiResponseBody;
    if (DEBUG && resp != null) {
      console.log(`[DEBUG] API Response code: ${resp.code}, msg: ${resp.msg ?? '(none)'}`);
      if (resp.data != null && typeof resp.data === 'object') {
        console.log('[DEBUG] API Response data keys:', Object.keys(resp.data));
      }
    }

    if (resp?.code !== 80000000 && resp?.code !== '80000000') {
      const detail = resp?.data != null ? ` | detail: ${JSON.stringify(resp.data)}` : '';
      if (DEBUG) console.error('[DEBUG] API error full response:', JSON.stringify(resp, null, 2));
      const err = new Error(`API returned error: ${resp?.msg ?? 'Unknown error'}${detail}`) as Error & { apiResponse?: unknown };
      err.apiResponse = resp;
      throw err;
    }

    return response.data as ApiResponse<T>;
  } catch (error: unknown) {
    const ax = error as { message?: string; response?: { data?: { msg?: string } } };
    if (DEBUG) {
      console.error('[DEBUG] API Error:', ax.message);
      if (ax.response?.data) console.error('[DEBUG] Error response:', JSON.stringify(ax.response.data, null, 2));
    }
    const errorMsg = ax.response?.data?.msg ?? ax.message ?? 'Unknown error';
    throw new Error(`API Error: ${errorMsg}`);
  }
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, data?: unknown) => apiRequest<T>('POST', path, data),
  put: <T>(path: string, data?: unknown) => apiRequest<T>('PUT', path, data),
  patch: <T>(path: string, data?: unknown) => apiRequest<T>('PATCH', path, data),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
};

import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';
import axiosRetry from 'axios-retry';
import { session } from '../session.js';
import { ApiResponse } from '../types.js';

/**
 * Generate required headers for API requests.
 * Signature must match dashboard: SHA256(body) -> digest_ts -> AES-ECB -> SHA256(ciphertext WordArray).
 */
function generateApiHeaders(body: any, dashboardToken?: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || {});

  const firstHash = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(bodyStr)).toString();
  const combined = `${firstHash}_${timestamp}`;
  const key = CryptoJS.enc.Utf8.parse('WpVog9P8NveQLEJYE2cnjg==');
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
  const apiUrl = session.get('apiUrl');

  const client = axios.create({
    baseURL: apiUrl,
    timeout: 30000,
  });

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

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: any,
  customHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  await session.requireAuth();
  const client = createApiClient();
  const dashboardToken = session.get('dashboardToken');

  // Generate headers with signature
  const headers = {
    ...generateApiHeaders(data, dashboardToken),
    ...customHeaders,
  };

  try {
    console.log(`[DEBUG] API Request: ${method} ${path}`);
    
    // Print curl command for debugging
    const apiUrl = session.get('apiUrl');
    const curlHeaders = Object.entries(headers)
      .map(([key, value]) => `  -H '${key}: ${value}'`)
      .join(' \\\n');
    const curlBody = data ? `  --data-raw '${JSON.stringify(data)}'` : '';
    const curlCommand = `curl '${apiUrl}${path}' \\\n${curlHeaders}${curlBody ? ' \\\n' + curlBody : ''}`;
    console.log('[DEBUG] Equivalent curl command:');
    console.log(curlCommand);
    console.log('');
    
    const response = await client.request({
      method,
      url: path,
      data,
      headers,
    });

    const resp = response.data as any;
    console.log(`[DEBUG] API Response code: ${resp?.code}, msg: ${resp?.msg ?? '(none)'}`);
    if (resp?.data != null && typeof resp.data === 'object') {
      console.log('[DEBUG] API Response data keys:', Object.keys(resp.data));
    }

    if (resp?.code !== 80000000) {
      const detail = resp?.data != null ? ` | detail: ${JSON.stringify(resp.data)}` : '';
      console.error('[DEBUG] API error full response:', JSON.stringify(resp, null, 2));
      const err = new Error(`API returned error: ${resp?.msg || 'Unknown error'}${detail}`) as Error & { apiResponse?: unknown };
      err.apiResponse = resp;
      throw err;
    }

    return response.data as ApiResponse<T>;
  } catch (error: any) {
    console.error('[DEBUG] API Error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response (full):', JSON.stringify(error.response.data, null, 2));
    }
    const errorMsg = error.response?.data?.msg || error.message;
    throw new Error(`API Error: ${errorMsg}`);
  }
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, data?: any) => apiRequest<T>('POST', path, data),
  put: <T>(path: string, data?: any) => apiRequest<T>('PUT', path, data),
  patch: <T>(path: string, data?: any) => apiRequest<T>('PATCH', path, data),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
};

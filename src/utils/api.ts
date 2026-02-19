import axios, { AxiosInstance } from 'axios';
import CryptoJS from 'crypto-js';
import axiosRetry from 'axios-retry';
import { session } from '../session.js';
import { ApiResponse } from '../types.js';

/**
 * Generate required headers for API requests
 */
function generateApiHeaders(body: any, dashboardToken?: string): Record<string, string> {
  const timestamp = Date.now();
  const bodyStr = JSON.stringify(body || {});
  
  // Step 1: SHA256 hash of body
  const firstHash = CryptoJS.SHA256(bodyStr).toString();
  
  // Step 2: Combine with timestamp
  const combined = `${firstHash}_${timestamp}`;
  
  // Step 3: AES-ECB encryption
  const key = CryptoJS.enc.Utf8.parse('WpVog9P8NveQLEJYE2cnjg==');
  const encrypted = CryptoJS.AES.encrypt(combined, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Step 4: SHA256 of encrypted result
  const signature = CryptoJS.SHA256(encrypted.toString()).toString();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp.toString(),
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any,
  customHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  session.requireAuth();
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

    console.log(`[DEBUG] API Response code: ${response.data?.code}`);
    
    // Check for API-level errors (code !== 80000000)
    if (response.data?.code !== 80000000) {
      throw new Error(`API returned error: ${response.data?.msg || 'Unknown error'}`);
    }

    return response.data as ApiResponse<T>;
  } catch (error: any) {
    console.error('[DEBUG] API Error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    const errorMsg = error.response?.data?.msg || error.message;
    throw new Error(`API Error: ${errorMsg}`);
  }
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T>(path: string, data?: any) => apiRequest<T>('POST', path, data),
  put: <T>(path: string, data?: any) => apiRequest<T>('PUT', path, data),
  delete: <T>(path: string) => apiRequest<T>('DELETE', path),
};

/**
 * Query Payment Schema
 * Check if payment schema exists for a credential schema
 */

import axios from 'axios';
import { session } from '../session.js';
import { getMocaChainApiUrl, getCredentialDashboardUrl } from '../config.js';

function buildPaymentHeaders(dashboardToken: string, issuerId: string): Record<string, string> {
  const timestamp = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-appversion': 'zkserapi_1.0.0',
    'x-dashboard-auth': dashboardToken,
    'x-issuer-id': issuerId,
    'x-timestamp': timestamp.toString(),
    'x-signature': '', // Will be generated if needed
  };
  const dashboardBaseUrl = getCredentialDashboardUrl();
  if (dashboardBaseUrl) {
    const base = dashboardBaseUrl.replace(/\/$/, '');
    headers['Origin'] = base;
    headers['Referer'] = `${base}/`;
  }
  return headers;
}

export async function queryPaymentSchema(schemaId?: string): Promise<any> {
  await session.requireAuth();

  const credentialSchemaId = schemaId || session.get('schemaId');
  const partnerId = session.get('partnerId');
  const dashboardToken = session.get('dashboardToken');
  const issuerId = session.get('issuerId');

  if (!credentialSchemaId || !partnerId) {
    throw new Error('Missing required session data');
  }

  // Use current config so CREDENTIAL_MCP_ENVIRONMENT from .env is respected
  const paymentApiUrl = getMocaChainApiUrl();

  const url = `${paymentApiUrl}/v1/payment/schema/fee`;
  const params = {
    page: 1,
    limit: 10,
    credentialSchemaId,
    partnerId,
    complianceAccessKeyEnabled: false,
  };

  console.log('[DEBUG] Querying payment schema:', params);

  try {
    const headers = buildPaymentHeaders(dashboardToken!, issuerId!);

    const response = await axios.get(url, {
      params,
      headers,
    });

    console.log('[DEBUG] Payment schema query response:', response.status);
    console.log('[DEBUG] Payment schemas found:', response.data?.data?.length || 0);

    return response.data;
  } catch (error: any) {
    console.error('[DEBUG] Payment schema query error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

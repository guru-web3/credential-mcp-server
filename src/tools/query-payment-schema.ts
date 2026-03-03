/**
 * Query Payment Schema
 * Check if payment schema exists for a credential schema
 */

import axios from 'axios';
import { session } from '../session.js';
import { getMocaChainApiUrl, fromSessionEnvironment } from '../config.js';

function generatePaymentHeaders(dashboardToken: string, issuerId: string): Record<string, string> {
  const timestamp = Date.now();
  
  // Payment API uses different signature - just basic headers
  return {
    'Content-Type': 'application/json',
    'x-appversion': 'zkserapi_1.0.0',
    'x-dashboard-auth': dashboardToken,
    'x-issuer-id': issuerId,
    'x-timestamp': timestamp.toString(),
    'x-signature': '', // Will be generated if needed
  };
}

export async function queryPaymentSchema(schemaId?: string): Promise<any> {
  await session.requireAuth();

  const credentialSchemaId = schemaId || session.get('schemaId');
  const partnerId = session.get('partnerId');
  const dashboardToken = session.get('dashboardToken');
  const issuerId = session.get('issuerId');
  const environment = session.get('environment');

  if (!credentialSchemaId || !partnerId) {
    throw new Error('Missing required session data');
  }

  const paymentApiUrl = getMocaChainApiUrl(fromSessionEnvironment(environment));

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
    const headers = generatePaymentHeaders(dashboardToken!, issuerId!);
    
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

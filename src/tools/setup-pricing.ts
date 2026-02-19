import { z } from 'zod';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { session } from '../session.js';

export const SetupPricingArgsSchema = z.object({
  schemaId: z.string().optional().describe('Schema ID (uses last created schema if not provided)'),
  pricingModel: z.enum(['pay_on_success', 'pay_on_issuance']).optional().default('pay_on_success').describe('Pricing model: pay_on_success (only charged for successful verifications) or pay_on_issuance'),
  complianceAccessKeyEnabled: z.boolean().optional().default(false).describe('Enable Compliance Access Key (CAK) requirement'),
  paymentFeeSchemaId: z.string().optional().describe('Payment fee schema ID (default is USD8 standard: 0x64676f3921f98b72cf26dc0ac617fcade0189ae5244fa1cd614c18fb89e1be87)'),
});

/**
 * Generate headers for payment API
 */
function generatePaymentHeaders(body: any, dashboardToken: string, issuerId: string): Record<string, string> {
  const timestamp = Date.now();
  const bodyStr = JSON.stringify(body);
  
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
  
  return {
    'accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-timestamp': timestamp.toString(),
    'x-appversion': 'zkserapi_1.0.0',
    'x-dashboard-auth': dashboardToken,
    'x-issuer-id': issuerId,
  };
}

export async function setupPricing(args: z.infer<typeof SetupPricingArgsSchema>) {
  session.requireAuth();

  const { schemaId: providedSchemaId, pricingModel, complianceAccessKeyEnabled, paymentFeeSchemaId } = args;
  
  const schemaId = providedSchemaId || session.get('schemaId');
  if (!schemaId) {
    throw new Error('No schema ID provided. Create a schema first or provide schemaId parameter.');
  }

  // Only use paymentFeeSchemaId if explicitly provided (wallet-specific)
  const feeSchemaId = paymentFeeSchemaId;

  const dashboardToken = session.get('dashboardToken');
  const issuerId = session.get('issuerId');
  const environment = session.get('environment');

  if (!dashboardToken || !issuerId) {
    throw new Error('Missing authentication tokens. Please authenticate first.');
  }

  // Payment API URL (different from credential API)
  const paymentApiUrl = environment === 'production'
    ? 'https://api.mocachain.org'
    : 'https://api.staging.mocachain.org';

  const pricingData: any = {
    schemaId,
    pricingModel,
    complianceAccessKeyEnabled,
  };
  
  // Only include paymentFeeSchemaId if provided
  if (feeSchemaId) {
    pricingData.paymentFeeSchemaId = feeSchemaId;
  }

  console.log('[DEBUG] Setting up pricing on:', paymentApiUrl);
  console.log('[DEBUG] Pricing data:', JSON.stringify(pricingData, null, 2));

  try {
    const headers = generatePaymentHeaders(pricingData, dashboardToken, issuerId);
    
    const response = await axios.post(
      `${paymentApiUrl}/v1/payment/schema/fee`,
      pricingData,
      { headers }
    );

    console.log('[DEBUG] Pricing response:', response.status);

    // Payment API uses standard HTTP status codes (200/201), not code field
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`API returned error: ${response.data?.msg || response.statusText}`);
    }

    return {
      success: true,
      message: 'Pricing configured successfully',
      schemaId,
      pricingModel,
      complianceAccessKeyEnabled,
      paymentFeeSchemaId: feeSchemaId,
      nextSteps: [
        'Create verification programs with credential_create_verification_programs',
      ],
    };
  } catch (error: any) {
    console.error('[DEBUG] Pricing setup error:', error.message);
    if (error.response?.data) {
      console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Pricing setup failed: ${error.response?.data?.msg || error.message}`);
  }
}
